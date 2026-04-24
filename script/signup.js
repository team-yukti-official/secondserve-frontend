document.addEventListener('DOMContentLoaded', function () {

    /* ── Temporary flag to disable OTP verification ────────────────────── */
    const OTP_VERIFICATION_DISABLED = true;

    /* ── DOM refs ───────────────────────────────────────────────────────── */
    const passwordInput         = document.getElementById('password');
    const confirmPasswordInput  = document.getElementById('confirmPassword');
    const passwordToggle        = document.getElementById('passwordToggle');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    const fullNameInput         = document.getElementById('fullName');
    const emailInput            = document.getElementById('email');
    const cityInput             = document.getElementById('city');
    const phoneInput            = document.getElementById('phone');
    const userTypeSelect        = document.getElementById('userType');
    const donorTypeField        = document.getElementById('donorTypeField');
    const donorTypeSelect       = document.getElementById('donorType');
    const signupForm            = document.getElementById('signupForm');
    const submitBtn             = document.querySelector('.signup-submit');
    const useLocationBtn        = document.getElementById('useLocationBtn');
    const latitudeInput         = document.getElementById('latitude');
    const longitudeInput        = document.getElementById('longitude');
    const locationStatus        = document.getElementById('locationStatus');

    /* OTP UI refs */
    const sendEmailOtpBtn    = document.getElementById('sendEmailOtpBtn');
    const emailOtpSection    = document.getElementById('emailOtpSection');
    const emailOtpBoxes      = emailOtpSection.querySelectorAll('.otp-box');
    const verifyEmailOtpBtn  = document.getElementById('verifyEmailOtpBtn');
    const emailOtpStatus     = document.getElementById('emailOtpStatus');
    const emailResend        = document.getElementById('emailResend');

    /* Country code refs */
    const countryCodeBtn     = document.getElementById('countryCodeBtn');
    const countryDropdown    = document.getElementById('countryDropdown');
    const ccSearch           = document.getElementById('ccSearch');
    const ccList             = document.getElementById('ccList');
    const selectedFlag       = document.getElementById('selectedFlag');
    const selectedCode       = document.getElementById('selectedCode');
    const countryCodeHidden  = document.getElementById('countryCode');

    /* State */
    let emailVerified = false;
    let emailVerificationRequired = true;
    let emailVerificationToken = '';
    let emailResendInterval = null;

    /* ================================================================
       COUNTRY LIST
       ================================================================ */
    const COUNTRIES = [
        { flag:'🇦🇫', name:'Afghanistan',           code:'+93'  },
        { flag:'🇦🇱', name:'Albania',               code:'+355' },
        { flag:'🇩🇿', name:'Algeria',               code:'+213' },
        { flag:'🇦🇷', name:'Argentina',             code:'+54'  },
        { flag:'🇦🇲', name:'Armenia',               code:'+374' },
        { flag:'🇦🇺', name:'Australia',             code:'+61'  },
        { flag:'🇦🇹', name:'Austria',               code:'+43'  },
        { flag:'🇦🇿', name:'Azerbaijan',            code:'+994' },
        { flag:'🇧🇭', name:'Bahrain',               code:'+973' },
        { flag:'🇧🇩', name:'Bangladesh',            code:'+880' },
        { flag:'🇧🇾', name:'Belarus',               code:'+375' },
        { flag:'🇧🇪', name:'Belgium',               code:'+32'  },
        { flag:'🇧🇷', name:'Brazil',                code:'+55'  },
        { flag:'🇧🇳', name:'Brunei',                code:'+673' },
        { flag:'🇧🇬', name:'Bulgaria',              code:'+359' },
        { flag:'🇨🇦', name:'Canada',                code:'+1'   },
        { flag:'🇨🇱', name:'Chile',                 code:'+56'  },
        { flag:'🇨🇳', name:'China',                 code:'+86'  },
        { flag:'🇨🇴', name:'Colombia',              code:'+57'  },
        { flag:'🇨🇷', name:'Costa Rica',            code:'+506' },
        { flag:'🇭🇷', name:'Croatia',               code:'+385' },
        { flag:'🇨🇾', name:'Cyprus',                code:'+357' },
        { flag:'🇨🇿', name:'Czech Republic',        code:'+420' },
        { flag:'🇩🇰', name:'Denmark',               code:'+45'  },
        { flag:'🇪🇬', name:'Egypt',                 code:'+20'  },
        { flag:'🇪🇪', name:'Estonia',               code:'+372' },
        { flag:'🇪🇹', name:'Ethiopia',              code:'+251' },
        { flag:'🇫🇮', name:'Finland',               code:'+358' },
        { flag:'🇫🇷', name:'France',                code:'+33'  },
        { flag:'🇬🇪', name:'Georgia',               code:'+995' },
        { flag:'🇩🇪', name:'Germany',               code:'+49'  },
        { flag:'🇬🇭', name:'Ghana',                 code:'+233' },
        { flag:'🇬🇷', name:'Greece',                code:'+30'  },
        { flag:'🇬🇹', name:'Guatemala',             code:'+502' },
        { flag:'🇭🇰', name:'Hong Kong',             code:'+852' },
        { flag:'🇭🇺', name:'Hungary',               code:'+36'  },
        { flag:'🇮🇸', name:'Iceland',               code:'+354' },
        { flag:'🇮🇳', name:'India',                 code:'+91'  },
        { flag:'🇮🇩', name:'Indonesia',             code:'+62'  },
        { flag:'🇮🇷', name:'Iran',                  code:'+98'  },
        { flag:'🇮🇶', name:'Iraq',                  code:'+964' },
        { flag:'🇮🇪', name:'Ireland',               code:'+353' },
        { flag:'🇮🇱', name:'Israel',                code:'+972' },
        { flag:'🇮🇹', name:'Italy',                 code:'+39'  },
        { flag:'🇯🇵', name:'Japan',                 code:'+81'  },
        { flag:'🇯🇴', name:'Jordan',                code:'+962' },
        { flag:'🇰🇿', name:'Kazakhstan',            code:'+7'   },
        { flag:'🇰🇪', name:'Kenya',                 code:'+254' },
        { flag:'🇰🇼', name:'Kuwait',                code:'+965' },
        { flag:'🇱🇻', name:'Latvia',                code:'+371' },
        { flag:'🇱🇧', name:'Lebanon',               code:'+961' },
        { flag:'🇱🇹', name:'Lithuania',             code:'+370' },
        { flag:'🇱🇺', name:'Luxembourg',            code:'+352' },
        { flag:'🇲🇾', name:'Malaysia',              code:'+60'  },
        { flag:'🇲🇻', name:'Maldives',              code:'+960' },
        { flag:'🇲🇹', name:'Malta',                 code:'+356' },
        { flag:'🇲🇽', name:'Mexico',                code:'+52'  },
        { flag:'🇲🇩', name:'Moldova',               code:'+373' },
        { flag:'🇲🇳', name:'Mongolia',              code:'+976' },
        { flag:'🇲🇦', name:'Morocco',               code:'+212' },
        { flag:'🇲🇲', name:'Myanmar',               code:'+95'  },
        { flag:'🇳🇵', name:'Nepal',                 code:'+977' },
        { flag:'🇳🇱', name:'Netherlands',           code:'+31'  },
        { flag:'🇳🇿', name:'New Zealand',           code:'+64'  },
        { flag:'🇳🇬', name:'Nigeria',               code:'+234' },
        { flag:'🇳🇴', name:'Norway',                code:'+47'  },
        { flag:'🇴🇲', name:'Oman',                  code:'+968' },
        { flag:'🇵🇰', name:'Pakistan',              code:'+92'  },
        { flag:'🇵🇦', name:'Panama',                code:'+507' },
        { flag:'🇵🇭', name:'Philippines',           code:'+63'  },
        { flag:'🇵🇱', name:'Poland',                code:'+48'  },
        { flag:'🇵🇹', name:'Portugal',              code:'+351' },
        { flag:'🇶🇦', name:'Qatar',                 code:'+974' },
        { flag:'🇷🇴', name:'Romania',               code:'+40'  },
        { flag:'🇷🇺', name:'Russia',                code:'+7'   },
        { flag:'🇸🇦', name:'Saudi Arabia',          code:'+966' },
        { flag:'🇷🇸', name:'Serbia',                code:'+381' },
        { flag:'🇸🇬', name:'Singapore',             code:'+65'  },
        { flag:'🇸🇰', name:'Slovakia',              code:'+421' },
        { flag:'🇿🇦', name:'South Africa',          code:'+27'  },
        { flag:'🇪🇸', name:'Spain',                 code:'+34'  },
        { flag:'🇱🇰', name:'Sri Lanka',             code:'+94'  },
        { flag:'🇸🇪', name:'Sweden',                code:'+46'  },
        { flag:'🇨🇭', name:'Switzerland',           code:'+41'  },
        { flag:'🇹🇼', name:'Taiwan',                code:'+886' },
        { flag:'🇹🇿', name:'Tanzania',              code:'+255' },
        { flag:'🇹🇭', name:'Thailand',              code:'+66'  },
        { flag:'🇹🇳', name:'Tunisia',               code:'+216' },
        { flag:'🇹🇷', name:'Turkey',                code:'+90'  },
        { flag:'🇺🇬', name:'Uganda',                code:'+256' },
        { flag:'🇺🇦', name:'Ukraine',               code:'+380' },
        { flag:'🇦🇪', name:'UAE',                   code:'+971' },
        { flag:'🇬🇧', name:'United Kingdom',        code:'+44'  },
        { flag:'🇺🇸', name:'United States',         code:'+1'   },
        { flag:'🇺🇿', name:'Uzbekistan',            code:'+998' },
        { flag:'🇻🇳', name:'Vietnam',               code:'+84'  },
        { flag:'🇾🇪', name:'Yemen',                 code:'+967' },
        { flag:'🇿🇲', name:'Zambia',                code:'+260' },
        { flag:'🇿🇼', name:'Zimbabwe',              code:'+263' },
    ];

    /* ================================================================
       COUNTRY DROPDOWN
       ================================================================ */
    let selectedCountry = COUNTRIES.find(c => c.code === '+91') || COUNTRIES[0];
    let ccFocusedIndex  = -1;

    function renderCountryList(filter = '') {
        ccList.innerHTML = '';
        ccFocusedIndex = -1;

        const term = filter.toLowerCase().trim();
        const filtered = term
            ? COUNTRIES.filter(c => c.name.toLowerCase().includes(term) || c.code.includes(term))
            : COUNTRIES;

        if (!filtered.length) {
            const empty = document.createElement('li');
            empty.style.cssText = 'padding:12px 14px;color:var(--text-light);font-size:0.85rem;cursor:default;text-align:center;';
            empty.textContent = 'No countries found';
            ccList.appendChild(empty);
            return;
        }

        filtered.forEach(c => {
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            if (c.code === selectedCountry.code && c.name === selectedCountry.name) {
                li.classList.add('selected');
            }
            li.innerHTML = `<span class="li-flag">${c.flag}</span>
                            <span class="li-name">${c.name}</span>
                            <span class="li-code">${c.code}</span>`;
            li.addEventListener('click', () => selectCountry(c));
            ccList.appendChild(li);
        });

        // Scroll current selection into view
        const sel = ccList.querySelector('.selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function selectCountry(c) {
        selectedCountry          = c;
        selectedFlag.textContent = c.flag;
        selectedCode.textContent = c.code;
        countryCodeHidden.value  = c.code;
        closeDropdown();
    }

    function openDropdown() {
        // Portal-position: place dropdown below the button using fixed coords
        // so it escapes any overflow:hidden parent (like .field-row)
        const r = countryCodeBtn.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const dropdownWidth = Math.min(Math.max(r.width, 270), viewportWidth - 24);
        const left = Math.min(Math.max(12, r.left), viewportWidth - dropdownWidth - 12);

        countryDropdown.style.top = (r.bottom + 6) + 'px';
        countryDropdown.style.left = left + 'px';
        countryDropdown.style.width = dropdownWidth + 'px';

        countryDropdown.classList.add('open');
        countryCodeBtn.setAttribute('aria-expanded', 'true');
        ccSearch.value = '';
        renderCountryList();
        requestAnimationFrame(() => ccSearch.focus());
    }

    function closeDropdown() {
        countryDropdown.classList.remove('open');
        countryCodeBtn.setAttribute('aria-expanded', 'false');
        ccFocusedIndex = -1;
    }

    function setCcFocus(index) {
        const items = [...ccList.querySelectorAll('li[role="option"]')];
        if (!items.length) return;
        ccFocusedIndex = Math.max(0, Math.min(index, items.length - 1));
        items.forEach((li, i) => li.classList.toggle('focused', i === ccFocusedIndex));
        items[ccFocusedIndex].scrollIntoView({ block: 'nearest' });
    }

    // Toggle open/close
    countryCodeBtn.addEventListener('click', e => {
        e.stopPropagation();
        countryDropdown.classList.contains('open') ? closeDropdown() : openDropdown();
    });

    // Live search filter
    ccSearch.addEventListener('input', () => renderCountryList(ccSearch.value));

    // Keyboard navigation inside search
    ccSearch.addEventListener('keydown', e => {
        const items = [...ccList.querySelectorAll('li[role="option"]')];
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCcFocus(ccFocusedIndex < 0 ? 0 : ccFocusedIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCcFocus(ccFocusedIndex <= 0 ? 0 : ccFocusedIndex - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (ccFocusedIndex >= 0 && items[ccFocusedIndex]) {
                items[ccFocusedIndex].click();
            } else if (items.length === 1) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            closeDropdown();
            countryCodeBtn.focus();
        }
    });

    // Close on outside click — must check both wrapper and the portal dropdown
    document.addEventListener('click', e => {
        if (!e.target.closest('.country-code-wrapper') &&
            !e.target.closest('#countryDropdown')) {
            closeDropdown();
        }
    });

    // Escape from anywhere
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && countryDropdown.classList.contains('open')) {
            closeDropdown();
            countryCodeBtn.focus();
        }
    });

    // Reposition on scroll (dropdown stays anchored to button)
    window.addEventListener('scroll', () => {
        if (countryDropdown.classList.contains('open')) openDropdown();
    }, { passive: true });

    // Close on resize to avoid stale position
    window.addEventListener('resize', () => {
        if (countryDropdown.classList.contains('open')) closeDropdown();
    });

    renderCountryList();

    /* ================================================================
       OTP BOX KEYBOARD BEHAVIOUR  (auto-advance, backspace, paste)
       ================================================================ */
    function wireOtpBoxes(boxes) {
        boxes.forEach((box, i) => {
            box.addEventListener('input', () => {
                const v = box.value.replace(/\D/g, '');
                box.value = v ? v[0] : '';
                box.classList.toggle('filled', !!box.value);
                if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
            });

            box.addEventListener('keydown', e => {
                if (e.key === 'Backspace' && !box.value && i > 0) {
                    boxes[i - 1].value = '';
                    boxes[i - 1].classList.remove('filled');
                    boxes[i - 1].focus();
                }
            });

            box.addEventListener('paste', e => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                [...text].slice(0, boxes.length).forEach((ch, j) => {
                    if (boxes[j]) { boxes[j].value = ch; boxes[j].classList.add('filled'); }
                });
                const next = boxes[Math.min(text.length, boxes.length - 1)];
                if (next) next.focus();
            });
        });
    }

    wireOtpBoxes(emailOtpBoxes);

    function getOtpValue(boxes) {
        return [...boxes].map(b => b.value).join('');
    }

    function clearOtpBoxes(boxes) {
        boxes.forEach(b => { b.value = ''; b.classList.remove('filled', 'error-shake'); });
    }

    function shakeOtpBoxes(boxes) {
        boxes.forEach(b => {
            b.classList.remove('error-shake');
            void b.offsetWidth;
            b.classList.add('error-shake');
        });
        setTimeout(() => boxes.forEach(b => b.classList.remove('error-shake')), 400);
    }

    /* ================================================================
       OTP HELPERS
       ================================================================ */
    function setStatus(el, msg, type) {
        el.textContent = msg;
        el.className = 'otp-status' + (type ? ' ' + type : '');
    }

    async function loadEmailVerificationStatus() {
        try {
            const response = await APIUtils.get(
                API_CONFIG.ENDPOINTS.AUTH.SIGNUP_EMAIL_VERIFICATION_STATUS,
                { includeAuth: false, showError: false }
            );

            emailVerificationRequired = !!response?.data?.required;
            if (!emailVerificationRequired) {
                emailVerified = true;
                emailVerificationToken = '';
                sendEmailOtpBtn.disabled = true;
                verifyEmailOtpBtn.disabled = true;
                emailOtpSection.classList.add('visible', 'verified');
                setStatus(
                    emailOtpStatus,
                    `Email verification temporarily paused${response?.data?.resumeAt ? ` until ${new Date(response.data.resumeAt).toLocaleTimeString()}` : ''}.`,
                    'success'
                );
            }
        } catch (error) {
            emailVerificationRequired = true;
        }
    }

    function startResendTimer(sendBtn, resendEl, existingInterval, callback) {
        let secs = 60;
        resendEl.innerHTML = `Resend OTP in <strong>${secs}s</strong>`;
        if (existingInterval) clearInterval(existingInterval);

        const t = setInterval(() => {
            secs--;
            if (secs <= 0) {
                clearInterval(t);
                resendEl.innerHTML = `Didn't receive it? <a id="resendLink">Resend OTP</a>`;
                sendBtn.disabled = false;
                document.getElementById('resendLink')?.addEventListener('click', callback);
            } else {
                resendEl.innerHTML = `Resend OTP in <strong>${secs}s</strong>`;
            }
        }, 1000);
        return t;
    }

    /* ================================================================
       EMAIL OTP
       ================================================================ */
    async function sendEmailOtp() {
        if (!emailVerificationRequired) {
            return;
        }

        if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
            setStatus(emailOtpStatus, '✗ Enter a valid email first.', 'error');
            emailInput.focus(); return;
        }

        sendEmailOtpBtn.disabled = true;
        sendEmailOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Sending...</span>';

        try {
            const response = await APIUtils.post(
                API_CONFIG.ENDPOINTS.AUTH.SEND_SIGNUP_EMAIL_OTP,
                { email: emailInput.value.trim(), redirectTo: `${window.location.origin}/signup.html` },
                { includeAuth: false }
            );

            if (response?.data?.devOtp) {
                console.info('[DEV] Email OTP:', response.data.devOtp);
            }
        } catch (error) {
            setStatus(emailOtpStatus, `✗ ${error.message || 'Failed to send OTP'}`, 'error');
            sendEmailOtpBtn.disabled = false;
            sendEmailOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Send OTP</span>';
            return;
        }

        clearOtpBoxes(emailOtpBoxes);
        emailOtpSection.classList.add('visible');
        emailOtpSection.classList.remove('verified');
        emailVerified = false;
        emailVerificationToken = '';
        emailInput.classList.remove('verified');

        sendEmailOtpBtn.disabled = true;
        sendEmailOtpBtn.innerHTML = '<i class="fas fa-check"></i><span>OTP Sent</span>';
        sendEmailOtpBtn.classList.add('sent');

        setStatus(emailOtpStatus, '', '');
        emailOtpBoxes[0].focus();

        emailResendInterval = startResendTimer(sendEmailOtpBtn, emailResend, emailResendInterval, () => {
            sendEmailOtpBtn.classList.remove('sent');
            sendEmailOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Send OTP</span>';
            emailResend.innerHTML = '';
            sendEmailOtp();
        });
    }

    async function verifyEmailOtp() {
        if (!emailVerificationRequired) {
            return;
        }

        const entered = getOtpValue(emailOtpBoxes);
        if (entered.length < 6) { setStatus(emailOtpStatus, '✗ Please fill all 6 digits.', 'error'); return; }

        verifyEmailOtpBtn.disabled = true;
        try {
            const response = await APIUtils.post(
                API_CONFIG.ENDPOINTS.AUTH.VERIFY_SIGNUP_EMAIL_OTP,
                { email: emailInput.value.trim(), otp: entered },
                { includeAuth: false }
            );

            emailVerificationToken = response?.data?.verificationToken || '';
            if (!emailVerificationToken) {
                throw new Error('Missing email verification token');
            }

            emailVerified = true;
            emailInput.classList.add('verified');
            emailInput.readOnly = true;
            emailOtpSection.classList.add('verified');
            verifyEmailOtpBtn.disabled = true;
            clearInterval(emailResendInterval);
            emailResend.innerHTML = '';
            setStatus(emailOtpStatus, '✓ Email verified successfully!', 'success');
        } catch (error) {
            verifyEmailOtpBtn.disabled = false;
            setStatus(emailOtpStatus, '✗ Incorrect OTP. Try again.', 'error');
            shakeOtpBoxes(emailOtpBoxes);
            clearOtpBoxes(emailOtpBoxes);
            emailOtpBoxes[0].focus();
        }
    }

    sendEmailOtpBtn.addEventListener('click', sendEmailOtp);
    verifyEmailOtpBtn.addEventListener('click', verifyEmailOtp);
    loadEmailVerificationStatus();

    async function tryVerifyEmailFromMagicLink() {
        try {
            const queryParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));

            const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash') || '';
            const type = queryParams.get('type') || hashParams.get('type') || 'email';
            const accessToken = hashParams.get('access_token') || '';

            let response = null;
            if (tokenHash) {
                response = await APIUtils.post(
                    API_CONFIG.ENDPOINTS.AUTH.VERIFY_SIGNUP_EMAIL_LINK,
                    { tokenHash, type },
                    { includeAuth: false, showError: false }
                );
            } else if (accessToken) {
                response = await APIUtils.post(
                    API_CONFIG.ENDPOINTS.AUTH.VERIFY_SIGNUP_EMAIL_SESSION,
                    { accessToken },
                    { includeAuth: false, showError: false }
                );
            } else {
                return;
            }

            const email = response?.data?.email || '';
            emailVerificationToken = response?.data?.verificationToken || '';
            if (!email || !emailVerificationToken) {
                return;
            }

            emailInput.value = email;
            emailVerified = true;
            emailInput.classList.add('verified');
            emailInput.readOnly = true;
            emailOtpSection.classList.add('visible', 'verified');
            verifyEmailOtpBtn.disabled = true;
            setStatus(emailOtpStatus, '✓ Email verified from link.', 'success');

            // Clean token params from URL after verification.
            const clean = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, clean);
        } catch (error) {
            // Keep manual OTP path available if link verification fails.
        }
    }

    tryVerifyEmailFromMagicLink();

    emailInput.addEventListener('input', () => {
        emailVerified = false;
        emailVerificationToken = '';
        emailInput.readOnly = false;
        verifyEmailOtpBtn.disabled = false;
        emailOtpSection.classList.remove('verified');
    });

    /* ================================================================
       PASSWORD TOGGLES  (original)
       ================================================================ */
    function setupPasswordToggle(input, button) {
        if (!input || !button) return;
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    setupPasswordToggle(passwordInput, passwordToggle);
    setupPasswordToggle(confirmPasswordInput, confirmPasswordToggle);

    /* ================================================================
       PASSWORD MATCH FEEDBACK  (original)
       ================================================================ */
    function validatePasswordMatch() {
        const existingError   = confirmPasswordInput.parentElement.querySelector('.error-message');
        const existingSuccess = confirmPasswordInput.parentElement.querySelector('.success-message');
        if (existingError)   existingError.remove();
        if (existingSuccess) existingSuccess.remove();

        if (passwordInput.value && confirmPasswordInput.value) {
            if (passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.style.borderColor = '#f44336';
                confirmPasswordInput.style.boxShadow  = '0 0 5px rgba(244,67,54,0.3)';
                const e = document.createElement('small');
                e.className = 'error-message';
                e.textContent = '✗ Passwords do not match';
                confirmPasswordInput.parentElement.appendChild(e);
            } else {
                confirmPasswordInput.style.borderColor = '#4caf50';
                confirmPasswordInput.style.boxShadow  = '0 0 5px rgba(76,175,80,0.3)';
                const s = document.createElement('small');
                s.className = 'success-message';
                s.textContent = '✓ Passwords match';
                confirmPasswordInput.parentElement.appendChild(s);
            }
        } else {
            confirmPasswordInput.style.borderColor = '';
            confirmPasswordInput.style.boxShadow  = '';
        }
    }
    if (passwordInput)        passwordInput.addEventListener('input', validatePasswordMatch);
    if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', validatePasswordMatch);

    /* ================================================================
       DONOR TYPE TOGGLE  (original)
       ================================================================ */
    if (userTypeSelect && donorTypeField && donorTypeSelect) {
        const toggleDonorField = function () {
            if (userTypeSelect.value === 'donor') {
                donorTypeField.classList.add('show');
                donorTypeField.style.display = 'block';
                donorTypeSelect.required = true;
            } else {
                donorTypeField.classList.remove('show');
                donorTypeField.style.display = 'none';
                donorTypeSelect.required = false;
                donorTypeSelect.value = '';
            }
        };
        userTypeSelect.addEventListener('change', toggleDonorField);
        toggleDonorField();
    }

    /* ================================================================
       USE CURRENT LOCATION  (original)
       ================================================================ */
    async function handleUseLocation() {
        if (!useLocationBtn) return;
        if (!navigator.geolocation) { APIUtils.showErrorMessage('Geolocation is not supported.'); return; }
        useLocationBtn.disabled = true;
        const icon = useLocationBtn.querySelector('i');
        const orig = icon ? icon.className : '';
        if (icon) icon.className = 'fas fa-spinner fa-spin';
        if (locationStatus) locationStatus.textContent = 'Locating...';

        navigator.geolocation.getCurrentPosition(async pos => {
            const lat = pos.coords.latitude, lon = pos.coords.longitude;
            if (latitudeInput)  latitudeInput.value  = lat;
            if (longitudeInput) longitudeInput.value = lon;
            try {
                const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, { headers: { Accept: 'application/json' } });
                if (resp.ok) {
                    const data = await resp.json();
                    const addr = data.address || {};
                    if (cityInput) cityInput.value = addr.city || addr.town || addr.village || addr.county || addr.state || data.display_name || '';
                    if (locationStatus) locationStatus.textContent = 'Location detected';
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (icon) icon.className = orig;
                useLocationBtn.disabled = false;
            }
        }, err => {
            console.error(err);
            APIUtils.showErrorMessage('Unable to get your location. Please allow location access.');
            if (icon) icon.className = orig;
            useLocationBtn.disabled = false;
            if (locationStatus) locationStatus.textContent = '';
        }, { timeout: 10000 });
    }
    if (useLocationBtn) useLocationBtn.addEventListener('click', handleUseLocation);

    /* ================================================================
       FORM SUBMIT  (original logic + email OTP gate)
       ================================================================ */
    if (signupForm) {
        signupForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const userData = {
                userType:        userTypeSelect.value,
                donorType:       donorTypeSelect.value || null,
                fullName:        fullNameInput.value.trim(),
                email:           emailInput.value.trim(),
                password:        passwordInput.value,
                confirmPassword: confirmPasswordInput.value,
                city:            cityInput.value.trim(),
                address:         cityInput.value.trim(),
                phone:           phoneInput.value.trim() ? (countryCodeHidden.value + phoneInput.value.trim()) : null,
                emailVerificationToken,
            };

            if (!userData.userType)                                     { APIUtils.showErrorMessage('Please select your role'); return; }
            if (userData.userType === 'donor' && !userData.donorType)   { APIUtils.showErrorMessage('Please select your donor type'); return; }
            if (!userData.fullName)                                      { APIUtils.showErrorMessage('Please enter your full name'); return; }
            if (!userData.email || !validateEmail(userData.email))       { APIUtils.showErrorMessage('Please enter a valid email address'); return; }
            if (!OTP_VERIFICATION_DISABLED && emailVerificationRequired && !emailVerified)              { APIUtils.showErrorMessage('Please verify your email with OTP first.'); sendEmailOtpBtn.scrollIntoView({ behavior:'smooth', block:'center' }); return; }
            if (!userData.password || userData.password.length < 8)     { APIUtils.showErrorMessage('Password must be at least 8 characters'); return; }
            if (userData.password !== userData.confirmPassword)          { APIUtils.showErrorMessage('Passwords do not match!'); confirmPasswordInput.focus(); return; }
            if (!userData.city)                                          { APIUtils.showErrorMessage('Please enter your city'); return; }

            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            submitBtn.disabled = true;

            try {
                const sendData = { ...userData };
                delete sendData.confirmPassword;

                const result = await APIUtils.signup(sendData);
                const createdUser = result?.data?.user || {};

                if (result?.success && result?.data?.token) {
                    const resolvedType = createdUser.userType || createdUser.user_type || userData.userType;
                    const resolvedName = createdUser.full_name || createdUser.fullName || userData.fullName;
                    const resolvedEmail = createdUser.email || userData.email;
                    const resolvedAddress = (createdUser.address || createdUser.city || userData.address || userData.city || '').trim();

                    sessionStorage.setItem('userType', resolvedType);
                    sessionStorage.setItem('userEmail', resolvedEmail);
                    sessionStorage.setItem('userName', resolvedName);

                    const existingUserData = APIUtils.getUserData() || {};
                    APIUtils.setUserData({
                        ...existingUserData,
                        ...createdUser,
                        userType: resolvedType,
                        full_name: resolvedName,
                        email: resolvedEmail,
                        address: resolvedAddress,
                        city: resolvedAddress
                    });

                    const profileSnapshot = {
                        ...createdUser,
                        name: resolvedName,
                        full_name: resolvedName,
                        email: resolvedEmail,
                        address: resolvedAddress,
                        city: resolvedAddress,
                        location: resolvedAddress,
                        phone: createdUser.phone || userData.phone || ''
                    };
                    if (resolvedType === 'ngo') {
                        localStorage.setItem('ngoProfile', JSON.stringify(profileSnapshot));
                    } else if (resolvedType === 'donor') {
                        localStorage.setItem('donorProfile', JSON.stringify(profileSnapshot));
                    }

                    APIUtils.showSuccessMessage('Account created successfully! Redirecting...');
                    window.location.href = 'index.html';
                } else {
                    APIUtils.showErrorMessage(result?.data?.message || 'Failed to create account. Please try again.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled  = false;
                }
            } catch (err) {
                console.error(err);
                APIUtils.showErrorMessage(err?.message || 'An error occurred. Please try again.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled  = false;
            }
        });
    }
});

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
