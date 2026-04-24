/**
 * Extended API Functions for FeedLink
 * Adds additional API methods to the existing APIUtils
 *
 * FIXES APPLIED:
 * - Bug #1: Removed the conflicting second definition of getNearbyNGOs that was
 *   in api.js (which accepted a plain data object). This file is the single
 *   authoritative version and uses the correct (latitude, longitude, radius) signature.
 * - Bug #2: api.js has been replaced by this file entirely. All methods previously
 *   duplicated in api.js are now only here, properly extending APIUtils.
 */

// Ensure APIUtils exists (defined in api-utils.js)
if (typeof APIUtils === 'undefined') {
    console.error('APIUtils not defined. Make sure api-utils.js is loaded first.');
}

// Add extended methods to APIUtils
Object.assign(APIUtils, {
    /**
     * Normalize a donation expiry timestamp from available backend fields.
     */
    getDonationExpiry(donation) {
        if (!donation) return null;

        if (donation.expiresAt) return donation.expiresAt;
        if (donation.expiryTime && donation.expiryDate) {
            return `${donation.expiryDate}T${donation.expiryTime}`;
        }
        if (donation.expiryTime) return donation.expiryTime;
        if (donation.expiryDate) return donation.expiryDate;

        return null;
    },

    /**
     * Check whether a donation has already expired.
     */
    isDonationExpired(donation) {
        const expiryValue = this.getDonationExpiry(donation);
        if (!expiryValue) return false;

        const expiry = new Date(expiryValue);
        if (Number.isNaN(expiry.getTime())) return false;

        return expiry.getTime() <= Date.now();
    },

    /**
     * Delete a donation using the available backend route.
     */
    async deleteDonationById(donationId) {
        if (!donationId) {
            return { success: false, error: 'Missing donation id' };
        }

        const routes = [
            APIUtils.buildUrl(API_CONFIG.ENDPOINTS.DONATIONS.DELETE, { id: donationId }),
            `/food/${donationId}`,
        ];

        for (const route of routes) {
            try {
                return await this.delete(route, { showError: false });
            } catch (error) {
                // Try the next known route before giving up.
                console.warn(`Delete failed for ${route}:`, error.message);
            }
        }

        return { success: false, error: 'Failed to delete expired donation' };
    },

    /**
     * Delete expired donations and return only active donations for rendering.
     */
    async purgeExpiredDonations(donations = []) {
        const expired = [];
        const active = [];

        donations.forEach((donation) => {
            if (this.isDonationExpired(donation)) {
                expired.push(donation);
            } else {
                active.push(donation);
            }
        });

        if (!expired.length) {
            return { activeDonations: active, deletedCount: 0 };
        }

        const results = await Promise.allSettled(
            expired.map((donation) => this.deleteDonationById(donation.id))
        );

        const deletedCount = results.filter(
            (result) => result.status === 'fulfilled' && result.value?.success
        ).length;

        return {
            activeDonations: active,
            deletedCount,
            expiredCount: expired.length
        };
    },

    /**
     * Fetch featured food donations
     */
    async getFeaturedDonations() {
        try {
            return await this.get('/food/featured', { showError: false });
        } catch (error) {
            console.error('Error fetching featured donations:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch all available food donations
     */
    async getAllFoodDonations() {
        try {
            return await this.get(API_CONFIG.ENDPOINTS.DONATIONS.GET_ALL, { showError: false });
        } catch (error) {
            console.error('Error fetching all donations:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch nearby donations by coordinates
     */
    async getNearbyDonations(latitude, longitude, radius = 10) {
        try {
            return await this.get(
                `/food/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`,
                { showError: false }
            );
        } catch (error) {
            console.error('Error fetching nearby donations:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch dashboard statistics
     */
    async getDashboardStatistics() {
        try {
            const cacheBust = Date.now();
            return await this.get(`/food/statistics/dashboard?_=${cacheBust}`, { showError: false });
        } catch (error) {
            console.error('Error fetching statistics:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Request food pickup
     */
    async requestPickup(donationId) {
        try {
            return await this.post(`/food/${donationId}/request-pickup`, {});
        } catch (error) {
            console.error('Error requesting pickup:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Create food donation
     */
    async createDonation(donationData) {
        try {
            return await this.post('/food/donate', donationData);
        } catch (error) {
            console.error('Error creating donation:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Create Second Smile donation with optional image upload.
     */
    async createSmileDonation(formData) {
        try {
            return await this.postFormData(API_CONFIG.ENDPOINTS.SMILE.CREATE, formData);
        } catch (error) {
            console.error('Error creating smile donation:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch featured Second Smile donations.
     */
    async getSmileFeaturedDonations() {
        try {
            return await this.get(API_CONFIG.ENDPOINTS.SMILE.GET_FEATURED, { showError: false });
        } catch (error) {
            console.error('Error fetching smile donations:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch all Second Smile donations.
     */
    async getAllSmileDonations() {
        try {
            try {
                return await this.get(API_CONFIG.ENDPOINTS.SMILE.GET_ALL, { showError: false });
            } catch (error) {
                console.warn('Smile all endpoint unavailable, falling back to featured donations:', error.message);
                return await this.getSmileFeaturedDonations();
            }
        } catch (error) {
            console.error('Error fetching all smile donations:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch Second Smile dashboard statistics.
     */
    async getSmileStatistics() {
        try {
            const cacheBust = Date.now();
            return await this.get(`${API_CONFIG.ENDPOINTS.SMILE.DASHBOARD_STATS}?_=${cacheBust}`, { showError: false });
        } catch (error) {
            console.error('Error fetching smile statistics:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Request pickup for a Second Smile donation.
     */
    async requestSmilePickup(donationId, message = '') {
        try {
            const endpoint = APIUtils.buildUrl(API_CONFIG.ENDPOINTS.SMILE.REQUEST_PICKUP, { id: donationId });
            return await this.post(endpoint, { message });
        } catch (error) {
            console.error('Error requesting smile pickup:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get NGOs nearby — Bug #1 fix: single authoritative definition,
     * uses (latitude, longitude, radius) params (not a plain object).
     */
    async getNearbyNGOs(latitude, longitude, radius = 10) {
        try {
            return await this.get(
                `/ngos/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`,
                { showError: false }
            );
        } catch (error) {
            console.error('Error fetching nearby NGOs:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get nearby Donors based on coordinates
     */
    async getNearbyDonors(data) {
        try {
            return await this.post('/users/nearby-donors', data, { showError: false });
        } catch (error) {
            console.error('Error fetching nearby donors:', error);
            return { success: false, error: error.message };
        }
    },
});
