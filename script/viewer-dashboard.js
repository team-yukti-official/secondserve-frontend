(function(){
  const DONOR_BADGES = [
    { id:'seed', emoji:'🌱', name:'Seed Donor', req:1, cssClass:'badge-seed' },
    { id:'sprout', emoji:'🌿', name:'Sprout', req:5, cssClass:'badge-sprout' },
    { id:'guardian', emoji:'🛡️', name:'Food Guardian', req:10, cssClass:'badge-guardian' },
    { id:'champion', emoji:'⚡', name:'Champion', req:25, cssClass:'badge-champion' },
    { id:'hero', emoji:'🔥', name:'Community Hero', req:50, cssClass:'badge-hero' },
    { id:'legend', emoji:'⭐', name:'Legend', req:100, cssClass:'badge-legend' },
    { id:'titan', emoji:'💎', name:'Titan', req:200, cssClass:'badge-titan' },
    { id:'immortal', emoji:'👑', name:'Immortal Giver', req:500, cssClass:'badge-immortal' }
  ];

  const BASE = (typeof API_CONFIG!=='undefined' ? API_CONFIG.BASE_URL : null) || localStorage.getItem('apiBaseUrl') || 'http://localhost:5000/api';
  const TK = (typeof API_CONFIG!=='undefined' ? API_CONFIG.TOKEN_KEY : null) || 'feedlink_auth_token';

  function getToken(){ return sessionStorage.getItem(TK) || localStorage.getItem(TK); }

  async function fetchAPI(path){
    const token = getToken();
    const headers = {'Accept':'application/json'};
    if(token) headers.Authorization = 'Bearer ' + token;

    const res = await fetch(BASE + path, {
      headers
    });

    if(res.status === 401 || res.status === 403){
      throw new Error('Unauthorized');
    }

    if(!res.ok){
      const t = await res.text();
      const err = new Error(t || res.statusText || 'Request failed');
      err.status = res.status;
      throw err;
    }

    return res.json();
  }

  function getProfileId(){
    const q = new URLSearchParams(window.location.search);
    return q.get('userId') || q.get('id') || '';
  }

  function fmtDate(value){
    if(!value) return '-';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  }

  function escapeHtml(text){
    if (text === null || text === undefined) return '';
    const map = {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#039;'};
    return String(text).replace(/[&<>\"']/g, m => map[m]);
  }

  function renderProfile(profile){
    const avatarImg = document.getElementById('avatarImg');
    const avatarInitial = document.getElementById('avatarInitial');
    const name = document.getElementById('dispName');
    const role = document.getElementById('dispSub');
    const address = document.getElementById('vAddr');
    const email = document.getElementById('vEmail');
    const phone = document.getElementById('vPhone');
    const joined = document.getElementById('vJoined');
    const topName = document.getElementById('topName');
    const vName = document.getElementById('vName');
    const aboutText = document.getElementById('aboutText');
    const verifiedTag = document.getElementById('verifiedTag');
    const profileTypeTag = document.getElementById('profileTypeTag');
    const dashTitle = document.getElementById('dashTitle');
    const dashSubtitle = document.getElementById('dashSubtitle');
    const websiteWrap = document.getElementById('websiteWrap');
    const websiteLink = document.getElementById('websiteLink');

    name.textContent = profile.displayName || 'Community Member';
    const roleText = (profile.userType || 'member').toUpperCase() + ' PROFILE';
    role.textContent = roleText;
    profileTypeTag.textContent = roleText;
    topName.textContent = profile.displayName || 'Profile Viewer';
    vName.textContent = profile.displayName || 'Community Member';
    dashTitle.textContent = (profile.displayName || 'Community Member') + ' Dashboard';
    dashSubtitle.textContent = (profile.userType || 'member').toUpperCase() === 'NGO'
      ? 'Public NGO impact summary and pickup activity'
      : 'Public donor contribution summary and activity';
    address.textContent = profile.address || 'Not provided';
    email.textContent = profile.privacy?.email || 'Hidden for privacy';
    phone.textContent = profile.privacy?.phone || 'Hidden for privacy';
    joined.textContent = fmtDate(profile.joinedAt);

    const about = profile.organization?.mission || profile.organization?.impactStatement || profile.bio || 'No profile description available yet.';
    aboutText.textContent = about;

    if(profile.organization?.website){
      websiteWrap.style.display = 'block';
      websiteLink.href = profile.organization.website;
      websiteLink.textContent = profile.organization.website;
    }else{
      websiteWrap.style.display = 'none';
    }

    if(profile.verified){
      verifiedTag.style.display = 'inline-flex';
    }else{
      verifiedTag.style.display = 'none';
    }

    if(profile.profileImage){
      avatarImg.src = profile.profileImage;
      avatarImg.style.display = 'block';
      avatarInitial.style.display = 'none';
    } else {
      const initial = (profile.displayName || 'U').trim().charAt(0).toUpperCase() || 'U';
      avatarInitial.textContent = initial;
      avatarInitial.style.display = 'inline';
      avatarImg.style.display = 'none';
    }
  }

  function renderStats(stats, profile){
    const container = document.getElementById('statsGrid');
    const userType = String(profile && profile.userType || '').toLowerCase();
    container.classList.toggle('ngo-wide', userType === 'ngo');
    const cards = Array.isArray(stats.cards) ? stats.cards : [];
    if(!cards.length){
      container.innerHTML = '<div class="stat-card sc-green"><div class="s-icon si-g"><i class="fas fa-chart-line"></i></div><div class="s-val">0</div><div class="s-lbl">Stats</div></div>';
      return;
    }

    const iconClasses = ['si-g','si-o','si-b','si-p'];
    const cardClasses = ['sc-green','sc-orange','sc-blue','sc-purple'];
    const icons = ['fa-chart-line','fa-heart','fa-hands-helping','fa-check-circle'];

    container.innerHTML = cards.map((card, index) => {
      return '<article class="stat-card ' + cardClasses[index % cardClasses.length] + '">'
        + '<div class="s-icon ' + iconClasses[index % iconClasses.length] + '"><i class="fas ' + icons[index % icons.length] + '"></i></div>'
        + '<div class="s-val">' + escapeHtml(String(card.value ?? 0)) + '</div>'
        + '<div class="s-lbl">' + escapeHtml(card.label || 'Metric') + '</div>'
        + '</article>';
    }).join('');

    const cardLabels = cards.map(c => c.label || 'Metric');
    document.getElementById('psA').textContent = String(cards[0]?.value ?? 0);
    document.getElementById('psB').textContent = String(cards[1]?.value ?? 0);
    document.getElementById('psC').textContent = String(cards[2]?.value ?? 0);
    document.getElementById('psALabel').textContent = cardLabels[0] || 'Metric A';
    document.getElementById('psBLabel').textContent = cardLabels[1] || 'Metric B';
    document.getElementById('psCLabel').textContent = cardLabels[2] || 'Metric C';
  }

  function renderEssentials(profile, stats){
    const essentialsList = document.getElementById('essentialsList');
    if(!essentialsList) return;

    const isDonor = String(profile && profile.userType || '').toLowerCase() === 'donor';
    const summary = stats && typeof stats.summary === 'object' ? stats.summary : {};
    const joined = fmtDate(profile && profile.joinedAt);
    const hasLocation = !!(profile && profile.address);
    const verification = profile && profile.verified ? 'Verified profile' : 'Not verified yet';

    const roleSpecific = isDonor
      ? ('Total donations: ' + String(summary.totalDonations ?? extractTotalDonations(stats)))
      : ('Total requests: ' + String(summary.totalRequests ?? 0));

    const activitySignal = isDonor
      ? ('Pickup success: ' + String(summary.pickupSuccessRate ?? '0%'))
      : ('Completion rate: ' + String(summary.completionRate ?? '0%'));

    const essentials = [
      { title:'Profile Type', value:(String(profile && profile.userType || 'member').toUpperCase() + ' PROFILE') },
      { title:'Trust Status', value:verification },
      { title:'Member Since', value:joined },
      { title:'Location Visibility', value:hasLocation ? 'Location shared publicly' : 'Location not provided' },
      { title:'Privacy', value:'Email and phone are hidden for safe viewing' },
      { title:'Activity Signal', value:activitySignal },
      { title:'Contribution Snapshot', value:roleSpecific }
    ];

    essentialsList.innerHTML = essentials.map(item => {
      return '<div class="summary-item">'
        + '<div class="summary-dot"></div>'
        + '<div>'
        + '<div class="summary-k">' + escapeHtml(item.title) + '</div>'
        + '<div class="summary-v">' + escapeHtml(item.value) + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  function getFoodIcon(foodName){
    const name = String(foodName || '').toLowerCase().trim();
    const iconMap = {
      'rice': 'fa-bowl-rice',
      'vegetables': 'fa-leaf',
      'vegetable': 'fa-leaf',
      'carrot': 'fa-carrot-alt',
      'apple': 'fa-apple-whole',
      'fruit': 'fa-apple-whole',
      'bread': 'fa-bread-slice',
      'milk': 'fa-glass-water',
      'meat': 'fa-drumstick-bite',
      'chicken': 'fa-drumstick-bite',
      'fish': 'fa-fish',
      'pasta': 'fa-utensils',
      'tomato': 'fa-tomato',
      'egg': 'fa-egg',
      'eggs': 'fa-egg',
      'potato': 'fa-potato',
      'potatoes': 'fa-potato',
      'cheese': 'fa-cheese',
      'cookie': 'fa-cookie',
      'cookies': 'fa-cookie',
      'cake': 'fa-cake-candles',
      'beans': 'fa-seedling',
      'lentils': 'fa-seedling',
      'grains': 'fa-wheat',
      'corn': 'fa-corn',
      'pepper': 'fa-pepper-hot',
      'onion': 'fa-circle-half-stroke'
    };

    for(const [key, icon] of Object.entries(iconMap)){
      if(name.includes(key)) return icon;
    }

    return 'fa-gift';
  }

  function renderActivity(stats){
    const list = document.getElementById('activityList');
    const activity = Array.isArray(stats.recentActivity) ? stats.recentActivity : [];

    if(!activity.length){
      list.innerHTML = '<div class="empty"><i class="fas fa-history"></i><p>No public activity yet.</p></div>';
      return;
    }

    list.innerHTML = activity.map(item => {
      const statusRaw = String(item.status || 'updated').toLowerCase();
      const statusClass = statusRaw === 'completed' ? 'done' : statusRaw === 'accepted' ? 'ok' : statusRaw === 'pending' ? 'wait' : 'info';
      const iconClass = getFoodIcon(item.title);

      return '<div class="viewer-item">'
        + '<div class="fdot db"><i class="fas ' + iconClass + '"></i></div>'
        + '<div class="activity-content">'
        + '<div class="ftext"><strong>' + escapeHtml(item.title || 'Activity') + '</strong></div>'
        + '<div class="ftime">' + escapeHtml(item.meta || '') + ' • ' + escapeHtml(fmtDate(item.date)) + '</div>'
        + '<div class="activity-bottom">'
        + '<span class="activity-pill ' + statusClass + '">' + escapeHtml(item.status || 'updated') + '</span>'
        + '<a class="activity-action" href="index.html#food-listings">See Donations</a>'
        + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  function renderError(message){
    document.getElementById('viewerLayout').innerHTML = '<div class="card"><div class="empty"><i class="fas fa-triangle-exclamation"></i><p>' + escapeHtml(message || 'Unable to load profile') + '</p></div></div>';
  }

  function getCurrentDonorBadge(donationCount){
    if(donationCount < DONOR_BADGES[0].req) return null;
    let current = DONOR_BADGES[0];
    for(const b of DONOR_BADGES){
      if(donationCount >= b.req) current = b;
      else break;
    }
    return current;
  }

  function getNextDonorBadge(donationCount){
    for(const b of DONOR_BADGES){
      if(donationCount < b.req) return b;
    }
    return null;
  }

  function extractTotalDonations(stats){
    if(stats && stats.summary && typeof stats.summary.totalDonations === 'number'){
      return stats.summary.totalDonations;
    }
    const cards = Array.isArray(stats && stats.cards) ? stats.cards : [];
    for(const card of cards){
      const label = String(card && card.label || '').toLowerCase();
      if(label.includes('donation')){
        const val = Number(card.value);
        return Number.isFinite(val) ? val : 0;
      }
    }
    return 0;
  }

  function renderDonorBadge(profile, stats){
    const badgeWrap = document.getElementById('profileBadgeWrap');
    const badgePill = document.getElementById('viewerBadgePill');
    const badgeIcon = document.getElementById('viewerBadgeIcon');
    const badgeName = document.getElementById('viewerBadgeName');
    const badgeHint = document.getElementById('donorBadgeHint');
    if(!badgeWrap || !badgePill || !badgeIcon || !badgeName || !badgeHint) return;

    const isDonor = String(profile && profile.userType || '').toLowerCase() === 'donor';
    if(!isDonor){
      badgeWrap.style.display = 'none';
      return;
    }

    badgeWrap.style.display = 'flex';
    const donationCount = extractTotalDonations(stats);
    const current = getCurrentDonorBadge(donationCount);
    const next = getNextDonorBadge(donationCount);

    if(current){
      badgePill.className = 'donor-badge-pill ' + current.cssClass;
      badgeIcon.textContent = current.emoji;
      badgeName.textContent = current.name;
      badgeHint.textContent = next
        ? ('Next badge: ' + next.name + ' at ' + next.req + ' donations')
        : 'Top tier unlocked. Outstanding impact!';
    }else{
      badgePill.className = 'donor-badge-pill badge-none';
      badgeIcon.textContent = '🔒';
      badgeName.textContent = 'No Badge';
      badgeHint.textContent = 'Donate to earn badges. First badge unlocks at 1 donation.';
    }
  }

  let _toastTimer;
  function toast(msg,type){
    const el = document.getElementById('toast');
    if(!el) return;
    const icons = {success:'fa-check-circle',error:'fa-times-circle',info:'fa-info-circle'};
    el.className = 'toast ' + (type || 'info') + ' show';
    document.getElementById('ti').className = 'ti fas ' + (icons[type || 'info'] || icons.info);
    document.getElementById('tm').textContent = msg;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 3200);
  }

  function buildFallbackStats(userType){
    if(String(userType || '').toLowerCase() === 'ngo'){
      return {
        cards:[
          {label:'Total Requests', value:0},
          {label:'Accepted Pickups', value:0},
          {label:'Meals Distributed', value:0},
          {label:'Donors Connected', value:0}
        ],
        summary:{ totalRequests:0, acceptedPickups:0, completedPickups:0, mealsDistributed:0, donorsConnected:0, completionRate:'0%' },
        recentActivity:[]
      };
    }

    return {
      cards:[
        {label:'Total Donations', value:0},
        {label:'Meals Shared', value:0},
        {label:'NGOs Helped', value:0},
        {label:'Pickup Success Rate', value:'0%'}
      ],
      summary:{ totalDonations:0, completedDonations:0, mealsShared:0, ngosHelped:0, pickupSuccessRate:'0%' },
      recentActivity:[]
    };
  }

  function mapUserFallbackProfile(raw){
    return {
      id: raw.id || null,
      displayName: raw.full_name || 'Community Member',
      userType: raw.user_type || 'member',
      address: raw.address || null,
      bio: raw.bio || null,
      profileImage: raw.profile_image || null,
      verified: !!raw.verified,
      joinedAt: raw.created_at,
      organization: null,
      privacy: {
        email: 'Hidden for privacy',
        phone: 'Hidden for privacy'
      }
    };
  }

  function normalizeTopDonors(payload){
    if(Array.isArray(payload)) return payload;
    if(payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  function openViewerProfile(userId){
    if(!userId) return;
    window.location.href = 'viewer-dashboard.html?userId=' + encodeURIComponent(userId);
  }

  function renderTopDonorsLeaderboard(viewedProfile, topDonors){
    const container = document.getElementById('topDonorsList');
    const scrollWrap = document.getElementById('topDonorsScroll');
    const sticky = document.getElementById('currentDonorSticky');
    if(!container || !scrollWrap || !sticky) return;

    const list = normalizeTopDonors(topDonors);
    const useScrollableMode = list.length >= 6;

    scrollWrap.classList.toggle('is-scrollable', useScrollableMode);

    if(!list.length){
      container.innerHTML = '<div class="empty"><i class="fas fa-trophy"></i><p>No donor rankings available yet.</p></div>';
      sticky.style.display = 'none';
      return;
    }

    const viewedId = viewedProfile && viewedProfile.id ? String(viewedProfile.id) : '';
    const viewedType = String(viewedProfile && viewedProfile.userType || '').toLowerCase();

    container.innerHTML = list.map((donor, index) => {
      const rank = index + 1;
      const rankText = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
      const isCurrent = viewedType === 'donor' && viewedId && String(donor.id || '') === viewedId;
      const donations = Number(donor.donations || 0);
      const canOpen = !!donor.id && !isCurrent;
      const nameClass = 'leader-name' + (canOpen ? ' clickable' : '');
      const clickAction = canOpen ? ' onclick="openViewerProfile(\'' + escapeHtml(String(donor.id)) + '\')" title="View profile"' : '';

      return '<div class="leader-item' + (isCurrent ? ' current' : '') + '" data-donor-id="' + escapeHtml(String(donor.id || '')) + '">'
        + '<div class="leader-rank ' + (rank <= 3 ? 'gold' : '') + '">' + rankText + '</div>'
        + '<div class="' + nameClass + '"' + clickAction + '>' + escapeHtml(donor.name || 'Anonymous Donor') + (isCurrent ? '<span class="leader-badge">This profile</span>' : '') + '</div>'
        + '<div class="leader-count">' + donations + ' donation' + (donations === 1 ? '' : 's') + '</div>'
        + '</div>';
    }).join('');

    if(scrollWrap._leaderScrollHandler){
      scrollWrap.removeEventListener('scroll', scrollWrap._leaderScrollHandler);
      scrollWrap._leaderScrollHandler = null;
    }

    if(!useScrollableMode){
      scrollWrap.style.maxHeight = '';
      sticky.style.display = 'none';
      return;
    }

    // Fit viewport to roughly 5 rows so ranks after 5 appear via scrolling.
    const sampleRow = container.querySelector('.leader-item');
    if(sampleRow){
      const rowHeight = sampleRow.offsetHeight || 48;
      scrollWrap.style.maxHeight = (rowHeight * 5 + 6) + 'px';
    }

    if(viewedType !== 'donor' || !viewedId){
      sticky.style.display = 'none';
      return;
    }

    const currentIndex = list.findIndex(donor => String(donor.id || '') === viewedId);
    if(currentIndex < 0){
      sticky.innerHTML = '<div class="leader-rank">•</div><div class="leader-name">This donor is not ranked yet.</div>';
      sticky.style.display = 'flex';
      return;
    }

    const current = list[currentIndex];
    const rank = currentIndex + 1;
    const rankText = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
    const donations = Number(current.donations || 0);
    sticky.innerHTML = '<div class="leader-rank ' + (rank <= 3 ? 'gold' : '') + '">' + rankText + '</div>'
      + '<div class="leader-name">' + escapeHtml(current.name || 'Anonymous Donor') + '<span class="leader-badge">This profile</span></div>'
      + '<div class="leader-count">' + donations + ' donation' + (donations === 1 ? '' : 's') + '</div>';

    const currentRow = container.querySelector('[data-donor-id="' + viewedId + '"]');
    if(currentRow){
      sticky.style.cursor = 'pointer';
      sticky.title = 'Jump to your actual rank';
      sticky.onclick = function(){
        const targetTop = Math.max(0, currentRow.offsetTop - Math.max(8, Math.floor(scrollWrap.clientHeight * 0.35)));
        scrollWrap.scrollTo({ top: targetTop, behavior: 'smooth' });
      };
    }else{
      sticky.style.cursor = 'default';
      sticky.title = '';
      sticky.onclick = null;
    }

    const updateStickyVisibility = function(){
      if(!currentRow){
        sticky.style.display = 'flex';
        return;
      }
      const rowTop = currentRow.offsetTop;
      const rowBottom = rowTop + currentRow.offsetHeight;
      const viewTop = scrollWrap.scrollTop;
      const viewBottom = viewTop + scrollWrap.clientHeight;
      const isVisible = rowBottom > viewTop && rowTop < viewBottom;
      sticky.style.display = isVisible ? 'none' : 'flex';
    };

    scrollWrap._leaderScrollHandler = updateStickyVisibility;
    scrollWrap.addEventListener('scroll', updateStickyVisibility, { passive: true });
    // Ensure correct visibility after browser performs final layout.
    requestAnimationFrame(updateStickyVisibility);
    setTimeout(updateStickyVisibility, 0);
  }

  async function init(){
    const profileId = getProfileId();
    if(!profileId){
      renderError('No profile selected.');
      return;
    }

    try{
      let profile = null;
      try{
        profile = await fetchAPI('/users/public/' + encodeURIComponent(profileId));
      }catch(publicProfileError){
        const userFallback = await fetchAPI('/users/' + encodeURIComponent(profileId));
        profile = mapUserFallbackProfile(userFallback || {});
      }

      let stats = null;
      try{
        stats = await fetchAPI('/users/public/' + encodeURIComponent(profileId) + '/stats');
      }catch(publicStatsError){
        stats = buildFallbackStats(profile && profile.userType);
      }

      let topDonors = [];
      try{
        topDonors = await fetchAPI('/donations/top-donors');
      }catch(topDonorsError){
        topDonors = [];
      }

      renderProfile(profile || {});
      renderStats(stats || {}, profile || {});
      renderTopDonorsLeaderboard(profile || {}, topDonors);
      renderActivity(stats || {});
      renderDonorBadge(profile || {}, stats || {});
    }catch(error){
      const details = error && error.message ? error.message : 'Unknown error';
      renderError('Could not load this profile dashboard. ' + details);
      toast('Unable to load profile data','error');
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    window.openViewerProfile = openViewerProfile;

    document.getElementById('backBtn').addEventListener('click', function(){
      if(window.history.length > 1) window.history.back();
      else window.location.href = 'index.html';
    });

    const darkBtn = document.getElementById('darkBtn');
    const darkIcon = document.getElementById('darkIcon');
    if(localStorage.getItem('feedlink_dark') === '1'){
      document.body.classList.add('dark-mode');
      darkIcon.className = 'fas fa-sun';
    }
    darkBtn.addEventListener('click', function(){
      document.body.classList.toggle('dark-mode');
      const on = document.body.classList.contains('dark-mode');
      localStorage.setItem('feedlink_dark', on ? '1' : '0');
      darkIcon.className = on ? 'fas fa-sun' : 'fas fa-moon';
    });

    init();
  });
})();