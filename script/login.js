/**
 * FeedLink Login Form Handler
 * Manages user authentication and login process
 *
 * FIXES APPLIED:
 * - Uses APIUtils.login() so token/user data are stored consistently.
 * - Respects redirectAfterLogin for protected routes before falling back to dashboards.
 */

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const userTypeSelect = document.getElementById('userType');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('passwordInput');
    const submitBtn = document.querySelector('.login-submit');
    const emailInput = document.querySelector('input[type="email"]');
    const dashboardRoutes = {
        admin: 'admin-dashboard.html',
        donor: 'donor-dashboard.html',
        ngo: 'ngo-dashboard.html'
    };

    function getPostLoginDestination(userType) {
        const fallback = dashboardRoutes[userType] || 'index.html';
        const storedRedirect = sessionStorage.getItem('redirectAfterLogin');

        if (!storedRedirect) {
            return fallback;
        }

        sessionStorage.removeItem('redirectAfterLogin');

        try {
            const url = new URL(storedRedirect, window.location.href);
            const parts = url.pathname.split('/').filter(Boolean);
            const fileName = parts[parts.length - 1];

            if (!fileName || /^(login|signup)\.html$/i.test(fileName)) {
                return fallback;
            }

            return `${fileName}${url.search}${url.hash}`;
        } catch (error) {
            return fallback;
        }
    }

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function (e) {
            e.preventDefault();
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const userType = userTypeSelect.value;
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!userType) {
                APIUtils.showErrorMessage('Please select your role');
                return;
            }
            if (!email) {
                APIUtils.showErrorMessage('Please enter your email');
                return;
            }
            if (!password) {
                APIUtils.showErrorMessage('Please enter your password');
                return;
            }

            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;

            try {
                const result = await APIUtils.login(email, password, userType);

                if (result && result.success) {
                    const user = result.data?.user || {};
                    sessionStorage.setItem('userType', user.userType || userType);
                    sessionStorage.setItem('userName', user.full_name || user.fullName || email.split('@')[0]);
                    sessionStorage.setItem('userEmail', user.email || email);

                    APIUtils.showSuccessMessage('Login successful! Redirecting...');

                    const destination = getPostLoginDestination(user.userType || userType);
                    setTimeout(() => {
                        window.location.href = destination;
                    }, 800);
                } else {
                    APIUtils.showErrorMessage(result?.data?.message || 'Login failed. Please check your credentials.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Login error:', error);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
