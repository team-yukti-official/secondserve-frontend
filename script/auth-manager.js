/**
 * FeedLink Authentication Manager
 * Handles authentication checks, redirects, and session management
 *
 * FIXES APPLIED:
 * - Bug #10: validateSession now uses optional chaining (?.) so it doesn't crash
 *   when response.data is undefined or null.
 */

class AuthManager {
    /**
     * Check if user is logged in
     */
    static isLoggedIn() {
        return APIUtils.isAuthenticated();
    }

    /**
     * Get current user data
     */
    static getCurrentUser() {
        return APIUtils.getUserData();
    }

    /**
     * Get current user type (donor, ngo, or admin)
     */
    static getUserType() {
        const user = this.getCurrentUser();
        return user?.userType || null;
    }

    /**
     * Require authentication — redirect to login if not authenticated
     */
    static requireAuth() {
        if (!this.isLoggedIn()) {
            // Store the current page to redirect back after login
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    /**
     * Require specific user type
     */
    static requireUserType(userType) {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }

        const currentUserType = this.getUserType();
        if (currentUserType !== userType) {
            APIUtils.showErrorMessage(`This page is for ${userType}s only`);
            window.location.href = 'index.html';
            return false;
        }

        return true;
    }

    /**
     * Logout and redirect to login page
     */
    static logout() {
        APIUtils.logout();
        APIUtils.showSuccessMessage('Logged out successfully');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }

    /**
     * Validate session token with server
     * Bug #10 fix: use optional chaining so response.data being undefined
     * doesn't throw a TypeError.
     */
    static async validateSession() {
        try {
            const response = await APIUtils.get(
                API_CONFIG.ENDPOINTS.AUTH.VALIDATE_TOKEN,
                { showError: false }
            );

            if (!response?.data?.valid) {
                this.logout();
                return false;
            }

            return true;

        } catch (error) {
            // If validation fails, logout user
            this.logout();
            return false;
        }
    }

    /**
     * Refresh authentication token
     */
    static async refreshToken() {
        try {
            const response = await APIUtils.post(
                API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
                {},
                { showError: false }
            );

            if (response?.data?.token) {
                APIUtils.setToken(response.data.token);
                return true;
            }

            return false;

        } catch (error) {
            return false;
        }
    }

    /**
     * Setup auto-logout on token expiry
     */
    static setupTokenRefresh(interval = 3600000) { // 1 hour
        setInterval(async () => {
            const refreshed = await this.refreshToken();
            if (!refreshed) {
                this.logout();
            }
        }, interval);
    }

    /**
     * Add authentication check on page load
     */
    static checkAuthOnLoad() {
        if (this.isLoggedIn()) {
            this.validateSession();
        }
    }
}

// Make it globally available
window.AuthManager = AuthManager;

// Auto-check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.checkAuthOnLoad();
});
