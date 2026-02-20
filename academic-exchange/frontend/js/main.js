let currentUser = null;
let allListings = [];
let selectedImages = [];
let currentChatRoom = null;
let currentSellerId = null;
let typingTimeout = null;
const API_BASE = window.ENV_API_URL || '';
const API = API_BASE + '/api';
const socket = io(API_BASE);

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadListings();
    setupSearch();
    setupDragDrop();
    setupSocketListeners();
    loadSavedSearches();

    if (currentUser) {
        loadMyItems();
    }
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            currentUser = JSON.parse(atob(token.split('.')[1]));
            updateNav();
            checkLoginAlert();
        } catch (e) {
            localStorage.removeItem('token');
        }
    }
}

function updateNav() {
    const nav = document.getElementById('navMenu');
    if (currentUser) {
        nav.innerHTML = `
            ${currentUser.role === 'admin' ? '<button class="nav-btn" onclick="showAdminDashboard()">Admin</button>' : ''}
            <button class="nav-action-btn" onclick="showSellModal()">📦 Sell</button>
            <button class="nav-action-btn" onclick="openWishlist()">❤️ Saved</button>
            <button class="nav-action-btn" onclick="openChatsPanel()" style="position:relative;">
                💬 Chats
                <span class="nav-badge" id="chatsBadge" style="display:none;">0</span>
            </button>
            <button class="nav-profile-btn" id="navAvatarIcon" onclick="toggleProfileDropdown(event)">👤</button>
        `;
        loadNavAvatar();
        loadWishlistIds();
        updateUnreadBadge();
    }
}

