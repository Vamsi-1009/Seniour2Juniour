let currentUser = null;
let allListings = [];
let selectedImages = [];
let currentChatRoom = null;
let typingTimeout = null;
const API = '/api';
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadListings();
    setupSearch();
    setupDragDrop();
    setupSocketListeners();
    loadSavedSearches();
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
            <button class="profile-btn" onclick="toggleProfileDropdown(event)">
                <div class="profile-icon">👤</div>
                <span>${currentUser.name || 'User'}</span>
            </button>
        `;
    }
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
        if (filters.category) url += `category=${filters.category}&`;
        if (filters.minPrice) url += `minPrice=${filters.minPrice}&`;
        if (filters.maxPrice) url += `maxPrice=${filters.maxPrice}&`;
        if (filters.condition) url += `condition=${filters.condition}&`;
        if (filters.location) url += `location=${filters.location}&`;
        if (filters.sort) url += `sort=${filters.sort}&`;

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
            const content = document.getElementById('profileContent');
            content.innerHTML = `
                <p><strong>Name:</strong> ${data.user.name}</p>
                <p><strong>Email:</strong> ${data.user.email}</p>
                <p><strong>Role:</strong> ${data.user.role}</p>
                <h3 style="margin-top:1.5rem;">My Listings</h3>
                ${data.listings.map(l => `
                    <div style="padding:1rem;background:rgba(255,255,255,0.1);border-radius:10px;margin:0.5rem 0">
                        <p><strong>${l.title}</strong> - ₹${l.price}</p>
                        <small>Status: ${l.status}</small>
                    </div>
                `).join('')}
            `;
            showModal('profileModal');
        }
    } catch (error) {
        showAlert('Failed to load profile', 'error');
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

function filterCategory(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

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

function openChat(listingId, sellerId) {
    if (!currentUser) {
        showAlert('Please login to chat', 'error');
        return;
    }

    currentChatRoom = listingId;
    socket.emit('join_chat', { listingId, userId: currentUser.user_id });

    showModal('chatModal');
    loadChatHistory(listingId);

    const chatInput = document.getElementById('chatInput');
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
        receiverId: 'seller_id', // Should be passed from listing
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

function selectCategory(category) {
    selectedCategoryValue = category;
    document.getElementById('sellCategory').value = category;

    // Update UI
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.category-card').classList.add('selected');
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

        if (!title || !desc || !price || !category) {
            showAlert('Please fill all required fields', 'error');
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
        if (filters.category) url += `category=${filters.category}&`;
        if (filters.minPrice) url += `minPrice=${filters.minPrice}&`;
        if (filters.maxPrice) url += `maxPrice=${filters.maxPrice}&`;
        if (filters.condition) url += `condition=${filters.condition}&`;
        if (filters.location) url += `location=${filters.location}&`;
        if (filters.latitude) url += `latitude=${filters.latitude}&`;
        if (filters.longitude) url += `longitude=${filters.longitude}&`;
        if (filters.range) url += `range=${filters.range}&`;
        if (filters.sort) url += `sort=${filters.sort}&`;

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

// Load my items when user logs in
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
