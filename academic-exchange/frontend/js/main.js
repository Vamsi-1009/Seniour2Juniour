// State
let currentUser = null;
let allListings = [];
let activeCategory = 'all';
let activeCondition = 'all';
let locationFilter = null; // { lat, lng, radius }
let filterMap = null;
let filterMarker = null;
let filterCircle = null;
let sellMap = null;
let sellMarker = null;
let sellCoords = null; // { lat, lng }
let socket = null;
let currentChatReceiverId = null;
let currentChatListingId = null;

const API = '/api';

// ============================
// INIT
// ============================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadListings();
    setupSearch();
    setupClickOutside();
});

// ============================
// AUTH
// ============================
function checkAuth() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            updateNav();
            initSocket();
        } catch (e) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
}

function updateNav() {
    const nav = document.getElementById('navMenu');
    if (currentUser) {
        const initials = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?';
        const displayName = currentUser.name || 'User';
        nav.innerHTML = `
            <div class="profile-nav-btn" id="profileNavBtn" onclick="toggleDropdown(event)">
                <div class="profile-avatar">${initials}</div>
                <span class="profile-username">${displayName}</span>
                <span class="dropdown-arrow">▾</span>
            </div>
        `;
    } else {
        nav.innerHTML = `
            <button class="nav-btn" onclick="showLogin()">Login</button>
            <button class="nav-btn primary" onclick="showRegister()">Sign Up</button>
        `;
    }
}

function toggleDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    const btn = document.getElementById('profileNavBtn');
    const rect = btn.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    dropdown.classList.toggle('show');
}

function closeDropdown() {
    document.getElementById('profileDropdown').classList.remove('show');
}

function setupClickOutside() {
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            if (!e.target.closest('#profileNavBtn') && !e.target.closest('#profileDropdown')) {
                closeDropdown();
            }
        }
    });
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const res = await fetch(API + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            closeModal('loginModal');
            updateNav();
            initSocket();
            showToast('Welcome back, ' + data.user.name + '!', 'success');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    try {
        const res = await fetch(API + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            closeModal('registerModal');
            updateNav();
            initSocket();
            showToast('Account created! Welcome, ' + data.user.name + '!', 'success');
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
    }
}

function logout() {
    closeDropdown();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    if (socket) { socket.disconnect(); socket = null; }
    updateNav();
    showToast('Logged out successfully', 'info');
    loadListings();
}

// ============================
// CHANGE PASSWORD
// ============================
function showChangePassword() {
    document.getElementById('changePasswordForm').reset();
    document.getElementById('changePasswordMsg').textContent = '';
    showModal('changePasswordModal');
}

async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const msgEl = document.getElementById('changePasswordMsg');

    if (newPassword !== confirmPassword) {
        msgEl.textContent = 'New passwords do not match.';
        msgEl.className = 'form-message error';
        return;
    }
    if (newPassword.length < 6) {
        msgEl.textContent = 'Password must be at least 6 characters.';
        msgEl.className = 'form-message error';
        return;
    }

    try {
        const res = await fetch(API + '/auth/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (data.success) {
            msgEl.textContent = 'Password changed successfully!';
            msgEl.className = 'form-message success';
            document.getElementById('changePasswordForm').reset();
        } else {
            msgEl.textContent = data.error || 'Failed to change password.';
            msgEl.className = 'form-message error';
        }
    } catch (err) {
        msgEl.textContent = 'Network error. Please try again.';
        msgEl.className = 'form-message error';
    }
}

// ============================
// LISTINGS
// ============================
async function loadListings() {
    const grid = document.getElementById('listingsGrid');
    grid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading listings...</p></div>';
    try {
        const params = new URLSearchParams();
        if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
        if (activeCondition && activeCondition !== 'all') params.set('condition', activeCondition);
        const sort = document.getElementById('sortSelect') ? document.getElementById('sortSelect').value : '';
        if (sort) params.set('sort', sort);
        if (locationFilter) {
            params.set('lat', locationFilter.lat);
            params.set('lng', locationFilter.lng);
            params.set('radius', locationFilter.radius);
        }
        const res = await fetch(API + '/listings?' + params.toString());
        const data = await res.json();
        if (data.success) {
            allListings = data.listings;
            // Update hero stat counter
            const statEl = document.getElementById('statListings');
            if (statEl) statEl.textContent = data.listings.length;
            applySearchFilter();
        } else {
            grid.innerHTML = '<div class="loading-state">Failed to load listings.</div>';
        }
    } catch (err) {
        grid.innerHTML = '<div class="loading-state">Server connection error.</div>';
    }
}

