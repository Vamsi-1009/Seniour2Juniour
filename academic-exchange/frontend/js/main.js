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
            <button class="nav-btn nav-action-btn" onclick="showSellModal()">📦 Sell Item</button>
            <button class="nav-btn nav-action-btn" onclick="openChatsPanel()">💬 Chats</button>
            <button class="profile-btn" onclick="toggleProfileDropdown(event)">
                <div class="profile-icon" id="navAvatarIcon">👤</div>
                <span>${currentUser.name || 'User'}</span>
            </button>
        `;
        // Load avatar in nav if available
        loadNavAvatar();
    }
}

async function loadNavAvatar() {
    try {
        const res = await fetch(API + '/user/profile', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        if (data.success && data.user.avatar) {
            const icon = document.getElementById('navAvatarIcon');
            if (icon) {
                icon.innerHTML = `<img src="${data.user.avatar}" alt="avatar" style="width:35px;height:35px;border-radius:50%;object-fit:cover;">`;
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
        grid.innerHTML = '<p style="text-align:center;width:100%;color:white;">No listings found</p>';
        return;
    }

    grid.innerHTML = listings.map(item => `
        <div class="card" onclick="viewListing('${item.listing_id}')">
            <img src="${item.images[0]}" class="card-image" alt="${item.title}">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-price">₹${item.price}</p>
                <div class="card-meta">
                    <span>${item.condition}</span>
                    <span>${item.location || 'Online'}</span>
                </div>
                <div class="card-meta">
                    <span>👁️ ${item.views || 0} views</span>
                </div>
            </div>
        </div>
    `).join('');
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
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 700px;">
                    <h2>${listing.title}</h2>
                    <img src="${listing.images[0]}" style="width:100%; border-radius:15px; margin:1rem 0;">
                    <p><strong>Price:</strong> ₹${listing.price}</p>
                    <p><strong>Condition:</strong> ${listing.condition}</p>
                    <p><strong>Category:</strong> ${listing.category}</p>
                    <p><strong>Location:</strong> ${listing.location || 'Not specified'}</p>
                    <p style="margin-top:1rem;">${listing.description}</p>
                    <div style="margin-top:1.5rem; display:flex; gap:1rem;">
                        <button class="btn btn-primary" onclick="openChat('${listing.listing_id}', '${listing.user_id}')">💬 Chat with Seller</button>
                        <button class="btn btn-primary" onclick="initiatePaymentModal('${listing.listing_id}', '${listing.title}', ${listing.price})">💳 Buy Now</button>
                        <button class="btn" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
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
    const avatarSrc = user.avatar
        ? `<img src="${user.avatar}" alt="avatar" class="profile-avatar-img">`
        : `<div class="profile-avatar-placeholder">👤</div>`;

    content.innerHTML = `
        <div class="profile-view">
            <!-- Avatar -->
            <div class="profile-avatar-section">
                <div class="profile-avatar-wrapper" id="profileAvatarWrapper">
                    ${avatarSrc}
                </div>
                <div class="profile-basic-info">
                    <h3 class="profile-name" id="profileDisplayName">${user.name}</h3>
                    <p class="profile-email" id="profileDisplayEmail">${user.email}</p>
                    <span class="profile-role-badge">${user.role || 'student'}</span>
                </div>
            </div>

            <!-- Details -->
            <div class="profile-details-section">
                <div class="profile-detail-row">
                    <span class="profile-detail-label">📍 Location</span>
                    <span class="profile-detail-value" id="profileDisplayLocation">${user.location || 'Not set'}</span>
                </div>
                <div class="profile-detail-row">
                    <span class="profile-detail-label">📝 Bio</span>
                    <span class="profile-detail-value" id="profileDisplayBio">${user.bio || 'No bio yet'}</span>
                </div>
            </div>

            <!-- Edit Button -->
            <button class="btn btn-primary profile-edit-btn" onclick="renderProfileEdit(${JSON.stringify(user).replace(/"/g, '&quot;')})">✏️ Edit Profile</button>

            <!-- My Listings -->
            <div class="profile-listings-section">
                <h3>📦 My Listings (${listings.length})</h3>
                <div class="profile-listings-grid">
                    ${listings.length === 0
                        ? '<p style="opacity:0.6;margin-top:0.5rem;">No listings yet. Start selling!</p>'
                        : listings.map(l => `
                            <div class="profile-listing-card">
                                <strong>${l.title}</strong>
                                <span class="profile-listing-price">₹${l.price}</span>
                                <span class="profile-listing-status ${l.status}">${l.status}</span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    `;
}

function renderProfileEdit(user) {
    const content = document.getElementById('profileContent');
    const avatarSrc = user.avatar
        ? `<img src="${user.avatar}" alt="avatar" class="profile-avatar-img" id="profileAvatarPreview">`
        : `<div class="profile-avatar-placeholder" id="profileAvatarPreview">👤</div>`;

    content.innerHTML = `
        <div class="profile-edit-form">
            <!-- Avatar Upload -->
            <div class="profile-avatar-section">
                <div class="profile-avatar-wrapper profile-avatar-upload" onclick="document.getElementById('avatarInput').click()">
                    <div id="profileAvatarPreviewWrap">${avatarSrc}</div>
                    <div class="avatar-upload-overlay">📷 Change</div>
                </div>
                <input type="file" id="avatarInput" accept="image/*" style="display:none;" onchange="handleAvatarChange(this)">
            </div>

            <!-- Form Fields -->
            <form id="profileEditForm" onsubmit="handleUpdateProfile(event)">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-input modern" id="editName" value="${user.name || ''}" placeholder="Your name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input modern" id="editEmail" value="${user.email || ''}" placeholder="Your email" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Location</label>
                    <input type="text" class="form-input modern" id="editLocation" value="${user.location || ''}" placeholder="e.g., Mumbai, Maharashtra">
                </div>
                <div class="form-group">
                    <label class="form-label">Bio</label>
                    <textarea class="form-textarea modern" id="editBio" rows="3" placeholder="Tell others about yourself...">${user.bio || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="showProfile()">← Cancel</button>
                    <button type="submit" class="btn btn-primary">💾 Save Changes</button>
                </div>
            </form>
        </div>
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
    const div = document.createElement('div');
    div.className = `chat-message ${message.sender_id === currentUser?.user_id ? 'sent' : 'received'}`;
    div.innerHTML = `
        ${message.content}
        <span class="message-time">${new Date(message.created_at).toLocaleTimeString()}</span>
        <div class="message-reactions">
            <span class="reaction" onclick="addReaction('${message.message_id}', '👍')">👍</span>
            <span class="reaction" onclick="addReaction('${message.message_id}', '❤️')">❤️</span>
            <span class="reaction" onclick="addReaction('${message.message_id}', '😂')">😂</span>
        </div>
    `;
    messagesDiv.appendChild(div);
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
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));

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
    const alert = document.createElement('div');
    alert.className = `alert-notification ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.animation = 'slideInRight 0.3s ease reverse';
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
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
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
    dropdown.classList.toggle('show');
}

function closeProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.remove('show');
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
        chatsList.innerHTML = '<p style="text-align:center;opacity:0.7;">No chats yet</p>';
        return;
    }

    chatsList.innerHTML = chats.map(chat => `
        <div class="chat-list-item" onclick="openChatFromList('${chat.listing_id}', '${chat.seller_id}')">
            <img src="${chat.listing_image || '/uploads/default.png'}" alt="Listing">
            <div class="chat-list-info">
                <h4>${chat.listing_title || 'Listing'}</h4>
                <p>${chat.last_message || 'No messages yet'}</p>
                <small>${chat.last_message_time ? new Date(chat.last_message_time).toLocaleString() : ''}</small>
            </div>
            ${chat.unread_count > 0 ? `<span class="chat-unread-badge">${chat.unread_count}</span>` : ''}
        </div>
    `).join('');
}

function openChatFromList(listingId, sellerId) {
    closeModal('chatsPanelModal');
    openChat(listingId, sellerId);
}

// Close dropdown when clicking outside
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }

    // Close profile dropdown when clicking outside
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && !e.target.closest('.profile-btn') && !e.target.closest('.profile-dropdown')) {
        dropdown.classList.remove('show');
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

    grid.innerHTML = items.map(item => `
        <div class="card">
            <img src="${item.images[0]}" class="card-image" alt="${item.title}">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-price">₹${item.price}</p>
                <div class="card-meta">
                    <span>${item.condition}</span>
                    <span>${item.status}</span>
                </div>
                <div class="card-meta">
                    <span>👁️ ${item.views || 0} views</span>
                </div>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                    <button class="btn btn-sm" onclick="editListing('${item.listing_id}')">Edit</button>
                    <button class="btn btn-sm btn-secondary" onclick="deleteListing('${item.listing_id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function deleteListing(id) {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
        const res = await fetch(API + `/listings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });

        if (res.ok) {
            showAlert('Listing deleted successfully', 'success');
            loadMyItems();
            loadListings();
        }
    } catch (error) {
        showAlert('Failed to delete listing', 'error');
    }
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