async function loadNavAvatar() {
    try {
        const res = await fetch(API + '/user/profile', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        const icon = document.getElementById('navAvatarIcon');
        if (icon) {
            if (data.success && data.user.avatar) {
                icon.innerHTML = `<img src="${data.user.avatar}" alt="avatar">`;
            } else if (data.success && data.user.name) {
                icon.textContent = data.user.name.charAt(0).toUpperCase();
            }
        }
    } catch (e) { /* ignore */ }
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
            showAlert('Login successful! Welcome back.', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showAlert(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
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
            showAlert('Account created successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showAlert(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    showAlert('Logged out successfully', 'info');
    setTimeout(() => location.reload(), 500);
}

async function loadListings(filters = {}) {
    try {
        let url = API + '/listings?';
        if (filters.category) url += `category=${encodeURIComponent(filters.category)}&`;
        if (filters.minPrice) url += `minPrice=${encodeURIComponent(filters.minPrice)}&`;
        if (filters.maxPrice) url += `maxPrice=${encodeURIComponent(filters.maxPrice)}&`;
        if (filters.condition) url += `condition=${encodeURIComponent(filters.condition)}&`;
        if (filters.location) url += `location=${encodeURIComponent(filters.location)}&`;
        if (filters.sort) url += `sort=${encodeURIComponent(filters.sort)}&`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
            allListings = data.listings;
            renderListings(allListings);
        }
    } catch (error) {
        showAlert('Failed to load listings', 'error');
    }
}

function renderListings(listings) {
    const grid = document.getElementById('listingsGrid');
    if (listings.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
            <div class="empty-icon">📭</div>
            <h3>No listings found</h3>
            <p>Try a different search or category</p>
        </div>`;
        return;
    }

    grid.innerHTML = listings.map(item => {
        const img = item.images && item.images[0]
            ? `<img src="${item.images[0]}" alt="${item.title}">`
            : `<div class="card-no-image">📦</div>`;
        const isSold = item.status === 'sold';
        const isWished = myWishlist && myWishlist.has(String(item.listing_id));
        return `
        <div class="listing-card" onclick="viewListing('${item.listing_id}')">
            <div class="card-image-container">
                ${img}
                <span class="card-condition">${item.condition || ''}</span>
                ${isSold ? '<div class="sold-overlay"><span class="sold-tag">SOLD</span></div>' : ''}
                <button class="wish-btn ${isWished ? 'active' : ''}" data-id="${item.listing_id}" onclick="toggleWishlist(event,'${item.listing_id}')" title="Save to wishlist">${isWished ? '❤️' : '🤍'}</button>
            </div>
            <div class="card-content">
                <span class="card-category">${item.category || ''}</span>
                <h3 class="card-title">${item.title}</h3>
                <p class="card-description">${item.description || ''}</p>
                <div class="card-footer">
                    <span class="card-price">₹${item.price}</span>
                    <span class="card-location">📍 ${item.location || 'Online'}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Drag & Drop Image Upload
function setupDragDrop() {
    const dragArea = document.getElementById('dragDropArea');
    const fileInput = document.getElementById('sellImages');

    if (!dragArea || !fileInput) return;

    dragArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragArea.classList.add('drag-over');
    });

    dragArea.addEventListener('dragleave', () => {
        dragArea.classList.remove('drag-over');
    });

    dragArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleImageSelect(files);
    });

    fileInput.addEventListener('change', (e) => {
        handleImageSelect(e.target.files);
    });
}

function handleImageSelect(files) {
    selectedImages = [];
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';

    if (files.length > 5) {
        showAlert('Maximum 5 images allowed', 'error');
        return;
    }

    Array.from(files).forEach((file, index) => {
        if (file.size > 5 * 1024 * 1024) {
            showAlert(`${file.name} exceeds 5MB limit`, 'error');
            return;
        }

        if (!file.type.match('image.*')) {
            showAlert(`${file.name} is not an image`, 'error');
            return;
        }

        selectedImages.push(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button class="remove-image" onclick="removeImage(${index})">×</button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removeImage(index) {
    selectedImages.splice(index, 1);
    const fileInput = document.getElementById('sellImages');
    const dt = new DataTransfer();
    selectedImages.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
    handleImageSelect(selectedImages);
}

async function handleSell(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('sellTitle').value);
    formData.append('description', document.getElementById('sellDesc').value);
    formData.append('price', document.getElementById('sellPrice').value);
    formData.append('category', document.getElementById('sellCategory').value);
    formData.append('condition', document.getElementById('sellCondition').value);
    formData.append('location', document.getElementById('sellLocation').value);

    selectedImages.forEach(file => formData.append('images', file));

    try {
        const res = await fetch(API + '/listings', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showAlert('Listing created successfully!', 'success');
            closeModal('sellModal');
            document.getElementById('sellForm').reset();
            selectedImages = [];
            document.getElementById('imagePreview').innerHTML = '';
            loadListings();
        } else {
            showAlert(data.error || 'Failed to create listing', 'error');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
    }
}

async function viewListing(id) {
    try {
        const res = await fetch(API + '/listings/' + id);
        const data = await res.json();

        if (data.success) {
            const listing = data.listing;
            // Remove any previous dynamic listing modal
            const old = document.getElementById('listingDetailModal');
            if (old) old.remove();

            const images = (listing.images && listing.images.length > 0)
                ? listing.images.map(src => `<img src="${src}" alt="${listing.title}">`).join('')
                : `<div class="card-no-image" style="height:200px;border-radius:var(--r-lg);">📦</div>`;

            const isOwner = currentUser && currentUser.user_id === listing.user_id;

            const modal = document.createElement('div');
            modal.id = 'listingDetailModal';
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:680px;">
                    <div class="modal-header">
                        <h2>${listing.title}</h2>
                        <button class="close-btn" onclick="document.getElementById('listingDetailModal').remove()">✕</button>
                    </div>
                    <div class="listing-detail-images">${images}</div>
                    <div class="listing-detail-body">
                        <div class="listing-detail-price">₹${listing.price}</div>
                        <div class="listing-detail-meta">
                            <span class="detail-badge">📦 ${listing.condition}</span>
                            <span class="detail-badge">🏷️ ${listing.category}</span>
                            <span class="detail-badge">📍 ${listing.location || 'Online'}</span>
                        </div>
                        <p class="listing-detail-desc">${listing.description}</p>
                        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                            ${!isOwner ? `<button class="btn btn-primary" onclick="openChat('${listing.listing_id}','${listing.user_id}');document.getElementById('listingDetailModal').remove()">💬 Chat with Seller</button>` : ''}
                            ${!isOwner ? `<button class="btn btn-primary" onclick="initiatePaymentModal('${listing.listing_id}','${listing.title}',${listing.price})">💳 Buy Now</button>` : ''}
                            <button class="btn btn-secondary" onclick="document.getElementById('listingDetailModal').remove()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            // Close on backdrop click
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        }
    } catch (error) {
        showAlert('Failed to load listing details', 'error');
    }
}

async function showProfile() {
    try {
        const res = await fetch(API + '/user/profile', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();

        if (data.success) {
            renderProfileView(data.user, data.listings);
            showModal('profileModal');
        }
    } catch (error) {
        showAlert('Failed to load profile', 'error');
    }
}

function renderProfileView(user, listings) {
    const content = document.getElementById('profileContent');
    const avatarContent = user.avatar
        ? `<img src="${user.avatar}" alt="avatar">`
        : '👤';

    content.innerHTML = `
        <div class="profile-avatar-section">
            <div class="profile-avatar-wrapper">
                <div class="profile-avatar">${avatarContent}</div>
            </div>
            <div class="profile-name">${user.name}</div>
            <span class="profile-role-badge">${user.role || 'Student'}</span>
        </div>

        <div class="profile-details">
            <div class="profile-detail-item">
                <span class="profile-detail-icon">✉️</span>
                <div>
                    <div class="profile-detail-label">Email</div>
                    <div class="profile-detail-value">${user.email}</div>
                </div>
            </div>
            <div class="profile-detail-item">
                <span class="profile-detail-icon">📍</span>
                <div>
                    <div class="profile-detail-label">Location</div>
                    <div class="profile-detail-value">${user.location || 'Not set'}</div>
                </div>
            </div>
            <div class="profile-detail-item">
                <span class="profile-detail-icon">📝</span>
                <div>
                    <div class="profile-detail-label">Bio</div>
                    <div class="profile-detail-value">${user.bio || 'No bio yet'}</div>
                </div>
            </div>
            <div style="padding:1rem 0 0.5rem;">
                <button class="btn btn-primary btn-block" onclick="renderProfileEdit(${JSON.stringify(user).replace(/"/g, '&quot;')})">✏️ Edit Profile</button>
            </div>
        </div>

        <div class="profile-listings">
            <h3>📦 My Listings (${listings.length})</h3>
            ${listings.length === 0
                ? '<p style="color:var(--text-3);font-size:0.88rem;font-weight:600;">No listings yet. Start selling!</p>'
                : listings.map(l => {
                    const thumb = l.images && l.images[0]
                        ? `<div class="profile-listing-thumb"><img src="${l.images[0]}" alt="${l.title}"></div>`
                        : `<div class="profile-listing-thumb">📦</div>`;
                    return `
                    <div class="profile-listing-item">
                        ${thumb}
                        <div class="profile-listing-info">
                            <div class="profile-listing-title">${l.title}</div>
                            <div class="profile-listing-price">₹${l.price} · ${l.status}</div>
                        </div>
                    </div>`;
                }).join('')
            }
        </div>
    `;
}

function renderProfileEdit(user) {
    const content = document.getElementById('profileContent');
    const avatarContent = user.avatar
        ? `<img src="${user.avatar}" alt="avatar">`
        : '👤';

    content.innerHTML = `
        <div class="profile-avatar-section">
            <div class="profile-avatar-wrapper" style="cursor:pointer;" onclick="document.getElementById('avatarInput').click()">
                <div class="profile-avatar" id="profileAvatarPreviewWrap">${avatarContent}</div>
                <button type="button" class="avatar-upload-btn" onclick="event.stopPropagation();document.getElementById('avatarInput').click()">📷</button>
            </div>
            <div class="avatar-edit-hint">Click to change photo</div>
            <input type="file" id="avatarInput" accept="image/*" style="display:none;" onchange="handleAvatarChange(this)">
        </div>

        <form id="profileEditForm" onsubmit="handleUpdateProfile(event)" style="padding:0 1.5rem 1.5rem;">
            <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" id="editName" value="${user.name || ''}" placeholder="Your name" required>
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="editEmail" value="${user.email || ''}" placeholder="Your email" required>
            </div>
            <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" id="editLocation" value="${user.location || ''}" placeholder="e.g., Mumbai, Maharashtra">
            </div>
            <div class="form-group">
                <label class="form-label">Bio</label>
                <textarea class="form-textarea" id="editBio" rows="3" placeholder="Tell others about yourself...">${user.bio || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="showProfile()">← Cancel</button>
                <button type="submit" class="btn btn-primary">💾 Save Changes</button>
            </div>
        </form>
    `;
}

let pendingAvatarFile = null;

function handleAvatarChange(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showAlert('Avatar must be under 2MB', 'error');
        return;
    }
    pendingAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const wrap = document.getElementById('profileAvatarPreviewWrap');
        if (wrap) {
            wrap.innerHTML = `<img src="${e.target.result}" alt="avatar" class="profile-avatar-img">`;
        }
    };
    reader.readAsDataURL(file);
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const location = document.getElementById('editLocation').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    try {
        // Update profile info
        const res = await fetch(API + '/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ name, email, location, bio })
        });
        const data = await res.json();

        if (!data.success) {
            showAlert(data.error || 'Failed to update profile', 'error');
            return;
        }

        // Upload avatar if changed
        if (pendingAvatarFile) {
            const formData = new FormData();
            formData.append('avatar', pendingAvatarFile);
            const avatarRes = await fetch(API + '/user/avatar', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: formData
            });
            const avatarData = await avatarRes.json();
            if (!avatarData.success) {
                showAlert('Profile saved but avatar upload failed', 'error');
            }
            pendingAvatarFile = null;
        }

        showAlert('Profile updated successfully!', 'success');

        // Update displayed name in navbar
        currentUser.name = name;
        updateNav();

        // Reload profile view
        showProfile();
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
    }
}

// Advanced Filters
function toggleAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    filters.style.display = filters.style.display === 'none' ? 'grid' : 'none';
}

function applyAdvancedFilters() {
    const filters = {
        minPrice: document.getElementById('minPrice').value,
        maxPrice: document.getElementById('maxPrice').value,
        condition: document.getElementById('conditionFilter').value,
        location: document.getElementById('locationFilter').value,
        sort: document.getElementById('sortBy').value
    };

    loadListings(filters);
    saveSearch(filters);
}

function clearFilters() {
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('conditionFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('sortBy').value = 'newest';
    loadListings();
}

// Saved Searches
function saveSearch(filters) {
    let searches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    searches.unshift(filters);
    searches = searches.slice(0, 5); // Keep only last 5
    localStorage.setItem('savedSearches', JSON.stringify(searches));
}

function loadSavedSearches() {
    const searches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    // Can display these in UI if needed
}

function filterCategory(category, el) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');

    if (category === 'all') {
        loadListings();
    } else {
        loadListings({ category });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allListings.filter(l =>
            l.title.toLowerCase().includes(query) ||
            l.description.toLowerCase().includes(query)
        );
        renderListings(filtered);

        // Save recent keyword
        if (query) {
            let keywords = JSON.parse(localStorage.getItem('recentKeywords') || '[]');
            if (!keywords.includes(query)) {
                keywords.unshift(query);
                keywords = keywords.slice(0, 10);
                localStorage.setItem('recentKeywords', JSON.stringify(keywords));
            }
        }
    });
}