function applySearchFilter() {
    const query = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
    let filtered = allListings;
    if (query) {
        filtered = allListings.filter(l =>
            l.title.toLowerCase().includes(query) ||
            (l.description && l.description.toLowerCase().includes(query))
        );
    }
    renderListings(filtered);
}

function renderListings(listings) {
    const grid = document.getElementById('listingsGrid');
    // Update section listing count
    const countEl = document.getElementById('listingCount');
    if (countEl) countEl.textContent = listings ? listings.length : 0;

    if (!listings || listings.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>No listings found</p><small>Try adjusting your filters or be the first to post!</small></div>';
        return;
    }

    const categoryIcons = {
        'Books': '📚', 'Electronics': '💻', 'Notes': '📓', 'Lab Equipment': '🔬',
        'Stationery': '✏️', 'Sports': '⚽', 'Clothing': '👕', 'Other': '📦'
    };

    grid.innerHTML = listings.map((item, idx) => {
        const img = item.images && item.images.length > 0 ? item.images[0] : '';
        const imgEl = img
            ? `<img src="${img}" class="card-image" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'card-image-placeholder\'>📷</div>'">`
            : '<div class="card-image-placeholder">📷</div>';
        const condBadge = item.condition === 'New' ? 'badge-new' : 'badge-used';
        const catIcon = categoryIcons[item.category] || '📦';
        const initials = item.seller_name ? item.seller_name.charAt(0).toUpperCase() : '?';
        return `
            <div class="card" onclick="viewListing('${item.listing_id}')" style="animation-delay:${idx * 0.05}s">
                <div class="card-image-wrap">
                    ${imgEl}
                    <button class="card-wish" onclick="event.stopPropagation(); toggleWish(this, '${item.listing_id}')" title="Wishlist">♡</button>
                    <span class="card-category">${catIcon} ${escapeHtml(item.category || 'Other')}</span>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${escapeHtml(item.title)}</h3>
                    <p class="card-price">₹${Number(item.price).toLocaleString('en-IN')}</p>
                    <div class="card-meta">
                        <span class="badge ${condBadge}">${item.condition}</span>
                        <span class="card-location">📍 ${escapeHtml(item.location || 'Online')}</span>
                    </div>
                    <div class="card-seller">
                        <div class="seller-chip">${initials}</div>
                        <span>${escapeHtml(item.seller_name || 'Unknown')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleWish(btn, listingId) {
    const wished = btn.classList.toggle('wished');
    btn.textContent = wished ? '♥' : '♡';
    if (wished) showToast('Added to wishlist', 'success');
}

async function viewListing(id) {
    try {
        const res = await fetch(API + '/listings/' + id);
        const data = await res.json();
        if (!data.success) return showToast('Failed to load listing', 'error');
        const l = data.listing;
        const imgs = l.images && l.images.length > 0
            ? `<div class="listing-images">${l.images.map(img => `<img src="${img}" class="listing-img" alt="listing image">`).join('')}</div>`
            : '<div class="listing-img-placeholder">📷 No images</div>';

        const isOwner = currentUser && currentUser.user_id === l.user_id;
        const contactBtn = !isOwner && currentUser
            ? `<button class="btn btn-primary" onclick="startChat('${l.user_id}', '${l.listing_id}', '${escapeHtml(l.seller_name)}')">💬 Contact Seller</button>`
            : (!currentUser ? `<button class="btn btn-primary" onclick="showLogin()">Login to Contact</button>` : '');
        const deleteBtn = isOwner
            ? `<button class="btn btn-danger" onclick="deleteListing('${l.listing_id}')">🗑 Delete</button>`
            : '';

        document.getElementById('listingDetail').innerHTML = `
            ${imgs}
            <h2 style="margin:1rem 0 0.5rem">${escapeHtml(l.title)}</h2>
            <p class="listing-price">₹${Number(l.price).toLocaleString('en-IN')}</p>
            <div class="listing-badges">
                <span class="badge ${l.condition === 'New' ? 'badge-new' : 'badge-used'}">${l.condition}</span>
                <span class="badge badge-cat">${escapeHtml(l.category)}</span>
                ${l.location ? `<span class="badge badge-loc">📍 ${escapeHtml(l.location)}</span>` : ''}
            </div>
            <p class="listing-desc">${escapeHtml(l.description)}</p>
            <div class="listing-seller">
                <div class="seller-avatar">${l.seller_name ? l.seller_name.charAt(0).toUpperCase() : '?'}</div>
                <div>
                    <p><strong>${escapeHtml(l.seller_name || 'Unknown')}</strong></p>
                    <small>${l.views || 0} views</small>
                </div>
            </div>
            <div class="listing-actions">
                ${contactBtn}
                ${deleteBtn}
            </div>
        `;
        showModal('listingModal');
    } catch (err) {
        showToast('Failed to load listing', 'error');
    }
}

async function deleteListing(id) {
    if (!confirm('Delete this listing?')) return;
    try {
        const res = await fetch(API + '/listings/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        if (data.success) {
            closeModal('listingModal');
            showToast('Listing deleted', 'success');
            loadListings();
        } else {
            showToast(data.error || 'Failed to delete', 'error');
        }
    } catch (err) {
        showToast('Network error', 'error');
    }
}

async function handleSell(e) {
    e.preventDefault();
    if (!currentUser) { showLogin(); return; }

    const formData = new FormData();
    formData.append('title', document.getElementById('sellTitle').value);
    formData.append('description', document.getElementById('sellDesc').value);
    formData.append('price', document.getElementById('sellPrice').value);
    formData.append('category', document.getElementById('sellCategory').value);
    formData.append('condition', document.getElementById('sellCondition').value);
    formData.append('location', document.getElementById('sellLocation').value);
    if (sellCoords) {
        formData.append('latitude', sellCoords.lat);
        formData.append('longitude', sellCoords.lng);
    }
    const files = document.getElementById('sellImages').files;
    for (let file of files) formData.append('images', file);

    try {
        const res = await fetch(API + '/listings', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('sellForm').reset();
            sellCoords = null;
            document.getElementById('sellLocationCoords').textContent = '';
            closeModal('sellModal');
            showToast('Listing posted successfully!', 'success');
            loadListings();
        } else {
            showToast(data.error || 'Failed to post listing', 'error');
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
    }
}

// ============================
// MY ITEMS
// ============================
async function showMyItems() {
    if (!currentUser) { showLogin(); return; }
    showModal('myItemsModal');
    const content = document.getElementById('myItemsContent');
    content.innerHTML = '<div class="loading-state">Loading your items...</div>';

    try {
        const res = await fetch(API + '/user/profile', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        if (!data.success) {
            content.innerHTML = '<div class="loading-state">Failed to load items.</div>';
            return;
        }
        const listings = data.listings || [];
        if (listings.length === 0) {
            content.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>You have no listings yet</p><small><a href="#" onclick="closeModal(\'myItemsModal\'); showSellModal()" style="color:var(--accent)">Post your first item</a></small></div>';
            return;
        }
        content.innerHTML = listings.map(l => {
            const img = l.images && l.images.length > 0 ? `<img src="${l.images[0]}" class="my-item-img" alt="item">` : '<div class="my-item-img-placeholder">📷</div>';
            const statusBadge = l.status === 'active' ? 'badge-new' : 'badge-used';
            return `
                <div class="my-item-card">
                    ${img}
                    <div class="my-item-info">
                        <h4>${escapeHtml(l.title)}</h4>
                        <p class="my-item-price">₹${Number(l.price).toLocaleString('en-IN')}</p>
                        <span class="badge ${statusBadge}">${l.status}</span>
                    </div>
                    <div class="my-item-actions">
                        <button class="btn-sm btn-view" onclick="closeModal('myItemsModal'); viewListing('${l.listing_id}')">View</button>
                        <button class="btn-sm btn-del" onclick="deleteListing('${l.listing_id}'); closeModal('myItemsModal')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        content.innerHTML = '<div class="loading-state">Error loading items.</div>';
    }
}

// ============================
// FILTERS
// ============================
function filterCategory(category, btn) {
    activeCategory = category;
    document.querySelectorAll('.filter-btn:not(.condition-btn)').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadListings();
}

function filterCondition(condition, btn) {
    activeCondition = condition;
    document.querySelectorAll('.condition-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadListings();
}

function applyFilters() {
    loadListings();
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    if (input) {
        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => applySearchFilter(), 300);
        });
    }
}

