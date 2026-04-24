/**
 * FeedLink Shared Utilities
 * Functions used across multiple pages — load this before page-specific scripts.
 *
 * FIXES APPLIED:
 * - Bug #16: escapeHtml() was duplicated in index-handler.js AND find-ngo-handler.js.
 *   Both definitions have been removed and the single canonical version lives here.
 *   Load shared-utils.js in every HTML page that needs it (before other scripts).
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Make available globally (for inline onclick handlers in templates)
window.escapeHtml = escapeHtml;