// Socket.io Chat
function setupSocketListeners() {
    socket.on('new_message', (message) => {
        displayMessage(message);
    });

    socket.on('user_typing', ({ userId }) => {
        if (userId !== currentUser?.user_id) {
            showTypingIndicator();
        }
    });

    socket.on('user_stopped_typing', () => {
        hideTypingIndicator();
    });
}

async function openChat(listingId, sellerId) {
    if (!currentUser) {
        showAlert('Please login to chat', 'error');
        return;
    }

    currentChatRoom = listingId;
    currentSellerId = sellerId;
    socket.emit('join_chat', { listingId, userId: currentUser.user_id });

    // Reset header while loading
    const nameEl = document.getElementById('chatPersonName');
    const itemEl = document.getElementById('chatPersonItem');
    const avatarEl = document.getElementById('chatPersonAvatar');
    if (nameEl) nameEl.textContent = 'Loading...';
    if (itemEl) itemEl.textContent = '';
    if (avatarEl) avatarEl.innerHTML = '👤';

    showModal('chatModal');
    loadChatHistory(listingId);

    // Fetch listing details to populate chat header
    try {
        const res = await fetch(`${API}/listings/${listingId}`);
        const data = await res.json();
        if (data.success) {
            const listing = data.listing;
            if (itemEl) itemEl.textContent = listing.title;

            // Determine who we are chatting with
            const isSellerMe = listing.user_id === currentUser.user_id;
            const otherUserId = isSellerMe ? null : listing.user_id;

            if (otherUserId) {
                // Fetch other user's info (seller)
                try {
                    const uRes = await fetch(`${API}/user/public/${otherUserId}`, {
                        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
                    });
                    const uData = await uRes.json();
                    if (uData.success && uData.user) {
                        if (nameEl) nameEl.textContent = uData.user.name || 'Seller';
                        if (avatarEl && uData.user.avatar) {
                            avatarEl.innerHTML = `<img src="${uData.user.avatar}" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
                        } else if (nameEl) {
                            if (avatarEl) avatarEl.innerHTML = '👤';
                        }
                    } else {
                        if (nameEl) nameEl.textContent = 'Seller';
                    }
                } catch(e) {
                    if (nameEl) nameEl.textContent = 'Seller';
                }
            } else {
                // We are the seller — show "You are the seller"
                if (nameEl) nameEl.textContent = 'You (Seller)';
            }
        }
    } catch (e) {
        if (nameEl) nameEl.textContent = 'Chat';
    }

    const chatInput = document.getElementById('chatInput');
    chatInput.removeEventListener('input', handleTyping);
    chatInput.addEventListener('input', handleTyping);
}

async function loadChatHistory(listingId) {
    try {
        const res = await fetch(`${API}/messages/${listingId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();

        if (data.success) {
            const messagesDiv = document.getElementById('chatMessages');
            messagesDiv.innerHTML = '';
            data.messages.forEach(msg => displayMessage(msg));
        }
    } catch (error) {
        console.error('Failed to load chat history');
    }
}

function handleTyping() {
    socket.emit('typing', { room: currentChatRoom, userId: currentUser.user_id });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stopped_typing', { room: currentChatRoom });
    }, 1000);
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    socket.emit('send_message', {
        listingId: currentChatRoom,
        senderId: currentUser.user_id,
        receiverId: currentSellerId,
        message: message
    });

    input.value = '';
    socket.emit('stopped_typing', { room: currentChatRoom });
}

function displayMessage(message) {
    const messagesDiv = document.getElementById('chatMessages');
    const isSent = message.sender_id === currentUser?.user_id;
    const senderLabel = isSent ? 'You' : (message.sender_name || 'User');

    const wrapper = document.createElement('div');
    wrapper.className = `chat-message-wrapper ${isSent ? 'sent' : 'received'}`;

    const div = document.createElement('div');
    div.className = `chat-message ${isSent ? 'sent' : 'received'}`;
    div.innerHTML = `
        <span class="message-sender-name">${senderLabel}</span>
        ${message.content}
        <span class="message-time">${new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div class="message-reactions">
            <span class="reaction" onclick="addReaction('${message.message_id}', '👍')">👍</span>
            <span class="reaction" onclick="addReaction('${message.message_id}', '❤️')">❤️</span>
            <span class="reaction" onclick="addReaction('${message.message_id}', '😂')">😂</span>
        </div>
    `;
    wrapper.appendChild(div);
    messagesDiv.appendChild(wrapper);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addReaction(messageId, emoji) {
    // Store reaction logic here
    showAlert(`Added ${emoji} reaction`, 'success');
}

function showTypingIndicator() {
    document.getElementById('typingIndicator').style.display = 'flex';
}

function hideTypingIndicator() {
    document.getElementById('typingIndicator').style.display = 'none';
}

// Payment Integration
function initiatePaymentModal(listingId, title, price) {
    document.getElementById('paymentItem').textContent = title;
    document.getElementById('paymentPrice').textContent = `₹${price}`;

    // Close listing modal
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    const dynModal = document.getElementById('listingDetailModal');
    if (dynModal) dynModal.remove();

    showModal('paymentModal');
}

function initiatePayment(method) {
    if (!currentUser) {
        showAlert('Please login to make a payment', 'error');
        return;
    }

    const price = parseFloat(document.getElementById('paymentPrice').textContent.replace('₹', ''));

    if (method === 'razorpay') {
        initiateRazorpay(price);
    } else if (method === 'stripe') {
        initiateStripe(price);
    }
}

function initiateRazorpay(amount) {
    const options = {
        key: 'YOUR_RAZORPAY_KEY', // Replace with actual key
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        name: 'Academic Exchange',
        description: 'Purchase from marketplace',
        handler: function(response) {
            showAlert('Payment successful!', 'success');
            closeModal('paymentModal');
            recordTransaction(response.razorpay_payment_id, amount);
        },
        prefill: {
            name: currentUser.name,
            email: currentUser.email
        },
        theme: {
            color: '#667eea'
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}

async function initiateStripe(amount) {
    showAlert('Stripe integration coming soon!', 'info');
    // Implement Stripe checkout here
}

async function recordTransaction(paymentId, amount) {
    try {
        const res = await fetch(API + '/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                payment_id: paymentId,
                amount: amount,
                status: 'completed'
            })
        });

        if (res.ok) {
            showAlert('Transaction recorded successfully', 'success');
        }
    } catch (error) {
        console.error('Failed to record transaction');
    }
}

// Utility Functions
function showAlert(message, type = 'info') {
    let container = document.getElementById('alertContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alertContainer';
        container.className = 'alert-container';
        document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(40px)';
        alert.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function checkLoginAlert() {
    const lastLogin = localStorage.getItem('lastLogin');
    const now = new Date().toISOString();

    if (lastLogin) {
        const diff = new Date(now) - new Date(lastLogin);
        const hours = diff / (1000 * 60 * 60);

        if (hours > 24) {
            showAlert(`Welcome back! Last login: ${new Date(lastLogin).toLocaleDateString()}`, 'info');
        }
    }

    localStorage.setItem('lastLogin', now);
}

function showModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showLogin() {
    closeModal('registerModal');
    showModal('loginModal');
}

function showRegister() {
    closeModal('loginModal');
    showModal('registerModal');
}

function showSellModal() {
    if (!currentUser) {
        showAlert('Please login to sell items', 'error');
        return;
    }
    showModal('sellModal');
}

// Profile Dropdown Functions
function toggleProfileDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('open');
}

function closeProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.remove('open');
}

// Change Password Handler
async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const res = await fetch(API + '/user/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await res.json();

        if (data.success) {
            showAlert('Password changed successfully!', 'success');
            closeModal('changePasswordModal');
            document.getElementById('changePasswordForm').reset();
        } else {
            showAlert(data.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'error');
    }
}

function showChangePassword() {
    showModal('changePasswordModal');
}

// Chats Panel Functions
async function openChatsPanel() {
    if (!currentUser) {
        showAlert('Please login to view chats', 'error');
        return;
    }

    showModal('chatsPanelModal');
    loadAllChats();
}

async function loadAllChats() {
    try {
        const res = await fetch(API + '/messages/my-chats', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });

        const data = await res.json();

        if (data.success) {
            renderChatsList(data.chats || []);
        }
    } catch (error) {
        console.error('Failed to load chats');
    }
}

function renderChatsList(chats) {
    const chatsList = document.getElementById('chatsList');

    if (chats.length === 0) {
        chatsList.innerHTML = `<div class="empty-state">
            <div class="empty-icon">💬</div>
            <h3>No chats yet</h3>
            <p>Start a conversation from a listing</p>
        </div>`;
        return;
    }

    chatsList.innerHTML = chats.map(chat => {
        const personName = chat.other_user_name || 'User';
        const avatarContent = chat.other_user_avatar
            ? `<img src="${chat.other_user_avatar}" alt="${personName}">`
            : personName.charAt(0).toUpperCase();
        const timeStr = chat.last_message_time
            ? new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

        return `
            <div class="chat-item" onclick="openChatFromList('${chat.listing_id}', '${chat.seller_id}')">
                <div class="chat-item-avatar">${avatarContent}</div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${personName}</div>
                    <div class="chat-item-subtitle">📦 ${chat.listing_title || 'Listing'} · ${chat.last_message || 'No messages yet'}</div>
                </div>
                <div class="chat-item-meta">
                    <span class="chat-item-time">${timeStr}</span>
                    ${chat.unread_count > 0 ? `<span class="chat-unread-badge">${chat.unread_count}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function openChatFromList(listingId, sellerId) {
    closeModal('chatsPanelModal');
    openChat(listingId, sellerId);
}

// Close dropdown when clicking outside
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }

    // Close profile dropdown when clicking outside
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && !e.target.closest('.nav-profile-btn') && !e.target.closest('.profile-dropdown')) {
        dropdown.classList.remove('open');
    }
};

// ==================== NEW FEATURES ====================

// Multi-step Sell Form
let currentStep = 1;
let selectedCategoryValue = '';
let sellMap = null;
let sellMarker = null;

function selectCategory(category, el) {
    selectedCategoryValue = category;
    document.getElementById('sellCategory').value = category;

    // Update UI
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('selected');
    });
    if (el) el.closest('.category-card').classList.add('selected');
}

function nextStep(step) {
    // Validate current step
    if (!validateStep(currentStep)) {
        return;
    }

    // Hide current step
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

    // Show next step
    document.getElementById(`step${step}`).classList.add('active');
    document.querySelector(`.step[data-step="${step}"]`).classList.add('active');

    currentStep = step;

    // Initialize map if on location step
    if (step === 3 && !sellMap) {
        setTimeout(initSellMap, 100);
    }
}

function prevStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

    document.getElementById(`step${step}`).classList.add('active');
    document.querySelector(`.step[data-step="${step}"]`).classList.add('active');

    currentStep = step;
}

