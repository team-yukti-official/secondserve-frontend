document.addEventListener('DOMContentLoaded', function () {
    bindDonateQuickActions();
    loadSmileStats();
    loadFeaturedSmileDonations();
    setInterval(loadSmileStats, 30000);
    setInterval(loadFeaturedSmileDonations, 30000);
});

const SMILE_CAROUSEL_LIMIT = 6;
let featuredSmileDonations = [];
let allSmileDonations = [];
let smileListingsExpanded = false;

function bindDonateQuickActions() {
    const donateButtons = document.querySelectorAll('.donate-btn');
    donateButtons.forEach((button) => {
        button.addEventListener('click', function () {
            const donationType = String(this.getAttribute('data-type') || '').trim();
            if (donationType) {
                sessionStorage.setItem('smileDonationType', donationType);
            }
        });
    });
}

async function loadSmileStats() {
    try {
        const result = await APIUtils.getSmileStatistics();
        if (!result.success) throw new Error(result.error || 'Stats fetch failed');

        const stats = result.data?.statistics || result.data || {};
        updateCount('clothes-count', stats.clothes || 0);
        updateCount('books-count', stats.books || 0);
        updateCount('toys-count', stats.toys || 0);
    } catch (error) {
        setOfflineCount('clothes-count');
        setOfflineCount('books-count');
        setOfflineCount('toys-count');
        console.error('Smile stats fetch error:', error);
    } finally {
        hideLoader('clothes-loader');
        hideLoader('books-loader');
        hideLoader('toys-loader');
    }
}

async function loadFeaturedSmileDonations() {
    const grid = document.getElementById('smileDonationGrid');
    if (!grid) return;

    grid.innerHTML = `
        <article class="smile-donation-card smile-donation-card--loading">
            <p>Loading Second Smile donations...</p>
        </article>
    `;

    try {
        const result = await APIUtils.getSmileFeaturedDonations();
        if (!result.success) {
            throw new Error(result.error || 'Could not load donations');
        }

        const donations = Array.isArray(result.data?.donations)
            ? result.data.donations
            : (Array.isArray(result.data) ? result.data : []);

        if (!donations.length) {
            grid.innerHTML = `
                <article class="smile-donation-card smile-donation-card--empty">
                    <h4>No active Smile donations yet</h4>
                    <p>Be the first one to donate clothes, books, or toys.</p>
                </article>
            `;
            return;
        }

        featuredSmileDonations = donations;
        renderSmileListings(grid, donations);
    } catch (error) {
        console.error('Featured smile donations error:', error);
        grid.innerHTML = `
            <article class="smile-donation-card smile-donation-card--empty">
                <h4>Unable to load donations right now</h4>
                <p>Please try again in a moment.</p>
            </article>
        `;
    }
}

function renderSmileListings(grid, donations) {
    if (smileListingsExpanded) {
        renderExpandedSmileListings(grid, allSmileDonations.length ? allSmileDonations : donations);
        return;
    }

    renderSmileCarousel(grid, donations);
}

function renderSmileCarousel(grid, donations) {
    const featured = donations.slice(0, SMILE_CAROUSEL_LIMIT);
    const showAllSlide = donations.length > SMILE_CAROUSEL_LIMIT;

    grid.classList.remove('smile-donation-grid--expanded');
    grid.classList.add('smile-donation-grid--carousel');
    grid.innerHTML = `
        <div class="smile-carousel-shell">
            <button class="smile-carousel-arrow smile-carousel-arrow--left" type="button" data-smile-carousel-prev aria-label="Scroll featured smile donations left">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="smile-carousel-viewport" data-smile-carousel-viewport>
                <div class="smile-carousel-track">
                    ${featured.map((donation) => `
                        <div class="smile-carousel-slide">
                            ${createSmileDonationCard(donation)}
                        </div>
                    `).join('')}
                    ${showAllSlide ? `
                        <div class="smile-carousel-slide">
                            <button type="button" class="smile-donation-card smile-card-all" data-smile-view-all>
                                <span class="smile-card-all-kicker">All Donations</span>
                                <strong>Browse every active Smile listing</strong>
                                <p>Open the complete feed of clothes, books, and toys donated by the community.</p>
                                <span class="smile-card-all-cta">
                                    View All <i class="fas fa-arrow-right"></i>
                                </span>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
            <button class="smile-carousel-arrow smile-carousel-arrow--right" type="button" data-smile-carousel-next aria-label="Scroll featured smile donations right">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    bindSmileRequestButtons(grid);
    bindSmileCarouselControls(grid);
    bindSmileAllButton(grid);
}

