const PAGE_TRANSITION_DURATION = 420;

function getPageSlug(url) {
    try {
        const pageUrl = new URL(url, window.location.href);
        const parts = pageUrl.pathname.split('/').filter(Boolean);
        const lastPart = parts[parts.length - 1] || '';
        return lastPart.toLowerCase();
    } catch (error) {
        return '';
    }
}

function shouldUseHeartTransition(fromUrl, toUrl) {
    const fromPage = getPageSlug(fromUrl);
    const toPage = getPageSlug(toUrl);

    return (
        (fromPage === 'index.html' && toPage === 'heart.html') ||
        (fromPage === 'heart.html' && toPage === 'heart-donate.html') ||
        (fromPage === 'heart-donate.html' && toPage === 'heart.html')
    );
}

function setPageTransitionTheme(fromUrl, toUrl) {
    const isHeartTheme = shouldUseHeartTransition(fromUrl, toUrl);

    document.documentElement.classList.toggle('page-transition-heart', isHeartTheme);

    if (document.body) {
        document.body.classList.toggle('page-transition-heart', isHeartTheme);
    }
}

function hidePageLoader() {
    document.documentElement.classList.remove('page-is-entering');
    document.documentElement.classList.remove('page-is-leaving');
    document.documentElement.classList.remove('page-transition-heart');
    document.documentElement.classList.add('page-ready');

    if (document.body) {
        document.body.classList.remove('page-transitioning');
        document.body.classList.remove('page-transition-heart');
    }
}

function showPageLoader() {
    document.documentElement.classList.remove('page-ready');
    document.documentElement.classList.add('page-is-leaving');

    if (document.body) {
        document.body.classList.add('page-transitioning');
    }
}

function shouldHandleNavigation(link) {
    if (!link) return false;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

    const destination = new URL(link.href, window.location.href);
    return destination.origin === window.location.origin;
}

function startPageTransition(url) {
    if (!url) return;

    setPageTransitionTheme(window.location.href, url);
    showPageLoader();
    window.setTimeout(() => {
        window.location.href = url;
    }, PAGE_TRANSITION_DURATION);
}

window.startPageTransition = startPageTransition;

function getStoredValue(key) {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
}

function getAuthToken() {
    if (window.APIUtils && typeof APIUtils.getToken === 'function') {
        return APIUtils.getToken() || localStorage.getItem('feedlink_auth_token');
    }
    return getStoredValue('feedlink_auth_token');
}

function getAuthUserName() {
    const explicitName = getStoredValue('userName');
    if (explicitName) return explicitName;

    const userJson = getStoredValue('feedlink_user_data');
    if (!userJson) return null;

    try {
        const user = JSON.parse(userJson);
        return user?.full_name || user?.fullName || user?.name || null;
    } catch (error) {
        return null;
    }
}

function getAuthUserType() {
    const explicitType = getStoredValue('userType');
    if (explicitType) return explicitType;

    const userJson = getStoredValue('feedlink_user_data');
    if (!userJson) return null;

    try {
        const user = JSON.parse(userJson);
        return user?.userType || null;
    } catch (error) {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Check for saved user preference in localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';

    // Apply saved theme immediately on page load
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (darkModeToggle) {
            const icon = darkModeToggle.querySelector('i');
            if (icon) icon.classList.replace('fa-moon', 'fa-sun');
        }
    } else {
        body.classList.remove('dark-mode');
        if (darkModeToggle) {
            const icon = darkModeToggle.querySelector('i');
            if (icon) icon.classList.replace('fa-sun', 'fa-moon');
        }
    }

    // Helper: send current theme to chat iframe
    function syncThemeToChat(theme) {
        const chatIframe = document.querySelector('#chat-overlay iframe');
        if (chatIframe && chatIframe.contentWindow) {
            chatIframe.contentWindow.postMessage({ type: 'setTheme', theme: theme }, '*');
        }
    }

    // Toggle Theme on Button Click
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            body.classList.toggle('dark-mode');

            const icon = darkModeToggle.querySelector('i');
            const isDarkMode = body.classList.contains('dark-mode');

            if (isDarkMode) {
                localStorage.setItem('theme', 'dark');
                if (icon) icon.classList.replace('fa-moon', 'fa-sun');
                syncThemeToChat('dark');
            } else {
                localStorage.setItem('theme', 'light');
                if (icon) icon.classList.replace('fa-sun', 'fa-moon');
                syncThemeToChat('light');
            }
        });
    }

    // Sync dark mode across browser tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'theme') {
            if (e.newValue === 'dark') {
                body.classList.add('dark-mode');
                if (darkModeToggle) {
                    const icon = darkModeToggle.querySelector('i');
                    if (icon) icon.classList.replace('fa-moon', 'fa-sun');
                }
            } else {
                body.classList.remove('dark-mode');
                if (darkModeToggle) {
                    const icon = darkModeToggle.querySelector('i');
                    if (icon) icon.classList.replace('fa-sun', 'fa-moon');
                }
            }
        }
    });

    // ============================================
    // AUTHENTICATION UI HANDLER
    // ============================================
    updateAuthUI();

    // Listen for auth changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'feedlink_auth_token' || e.key === 'feedlink_user_data' || e.key === 'userName' || e.key === 'userType') {
            updateAuthUI();
        }
    });

    // ===== HAMBURGER MENU =====
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('open');
            hamburgerBtn.classList.toggle('open', isOpen);
            hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
        });

        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                hamburgerBtn.classList.remove('open');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar')) {
                navMenu.classList.remove('open');
                hamburgerBtn.classList.remove('open');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                navMenu.classList.remove('open');
                hamburgerBtn.classList.remove('open');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    document.querySelectorAll('a[href]').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (event.defaultPrevented) return;
            if (event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (!shouldHandleNavigation(link)) return;

            const destination = new URL(link.href, window.location.href);
            const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const nextUrl = `${destination.pathname}${destination.search}${destination.hash}`;

            if (currentUrl === nextUrl) {
                setPageTransitionTheme(window.location.href, destination.href);
                showPageLoader();
                return;
            }

            event.preventDefault();
            startPageTransition(destination.href);
        });
    });

    window.addEventListener('pageshow', hidePageLoader);
    window.setTimeout(hidePageLoader, 120);

});