function validateStep(step) {
    if (step === 1) {
        const title = document.getElementById('sellTitle').value;
        const desc = document.getElementById('sellDesc').value;
        const price = document.getElementById('sellPrice').value;
        const category = document.getElementById('sellCategory').value;
        const condition = document.getElementById('sellCondition').value;

        if (!title || !desc || !price) {
            showAlert('Please fill all required fields', 'error');
            return false;
        }
        if (!category) {
            showAlert('Please select a category', 'error');
            return false;
        }
        if (!condition) {
            showAlert('Please select a condition', 'error');
            return false;
        }
    } else if (step === 2) {
        if (selectedImages.length === 0) {
            showAlert('Please upload at least one image', 'error');
            return false;
        }
    }
    return true;
}

function initSellMap() {
    if (sellMap) return;

    const mapElement = document.getElementById('sellMap');
    if (!mapElement) return;

    sellMap = L.map('sellMap').setView([20.5937, 78.9629], 5); // India center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(sellMap);

    // Get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            sellMap.setView([lat, lng], 13);

            sellMarker = L.marker([lat, lng], { draggable: true }).addTo(sellMap);

            document.getElementById('sellLatitude').value = lat;
            document.getElementById('sellLongitude').value = lng;

            sellMarker.on('dragend', function(e) {
                const pos = e.target.getLatLng();
                document.getElementById('sellLatitude').value = pos.lat;
                document.getElementById('sellLongitude').value = pos.lng;
            });
        });
    }

    sellMap.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (sellMarker) {
            sellMarker.setLatLng([lat, lng]);
        } else {
            sellMarker = L.marker([lat, lng], { draggable: true }).addTo(sellMap);

            sellMarker.on('dragend', function(e) {
                const pos = e.target.getLatLng();
                document.getElementById('sellLatitude').value = pos.lat;
                document.getElementById('sellLongitude').value = pos.lng;
            });
        }

        document.getElementById('sellLatitude').value = lat;
        document.getElementById('sellLongitude').value = lng;
    });
}

