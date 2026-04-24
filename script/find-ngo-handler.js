/**
 * Find NGO Handler
 * Handles loading and displaying registered NGOs
 *
 * FIXES APPLIED:
 * - Bug #9: createNGOCard now passes ngo.id (not ngo.phone) as the first
 *   argument to contactNGO(), which expects an NGO ID.
 * - Bug #16: escapeHtml() removed — now lives in shared-utils.js.
 *   Ensure shared-utils.js is loaded before this file in HTML.
 */

let allNGOs = [];
let userLocation = null;

document.addEventListener('DOMContentLoaded', function () {
    getUserLocation();
    loadRegisteredNGOs();
    setupFilters();
});

/**
 * Get user's current location for sorting NGOs by distance
 */
async function getUserLocation() {
    if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        return;
    }

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            });
        });

        userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        console.log('User location obtained:', userLocation);
        
        // Reload NGOs with location-based sorting
        loadRegisteredNGOs();
    } catch (error) {
        console.log('Could not get user location:', error.message);
        // Continue without location - NGOs will be sorted by creation date
    }
}

/**
 * Load registered NGOs from API
 */
async function loadRegisteredNGOs() {
    const ngoGrid = document.getElementById('ngoGrid');
    const loadingState = document.getElementById('ngoLoadingState');
    const emptyState = document.getElementById('ngoEmptyState');

    if (ngoGrid) ngoGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'block';

    try {
        let url = '/ngos/all';

        if (userLocation) {
            url += `?latitude=${userLocation.lat}&longitude=${userLocation.lng}`;
        }

        const response = await fetchNgos(url);
        const ngos = normalizeNgoResponse(response);

        if (ngos.length) {
            allNGOs = ngos;
            displayNGOs(allNGOs);

            const sortType = ngos.some(ngo => ngo.city && ngo.city.toLowerCase() !== 'not specified')
                ? 'location'
                : 'name';

            const sortIndicator = document.getElementById('sortIndicator');
            const sortTypeSpan = document.getElementById('sortType');
            if (sortIndicator && sortTypeSpan) {
                sortTypeSpan.textContent = sortType === 'location' ? 'location' : 'name';
                sortIndicator.style.display = 'block';
            }
        } else {
            showEmptyState('No NGOs were found. Please try again later.');
        }
    } catch (error) {
        console.error('Error loading NGOs:', error);
        showEmptyState(error.message || 'Error loading NGOs. Please try again later.');
    }
}

async function fetchNgos(url) {
    try {
        return await APIUtils.get(url, { showError: false });
    } catch (primaryError) {
        console.warn('Primary NGO fetch failed, retrying with absolute URL', primaryError);
        const fallbackUrl = `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/ngos/all`;
        const fallbackQuery = url.includes('?') ? url.substring(url.indexOf('?')) : '';
        return await APIUtils.get(fallbackUrl + fallbackQuery, { showError: false });
    }
}

function normalizeNgoResponse(response) {
    if (!response) return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    return [];
}

/**
 * Display NGOs in grid
 */
function displayNGOs(ngos) {
    const ngoGrid = document.getElementById('ngoGrid');
    const loadingState = document.getElementById('ngoLoadingState');
    const emptyState = document.getElementById('ngoEmptyState');

    if (loadingState) loadingState.style.display = 'none';

    if (!ngos || ngos.length === 0) {
        showEmptyState('No NGOs found');
        return;
    }

    ngoGrid.innerHTML = '';

    ngos.forEach(ngo => {
        const card = createNGOCard(ngo);
        ngoGrid.appendChild(card);
    });

    ngoGrid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
}

/**
 * Create NGO card element.
 * Bug #9 fix: pass ngo.id (or ngo._id) to contactNGO(), not ngo.phone.
 */
