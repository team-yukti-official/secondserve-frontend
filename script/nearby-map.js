/**
 * Nearby NGOs and Donors Interactive Map (Leaflet)
 *
 * Uses the existing authenticated backend endpoints to load nearby NGOs and
 * donors once a logged-in user shares their current location.
 */

let nearbyMap = null;
let userMarker = null;
let ngoMarkers = [];
let donorMarkers = [];
let currentUserLocation = null;
let locationWatchId = null;
let refreshIntervalId = null;
let isFetchingNearby = false;

const SEARCH_RADIUS_KM = 5;
const DEFAULT_CENTER = [22.5726, 88.3639];
const REFRESH_INTERVAL_MS = 30000;

document.addEventListener('DOMContentLoaded', () => {
    initNearbyMap();
    setupLocationButton();
    updateMapAuthState();
    window.addEventListener('storage', updateMapAuthState);
    window.addEventListener('focus', updateMapAuthState);
});

function initNearbyMap() {
    const mapElement = document.getElementById('nearbyMap');
    if (!mapElement || nearbyMap || typeof L === 'undefined') return;

    nearbyMap = L.map(mapElement, {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView(DEFAULT_CENTER, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(nearbyMap);
}

function setupLocationButton() {
    const loadBtn = document.getElementById('loadLocationBtn');
    if (!loadBtn) return;

    loadBtn.addEventListener('click', () => {
        if (typeof AuthManager !== 'undefined' && !AuthManager.requireAuth()) {
            return;
        }

        getUserLocationAndFetchNearby();
    });
}

function updateMapAuthState() {
    const authNote = document.getElementById('mapAuthNote');
    const loadBtn = document.getElementById('loadLocationBtn');
    const mapStatusText = document.getElementById('mapStatusText');
    const locationFetchIndicator = document.getElementById('locationFetchIndicator');
    const isLoggedIn = typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn();

    if (authNote) {
        authNote.textContent = isLoggedIn
            ? 'Use your live location to load nearby NGOs and donors from the backend.'
            : 'Log in to load nearby NGOs and donors from your backend.';
    }

    if (loadBtn) {
        loadBtn.title = isLoggedIn
            ? 'Find nearby NGOs and donors'
            : 'Please log in first';
    }

    if (mapStatusText && !currentUserLocation) {
        mapStatusText.textContent = isLoggedIn
            ? 'Ready to detect your live area'
            : 'Login required for live discovery';
    }

    if (locationFetchIndicator && !currentUserLocation) {
        locationFetchIndicator.classList.remove('fetching', 'ready', 'error');
    }
}

function getUserLocationAndFetchNearby() {
    const loadBtn = document.getElementById('loadLocationBtn');

    if (!navigator.geolocation) {
        APIUtils.showErrorMessage('Geolocation is not supported by your browser.');
        return;
    }

    const originalText = loadBtn ? loadBtn.innerHTML : '';
    setLoadButtonState(true, '<i class="fas fa-spinner fa-spin"></i> Getting Location...');
    setLocationIndicator('fetching', 'Fetching your location...');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const userLocation = extractLocation(position);

            currentUserLocation = userLocation;
            nearbyMap.setView([userLocation.lat, userLocation.lng], 14);
            addUserMarker(userLocation);
            await fetchNearbyLocations(userLocation);
            startLiveTracking();
            setLoadButtonState(false, originalText);
        },
        (error) => {
            console.error('Geolocation error:', error);

            let message = 'Unable to get location.';
            if (error.code === 1) message = 'Permission denied. Please allow location access.';
            if (error.code === 2) message = 'Location unavailable. Please turn on GPS or Wi-Fi.';
            if (error.code === 3) message = 'Location request timed out.';

            APIUtils.showErrorMessage(message);
            setLocationIndicator('error', 'Unable to fetch your location');
            setLoadButtonState(false, originalText);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function extractLocation(position) {
    return {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
}

function setLocationIndicator(state, text) {
    const locationFetchIndicator = document.getElementById('locationFetchIndicator');
    const mapStatusText = document.getElementById('mapStatusText');

    if (mapStatusText && text) {
        mapStatusText.textContent = text;
    }

    if (!locationFetchIndicator) return;

    locationFetchIndicator.classList.remove('fetching', 'ready', 'error');
    if (state) {
        locationFetchIndicator.classList.add(state);
    }
}

function startLiveTracking() {
    if (!navigator.geolocation) return;

    if (locationWatchId === null) {
        locationWatchId = navigator.geolocation.watchPosition(
            async (position) => {
                const nextLocation = extractLocation(position);
                const movedEnough = !currentUserLocation || calculateDistance(
                    currentUserLocation.lat,
                    currentUserLocation.lng,
                    nextLocation.lat,
                    nextLocation.lng
                ) > 0.1;

                currentUserLocation = nextLocation;
                addUserMarker(nextLocation);

                if (movedEnough) {
                    setLocationIndicator('fetching', 'Refreshing nearby results...');
                    nearbyMap.setView([nextLocation.lat, nextLocation.lng], 14);
                    await fetchNearbyLocations(nextLocation);
                }
            },
            (error) => {
                console.warn('watchPosition error:', error);
                setLocationIndicator('error', 'Live location updates paused');
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000
            }
        );
    }

    if (refreshIntervalId === null) {
        refreshIntervalId = window.setInterval(() => {
            if (currentUserLocation) {
                fetchNearbyLocations(currentUserLocation);
            }
        }, REFRESH_INTERVAL_MS);
    }
}

function setLoadButtonState(isLoading, html) {
    const loadBtn = document.getElementById('loadLocationBtn');
    if (!loadBtn) return;

    loadBtn.disabled = isLoading;
    loadBtn.innerHTML = html;
}

function addUserMarker(location) {
    if (userMarker) {
        nearbyMap.removeLayer(userMarker);
    }

    userMarker = L.circleMarker([location.lat, location.lng], {
        radius: 10,
        fillColor: '#1976d2',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.95
    }).addTo(nearbyMap);

    userMarker.bindPopup(`
        <div class="map-user-popup">
            <h3>Your Location</h3>
            <p>Nearby NGOs and donors are being loaded from the backend.</p>
        </div>
    `).openPopup();
}

async function fetchNearbyLocations(userLocation) {
    if (isFetchingNearby) return;

    const ngoCountEl = document.getElementById('ngoCount');
    const donorCountEl = document.getElementById('donorCount');

    if (ngoCountEl) ngoCountEl.textContent = '...';
    if (donorCountEl) donorCountEl.textContent = '...';
    setLocationIndicator('fetching', 'Checking nearby NGOs and donors...');

    clearMarkers();
    isFetchingNearby = true;

    try {
        const [ngoResponse, donorResponse] = await Promise.all([
            APIUtils.getNearbyNGOs(userLocation.lat, userLocation.lng, SEARCH_RADIUS_KM),
            APIUtils.getNearbyDonors({
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                radiusKm: SEARCH_RADIUS_KM
            })
        ]);

        const ngos = normalizeCollection(ngoResponse?.data);
        const donors = normalizeCollection(donorResponse?.data);

        addNGOMarkers(ngos, userLocation);
        addDonorMarkers(donors, userLocation);

        if (ngoCountEl) ngoCountEl.textContent = ngos.length;
        if (donorCountEl) donorCountEl.textContent = donors.length;
        setLocationIndicator('ready', 'Location connected and live');

        fitMapToBounds(userLocation, ngos, donors);

        if (!ngos.length && !donors.length) {
            APIUtils.showSuccessMessage('No nearby NGOs or donors were found in the selected radius.');
        }
    } catch (error) {
        console.error('fetchNearbyLocations error:', error);
        if (ngoCountEl) ngoCountEl.textContent = '0';
        if (donorCountEl) donorCountEl.textContent = '0';
        setLocationIndicator('error', 'Backend sync failed');
        APIUtils.showErrorMessage('Failed to load nearby NGOs and donors from the backend.');
    } finally {
        isFetchingNearby = false;
    }
}

function normalizeCollection(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.ngos)) return data.ngos;
    if (Array.isArray(data?.donors)) return data.donors;
    return [];
}

function addNGOMarkers(ngos, userLocation) {
    ngos.forEach((ngo) => {
        const coords = getCoordinates(ngo);
        if (!coords) return;

        const distance = calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
        const marker = L.marker([coords.lat, coords.lng], {
            icon: createDivIcon('ngo')
        }).addTo(nearbyMap);

        marker.bindPopup(buildNgoPopup(ngo, distance));
        ngoMarkers.push(marker);
    });
}

function addDonorMarkers(donors, userLocation) {
    donors.forEach((donor) => {
        const coords = getCoordinates(donor);
        if (!coords) return;

        const distance = calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
        const marker = L.marker([coords.lat, coords.lng], {
            icon: createDivIcon('donor')
        }).addTo(nearbyMap);

        marker.bindPopup(buildDonorPopup(donor, distance));
        donorMarkers.push(marker);
    });
}

function buildNgoPopup(ngo, distance) {
    const ngoId = escapeHtml(ngo.id || ngo._id || '');
    const detailUrl = ngoId ? `find-ngo.html?ngoId=${encodeURIComponent(ngoId)}` : 'find-ngo.html';
    const profileUrl = ngoId ? `viewer-dashboard.html?userId=${encodeURIComponent(ngoId)}` : 'find-ngo.html';

    return `
        <div class="map-popup">
            <span class="popup-badge ngo"><i class="fas fa-hand-holding-heart"></i> NGO</span>
            <h3>${escapeHtml(ngo.name || ngo.orgName || 'NGO')}</h3>
            <p><strong>${escapeHtml(ngo.category || 'Verified partner')}</strong></p>
            <p>${distance.toFixed(1)} km away</p>
            <p>${escapeHtml(ngo.city || ngo.address || 'Location not provided')}</p>
            <p><strong>Phone:</strong> ${escapeHtml(ngo.phone || ngo.contactNumber || 'N/A')}</p>
            <a class="popup-action ngo" href="${detailUrl}">View NGO Details</a>
            <a class="popup-action ngo" href="${profileUrl}" style="margin-top:6px">View Profile Dashboard</a>
        </div>
    `;
}

function buildDonorPopup(donor, distance) {
    const donorId = escapeHtml(donor.id || donor._id || '');
    const targetPage = donorId ? `viewer-dashboard.html?userId=${encodeURIComponent(donorId)}` : 'donor-dashboard.html';

    return `
        <div class="map-popup">
            <span class="popup-badge donor"><i class="fas fa-box-open"></i> Donor</span>
            <h3>${escapeHtml(donor.name || donor.fullName || 'Donor')}</h3>
            <p><strong>${escapeHtml(donor.donorType || 'Food donor')}</strong></p>
            <p>${distance.toFixed(1)} km away</p>
            <p>${escapeHtml(donor.city || donor.address || 'Location not provided')}</p>
            <p><strong>Phone:</strong> ${escapeHtml(donor.phone || donor.contactNumber || 'N/A')}</p>
            <a class="popup-action" href="${targetPage}">View Profile Dashboard</a>
        </div>
    `;
}

function createDivIcon(type) {
    const background = type === 'ngo' ? '#c62828' : '#2e7d32';
    const iconClass = type === 'ngo' ? 'fa-hand-holding-heart' : 'fa-box-open';

    return L.divIcon({
        className: '',
        html: `
            <div style="
                width: 36px;
                height: 36px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                background: ${background};
                border: 3px solid #ffffff;
                box-shadow: 0 10px 22px rgba(0,0,0,0.18);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <i class="fas ${iconClass}" style="transform: rotate(45deg); color: white; font-size: 13px;"></i>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -30]
    });
}

function getCoordinates(item) {
    const lat = Number(item?.latitude ?? item?.lat ?? item?.location?.latitude ?? item?.location?.lat);
    const lng = Number(item?.longitude ?? item?.lng ?? item?.location?.longitude ?? item?.location?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return { lat, lng };
}

function clearMarkers() {
    ngoMarkers.forEach((marker) => nearbyMap.removeLayer(marker));
    donorMarkers.forEach((marker) => nearbyMap.removeLayer(marker));
    ngoMarkers = [];
    donorMarkers = [];
}

function fitMapToBounds(userLocation, ngos, donors) {
    const points = [[userLocation.lat, userLocation.lng]];

    ngos.forEach((ngo) => {
        const coords = getCoordinates(ngo);
        if (coords) points.push([coords.lat, coords.lng]);
    });

    donors.forEach((donor) => {
        const coords = getCoordinates(donor);
        if (coords) points.push([coords.lat, coords.lng]);
    });

    if (!points.length) return;

    if (points.length === 1) {
        nearbyMap.setView(points[0], 14);
        return;
    }

    nearbyMap.fitBounds(points, {
        padding: [40, 40],
        maxZoom: 14
    });
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