// My Items Functionality
async function loadMyItems() {
    if (!currentUser) return;

    try {
        const res = await fetch(API + '/listings/my-items', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });

        const data = await res.json();

        if (data.success && data.listings.length > 0) {
            document.getElementById('myItemsSection').style.display = 'block';
            renderMyItems(data.listings);
        }
    } catch (error) {
        console.error('Failed to load my items');
    }
}

function renderMyItems(items) {
    const grid = document.getElementById('myItemsGrid');

    grid.innerHTML = items.map(item => {
        const img = item.images && item.images[0]
            ? `<img src="${item.images[0]}" alt="${item.title}">`
            : `<div class="card-no-image">📦</div>`;
        const isSold = item.status === 'sold';
        const soldLabel = isSold ? '🔄 Relist' : '✅ Sold';
        return `
        <div class="listing-card">
            <div class="card-image-container">
                ${img}
                <span class="card-condition">${item.condition || ''}</span>
                ${isSold ? '<div class="sold-overlay"><span class="sold-tag">SOLD</span></div>' : ''}
            </div>
            <div class="card-content">
                <span class="card-category">${isSold ? '🔴 Sold' : '🟢 Active'}</span>
                <h3 class="card-title">${item.title}</h3>
                <div class="card-footer">
                    <span class="card-price">₹${item.price}</span>
                    <span class="card-location">👁️ ${item.views || 0}</span>
                </div>
                <div class="card-actions">
                    <button class="card-btn" onclick="event.stopPropagation();editListing('${item.listing_id}')">✏️ Edit</button>
                    <button class="card-btn" onclick="event.stopPropagation();markAsSold('${item.listing_id}','${item.status}')">${soldLabel}</button>
                    <button class="card-btn danger" onclick="event.stopPropagation();deleteListing('${item.listing_id}')">🗑️ Delete</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function deleteListing(id) {
    showConfirm('Delete this listing permanently?', async () => {
        try {
            const res = await fetch(API + `/listings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            if (res.ok) {
                showAlert('Listing deleted', 'success');
                loadMyItems();
                loadListings();
            } else {
                showAlert('Failed to delete listing', 'error');
            }
        } catch (error) {
            showAlert('Failed to delete listing', 'error');
        }
    }, 'Delete');
}

