/**
 * FeedLink Environment Configuration
 * 
 * INSTRUCTIONS:
 * 1. Copy this file as 'env-config.js' in the same directory
 * 2. Update the API_BASE_URL to match your backend server
 * 3. Add this file to .gitignore to prevent accidental commits
 * 4. Reference this file BEFORE api-config.js in your HTML files
 * 
 * For development, you can also set these values directly in the browser console:
 * localStorage.setItem('apiBaseUrl', 'http://localhost:5000/api');
 */

// DEVELOPMENT CONFIGURATION
const ENV_CONFIG = {
    // Backend API Base URL
    API_BASE_URL: 'http://localhost:5000/api', // Change this to your backend URL

    // AI configuration for browser features like chat.html
    AI: {
        OPENROUTER_API_KEY: 'your_openrouter_api_key_here',
        OPENROUTER_MODEL: 'openai/gpt-oss-20b'
    },

    // Frontend-readable admin values
    // Keep only non-reversible values here if possible.
    ADMIN: {
        USERNAME: 'your_admin_username_here',
        CREDENTIAL_HASH: 'your_sha256_username_colon_secret_hash_here'
    },
    
    // Environment
    ENVIRONMENT: 'development', // 'development', 'staging', 'production'
    
    // Logging
    DEBUG_MODE: true, // Set to false in production
    LOG_API_CALLS: true,
    
    // Feature flags
    FEATURES: {
        GEOLOCATION: true,
        NOTIFICATIONS: true,
        FILE_UPLOAD: true,
        REAL_TIME_UPDATES: false // WebSocket updates
    },
    
    // Email configuration
    EMAIL: {
        SUPPORT: 'support@feedlink.com',
        FROM: 'noreply@feedlink.com'
    },
    
    // Map configuration
    MAP: {
        DEFAULT_ZOOM: 13,
        DEFAULT_LAT: 22.5726, // Kolkata
        DEFAULT_LNG: 88.3639
    }
};

window.ENV_CONFIG = ENV_CONFIG;

// Override API_CONFIG if env-config exists
if (window.API_CONFIG) {
    window.API_CONFIG.BASE_URL = ENV_CONFIG.API_BASE_URL;
}

// Optionally set up logging based on DEBUG_MODE
if (ENV_CONFIG.DEBUG_MODE) {
    window.LOG = {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console)
    };
} else {
    window.LOG = {
        log: () => {},
        error: () => {},
        warn: () => {},
        info: () => {}
    };
}
