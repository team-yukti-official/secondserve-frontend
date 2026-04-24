document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('heartDonateForm');
    const submitBtn = document.querySelector('.submit-btn');
    const fileInput = document.getElementById('itemImage');
    const wrapper = document.querySelector('.file-input-wrapper');
    const fileName = document.getElementById('fileName');
    const itemType = document.getElementById('itemType');
    const locationBtn = document.getElementById('getCurrentLocationBtn');
    const locationStatus = document.getElementById('locationStatus');

    const preselectedType = sessionStorage.getItem('smileDonationType');
    if (preselectedType && itemType) {
        itemType.value = preselectedType;
        sessionStorage.removeItem('smileDonationType');
    }

    if (fileInput && wrapper && fileName) {
        function updateFileName(files) {
            if (!files || files.length === 0) {
                fileName.textContent = '';
                return;
            }
            const names = Array.from(files).map((f) => f.name).join(', ');
            fileName.textContent = `Selected: ${names}`;
        }

        fileInput.addEventListener('change', function () {
            updateFileName(this.files);
        });

        wrapper.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover'].forEach((evt) => {
            wrapper.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                wrapper.classList.add('dragover');
            });
        });

        ['dragleave', 'dragend', 'drop'].forEach((evt) => {
            wrapper.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                wrapper.classList.remove('dragover');
            });
        });

        wrapper.addEventListener('drop', (e) => {
            const dtFiles = e.dataTransfer && e.dataTransfer.files;
            if (!dtFiles || dtFiles.length === 0) return;

            const file = dtFiles[0];
            try {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
            } catch (err) {
                console.warn('Could not set input.files programmatically', err);
            }

            updateFileName(dtFiles);
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) => {
            window.addEventListener(evt, function (e) {
                if (!e.target.closest || !e.target.closest('.file-input-wrapper')) {
                    e.preventDefault();
                }
            });
        });
    }

    function showLocationStatus(message, type = 'info') {
        if (!locationStatus) return;
        locationStatus.textContent = message;
        locationStatus.className = `location-status ${type}`;
    }

    if (locationBtn && locationStatus) {
        locationBtn.addEventListener('click', getCurrentLocation);
    }

    function getCurrentLocation() {
        if (!navigator.geolocation) {
            showLocationStatus('Geolocation not supported on this device.', 'error');
            return;
        }

        showLocationStatus('Getting your location...', 'info');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                showLocationStatus('Location found! Fetching address...', 'info');

                try {
                    await reverseGeocode(lat, lon);
                    showLocationStatus('Location auto-filled successfully!', 'success');
                    setTimeout(() => {
                        locationStatus.style.display = 'none';
                    }, 4000);
                } catch (err) {
                    console.error(err);
                    showLocationStatus('Address detected but autofill failed.', 'error');
                }
            },
            (error) => {
                console.error(error);
                showLocationStatus('Permission denied or unable to fetch location.', 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    async function reverseGeocode(lat, lon) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.address) throw new Error('No address found');

        const addr = data.address;
        const addressEl = document.getElementById('address');
        const cityEl = document.getElementById('city');
        const pincodeEl = document.getElementById('pincode');

        if (addressEl) addressEl.value = `${addr.road || ''} ${addr.house_number || ''}`.trim();
        if (cityEl) cityEl.value = addr.city || addr.town || addr.village || '';
        if (pincodeEl) pincodeEl.value = addr.postcode || '';
    }

    if (!form || !submitBtn) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!APIUtils.isAuthenticated()) {
            sessionStorage.setItem('redirectAfterLogin', '/heart-donate.html');
            window.location.href = 'login.html';
            return;
        }

        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting Donation...';

        try {
            const formData = new FormData();
            formData.append('itemType', String(document.getElementById('itemType').value || '').trim());
            formData.append('itemName', String(document.getElementById('itemName').value || '').trim());
            formData.append('quantity', String(document.getElementById('quantity').value || '').trim());
            formData.append('condition', String(document.getElementById('condition').value || '').trim());
            formData.append('address', String(document.getElementById('address').value || '').trim());
            formData.append('city', String(document.getElementById('city').value || '').trim());
            formData.append('pincode', String(document.getElementById('pincode').value || '').trim());
            formData.append('description', String(document.getElementById('description').value || '').trim());
            formData.append('contactPhone', String(document.getElementById('contactPhone').value || '').trim());

            if (fileInput && fileInput.files && fileInput.files[0]) {
                formData.append('itemImage', fileInput.files[0]);
            }

            const result = await APIUtils.createSmileDonation(formData);

            if (result && result.success) {
                APIUtils.showSuccessMessage('Second Smile donation posted successfully!');
                setTimeout(() => {
                    window.location.href = 'heart.html';
                }, 900);
                return;
            }

            APIUtils.showErrorMessage(result?.error || result?.data?.error || 'Unable to post donation. Please try again.');
        } catch (error) {
            console.error('Smile donation submit error:', error);
            APIUtils.showErrorMessage('Unable to post donation. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
