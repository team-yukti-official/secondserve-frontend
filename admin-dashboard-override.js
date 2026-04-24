(function () {
    const THEME_KEY = 'feedlink_admin_theme';
    let allVolunteers = [];
    let allMessages = [];
    let allNgos = [];
    let overviewCache = null;
    let systemCache = null;

    const loginRedirect = () => {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        window.location.href = 'admin-login.html';
    };

    const requireSession = () => {
        const session = getAdminSession();
        if (!session || !session.token) {
            loginRedirect();
            throw new Error('Missing admin session');
        }
        return session;
    };

    const isLocalSession = () => Boolean(getAdminSession()?.localOnly);

    const localPayload = (path) => {
        if (path === '/admin/login') {
            return { success: true, token: 'local-admin-token', username: getAdminSession()?.username || 'admin', expiresAt: Date.now() + (60 * 60 * 1000) };
        }

        if (path === '/admin/overview') {
            return {
                success: true,
                stats: {
                    totalUsers: 0,
                    totalDonors: 0,
                    totalNGOs: 0,
                    totalAdmins: 1,
                    totalDonations: 0,
                    availableDonations: 0,
                    claimedDonations: 0,
                    completedDonations: 0,
                    expiringSoon: 0,
                    volunteerSubmissions: 0,
                    totalVolunteers: 0,
                    pendingVolunteerApprovals: 0,
                    pickupRequests: 0,
                    pendingRequests: 0,
                    totalMessages: 0,
                    unreadMessages: 0,
                    ngoProfiles: 0,
                    expiredRemoved: 0
                },
                users: [],
                donations: [],
                volunteers: [],
                messages: [],
                ngos: [],
                charts: {
                    roles: [],
                    donationStatuses: [],
                    volunteerRoles: [],
                    cities: []
                },
                recentActivity: [],
                cleanup: {
                    nodeVersion: 'Local mode',
                    uptimeSeconds: 0,
                    memoryUsedMb: 0,
                    totalRecords: 0,
                    lastCleanupAt: null
                }
            };
        }

        if (path === '/admin/users' || path === '/admin/donations' || path === '/admin/volunteers' || path === '/admin/messages' || path === '/admin/ngos') {
            return { success: true, data: [] };
        }

        if (path === '/admin/system') {
            return {
                success: true,
                data: {
                    nodeVersion: 'Local mode',
                    uptimeSeconds: 0,
                    memoryUsedMb: 0,
                    totalRecords: 0,
                    lastCleanupAt: null
                }
            };
        }

        if (path === '/admin/cleanup-expired') {
            return { success: true, message: 'Local mode cleanup complete', deletedCount: 0, expiredCount: 0 };
        }

        if (path.startsWith('/admin/users/') || path.startsWith('/admin/donations/') || path.startsWith('/admin/volunteers/') || path.startsWith('/admin/messages/')) {
            return { success: true, message: 'Local mode action complete' };
        }

        return { success: true, data: [] };
    };

    const api = async (path, options = {}) => {
        if (isLocalSession()) {
            return localPayload(path, options);
        }

        const session = requireSession();
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.token}`,
                ...(options.headers || {})
            }
        });

        if (response.status === 401 || response.status === 403) {
            loginRedirect();
            throw new Error('Admin session expired');
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
            throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
        }

        return payload;
    };

    const list = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);
    const text = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };
    const esc = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const js = (value) => JSON.stringify(String(value ?? ''));

    const activeSection = () => (document.querySelector('.section.active')?.id || 'overview-section').replace('-section', '');
    const setActiveMenu = (section) => {
        document.querySelectorAll('.menu-item').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('href') === `#${section}`);
        });
    };
    const empty = (tbodyId, colspan, message) => {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">${esc(message)}</td></tr>`;
        }
    };
    const rowSearch = (inputId, tbodyId) => {
        const input = document.getElementById(inputId);
        const tbody = document.getElementById(tbodyId);
        if (!input || !tbody) return;
        input.oninput = () => {
            const term = input.value.trim().toLowerCase();
            tbody.querySelectorAll('tr').forEach((row) => {
                const haystack = (row.dataset.search || row.textContent || '').toLowerCase();
                row.style.display = haystack.includes(term) ? '' : 'none';
            });
        };
    };

    const applyTheme = (dark) => {
        document.body.classList.toggle('dark-mode', dark);
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
        const button = document.getElementById('themeToggle');
        if (button) {
            button.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
            button.setAttribute('aria-label', button.title);
        }
    };

    const initTheme = () => {
        const stored = localStorage.getItem(THEME_KEY);
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(stored ? stored === 'dark' : prefersDark);
    };

    const updateIdentity = () => {
        const session = getAdminSession();
        const name = document.querySelector('.admin-name');
        const role = document.querySelector('.admin-role');
        if (name && session) name.textContent = session.username || 'Database Admin';
        if (role) role.textContent = session ? 'Authenticated Admin' : 'System Administrator';
    };

    const updateCards = (stats = {}) => {
        text('totalUsers', stats.totalUsers ?? allUsers.length ?? 0);
        text('totalDonors', stats.totalDonors ?? allUsers.filter((u) => u.role === 'donor').length);
        text('totalNGOs', stats.totalNGOs ?? allUsers.filter((u) => u.role === 'ngo').length);
        text('totalDonations', stats.totalDonations ?? allDonations.length ?? 0);
        text('totalVolunteers', stats.totalVolunteers ?? stats.volunteerSubmissions ?? allVolunteers.length ?? 0);
        text('totalMessages', stats.totalMessages ?? allMessages.length ?? 0);
        text('totalPickupRequests', stats.pickupRequests ?? 0);
        text('totalExpiringSoon', stats.expiringSoon ?? allDonations.filter((d) => d.expiresSoon).length);
        text('pendingVolunteerApprovals', stats.pendingVolunteerApprovals ?? allVolunteers.filter((v) => String(v.status || '').toLowerCase() === 'pending').length);
    };

    const renderRecent = (items = []) => {
        const listNode = document.getElementById('recentActivityList');
        if (!listNode) return;
        if (!items.length) {
            listNode.innerHTML = '<div class="empty-state">No recent activity yet.</div>';
            return;
        }
        listNode.innerHTML = items.slice(0, 10).map((item) => `
            <div class="activity-item">
                <div><strong>${esc(item.title || item.type || 'Activity')}</strong></div>
                <div>${esc(item.text || '')}</div>
                <div class="activity-time">${formatDate(item.created_at || item.updated_at)}</div>
            </div>
        `).join('');
    };

    const renderUsers = (users) => {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        if (!users.length) return empty('usersTableBody', 8, 'No users found.');

        tbody.innerHTML = users.map((user) => {
            const search = [user.fullName, user.email, user.role, user.city, user.phone].join(' ').toLowerCase();
            return `
                <tr data-search="${esc(search)}">
                    <td>${esc(user.id)}</td>
                    <td>${esc(user.fullName)}</td>
                    <td>${esc(user.email)}</td>
                    <td><span class="status-pill ${esc(user.role)}">${esc(String(user.role || 'unknown').toUpperCase())}</span></td>
                    <td>${esc(user.city)}</td>
                    <td>${esc(user.phone || 'N/A')}</td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <button class="btn-action btn-view" onclick='viewUser(${js(user.id)})'><i class="fas fa-eye"></i></button>
                        <button class="btn-action btn-delete" onclick='deleteUser(${js(user.id)}, ${js(user.fullName)})'><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        rowSearch('userSearch', 'usersTableBody');
    };

    const renderDonations = (donations) => {
        const tbody = document.getElementById('donationsTableBody');
        if (!tbody) return;
        if (!donations.length) return empty('donationsTableBody', 8, 'No donations found.');

        tbody.innerHTML = donations.map((donation) => {
            const search = [donation.foodName, donation.donorName, donation.category, donation.status, donation.address].join(' ').toLowerCase();
            const expiry = donation.expiresSoon ? ' <span class="badge unread">Expiring soon</span>' : '';
            return `
                <tr data-search="${esc(search)}">
                    <td>${esc(donation.id)}</td>
                    <td>${esc(donation.foodName)}${expiry}</td>
                    <td>${esc(donation.donorName || 'Unknown')}</td>
                    <td>${esc(donation.quantity)} ${esc(donation.unit || '')}</td>
                    <td>${esc(donation.category || 'N/A')}</td>
                    <td><span class="status-pill ${esc(donation.status)}">${esc(String(donation.status || 'unknown').toUpperCase())}</span></td>
                    <td>${formatDate(donation.created_at)}</td>
                    <td>
                        <button class="btn-action btn-view" onclick='viewDonation(${js(donation.id)})'><i class="fas fa-eye"></i></button>
                        <button class="btn-action btn-delete" onclick='deleteDonation(${js(donation.id)})'><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        rowSearch('donationSearch', 'donationsTableBody');
    };

    const renderVolunteers = (items) => {
        const tbody = document.getElementById('volunteersTableBody');
        if (!tbody) return;
        if (!items.length) return empty('volunteersTableBody', 9, 'No volunteers found.');

        tbody.innerHTML = items.map((volunteer) => {
            const search = [volunteer.fullName, volunteer.city, volunteer.role, volunteer.status, volunteer.email, volunteer.phone, volunteer.availability, volunteer.message].join(' ').toLowerCase();
            const status = String(volunteer.status || 'approved').toLowerCase();
            return `
                <tr data-search="${esc(search)}">
                    <td>${esc(volunteer.fullName)}</td>
                    <td>${esc(volunteer.city)}</td>
                    <td>${esc(volunteer.role)}</td>
                    <td>${esc(volunteer.availability || 'N/A')}</td>
                    <td>${esc(volunteer.email)}</td>
                    <td>${esc(volunteer.phone || 'N/A')}</td>
                    <td><span class="status-pill ${esc(status)}">${esc(status.toUpperCase())}</span></td>
                    <td>${formatDate(volunteer.created_at)}</td>
                    <td>
                        <button class="btn-action btn-view" onclick='viewVolunteer(${js(volunteer.id)})'><i class="fas fa-eye"></i></button>
                        ${status === 'pending' ? `<button class="btn-action btn-edit" onclick='approveVolunteer(${js(volunteer.id)}, ${js(volunteer.fullName)})'><i class="fas fa-check"></i></button>` : ''}
                        <button class="btn-action btn-delete" onclick='deleteVolunteer(${js(volunteer.id)}, ${js(volunteer.fullName)})'><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        rowSearch('volunteerSearch', 'volunteersTableBody');
    };

    const renderMessages = (items) => {
        const tbody = document.getElementById('messagesTableBody');
        if (!tbody) return;
        if (!items.length) return empty('messagesTableBody', 7, 'No messages found.');

        tbody.innerHTML = items.map((message) => {
            const search = [message.senderName, message.receiverName, message.donationTitle, message.message, message.isRead ? 'read' : 'unread'].join(' ').toLowerCase();
            return `
                <tr data-search="${esc(search)}">
                    <td>${esc(message.senderName)}</td>
                    <td>${esc(message.receiverName)}</td>
                    <td>${esc(message.donationTitle || 'General')}</td>
                    <td><span class="message-preview">${esc(message.message)}</span></td>
                    <td><span class="status-pill ${message.isRead ? 'read' : 'unread'}">${message.isRead ? 'READ' : 'UNREAD'}</span></td>
                    <td>${formatDate(message.created_at)}</td>
                    <td>
                        <button class="btn-action btn-view" onclick='viewMessage(${js(message.id)})'><i class="fas fa-eye"></i></button>
                        <button class="btn-action btn-delete" onclick='deleteMessage(${js(message.id)}, ${js(message.senderName)})'><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        rowSearch('messageSearch', 'messagesTableBody');
    };

    const renderSystem = (system, cleanup = {}) => {
        systemCache = { ...system, cleanup };
        text('dbSize', 'Supabase managed');
        text('memoryUsage', `${Math.max(0, Number(system.memoryUsedMb) || 0)} MB`);
        text('totalRecords', system.totalRecords ?? (allUsers.length + allDonations.length + allVolunteers.length + allMessages.length));
        text('lastBackup', localStorage.getItem('lastBackup') || 'Never');
        text('lastCleanup', system.lastCleanupAt ? formatDate(system.lastCleanupAt) : 'Never');
        text('serverUptime', formatUptime(system.uptimeSeconds));
        text('nodeVersion', system.nodeVersion || 'Unknown');
    };

    const formatUptime = (seconds) => {
        const total = Math.max(0, Number(seconds) || 0);
        const days = Math.floor(total / 86400);
        const hours = Math.floor((total % 86400) / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const deleteRecord = async (path, successMessage, refreshers = []) => {
        const payload = await api(path, { method: 'DELETE' });
        alert(payload.message || successMessage);
        await Promise.all(refreshers.map((fn) => Promise.resolve(fn())));
    };

    window.showSection = function (sectionName) {
        document.querySelectorAll('.section').forEach((section) => section.classList.remove('active'));
        document.getElementById(`${sectionName}-section`)?.classList.add('active');
        setActiveMenu(sectionName);
        text('sectionTitle', ({
            overview: 'Dashboard Overview',
            users: 'User Management',
            donations: 'Donation Management',
            volunteers: 'Volunteer Management',
            messages: 'Message Center',
            analytics: 'Analytics & Insights',
            database: 'Direct Database Access',
            system: 'System Monitor'
        })[sectionName] || 'Dashboard Overview');

        const loaders = {
            overview: window.loadOverviewData,
            users: window.loadUsers,
            donations: window.loadDonations,
            volunteers: window.loadVolunteers,
            messages: window.loadMessages,
            analytics: window.loadAnalytics,
            database: window.loadDatabaseInfo,
            system: window.loadSystemInfo
        };
        loaders[sectionName]?.();
    };

    window.refreshData = () => window.showSection(activeSection());
    window.toggleTheme = () => applyTheme(!document.body.classList.contains('dark-mode'));

    window.loadOverviewData = async function () {
        try {
            const payload = await api('/admin/overview');
            overviewCache = payload;
            allUsers = payload.users || [];
            allDonations = payload.donations || [];
            allVolunteers = payload.volunteers || [];
            allMessages = payload.messages || [];
            allNgos = payload.ngos || [];
            updateCards(payload.stats || {});
            renderRecent(payload.recentActivity || []);
            createUserGrowthChart(allUsers);
            createDonationStatusChart(allDonations);
            createCategoryChart(allDonations);
            createCityChart(allUsers);
            createMonthlyTrendChart(allDonations);
            createRoleChart(allUsers);
            createVolunteerRoleChart(allVolunteers.filter((volunteer) => String(volunteer.status || '').toLowerCase() !== 'pending'));
            updateIdentity();
        } catch (error) {
            console.error('Error loading overview:', error);
            alert('Error loading dashboard data. Please check the admin backend.');
        }
    };

    window.loadUsers = async function () {
        try {
            const payload = await api('/admin/users');
            allUsers = list(payload);
            renderUsers(allUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            empty('usersTableBody', 8, 'Unable to load users.');
        }
    };

    window.loadDonations = async function () {
        try {
            const payload = await api('/admin/donations');
            allDonations = list(payload);
            const status = document.getElementById('statusFilter')?.value || '';
            renderDonations(status ? allDonations.filter((donation) => donation.status === status) : allDonations);
        } catch (error) {
            console.error('Error loading donations:', error);
            empty('donationsTableBody', 8, 'Unable to load donations.');
        }
    };

    window.loadVolunteers = async function () {
        try {
            const payload = await api('/admin/volunteers');
            allVolunteers = list(payload);
            const role = document.getElementById('volunteerRoleFilter')?.value || '';
            renderVolunteers(role ? allVolunteers.filter((volunteer) => volunteer.role === role) : allVolunteers);
        } catch (error) {
            console.error('Error loading volunteers:', error);
            empty('volunteersTableBody', 9, 'Unable to load volunteers.');
        }
    };

    window.loadMessages = async function () {
        try {
            const payload = await api('/admin/messages');
            allMessages = list(payload);
            const filter = document.getElementById('messageFilter')?.value || '';
            const filtered = filter === 'read'
                ? allMessages.filter((message) => message.isRead)
                : filter === 'unread'
                    ? allMessages.filter((message) => !message.isRead)
                    : allMessages;
            renderMessages(filtered);
        } catch (error) {
            console.error('Error loading messages:', error);
            empty('messagesTableBody', 7, 'Unable to load messages.');
        }
    };

    window.loadAnalytics = async function () {
        try {
            const payload = overviewCache || await api('/admin/overview');
            createCategoryChart(payload.donations || allDonations);
            createCityChart(payload.users || allUsers);
            createMonthlyTrendChart(payload.donations || allDonations);
            createRoleChart(payload.users || allUsers);
            createVolunteerRoleChart((payload.volunteers || allVolunteers).filter((volunteer) => String(volunteer.status || '').toLowerCase() !== 'pending'));
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    };

    window.loadDatabaseInfo = function () {
        const sql = document.getElementById('sqlQuery');
        const results = document.getElementById('queryResults');
        if (sql) sql.value = 'SELECT * FROM donations ORDER BY created_at DESC LIMIT 10;';
        if (results) {
            results.innerHTML = '<div class="empty-state">Use the quick queries below to inspect live admin data.</div>';
        }
    };

    window.quickQuery = async function (type) {
        const results = document.getElementById('queryResults');
        if (!results) return;
        try {
            let data = [];
            if (type === 'users') data = list(await api('/admin/users'));
            else if (type === 'donations') data = list(await api('/admin/donations'));
            else if (type === 'recent') data = (overviewCache || await api('/admin/overview')).recentActivity || [];
            else if (type === 'stats') data = (overviewCache || await api('/admin/overview')).stats || {};
            results.innerHTML = `<div style="background: rgba(102, 126, 234, 0.08); padding: 15px; border-radius: 12px; margin-top: 15px;"><pre style="overflow:auto; max-height:400px; margin:0;">${esc(JSON.stringify(data, null, 2))}</pre></div>`;
        } catch (error) {
            results.innerHTML = `<div style="color:#dc3545; padding:15px;">${esc(error.message)}</div>`;
        }
    };

    window.loadSystemInfo = async function () {
        try {
            const payload = await api('/admin/system');
            renderSystem(payload.data || payload, overviewCache?.cleanup || {});
        } catch (error) {
            console.error('Error loading system info:', error);
            ['dbSize', 'memoryUsage', 'totalRecords', 'serverUptime', 'nodeVersion'].forEach((id) => text(id, 'Unavailable'));
        }
    };

    window.viewUser = function (userId) {
        const user = allUsers.find((item) => String(item.id) === String(userId));
        if (!user) return;
        alert(`User Details:\n\nName: ${user.fullName}\nEmail: ${user.email}\nRole: ${user.role}\nCity: ${user.city}\nPhone: ${user.phone || 'N/A'}\nJoined: ${formatDate(user.created_at)}`);
    };

    window.viewDonation = function (donationId) {
        const donation = allDonations.find((item) => String(item.id) === String(donationId));
        if (!donation) return;
        alert(`Donation Details:\n\nFood: ${donation.foodName}\nDonor: ${donation.donorName}\nQuantity: ${donation.quantity} ${donation.unit || ''}\nStatus: ${donation.status}\nAddress: ${donation.address || 'N/A'}\nCreated: ${formatDate(donation.created_at)}`);
    };

    window.viewVolunteer = function (volunteerId) {
        const volunteer = allVolunteers.find((item) => String(item.id) === String(volunteerId));
        if (!volunteer) return;
        alert(`Volunteer Details:\n\nName: ${volunteer.fullName}\nCity: ${volunteer.city}\nRole: ${volunteer.role}\nStatus: ${(volunteer.status || 'approved').toUpperCase()}\nAvailability: ${volunteer.availability || 'N/A'}\nEmail: ${volunteer.email}\nPhone: ${volunteer.phone || 'N/A'}\nMessage: ${volunteer.message || 'N/A'}`);
    };

    window.viewMessage = function (messageId) {
        const message = allMessages.find((item) => String(item.id) === String(messageId));
        if (!message) return;
        alert(`Message Details:\n\nFrom: ${message.senderName}\nTo: ${message.receiverName}\nDonation: ${message.donationTitle || 'General'}\nStatus: ${message.isRead ? 'Read' : 'Unread'}\n\n${message.message}`);
    };

    window.deleteUser = async function (userId, userName) {
        if (!confirm(`Delete user ${userName}? This also removes their donations.`)) return;
        try {
            await deleteRecord(`/admin/users/${userId}`, 'User deleted successfully', [window.loadUsers, window.loadOverviewData]);
        } catch (error) {
            alert(error.message || 'Error deleting user');
        }
    };

    window.deleteDonation = async function (donationId) {
        if (!confirm('Delete this donation?')) return;
        try {
            await deleteRecord(`/admin/donations/${donationId}`, 'Donation deleted successfully', [window.loadDonations, window.loadOverviewData]);
        } catch (error) {
            alert(error.message || 'Error deleting donation');
        }
    };

    window.deleteVolunteer = async function (volunteerId, volunteerName) {
        if (!confirm(`Delete volunteer ${volunteerName}?`)) return;
        try {
            await deleteRecord(`/admin/volunteers/${volunteerId}`, 'Volunteer deleted successfully', [window.loadVolunteers, window.loadOverviewData]);
        } catch (error) {
            alert(error.message || 'Error deleting volunteer');
        }
    };

    window.approveVolunteer = async function (volunteerId, volunteerName) {
        if (!confirm(`Approve ${volunteerName} as a volunteer?`)) return;
        try {
            const payload = await api(`/admin/volunteers/${volunteerId}/approve`, { method: 'PATCH' });
            alert(payload.message || 'Volunteer approved successfully');
            await Promise.all([window.loadVolunteers(), window.loadOverviewData()]);
        } catch (error) {
            alert(error.message || 'Error approving volunteer');
        }
    };

    window.deleteMessage = async function (messageId, senderName) {
        if (!confirm(`Delete message from ${senderName}?`)) return;
        try {
            await deleteRecord(`/admin/messages/${messageId}`, 'Message deleted successfully', [window.loadMessages, window.loadOverviewData]);
        } catch (error) {
            alert(error.message || 'Error deleting message');
        }
    };

    window.cleanupExpiredDonations = async function () {
        if (!confirm('Clean up expired available donations now?')) return;
        try {
            const payload = await api('/admin/cleanup-expired', { method: 'POST' });
            alert(`Expired donations cleaned successfully. Removed ${payload.deletedCount ?? payload.expiredCount ?? 0} record(s).`);
            await Promise.all([window.loadOverviewData(), window.loadDonations(), window.loadSystemInfo()]);
        } catch (error) {
            alert(error.message || 'Unable to clean expired donations');
        }
    };

    window.exportData = function () {
        const section = activeSection();
        const data = section === 'overview'
            ? { users: allUsers, donations: allDonations, volunteers: allVolunteers, messages: allMessages, ngos: allNgos, stats: overviewCache?.stats || {} }
            : section === 'users'
                ? allUsers
                : section === 'donations'
                    ? allDonations
                    : section === 'volunteers'
                        ? allVolunteers
                        : section === 'messages'
                            ? allMessages
                            : section === 'analytics'
                                ? overviewCache?.charts || {}
                                : section === 'system'
                                    ? systemCache || {}
                                    : {};

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `feedlink-${section}-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    window.logout = function () {
        if (confirm('Are you sure you want to logout?')) {
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
            window.location.href = 'admin-login.html';
        }
    };

    window.updateSessionInfo = function () {
        const session = getAdminSession();
        if (!session) return;
        text('loginTime', session.loginTime ? new Date(session.loginTime).toLocaleString() : '--');
        if (session.loginTime) {
            const elapsed = Math.floor((Date.now() - new Date(session.loginTime).getTime()) / 1000);
            text('sessionDuration', `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`);
        }
        updateIdentity();
    };

    window.toggleTheme = () => applyTheme(!document.body.classList.contains('dark-mode'));

    function createVolunteerRoleChart(volunteers) {
        const ctx = document.getElementById('volunteerRoleChart');
        if (!ctx) return;
        const counts = {};
        volunteers.forEach((item) => {
            const role = item.role || 'Volunteer';
            counts[role] = (counts[role] || 0) + 1;
        });
        if (charts.volunteerRole) charts.volunteerRole.destroy();
        charts.volunteerRole = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{ data: Object.values(counts), backgroundColor: ['#667eea', '#43e97b', '#4facfe', '#ffc107', '#f093fb'] }]
            },
            options: { responsive: true, maintainAspectRatio: true }
        });
    }

    function start() {
        initTheme();
        updateIdentity();
        window.loadSystemInfo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
