/**
 * FeedLink API Configuration
 * Central configuration for all API endpoints and settings
 *
 * FIXES APPLIED:
 * - Bug #14: BASE_URL is now a getter so runtime changes to localStorage are reflected immediately
 * - Bug #18: UNFOLLOW documented to use DELETE method
 */

const API_CONFIG = {
    // Getter so runtime changes to localStorage['apiBaseUrl'] are always picked up
    get BASE_URL() {
        const localOverride = localStorage.getItem('apiBaseUrl');
        if (localOverride) {
            return localOverride;
        }

        if (typeof window !== 'undefined' && window.ENV_CONFIG && window.ENV_CONFIG.API_BASE_URL) {
            return window.ENV_CONFIG.API_BASE_URL;
        }

        // On deployed frontends (Netlify), use same-origin /api and let redirects handle backend routing.
        if (typeof window !== 'undefined') {
            const { protocol, hostname, origin } = window.location;
            const isHttp = protocol === 'http:' || protocol === 'https:';
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

            if (isHttp && !isLocal) {
                return `${origin}/api`;
            }
        }

        return 'http://localhost:5000/api';
    },

    // API Endpoints
    ENDPOINTS: {
        // Authentication
        AUTH: {
            LOGIN: '/auth/login',
            SIGNUP: '/auth/signup',
            LOGOUT: '/auth/logout',
            SEND_SIGNUP_EMAIL_OTP: '/auth/signup/send-email-otp',
            SIGNUP_EMAIL_VERIFICATION_STATUS: '/auth/signup/email-verification-status',
            VERIFY_SIGNUP_EMAIL_OTP: '/auth/signup/verify-email-otp',
            VERIFY_SIGNUP_EMAIL_LINK: '/auth/signup/verify-email-link',
            VERIFY_SIGNUP_EMAIL_SESSION: '/auth/signup/verify-email-session',
            VERIFY_EMAIL: '/auth/verify-email',
            FORGOT_PASSWORD: '/auth/forgot-password',
            RESET_PASSWORD: '/auth/reset-password',
            REFRESH_TOKEN: '/auth/refresh-token',
            CHECK_EMAIL: '/auth/check-email-exists',
            VALIDATE_TOKEN: '/auth/validate-token'
        },

        // Users & Profiles
        USERS: {
            PROFILE: '/users/profile',
            GET_USER: '/users/{id}',
            UPDATE_PROFILE: '/users/profile'
        },

        // Donations
        DONATIONS: {
            CREATE: '/donations/create',
            GET_FEATURED: '/donations/featured',
            GET_ALL: '/donations/all',
            GET_NEARBY: '/donations/nearby',
            GET_DETAIL: '/donations/{id}',
            UPDATE: '/donations/{id}',
            DELETE: '/donations/{id}',
            MY_DONATIONS: '/donations/my-donations',
            REQUEST_PICKUP: '/donations/{id}/request-pickup',
            UPLOAD_IMAGE: '/donations/upload-image',
            GET_REQUESTS: '/donations/{id}/requests'
        },

        // Second Smile Donations
        SMILE: {
            CREATE: '/smile/donate',
            GET_FEATURED: '/smile/featured',
            GET_ALL: '/smile/all',
            REQUEST_PICKUP: '/smile/{id}/request-pickup',
            DASHBOARD_STATS: '/smile/statistics/dashboard'
        },

        // NGOs
        NGOS: {
            GET_NEARBY: '/ngos/nearby',
            SEARCH: '/ngos/search',
            GET_DETAIL: '/ngos/{id}',
            // FOLLOW  → POST   /ngos/{id}/follow
            FOLLOW: '/ngos/{id}/follow',
            // UNFOLLOW → DELETE /ngos/{id}/follow  (same URL, different HTTP method)
            UNFOLLOW: '/ngos/{id}/follow',
            GET_STATISTICS: '/ngos/{id}/statistics'
        },

        // Volunteers
        VOLUNTEERS: {
            LIST: '/volunteers',
            CREATE: '/volunteers/join',
            GET_DETAIL: '/volunteers/{id}',
            UPDATE: '/volunteers/{id}',
            DELETE: '/volunteers/{id}',
            BY_CITY: '/volunteers/city/{city}',
            BY_ROLE: '/volunteers/role/{role}'
        },

        // Statistics
        STATISTICS: {
            DASHBOARD: '/statistics/dashboard',
            USER: '/statistics/user/{id}',
            NGO: '/statistics/ngo/{id}'
        },

        // Newsletter
        NEWSLETTER: {
            SUBSCRIBE: '/newsletter/subscribe',
            UNSUBSCRIBE: '/newsletter/unsubscribe'
        }
    },

    // HTTP Headers
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },

    // Single source-of-truth token/user keys — used everywhere
    TOKEN_KEY: 'feedlink_auth_token',
    USER_KEY: 'feedlink_user_data',

    // Request timeout (ms)
    TIMEOUT: 10000,

    // Geolocation settings
    GEOLOCATION: {
        TIMEOUT: 10000,
        MAX_AGE: 0,
        ENABLE_HIGH_ACCURACY: true
    }
};

// Make it globally available
window.API_CONFIG = API_CONFIG;
