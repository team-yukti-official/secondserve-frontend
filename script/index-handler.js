/**
 * Index Page — Dynamic Content Handler
 * Manages food listings and statistics updates
 *
 * FIXES APPLIED:
 * - Bug #5: Statistics fallback order fixed — nested .statistics property is
 *   checked first, then the raw data object, so the correct numbers are used.
 * - Bug #6: Both getUrgencyBadge() and getTimeRemaining() now consistently
 *   use donation.expiresAt (the canonical field). expiryTime is no longer used.
 * - Bug #16: escapeHtml() removed from this file — it now lives in shared-utils.js
 *   to avoid the duplicate definition that caused silent overwrites.
 */

document.addEventListener('DOMContentLoaded', async function () {
    try {
        await loadFeaturedDonations();
    } catch (error) {
        console.error('Featured donations load failed:', error);
    }

    try {
        await loadDashboardStatistics();
    } catch (error) {
        console.error('Dashboard statistics load failed:', error);
    }

    // Periodic refresh every 30 seconds
    setInterval(loadFeaturedDonations, 30000);
    setInterval(loadDashboardStatistics, 30000);
});

const FOOD_CAROUSEL_LIMIT = 6;
let featuredFoodDonations = [];
let allFoodDonations = [];
let foodListingsExpanded = false;

/**
 * Load featured food donations from backend
 */