function renderExpandedSmileListings(grid, donations) {
    grid.classList.remove('smile-donation-grid--carousel');
    grid.classList.add('smile-donation-grid--expanded');
    grid.innerHTML = `
        <div class="smile-listings-toolbar">
            <button type="button" class="smile-view-toggle" data-smile-view-featured>
                <i class="fas fa-arrow-left"></i> Back to Featured
            </button>
            <span class="smile-listings-count">${donations.length} active donation${donations.length === 1 ? '' : 's'}</span>
        </div>
        <div class="smile-grid-cards">
            ${donations.map((donation) => createSmileDonationCard(donation)).join('')}
        </div>
    `;

    bindSmileRequestButtons(grid);
    const backBtn = grid.querySelector('[data-smile-view-featured]');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            smileListingsExpanded = false;
            renderSmileListings(grid, featuredSmileDonations);
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

function bindSmileRequestButtons(root) {
    root.querySelectorAll('.smile-request-btn').forEach((button) => {
        button.addEventListener('click', async function (event) {
            event.preventDefault();
            const donationId = this.dataset.donationId;
            await handleSmilePickupRequest(donationId, this);
        });
    });
}

function bindSmileCarouselControls(grid) {
    const viewport = grid.querySelector('[data-smile-carousel-viewport]');
    const prevBtn = grid.querySelector('[data-smile-carousel-prev]');
    const nextBtn = grid.querySelector('[data-smile-carousel-next]');

    if (!viewport || !prevBtn || !nextBtn) return;

    const getScrollAmount = () => Math.max(280, Math.floor(viewport.clientWidth * 0.85));

    const updateButtons = () => {
        const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth - 4;
        prevBtn.disabled = viewport.scrollLeft <= 4;
        nextBtn.disabled = viewport.scrollLeft >= maxScrollLeft;
    };

    prevBtn.addEventListener('click', () => {
        viewport.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        viewport.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    });

    viewport.addEventListener('scroll', updateButtons, { passive: true });
    updateButtons();
}

function bindSmileAllButton(grid) {
    const allBtn = grid.querySelector('[data-smile-view-all]');
    if (!allBtn) return;

    allBtn.addEventListener('click', () => {
        showAllSmileListings(grid);
    });
}

async function showAllSmileListings(grid) {
    try {
        const result = await APIUtils.getAllSmileDonations();
        if (!result.success) {
            throw new Error(result.error || 'Failed to load all smile donations');
        }

        const donations = Array.isArray(result.data)
            ? result.data
            : (Array.isArray(result.data?.donations) ? result.data.donations : []);

        allSmileDonations = donations;
        smileListingsExpanded = true;
        renderExpandedSmileListings(grid, donations);
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Failed to load all smile donations:', error);
        APIUtils.showErrorMessage('Unable to load all Smile donations right now.');
    }
}

function createSmileDonationCard(donation) {
    const itemType = String(donation.item_type || donation.itemType || 'other');
    const itemName = donation.item_name || donation.itemName || 'Item Donation';
    const quantity = donation.quantity || 1;
    const condition = donation.item_condition || donation.condition || 'good';
    const location = [donation.city, donation.pincode].filter(Boolean).join(', ') || donation.address || 'Unknown location';
    const donorName = donation.users?.full_name || 'Community Donor';
    const description = donation.description || 'No additional description provided.';
    const imageUrl = donation.image_url || 'https://via.placeholder.com/360x220?text=Second+Smile';

    return `
        <article class="smile-donation-card">
            <img src="${imageUrl}" alt="${escapeHtml(itemName)}" onerror="this.src='https://via.placeholder.com/360x220?text=Second+Smile'">
            <div class="smile-donation-body">
                <span class="smile-chip smile-chip-${escapeHtml(itemType)}">${escapeHtml(itemType)}</span>
                <h4>${escapeHtml(itemName)}</h4>
                <p>${escapeHtml(description)}</p>
                <ul>
                    <li><i class="fas fa-box"></i> Quantity: ${escapeHtml(String(quantity))}</li>
                    <li><i class="fas fa-shield-heart"></i> Condition: ${escapeHtml(condition)}</li>
                    <li><i class="fas fa-map-marker-alt"></i> ${escapeHtml(location)}</li>
                    <li><i class="fas fa-user"></i> ${escapeHtml(donorName)}</li>
                </ul>
                <button class="smile-request-btn" data-donation-id="${donation.id}">Request Pickup</button>
            </div>
        </article>
    `;
}

async function handleSmilePickupRequest(donationId, button) {
    if (!donationId) return;

    if (!APIUtils.isAuthenticated()) {
        sessionStorage.setItem('redirectAfterLogin', '/heart.html');
        window.location.href = 'login.html';
        return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending...';

    try {
        const result = await APIUtils.requestSmilePickup(donationId);
        if (result.success) {
            APIUtils.showSuccessMessage('Pickup request sent successfully.');
            button.textContent = 'Requested';
            return;
        }

        APIUtils.showErrorMessage(result?.error || result?.data?.error || 'Failed to send pickup request.');
        button.disabled = false;
        button.textContent = originalText;
    } catch (error) {
        console.error('Smile pickup request error:', error);
        APIUtils.showErrorMessage('Failed to send pickup request.');
        button.disabled = false;
        button.textContent = originalText;
    }
}

function updateCount(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = `${value}+`;
}

function setOfflineCount(id) {
    const element = document.getElementById(id);
    if (element) element.innerText = 'Offline';
}

function hideLoader(id) {
    const loader = document.getElementById(id);
    if (loader) loader.style.display = 'none';
}
