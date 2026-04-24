/**
 * FeedLink API Utilities
 * Helper functions for API calls, error handling, and response management
 *
 * FIXES APPLIED:
 * - Bug #17: Removed pointless try-catch re-throws in login() and signup()
 * (error handling is already done inside this.post / this.fetch)
 */

class APIError extends Error {
    constructor(status, message, details = null) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'APIError';
    }
}

const APIUtils = {
    /**
     * Get authorization token from storage
     */
    getToken() {
        return sessionStorage.getItem(API_CONFIG.TOKEN_KEY);
    },

    /**
     * Save authorization token to storage
     */
    setToken(token) {
        if (token) {
            sessionStorage.setItem(API_CONFIG.TOKEN_KEY, token);
        }
    },

    /**
     * Remove authorization token from storage
     */
    clearToken() {
        sessionStorage.removeItem(API_CONFIG.TOKEN_KEY);
    },

    /**
     * Save user data to storage
     */
    setUserData(user) {
        if (user) {
            sessionStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(user));
        }
    },

    /**
     * Get user data from storage
     */
    getUserData() {
        const data = sessionStorage.getItem(API_CONFIG.USER_KEY);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Clear user data from storage
     */
    clearUserData() {
        sessionStorage.removeItem(API_CONFIG.USER_KEY);
        localStorage.removeItem(API_CONFIG.USER_KEY);
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Logout user (clear token and user data)
     */
    logout() {
        this.clearToken();
        this.clearUserData();
    },

    /**
     * Build headers with authentication
     */
    getHeaders(includeAuth = true, isFormData = false) {
        const headers = { ...API_CONFIG.HEADERS };

        if (isFormData) {
            delete headers['Content-Type'];
        }

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    },

    /**
     * Generic fetch wrapper with error handling
     */
    async fetch(url, options = {}) {
        const {
            method = 'GET',
            body = null,
            includeAuth = true,
            isFormData = false,
            showError = true,
            timeout = API_CONFIG.TIMEOUT
        } = options;

        // Build full URL
        const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;

        // Build request options
        const fetchOptions = {
            method,
            headers: this.getHeaders(includeAuth, isFormData)
        };

        // Add body if provided
        if (body) {
            if (isFormData) {
                fetchOptions.body = body;
            } else {
                fetchOptions.body = JSON.stringify(body);
            }
        }

        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        fetchOptions.signal = controller.signal;

        try {
            const response = await fetch(fullUrl, fetchOptions);
            clearTimeout(timeoutId);

            // Parse response
            const contentType = response.headers.get('content-type');
            const data = contentType && contentType.includes('application/json')
                ? await response.json()
                : await response.text();

            // Handle error responses
            if (!response.ok) {
                const errorMessage = data?.message || data?.error || `HTTP ${response.status}`;
                const error = new APIError(response.status, errorMessage, data);

                if (showError) {
                    this.showErrorMessage(errorMessage);
                }

                throw error;
            }

            return {
                success: true,
                status: response.status,
                data: data
            };

        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof APIError) {
                throw error;
            }

            // Handle network errors
            if (error.name === 'AbortError') {
                const timeoutError = new APIError(408, 'Request timeout. Please try again.');
                if (showError) {
                    this.showErrorMessage('Request timeout. Please try again.');
                }
                throw timeoutError;
            }

            // Handle other errors
            const networkError = new APIError(0, 'Network error. Please check your connection.');
            if (showError) {
                this.showErrorMessage('Network error. Please check your connection.');
            }
            throw networkError;
        }
    },

    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        return this.fetch(endpoint, { method: 'GET', ...options });
    },

    /**
     * POST request
     */
    async post(endpoint, body = null, options = {}) {
        return this.fetch(endpoint, { method: 'POST', body, ...options });
    },

    /**
     * PUT request
     */
    async put(endpoint, body = null, options = {}) {
        return this.fetch(endpoint, { method: 'PUT', body, ...options });
    },

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.fetch(endpoint, { method: 'DELETE', ...options });
    },

    /**
     * POST with FormData (for file uploads)
     */
    async postFormData(endpoint, formData, options = {}) {
        return this.fetch(endpoint, {
            method: 'POST',
            body: formData,
            isFormData: true,
            ...options
        });
    },

    /**
     * Login user
     * Bug #17 fix: removed pointless try-catch re-throw wrapper
     */
    async login(email, password, userType) {
        const result = await this.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
            email,
            password,
            userType
        });

        if (result.data && result.data.token) {
            this.setToken(result.data.token);
            this.setUserData(result.data.user);
        }

        return result;
    },

    /**
     * Signup user
     * Bug #17 fix: removed pointless try-catch re-throw wrapper
     */
    async signup(userData) {
        const result = await this.post(API_CONFIG.ENDPOINTS.AUTH.SIGNUP, userData);

        if (result.data && result.data.token) {
            this.setToken(result.data.token);
            this.setUserData(result.data.user);
        }

        return result;
    },

    /**
     * Unfollow NGO — uses DELETE (same URL as follow but different method)
     * Bug #18 fix: explicit method to make the DELETE intent clear
     */
    async unfollowNGO(ngoId) {
        const url = APIUtils.buildUrl(API_CONFIG.ENDPOINTS.NGOS.UNFOLLOW, { id: ngoId });
        return this.delete(url);
    },

    /**
     * Show error message to user
     */
    showErrorMessage(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            const notification = document.createElement('div');
            notification.className = 'api-error-notification';
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f44336;
                color: white;
                padding: 16px 24px;
                border-radius: 4px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 10000;
                font-size: 14px;
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 4000);
        }
    },

    /**
     * Show success message to user
     */
    showSuccessMessage(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            const notification = document.createElement('div');
            notification.className = 'api-success-notification';
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4caf50;
                color: white;
                padding: 16px 24px;
                border-radius: 4px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 10000;
                font-size: 14px;
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    },

    /**
     * Replace URL parameters
     */
    buildUrl(template, params = {}) {
        let url = template;
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        return url;
    }
};

// Make it globally available
window.APIUtils = APIUtils;