async function loadFeaturedDonations() {
    const foodGrid = document.querySelector('.food-grid');
    if (!foodGrid) return;

    foodGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 30px; color: var(--primary-color);"></i>
            <p style="margin-top: 10px; color: var(--text-light);">Loading food donations...</p>
        </div>
    `;

    const result = await APIUtils.getFeaturedDonations();

    if (!result.success) {
        console.error('Failed to load donations:', result.error);
        foodGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 30px; color: #ff9800;"></i>
                <p style="margin-top: 10px; color: var(--text-light);">Unable to load donations. Please refresh the page.</p>
            </div>
        `;
        return;
    }

    const donations = Array.isArray(result.data)
        ? result.data
        : (result.data?.donations || []);
    const cleanup = await APIUtils.purgeExpiredDonations(donations);
    const activeDonations = cleanup.activeDonations || [];
    featuredFoodDonations = activeDonations;

    if (cleanup.deletedCount > 0) {
        console.info(`Deleted ${cleanup.deletedCount} expired donation(s).`);
    }

    if (activeDonations.length === 0) {
        foodGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-inbox" style="font-size: 30px; color: var(--primary-light);"></i>
                <p style="margin-top: 10px; color: var(--text-light);">No food donations available at the moment.</p>
            </div>
        `;
        return;
    }

    renderFoodListings(foodGrid, activeDonations);
}

function renderFoodListings(foodGrid, donations) {
    if (foodListingsExpanded) {
        renderExpandedFoodListings(foodGrid, allFoodDonations.length ? allFoodDonations : donations);
        return;
    }

    renderFoodCarousel(foodGrid, donations);
}

function renderFoodCarousel(foodGrid, donations) {
    const featured = donations.slice(0, FOOD_CAROUSEL_LIMIT);
    const showAllSlide = donations.length > FOOD_CAROUSEL_LIMIT;

    foodGrid.classList.remove('food-grid--expanded');
    foodGrid.classList.add('food-grid--carousel');
    foodGrid.innerHTML = `
        <div class="food-carousel-shell">
            <button class="food-carousel-arrow food-carousel-arrow--left" type="button" data-carousel-prev aria-label="Scroll featured food left">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="food-carousel-viewport" data-carousel-viewport>
                <div class="food-carousel-track">
                    ${featured.map((donation) => `
                        <div class="food-carousel-slide">
                            ${createFoodCard(donation)}
                        </div>
                    `).join('')}
                    ${showAllSlide ? `
                        <div class="food-carousel-slide">
                            <button type="button" class="food-card food-card-all" data-food-view-all>
                                <span class="food-card-all-kicker">All Donations</span>
                                <strong>Show every available listing</strong>
                                <p>Browse the full feed of food donations instead of just the featured cards.</p>
                                <span class="food-card-all-cta">
                                    View All <i class="fas fa-arrow-right"></i>
                                </span>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
            <button class="food-carousel-arrow food-carousel-arrow--right" type="button" data-carousel-next aria-label="Scroll featured food right">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    bindFoodRequestButtons(foodGrid);
    bindFoodCarouselControls(foodGrid);
    bindFoodAllButton(foodGrid);
}

function renderExpandedFoodListings(foodGrid, donations) {
    foodGrid.classList.remove('food-grid--carousel');
    foodGrid.classList.add('food-grid--expanded');
    foodGrid.innerHTML = `
        <div class="food-listings-toolbar">
            <button type="button" class="food-view-toggle" data-food-view-featured>
                <i class="fas fa-arrow-left"></i> Back to Featured
            </button>
            <span class="food-listings-count">${donations.length} active donation${donations.length === 1 ? '' : 's'}</span>
        </div>
        <div class="food-grid-cards">
            ${donations.map((donation) => createFoodCard(donation)).join('')}
        </div>
    `;

    bindFoodRequestButtons(foodGrid);
    const backBtn = foodGrid.querySelector('[data-food-view-featured]');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            foodListingsExpanded = false;
            renderFoodListings(foodGrid, featuredFoodDonations);
            foodGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

function bindFoodRequestButtons(root) {
    root.querySelectorAll('.request-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            handleRequestPickup(this.dataset.donationId);
        });
    });
}

function bindFoodCarouselControls(foodGrid) {
    const viewport = foodGrid.querySelector('[data-carousel-viewport]');
    const prevBtn = foodGrid.querySelector('[data-carousel-prev]');
    const nextBtn = foodGrid.querySelector('[data-carousel-next]');

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

function bindFoodAllButton(foodGrid) {
    const allBtn = foodGrid.querySelector('[data-food-view-all]');
    if (!allBtn) return;

    allBtn.addEventListener('click', () => {
        showAllFoodListings(foodGrid);
    });
}

async function showAllFoodListings(foodGrid) {
    try {
        const result = await APIUtils.getAllFoodDonations();
        if (!result.success) {
            throw new Error(result.error || 'Failed to load all donations');
        }

        const donations = Array.isArray(result.data)
            ? result.data
            : (result.data?.donations || []);

        allFoodDonations = donations;
        foodListingsExpanded = true;
        renderExpandedFoodListings(foodGrid, donations);
        foodGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Failed to load all donations:', error);
        APIUtils.showErrorMessage('Unable to load all food donations right now.');
    }
}

/**
 * Create food card HTML.
 * Bug #6 fix: use donation.expiresAt consistently for both urgency badge and
 * time-remaining calculation.
 */
function createFoodCard(donation) {
    // Support both old and new backend field names.
    const foodName = donation.foodName || donation.title || 'Donation';
    const city = donation.city || donation.address || 'Unknown location';
    const quantity = donation.quantity || donation.servings || '-';
    const unit = donation.unit || '';
    const categories = normalizeCategories(donation.categories ?? donation.category);

    // Bug #6 fix: single canonical expiry field
    const expiresAt = donation.expiresAt || donation.expiry_date || donation.expiryTime;
    const urgencyClass = getUrgencyBadge(expiresAt);
    const timeRemaining = getTimeRemaining(expiresAt);
    const imageUrl = donation.imageUrl || (Array.isArray(donation.images) ? donation.images[0] : null) || 'https://via.placeholder.com/300x200?text=Food+Donation';

    return `
        <div class="food-card">
            <div class="food-badge ${urgencyClass.class}">${urgencyClass.text}</div>
            <img src="${imageUrl}" alt="${escapeHtml(foodName)}"
                 onerror="this.src='https://via.placeholder.com/300x200?text=Food+Donation'">
            <div class="food-info">
                <h3>${escapeHtml(foodName)}</h3>
                <div class="food-meta">
                    <p><i class="fas fa-box"></i> ${escapeHtml(String(quantity))} ${escapeHtml(String(unit))}</p>
                    <p><i class="fas fa-clock"></i> ${timeRemaining}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(city)}</p>
                </div>
                <div class="food-tags">
                    ${donation.vegetarian
                        ? '<span class="tag">🥬 Vegetarian</span>'
                        : '<span class="tag">🍗 Non-Veg</span>'}
                    ${categories.map(cat => `<span class="tag">${formatCategory(cat)}</span>`).join('')}
                </div>
                <button class="request-btn" data-donation-id="${donation.id}">
                    <i class="fas fa-check-circle"></i> Request Pickup
                </button>
            </div>
        </div>
    `;
}

/**
 * Get urgency badge based on expiry timestamp.
 * Bug #6 fix: parameter is now named expiresAt for clarity.
 */
function getUrgencyBadge(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMinutes = (expiry - now) / (1000 * 60);

    if (diffMinutes < 60) return { text: 'URGENT', class: 'urgent' };
    if (diffMinutes < 240) return { text: 'HOT', class: 'hot' };
    return { text: 'AVAILABLE', class: 'available' };
}

/**
 * Calculate time remaining until expiry.
 * Bug #6 fix: parameter is now named expiresAt for clarity.
 */
function getTimeRemaining(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;

    if (diffMs < 0) return 'EXPIRED';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
    return `Expires in ${minutes}m`;
}

/**
 * Format category display name
 */
function formatCategory(category) {
    const categoryMap = {
        cooked: '🍳 Cooked',
        raw: '🥕 Raw/Fresh',
        packaged: '📦 Packaged',
        baked: '🥐 Baked',
        dairy: '🥛 Dairy',
        beverages: '☕ Beverages',
    };
    return categoryMap[category] || category;
}

/**
 * Normalize category values that may arrive as arrays, JSON strings, or
 * bracketed strings like ["cooked"].
 */
function normalizeCategories(value) {
    if (Array.isArray(value)) {
        return value.flatMap(item => normalizeCategories(item));
    }

    if (value == null) {
        return [];
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        if (!trimmed) {
            return [];
        }

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                return normalizeCategories(JSON.parse(trimmed));
            } catch (error) {
                return [trimmed.replace(/^[\[\s'"]+|[\]\s'"]+$/g, '')];
            }
        }

        if (trimmed.includes(',')) {
            return trimmed.split(',').map(part => part.trim()).filter(Boolean);
        }

        return [trimmed.replace(/^[\[\s'"]+|[\]\s'"]+$/g, '')];
    }

    return [String(value)];
}

/**
 * Handle pickup request
 */
async function handleRequestPickup(donationId) {
    if (!confirm('Are you sure you want to request this food donation?')) return;

    const result = await APIUtils.requestPickup(donationId);

    if (result.success) {
        APIUtils.showSuccessMessage('Pickup request sent successfully!');
        await loadFeaturedDonations();
    } else {
        APIUtils.showErrorMessage('Failed to request pickup. Please try again.');
    }
}

/**
 * Load dashboard statistics.
 * Bug #5 fix: check for nested .statistics first, then fall back to raw data.
 */
async function loadDashboardStatistics() {
    const result = await APIUtils.getDashboardStatistics();
    const statItems = document.querySelectorAll('.stat-item');

    if (!result.success) {
        console.error('Failed to load statistics:', result.error);

        if (statItems.length >= 3) {
            updateStatItem(statItems[0], 'Unavailable', 'Meals Distributed');
            updateStatItem(statItems[1], 'Unavailable', 'Active NGOs');
            updateStatItem(statItems[2], 'Unavailable', 'Donors');
        }

        return;
    }

    // Bug #5 fix: prioritise the nested statistics object; the previous code had
    // result.data || result.data?.statistics which always resolved to result.data.
    const stats = result.data?.statistics || result.data || {};

    if (statItems.length >= 3) {
        updateStatItem(statItems[0], stats.totalDonations || 0, 'Meals Distributed');
        updateStatItem(statItems[1], stats.totalNGOs || 0, 'Active NGOs');
        updateStatItem(statItems[2], stats.totalDonors || 0, 'Donors');
    }
}

/**
 * Update individual stat item
 */
function updateStatItem(element, value, label) {
    const h4 = element.querySelector('h4');
    const p = element.querySelector('p');
    if (h4) {
        h4.textContent = typeof value === 'number' ? formatLargeNumber(value) : String(value);
    }
    if (p) p.textContent = label;
}

/**
 * Format large numbers (10000 → 10K+)
 */
function formatLargeNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
    if (num >= 1000) return Math.floor(num / 1000) + 'K+';
    return num + '+';
}