// Map Filter System
let filterMap = null;
let filterCircle = null;
let filterMarker = null;
let selectedLocation = null;
let selectedRange = 50;

function updateRangeValue(value) {
    document.getElementById('rangeValue').textContent = value;
    selectedRange = value;
}

function showMapFilter() {
    showModal('mapFilterModal');
    setTimeout(initFilterMap, 100);
}

function initFilterMap() {
    if (filterMap) return;

    filterMap = L.map('filterMap').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(filterMap);

    // Get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            filterMap.setView([lat, lng], 10);
            updateFilterLocation(lat, lng);
        });
    }

    filterMap.on('click', function(e) {
        updateFilterLocation(e.latlng.lat, e.latlng.lng);
    });
}

function updateFilterLocation(lat, lng) {
    selectedLocation = { lat, lng };

    if (filterMarker) {
        filterMarker.setLatLng([lat, lng]);
    } else {
        filterMarker = L.marker([lat, lng]).addTo(filterMap);
    }

    if (filterCircle) {
        filterCircle.setLatLng([lat, lng]);
        filterCircle.setRadius(selectedRange * 1000);
    } else {
        filterCircle = L.circle([lat, lng], {
            color: '#667eea',
            fillColor: '#f093fb',
            fillOpacity: 0.2,
            radius: selectedRange * 1000
        }).addTo(filterMap);
    }
}