function createNGOCard(ngo) {
    const card = document.createElement('div');
    card.className = 'ngo-card';

    const rating = ngo.rating || 0;
    const stars = generateStars(rating);

    // Bug #9 fix: use ngo.id as the identifier (fallback to ngo._id for MongoDB)
    const ngoId = ngo.id || ngo._id || '';

    card.innerHTML = `
        <div class="ngo-card-header">
            <h3>${escapeHtml(ngo.name)}</h3>
            <div class="ngo-category">${escapeHtml(ngo.category || 'NGO')}</div>
        </div>

        <div class="ngo-card-details">
            <p class="ngo-location">
                <i class="fas fa-map-marker-alt"></i> ${escapeHtml(ngo.city || 'Location not specified')}
            </p>
            <p class="ngo-email">
                <i class="fas fa-envelope"></i> ${escapeHtml(ngo.email || 'N/A')}
            </p>
            <p class="ngo-phone">
                <i class="fas fa-phone"></i> ${escapeHtml(ngo.phone || 'N/A')}
            </p>
            ${ngo.description
                ? `<p class="ngo-description">${escapeHtml(ngo.description.substring(0, 100))}${ngo.description.length > 100 ? '...' : ''}</p>`
                : ''}
        </div>

        <div class="ngo-card-rating">
            <div class="stars">${stars}</div>
            <span class="rating-text">${rating.toFixed(1)}/5.0</span>
        </div>

        <div class="ngo-card-stats">
            <div class="stat">
                <span class="stat-value">${ngo.mealsDistributed || 0}</span>
                <span class="stat-label">Meals Distributed</span>
            </div>
            <div class="stat">
                <span class="stat-value">${ngo.donationsReceived || 0}</span>
                <span class="stat-label">Donations</span>
            </div>
        </div>

        <button class="ngo-contact-btn"
                onclick="contactNGO('${escapeHtml(ngoId)}', '${escapeHtml(ngo.name)}')">
            <i class="fas fa-handshake"></i> Contact NGO
        </button>
        <a class="ngo-contact-btn" style="margin-top:8px;display:inline-flex;justify-content:center;text-decoration:none"
           href="viewer-dashboard.html?userId=${encodeURIComponent(ngoId)}">
            <i class="fas fa-chart-line"></i> View Profile
        </a>
    `;

    return card;
}

/**
 * Generate star rating HTML
 */
function generateStars(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            starsHTML += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        } else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }
    return starsHTML;
}

/**
 * Setup search and category filters
 */
function setupFilters() {
    const searchInput = document.getElementById('ngoSearchInput');
    const categoryFilter = document.getElementById('ngoFilterCategory');

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
}

/**
 * Apply search / category filters
 */
function applyFilters() {
    const searchTerm = (document.getElementById('ngoSearchInput')?.value || '').toLowerCase();
    const category = document.getElementById('ngoFilterCategory')?.value || '';

    const filtered = allNGOs.filter(ngo => {
        const matchesSearch = !searchTerm ||
            (ngo.name || '').toLowerCase().includes(searchTerm) ||
            (ngo.city && ngo.city.toLowerCase().includes(searchTerm)) ||
            (ngo.description && ngo.description.toLowerCase().includes(searchTerm));

        const matchesCategory = !category || ngo.category === category;

        return matchesSearch && matchesCategory;
    });

    displayNGOs(filtered);
}

/**
 * Show empty / error state
 */
function showEmptyState(message = 'No NGOs found') {
    const ngoGrid = document.getElementById('ngoGrid');
    const loadingState = document.getElementById('ngoLoadingState');
    const emptyState = document.getElementById('ngoEmptyState');

    if (ngoGrid) ngoGrid.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) {
        emptyState.style.display = 'block';
        const p = emptyState.querySelector('p');
        if (p) p.textContent = message;
    }
}

/**
 * Contact an NGO.
 * Bug #9 fix: first parameter is now the NGO's ID (not its phone number).
 */
function contactNGO(ngoId, ngoName) {
    const authToken = APIUtils.getToken();

    if (!authToken) {
        APIUtils.showErrorMessage('Please log in to contact NGOs');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }

    APIUtils.showSuccessMessage(`Connecting you with ${ngoName}...`);
    console.log(`Contact NGO id=${ngoId} name=${ngoName}`);
    // TODO: open contact form or redirect to messaging page with ngoId
}
