/**
 * FeedLink — Forgot Password Handler
 *
 * Relies on existing scripts (loaded before this file):
 *   api-config.js  → API_CONFIG  (endpoints, BASE_URL)
 *   api-utils.js   → APIUtils    (post, showErrorMessage, showSuccessMessage)
 *   all.js         → dark mode toggle, hamburger menu (loaded AFTER this file)
 *
 * Flow:
 *   Step 1 → POST /auth/forgot-password  { email }
 *   Step 2 → POST /auth/verify-otp       { email, otp }  → returns resetToken
 *   Step 3 → POST /auth/reset-password   { email, resetToken, newPassword }
 *   Step 4 → Success screen
 */

(function () {
    'use strict';

    /* ── State ─────────────────────────────────── */
    let userEmail  = '';
    let resetToken = '';
    let resendInterval = null;

    /* ── DOM ────────────────────────────────────── */
    const steps      = document.querySelectorAll('.step');
    const dots       = [document.getElementById('dot1'), document.getElementById('dot2'), document.getElementById('dot3')];

    const emailForm  = document.getElementById('emailForm');
    const emailInput = document.getElementById('emailInput');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const emailDisplay = document.getElementById('emailDisplay');

    const otpInputs  = document.querySelectorAll('.otp-input');
    const verifyBtn  = document.getElementById('verifyOtpBtn');
    const resendBtn  = document.getElementById('resendBtn');
    const timerEl    = document.getElementById('resendTimer');

    const resetForm    = document.getElementById('resetForm');
    const newPassInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmPassword');
    const strengthFill = document.getElementById('strengthFill');
    const strengthLabel = document.getElementById('strengthLabel');
    const resetBtn     = document.getElementById('resetBtn');

    /* ── Step navigation ────────────────────────── */
    window.goToStep = function (n) {
        steps.forEach((s, i) => s.classList.toggle('active', i + 1 === n));
        dots.forEach((d, i) => {
            d.classList.remove('active', 'done');
            if (i + 1 < n)  d.classList.add('done');
            if (i + 1 === n) d.classList.add('active');
        });
    };

    /* ── STEP 1: Send OTP ───────────────────────── */
    emailForm && emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!isValidEmail(email)) { APIUtils.showErrorMessage('Please enter a valid email address.'); return; }

        setLoading(sendOtpBtn, true, '<i class="fas fa-spinner fa-spin"></i> Sending…');
        try {
            await APIUtils.post(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }, { includeAuth: false });
            userEmail = email;
            emailDisplay.textContent = email;
            goToStep(2);
            startResendTimer(60);
            APIUtils.showSuccessMessage('Reset code sent! Check your inbox.');
        } catch (err) {
            console.error('[ForgotPwd] sendOtp:', err);
        } finally {
            setLoading(sendOtpBtn, false, '<i class="fas fa-paper-plane"></i> Send Reset Code');
        }
    });

    /* ── STEP 2: OTP inputs ─────────────────────── */
    otpInputs.forEach((inp, idx) => {
        inp.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            e.target.classList.toggle('filled', !!e.target.value);
            if (e.target.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
            checkOtpComplete();
        });

        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                otpInputs[idx - 1].value = '';
                otpInputs[idx - 1].classList.remove('filled');
                otpInputs[idx - 1].focus();
            }
        });

        inp.addEventListener('paste', (e) => {
            e.preventDefault();
            const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            [...digits].slice(0, 6).forEach((ch, i) => {
                if (otpInputs[i]) { otpInputs[i].value = ch; otpInputs[i].classList.add('filled'); }
            });
            const next = [...otpInputs].findIndex(i => !i.value);
            (otpInputs[next] || otpInputs[5]).focus();
            checkOtpComplete();
        });
    });

    function checkOtpComplete() {
        verifyBtn.disabled = ![...otpInputs].every(i => i.value.length === 1);
    }

    /* ── STEP 2: Verify OTP ─────────────────────── */
    verifyBtn && verifyBtn.addEventListener('click', async () => {
        const otp = [...otpInputs].map(i => i.value).join('');
        setLoading(verifyBtn, true, '<i class="fas fa-spinner fa-spin"></i> Verifying…');
        try {
            const res = await APIUtils.post('/auth/verify-otp', { email: userEmail, otp }, { includeAuth: false });
            resetToken = res?.data?.resetToken || res?.data?.token || '';
            clearResendTimer();
            goToStep(3);
            APIUtils.showSuccessMessage('Code verified! Set your new password.');
        } catch (err) {
            console.error('[ForgotPwd] verifyOtp:', err);
            otpInputs.forEach(i => { i.style.borderColor = '#f44336'; });
            setTimeout(() => otpInputs.forEach(i => { i.style.borderColor = ''; i.value = ''; i.classList.remove('filled'); }), 1200);
            otpInputs[0].focus();
            verifyBtn.disabled = true;
        } finally {
            setLoading(verifyBtn, false, '<i class="fas fa-check-circle"></i> Verify Code');
        }
    });

    /* ── STEP 2: Resend ─────────────────────────── */
    resendBtn && resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        try {
            await APIUtils.post(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: userEmail }, { includeAuth: false });
            APIUtils.showSuccessMessage('New code sent!');
            startResendTimer(60);
        } catch (err) {
            console.error('[ForgotPwd] resend:', err);
            resendBtn.disabled = false;
        }
    });

    function startResendTimer(secs) {
        clearResendTimer();
        let t = secs;
        resendBtn.disabled = true;
        timerEl.textContent = `(${t}s)`;
        resendInterval = setInterval(() => {
            t--;
            timerEl.textContent = `(${t}s)`;
            if (t <= 0) { clearResendTimer(); resendBtn.disabled = false; timerEl.textContent = ''; }
        }, 1000);
    }

    function clearResendTimer() {
        if (resendInterval) { clearInterval(resendInterval); resendInterval = null; }
    }

    /* ── STEP 3: Password strength ──────────────── */
    newPassInput && newPassInput.addEventListener('input', () => {
        const score = getStrength(newPassInput.value);
        const cfg = [
            { w: '0%',   c: '#e0e0e0', l: 'Enter a password' },
            { w: '25%',  c: '#f44336', l: '⚠ Weak' },
            { w: '50%',  c: '#ff9800', l: '▲ Fair' },
            { w: '75%',  c: '#2196f3', l: '◆ Good' },
            { w: '100%', c: '#4caf50', l: '✓ Strong' },
        ][score];
        strengthFill.style.width = cfg.w;
        strengthFill.style.background = cfg.c;
        strengthLabel.textContent = cfg.l;
        strengthLabel.style.color = cfg.c;
    });

    function getStrength(pwd) {
        if (!pwd) return 0;
        let s = 0;
        if (pwd.length >= 8)       s++;
        if (/[A-Z]/.test(pwd))     s++;
        if (/[0-9]/.test(pwd))     s++;
        if (/[^A-Za-z0-9]/.test(pwd)) s++;
        return s;
    }

    /* ── STEP 3: Password toggles ───────────────── */
    // .password-toggle-btn styling already in all.css — just wire the click
    document.getElementById('toggleNew')     && document.getElementById('toggleNew').addEventListener('click',     () => togglePass(newPassInput, document.getElementById('toggleNew')));
    document.getElementById('toggleConfirm') && document.getElementById('toggleConfirm').addEventListener('click', () => togglePass(confirmInput,  document.getElementById('toggleConfirm')));

    function togglePass(input, btn) {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        const icon = btn.querySelector('i');
        icon.classList.toggle('fa-eye',       !show);
        icon.classList.toggle('fa-eye-slash',  show);
    }

    /* ── STEP 3: Reset password ─────────────────── */
    resetForm && resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPwd  = newPassInput.value;
        const confPwd = confirmInput.value;

        if (newPwd.length < 8) { APIUtils.showErrorMessage('Password must be at least 8 characters.'); return; }
        if (newPwd !== confPwd) {
            APIUtils.showErrorMessage('Passwords do not match.');
            confirmInput.style.borderColor = '#f44336';
            setTimeout(() => { confirmInput.style.borderColor = ''; }, 1500);
            return;
        }

        setLoading(resetBtn, true, '<i class="fas fa-spinner fa-spin"></i> Resetting…');
        try {
            await APIUtils.post(
                API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
                { email: userEmail, resetToken, newPassword: newPwd },
                { includeAuth: false }
            );
            // Clear any stale auth data
            APIUtils.clearToken();
            APIUtils.clearUserData();
            goToStep(4);
        } catch (err) {
            console.error('[ForgotPwd] resetPassword:', err);
        } finally {
            setLoading(resetBtn, false, '<i class="fas fa-key"></i> Reset Password');
        }
    });

    /* ── Helpers ────────────────────────────────── */
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setLoading(btn, loading, html) {
        btn.disabled = loading;
        if (html) btn.innerHTML = html;
    }

})();