function updateMapRange(value) {
    document.getElementById('mapRangeValue').textContent = value;
    selectedRange = value;

    if (filterCircle) {
        filterCircle.setRadius(value * 1000);
    }
}

async function searchMapLocation() {
    const location = document.getElementById('mapSearch').value;

    if (!location) return;

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
        const data = await res.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);

            filterMap.setView([lat, lng], 12);
            updateFilterLocation(lat, lng);
        } else {
            showAlert('Location not found', 'error');
        }
    } catch (error) {
        showAlert('Failed to search location', 'error');
    }
}

function applyMapFilter() {
    if (!selectedLocation) {
        showAlert('Please select a location on the map', 'error');
        return;
    }

    closeModal('mapFilterModal');

    // Apply filters with location
    const filters = {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        range: selectedRange,
        minPrice: document.getElementById('minPrice').value,
        maxPrice: document.getElementById('maxPrice').value,
        condition: document.getElementById('conditionFilter').value,
        sort: document.getElementById('sortBy').value
    };

    loadListings(filters);
    showAlert(`Showing items within ${selectedRange}km radius`, 'success');
}

// ==================== MOBILE NAV HAMBURGER ====================

function toggleMobileMenu() {
    const nav = document.getElementById('navMenu');
    const btn = document.getElementById('hamburgerBtn');
    if (!nav || !btn) return;
    nav.classList.toggle('mobile-open');
    btn.classList.toggle('active');
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const nav = document.getElementById('navMenu');
    const btn = document.getElementById('hamburgerBtn');
    if (nav && btn && nav.classList.contains('mobile-open')) {
        if (!nav.contains(e.target) && !btn.contains(e.target)) {
            nav.classList.remove('mobile-open');
            btn.classList.remove('active');
        }
    }
});

// ==================== UNREAD BADGE ====================