// ============================
// LOCATION / MAP FILTER
// ============================
function openMapFilter() {
    showModal('mapFilterModal');
    setTimeout(() => {
        if (!filterMap) {
            filterMap = L.map('mapContainer').setView([20.5937, 78.9629], 5); // India center
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(filterMap);

            filterMap.on('click', (e) => {
                const { lat, lng } = e.latlng;
                placeFilterMarker(lat, lng);
            });
        } else {
            filterMap.invalidateSize();
        }
    }, 300);
}

function placeFilterMarker(lat, lng) {
    if (filterMarker) filterMap.removeLayer(filterMarker);
    if (filterCircle) filterMap.removeLayer(filterCircle);
    filterMarker = L.marker([lat, lng]).addTo(filterMap);
    const radius = parseInt(document.getElementById('radiusSlider').value);
    filterCircle = L.circle([lat, lng], { radius: radius * 1000, color: '#667eea', fillOpacity: 0.15 }).addTo(filterMap);
    document.getElementById('mapLocationText').textContent = `Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Radius: ${radius} km)`;
    filterMap._selectedLat = lat;
    filterMap._selectedLng = lng;
}

function updateRadius(value) {
    document.getElementById('radiusValue').textContent = value + ' km';
    if (filterCircle && filterMap._selectedLat) {
        filterMap.removeLayer(filterCircle);
        filterCircle = L.circle([filterMap._selectedLat, filterMap._selectedLng], {
            radius: value * 1000, color: '#667eea', fillOpacity: 0.15
        }).addTo(filterMap);
    }
}

function useMyLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported by your browser', 'error');
        return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        filterMap.setView([lat, lng], 12);
        placeFilterMarker(lat, lng);
        showToast('Location detected!', 'success');
    }, () => {
        showToast('Could not get your location. Please click on the map.', 'error');
    });
}

function applyLocationFilter() {
    if (!filterMap._selectedLat) {
        showToast('Please select a location on the map first', 'error');
        return;
    }
    const radius = parseInt(document.getElementById('radiusSlider').value);
    locationFilter = {
        lat: filterMap._selectedLat,
        lng: filterMap._selectedLng,
        radius: radius
    };
    closeModal('mapFilterModal');
    document.getElementById('locationFilterBadge').classList.remove('hidden');
    document.getElementById('locationFilterText').textContent = `Within ${radius} km of selected location`;
    loadListings();
    showToast(`Showing listings within ${radius} km`, 'success');
}

function clearLocationFilter() {
    locationFilter = null;
    document.getElementById('locationFilterBadge').classList.add('hidden');
    loadListings();
}

// ============================
// SELL LOCATION PICKER
// ============================
function openSellLocationPicker() {
    showModal('sellMapModal');
    setTimeout(() => {
        if (!sellMap) {
            sellMap = L.map('sellMapContainer').setView([20.5937, 78.9629], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(sellMap);
            sellMap.on('click', (e) => {
                const { lat, lng } = e.latlng;
                if (sellMarker) sellMap.removeLayer(sellMarker);
                sellMarker = L.marker([lat, lng]).addTo(sellMap);
                sellMap._selectedLat = lat;
                sellMap._selectedLng = lng;
                document.getElementById('sellMapLocationText').textContent = `Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            });
        } else {
            sellMap.invalidateSize();
        }
    }, 300);
}

function confirmSellLocation() {
    if (!sellMap._selectedLat) {
        showToast('Please click on the map to select a location', 'error');
        return;
    }
    sellCoords = { lat: sellMap._selectedLat, lng: sellMap._selectedLng };
    document.getElementById('sellLocationCoords').textContent = `📍 ${sellCoords.lat.toFixed(4)}, ${sellCoords.lng.toFixed(4)}`;
    closeModal('sellMapModal');
    showToast('Location set for listing', 'success');
}

// ============================
// CHATS / MESSAGES
// ============================
function initSocket() {
    if (!currentUser) return;
    try {
        socket = io();
        socket.on('connect', () => {
            socket.emit('join', currentUser.user_id);
        });
        socket.on('new_message', (msg) => {
            if (currentChatReceiverId && (msg.sender_id === currentChatReceiverId || msg.receiver_id === currentChatReceiverId)) {
                appendMessage(msg);
            }
        });
    } catch (e) {
        // Socket.io not available, skip
    }
}

async function showChats() {
    if (!currentUser) { showLogin(); return; }
    showModal('chatsModal');
    loadChatList();
}

async function loadChatList() {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '<div class="loading-state">Loading...</div>';
    try {
        const res = await fetch(API + '/messages/conversations', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        if (!data.success || !data.conversations || data.conversations.length === 0) {
            chatList.innerHTML = '<div class="empty-state"><p>No conversations yet</p></div>';
            return;
        }
        chatList.innerHTML = data.conversations.map(conv => {
            const name = currentUser.user_id === conv.sender_id ? conv.receiver_name : conv.sender_name;
            const initials = name ? name.charAt(0).toUpperCase() : '?';
            return `
                <div class="chat-item" onclick="openChat('${conv.other_user_id}', '${conv.listing_id}', '${escapeHtml(name)}')">
                    <div class="chat-item-avatar">${initials}</div>
                    <div class="chat-item-info">
                        <p class="chat-item-name">${escapeHtml(name)}</p>
                        <p class="chat-item-preview">${escapeHtml(conv.last_message || '')}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        chatList.innerHTML = '<div class="empty-state"><p>Error loading chats</p></div>';
    }
}

async function openChat(receiverId, listingId, receiverName) {
    currentChatReceiverId = receiverId;
    currentChatListingId = listingId;
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.innerHTML = `
        <div class="chat-header">
            <div class="chat-item-avatar">${receiverName.charAt(0).toUpperCase()}</div>
            <strong>${escapeHtml(receiverName)}</strong>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="loading-state">Loading messages...</div>
        </div>
        <form class="chat-input-form" onsubmit="sendMessage(event)">
            <input type="text" class="chat-input" id="chatInput" placeholder="Type a message..." autocomplete="off">
            <button type="submit" class="chat-send-btn">Send</button>
        </form>
    `;

    try {
        const res = await fetch(`${API}/messages/${listingId}/${receiverId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        const msgs = document.getElementById('chatMessages');
        if (data.success && data.messages) {
            if (data.messages.length === 0) {
                msgs.innerHTML = '<div class="chat-no-msgs">No messages yet. Say hello!</div>';
            } else {
                msgs.innerHTML = data.messages.map(m => renderMessage(m)).join('');
                msgs.scrollTop = msgs.scrollHeight;
            }
        } else {
            msgs.innerHTML = '<div class="chat-no-msgs">Start the conversation!</div>';
        }
    } catch (e) {
        document.getElementById('chatMessages').innerHTML = '<div class="chat-no-msgs">Error loading messages.</div>';
    }
}

async function startChat(sellerId, listingId, sellerName) {
    if (!currentUser) { closeModal('listingModal'); showLogin(); return; }
    closeModal('listingModal');
    showModal('chatsModal');
    await loadChatList();
    openChat(sellerId, listingId, sellerName);
}

async function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content) return;
    input.value = '';

    try {
        const res = await fetch(API + '/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                receiver_id: currentChatReceiverId,
                listing_id: currentChatListingId,
                content
            })
        });
        const data = await res.json();
        if (data.success) {
            appendMessage(data.message);
        }
    } catch (err) {
        showToast('Failed to send message', 'error');
    }
}

function renderMessage(m) {
    const isMine = currentUser && m.sender_id === currentUser.user_id;
    const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
        <span class="chat-bubble">${escapeHtml(m.content)}</span>
        <span class="chat-time">${time}</span>
    </div>`;
}

function appendMessage(m) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const noMsgs = msgs.querySelector('.chat-no-msgs');
    if (noMsgs) noMsgs.remove();
    msgs.insertAdjacentHTML('beforeend', renderMessage(m));
    msgs.scrollTop = msgs.scrollHeight;
}

// ============================
// MODAL HELPERS
// ============================
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.add('show'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.remove('show'); }
    // Only restore scroll if no other modals are open
    const anyOpen = document.querySelector('.modal.show');
    if (!anyOpen) document.body.style.overflow = '';
}

function showLogin() { closeModal('registerModal'); showModal('loginModal'); }
function showRegister() { closeModal('loginModal'); showModal('registerModal'); }
function showSellModal() {
    if (!currentUser) { showLogin(); return; }
    showModal('sellModal');
}

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
        const anyOpen = document.querySelector('.modal.show');
        if (!anyOpen) document.body.style.overflow = '';
    }
};

// ============================
// UTILITIES
// ============================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
