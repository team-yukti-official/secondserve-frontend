/**
 * Local runtime config for browser pages.
 *
 * This file is generated from local secrets for development use and is ignored
 * by git. In a static site, the browser cannot read `.env` directly, so values
 * needed by frontend code must be bridged through a JS file like this.
 */

const ENV_CONFIG = {
    // Update this URL to your Render backend: https://feedlink-backend.onrender.com/api
    API_BASE_URL: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api'
        : 'https://feedlink-backend.onrender.com/api',
    ENVIRONMENT: typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'development' : 'production',
    DEBUG_MODE: typeof window !== 'undefined' && window.location.hostname === 'localhost',
    LOG_API_CALLS: typeof window !== 'undefined' && window.location.hostname === 'localhost',
    FEATURES: {
        GEOLOCATION: true,
        NOTIFICATIONS: true,
        FILE_UPLOAD: true,
        REAL_TIME_UPDATES: false
    },
    EMAIL: {
        SUPPORT: 'support@secondserve.com',
        FROM: 'noreply@secondserve.com'
    },
    MAP: {
        DEFAULT_ZOOM: 13,
        DEFAULT_LAT: 22.5726,
        DEFAULT_LNG: 88.3639
    },
    AI: {
        OPENROUTER_API_KEY: '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',
        OPENROUTER_MODEL: 'openai/gpt-oss-20b'
    },
    ADMIN: {
        USERNAME: 'secondserveadmin@2025',
        CREDENTIAL_HASH: '2a4daea8aecf1c1a0b8a985c408f9ef978ede9b3aba8d5e866e838f3d2303a22'
    }
};

window.ENV_CONFIG = ENV_CONFIG;

window.LOG = ENV_CONFIG.DEBUG_MODE
    ? {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console)
    }
    : {
        log: () => {},
        error: () => {},
        warn: () => {},
        info: () => {}
    };