/**
 * Update navbar based on authentication status
 */
function updateAuthUI() {
    const authToken = getAuthToken();
    const userName = getAuthUserName();
    const userType = getAuthUserType();
    const loginBtn = document.querySelector('.login-btn');

    if (!loginBtn) return;

    if (authToken && userName) {
        // Logged in UI
        loginBtn.innerHTML = `
            <i class="fas fa-user"></i> ${userName}
        `;

        // REMOVE dropdown behavior
        loginBtn.onclick = (e) => {
            e.preventDefault();

            const routes = {
                donor: 'donor-dashboard.html',
                ngo: 'ngo-dashboard.html'
            };

            window.location.href = routes[userType] || 'login.html';
        };

    } else {
        // Not logged in — restore icon + original label for this page
        const label = loginBtn.dataset.label || 'Join';
        loginBtn.innerHTML = `<i class="fas fa-user"></i> ${label}`;
        loginBtn.onclick = null;
        loginBtn.href = 'login.html';
    }
}


/**
 * Handle logout
 */
function handleLogout(event) {
    event.preventDefault();

    if (confirm('Are you sure you want to logout?')) {
        const keys = ['feedlink_auth_token', 'feedlink_user_data', 'userName', 'userEmail', 'userType'];
        keys.forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        alert('Logged out successfully!');
        window.location.href = 'index.html';
    }
}
// chat-bot
document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("chat-toggle");
    const overlay = document.getElementById("chat-overlay");

    // Guard: if elements don't exist on this page, do nothing
    if (!toggle || !overlay) return;

    toggle.onclick = () => {
        const isOpen = overlay.style.display === "block";
        overlay.style.display = isOpen ? "none" : "block";
        toggle.classList.toggle('open', !isOpen);
        if (!isOpen) {
            // Sync current FeedLink theme to chat iframe on open
            const currentTheme = localStorage.getItem('theme') || 'light';
            const chatIframe = overlay.querySelector('iframe');
            if (chatIframe && chatIframe.contentWindow) {
                chatIframe.contentWindow.postMessage({ type: 'setTheme', theme: currentTheme }, '*');
            }
        }
    };

    // Close from iframe message + theme sync from chat iframe
    window.addEventListener("message", function (event) {
        if (event.data === "closeFeedlinkChat") {
            overlay.style.display = "none";
            toggle.classList.remove('open');
        }
        // Chat iframe toggled its own theme → sync FeedLink dark mode
        if (event.data && event.data.type === "themeChange") {
            const newTheme = event.data.theme;
            const isDark = newTheme === "dark";
            const bodyEl = document.body;
            const dmToggle = document.getElementById('darkModeToggle');
            if (isDark) {
                bodyEl.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
                if (dmToggle) {
                    const icon = dmToggle.querySelector('i');
                    if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
                }
            } else {
                bodyEl.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
                if (dmToggle) {
                    const icon = dmToggle.querySelector('i');
                    if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
                }
            }
        }
    });
});