async function updateUnreadBadge() {
    if (!currentUser) return;
    try {
        const res = await fetch(API + '/messages/my-chats', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        if (data.success) {
            const unread = (data.chats || []).reduce((sum, c) => sum + (c.unread_count > 0 ? 1 : 0), 0);
            const badge = document.getElementById('chatsBadge');
            if (badge) {
                if (unread > 0) {
                    badge.textContent = unread > 9 ? '9+' : unread;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (e) { /* ignore */ }
}

// Refresh badge every 30 s while logged in
setInterval(() => { if (currentUser) updateUnreadBadge(); }, 30000);

// ==================== CUSTOM CONFIRM MODAL ====================

function showConfirm(message, onConfirm, dangerLabel = 'Delete') {
    const old = document.getElementById('confirmModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="confirm-modal">
            <div class="confirm-icon">⚠️</div>
            <div class="confirm-message">${message}</div>
            <div class="confirm-actions">
                <button class="btn btn-secondary" onclick="document.getElementById('confirmModal').remove()">Cancel</button>
                <button class="btn btn-danger" id="confirmOkBtn">${dangerLabel}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('confirmOkBtn').addEventListener('click', () => {
        modal.remove();
        onConfirm();
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==================== EDIT LISTING ====================

async function editListing(id) {
    try {
        const res = await fetch(API + '/listings/' + id);
        const data = await res.json();
        if (!data.success) { showAlert('Failed to load listing', 'error'); return; }
        const l = data.listing;

        const old = document.getElementById('editListingModal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'editListingModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:520px;">
                <div class="modal-header">
                    <h2>✏️ Edit Listing</h2>
                    <button class="close-btn" onclick="document.getElementById('editListingModal').remove()">✕</button>
                </div>
                <form id="editListingForm" onsubmit="handleEditListing(event,'${id}')">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" class="form-input" id="editTitle" value="${(l.title || '').replace(/"/g, '&quot;')}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea class="form-textarea" id="editDescription" rows="3" required>${l.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Price (₹)</label>
                            <input type="number" class="form-input" id="editPrice" value="${l.price}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Condition</label>
                            <select class="form-select" id="editCondition">
                                <option value="New" ${l.condition==='New'?'selected':''}>New</option>
                                <option value="Like New" ${l.condition==='Like New'?'selected':''}>Like New</option>
                                <option value="Good" ${l.condition==='Good'?'selected':''}>Good</option>
                                <option value="Fair" ${l.condition==='Fair'?'selected':''}>Fair</option>
                                <option value="Used" ${l.condition==='Used'?'selected':''}>Used</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Location</label>
                        <input type="text" class="form-input" id="editLocation" value="${(l.location || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('editListingModal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">💾 Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    } catch (e) {
        showAlert('Failed to load listing', 'error');
    }
}

async function handleEditListing(e, id) {
    e.preventDefault();
    const body = {
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        price: document.getElementById('editPrice').value,
        condition: document.getElementById('editCondition').value,
        location: document.getElementById('editLocation').value
    };
    try {
        const res = await fetch(API + '/listings/' + id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            showAlert('Listing updated!', 'success');
            document.getElementById('editListingModal').remove();
            loadMyItems();
            loadListings();
        } else {
            showAlert(data.error || 'Update failed', 'error');
        }
    } catch (e) {
        showAlert('Network error', 'error');
    }
}

// ==================== MARK AS SOLD ====================

function markAsSold(id, currentStatus) {
    const newStatus = currentStatus === 'sold' ? 'active' : 'sold';
    const msg = newStatus === 'sold' ? 'Mark this listing as sold?' : 'Relist this item as active?';
    const label = newStatus === 'sold' ? 'Mark Sold' : 'Relist';
    showConfirm(msg, async () => {
        try {
            const res = await fetch(API + '/listings/' + id + '/status', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                showAlert(newStatus === 'sold' ? 'Marked as sold!' : 'Listing relisted!', 'success');
                loadMyItems();
                loadListings();
            } else {
                showAlert(data.error || 'Failed to update status', 'error');
            }
        } catch (e) {
            showAlert('Network error', 'error');
        }
    }, label);
}

// ==================== WISHLIST VIEW ====================

async function openWishlist() {
    if (!currentUser) {
        showAlert('Please login to view your wishlist', 'error');
        return;
    }
    showModal('wishlistModal');
    const list = document.getElementById('wishlistList');
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading...</p></div>`;

    try {
        const res = await fetch(API + '/wishlist', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        if (data.success) {
            myWishlist = new Set((data.wishlist || []).map(w => String(w.listing_id)));
            renderWishlistPanel(data.wishlist || []);
        }
    } catch (e) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>Failed to load wishlist</p></div>`;
    }
}

function renderWishlistPanel(items) {
    const list = document.getElementById('wishlistList');
    if (items.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🤍</div>
                <h3>No saved items yet</h3>
                <p>Tap the ❤️ heart on any listing to save it here</p>
            </div>`;
        return;
    }

    list.innerHTML = items.map(item => {
        const thumb = item.images && item.images[0]
            ? `<img src="${item.images[0]}" alt="${item.title}" class="wishlist-thumb">`
            : `<div class="wishlist-thumb wishlist-thumb-placeholder">📦</div>`;
        const isSold = item.status === 'sold';
        const statusBadge = isSold
            ? `<span class="wishlist-status sold">🔴 Sold</span>`
            : `<span class="wishlist-status available">🟢 Available</span>`;
        return `
        <div class="wishlist-item" onclick="closeModal('wishlistModal');viewListing('${item.listing_id}')">
            ${thumb}
            <div class="wishlist-item-info">
                <div class="wishlist-item-title">${item.title}</div>
                <div class="wishlist-item-sub">₹${item.price} &nbsp;·&nbsp; ${item.category || ''} &nbsp;·&nbsp; ${item.seller_name || 'Seller'}</div>
                ${statusBadge}
            </div>
            <button class="wish-btn active" style="position:static;flex-shrink:0;"
                onclick="event.stopPropagation();toggleAndRefreshWishlist(event,'${item.listing_id}')">❤️</button>
        </div>`;
    }).join('');
}

async function toggleAndRefreshWishlist(e, listingId) {
    await toggleWishlist(e, listingId);
    // Small delay so the alert shows before the panel reloads
    setTimeout(openWishlist, 400);
}

// ==================== WISHLIST ====================

let myWishlist = new Set();

async function loadWishlistIds() {
    if (!currentUser) return;
    try {
        const res = await fetch(API + '/wishlist', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        if (data.success) {
            myWishlist = new Set((data.wishlist || []).map(w => String(w.listing_id)));
            // Refresh any already-rendered heart buttons
            document.querySelectorAll('.wish-btn').forEach(btn => {
                const id = btn.dataset.id;
                const active = myWishlist.has(String(id));
                btn.classList.toggle('active', active);
                btn.textContent = active ? '❤️' : '🤍';
            });
        }
    } catch (e) { /* ignore */ }
}

async function toggleWishlist(e, listingId) {
    e.stopPropagation();
    if (!currentUser) {
        showAlert('Please login to save items', 'error');
        return;
    }
    try {
        const res = await fetch(API + '/wishlist/' + listingId, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        if (data.success) {
            const id = String(listingId);
            if (data.action === 'added') {
                myWishlist.add(id);
                showAlert('Saved to wishlist ❤️', 'success');
            } else {
                myWishlist.delete(id);
                showAlert('Removed from wishlist', 'info');
            }
            const btn = document.querySelector(`.wish-btn[data-id="${id}"]`);
            if (btn) {
                btn.classList.toggle('active', myWishlist.has(id));
                btn.textContent = myWishlist.has(id) ? '❤️' : '🤍';
            }
        }
    } catch (e) {
        showAlert('Failed to update wishlist', 'error');
    }
}

// Update loadListings to handle location filtering
const originalLoadListings = loadListings;
loadListings = async function(filters = {}) {
    try {
        let url = API + '/listings?';
        if (filters.category) url += `category=${encodeURIComponent(filters.category)}&`;
        if (filters.minPrice) url += `minPrice=${encodeURIComponent(filters.minPrice)}&`;
        if (filters.maxPrice) url += `maxPrice=${encodeURIComponent(filters.maxPrice)}&`;
        if (filters.condition) url += `condition=${encodeURIComponent(filters.condition)}&`;
        if (filters.location) url += `location=${encodeURIComponent(filters.location)}&`;
        if (filters.latitude) url += `latitude=${encodeURIComponent(filters.latitude)}&`;
        if (filters.longitude) url += `longitude=${encodeURIComponent(filters.longitude)}&`;
        if (filters.range) url += `range=${encodeURIComponent(filters.range)}&`;
        if (filters.sort) url += `sort=${encodeURIComponent(filters.sort)}&`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
            allListings = data.listings;
            renderListings(allListings);
        }
    } catch (error) {
        showAlert('Failed to load listings', 'error');
    }
};

