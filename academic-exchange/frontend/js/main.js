const API_URL = ''; // Empty string for relative path on production

// --- Safety Check for Socket.io ---
let socket = null;
try {
    socket = io(API_URL);
} catch (e) {
    console.warn("Socket.io not loaded.");
}

// --- Global State ---
let allListings = [];
let wishlistIds = [];
let currentRoom = null;
let currentUser = null;
let isEditingId = null; 
let currentCategory = 'all'; 

// --- Sub-Category Data ---
const subCategories = {
    'Engineering': ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'IT', 'Chemical', 'Aerospace', 'Other'],
    'MBBS': ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Internship', 'Dental (BDS)', 'Ayush'],
    'Law': ['LLB', 'LLM', 'CLAT Prep', 'Civil Law', 'Criminal Law', 'Constitution', 'Other'],
    'Intermediate': ['1st Year (MPC)', '1st Year (BiPC)', '1st Year (CEC/MEC)', '2nd Year (MPC)', '2nd Year (BiPC)', '2nd Year (CEC/MEC)'],
    'EAMCET': ['Engineering Stream', 'Agriculture & Medical', 'Previous Papers', 'Study Material'],
    'GATE': ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Instrumentation', 'General Aptitude'],
    'PG': ['MTech - CSE', 'MTech - ECE', 'MBA - Finance', 'MBA - Marketing', 'MBA - HR', 'MSc - Maths', 'MSc - Physics', 'MSc - Chemistry', 'MCA'],
    'Competitive Exams': ['UPSC (Civil Services)', 'SSC (CGL/CHSL)', 'Banking (PO/Clerk)', 'RRB (Railways)', 'GRE/TOEFL/IELTS', 'CAT/MAT', 'Defense'],
    'Gadgets': ['Laptops', 'Phones', 'Scientific Calculators', 'Drafters', 'Lab Coats', 'Aprons'],
    'Other': ['Fiction', 'Non-Fiction', 'Self Help', 'Stationery']
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchListings();
    checkLoginState();
    setupEventListeners();
    
    const token = localStorage.getItem('token');
    if (token) {
        currentUser = parseJwt(token)?.user_id;
        fetchWishlistIds();
    }
});

function parseJwt (token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
}

function timeAgo(dateString) {
    if(!dateString) return 'Recently';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
}

// --- Geolocation ---
function detectUserLocation() {
    const locInput = document.getElementById('locationFilter');
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    
    const originalPlaceholder = locInput.placeholder;
    locInput.placeholder = "Locating...";
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            const city = data.address.city || data.address.town || data.address.village || data.address.county;
            if (city) {
                locInput.value = city;
                // Note: We intentionally do NOT auto-filter here to prevent items from disappearing
            }
            locInput.placeholder = originalPlaceholder;
        } catch (err) { 
            console.error(err); 
            locInput.placeholder = "City/College";
        }
    }, (err) => { 
        alert("Location permission denied"); 
        locInput.placeholder = "City/College";
    });
}

// --- Socket Listeners ---
if (socket) {
    socket.on('receive_message', (data) => {
        if (data.room === currentRoom) {
            appendMessageToUI(data.message, data.author === currentUser ? 'self' : 'other');
        }
    });
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', () => filterCategory(currentCategory));
    
    const locationInput = document.getElementById('locationFilter');
    if (locationInput) locationInput.addEventListener('input', () => filterCategory(currentCategory));
    
    const toggleBtn = document.getElementById('toggleRegister');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleAuth);
    
    const sellForm = document.getElementById('sellForm');
    if (sellForm) sellForm.addEventListener('submit', handleSellItem);
}

// --- Helper: Handle Image Errors ---
function handleImgError(img) {
    if (img.dataset.hasError) return; 
    img.dataset.hasError = true;
    img.src = 'https://placehold.co/400x300/2d3436/FFF?text=Image+Deleted\n(Server+Reset)';
}

// --- Listings Logic ---
async function fetchListings() {
    try {
        const response = await fetch(`${API_URL}/listings`);
        allListings = await response.json();
        handleSort(); 
    } catch (err) { console.error("Fetch Error:", err); }
}

function renderListings(listings) {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    grid.innerHTML = ''; 

    if (!listings || listings.length === 0) {
        grid.innerHTML = '<p style="color:white; text-align:center; width:100%; grid-column: 1 / -1;">No listings found matching criteria.</p>';
        return;
    }

    listings.forEach((item, index) => {
        if (item.status === 'sold') return;

        let imageUrl = 'https://placehold.co/400x300/2d3436/FFF?text=No+Image';
        if (item.images && item.images.length > 0) {
            imageUrl = item.images[0].startsWith('http') ? item.images[0] : `${API_URL}${item.images[0]}`;
        }

        const isLiked = wishlistIds.includes(item.listing_id);
        const heartColor = isLiked ? '#ff7675' : 'white';

        const card = document.createElement('div');
        card.className = 'listing-card';
        // ADDED ANIMATION DELAY FOR "ATTRACTIVE" EFFECT
        card.style.animationDelay = `${index * 0.1}s`; 
        card.style.position = 'relative';
        
        card.innerHTML = `
            <img src="${imageUrl}" class="card-img" alt="${item.title}" 
                 onerror="handleImgError(this)"
                 onclick="viewListing('${item.listing_id}')" style="cursor:pointer;">
            
            <button onclick="toggleWishlist('${item.listing_id}', this)" 
                style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.5); border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:1.2rem; color:${heartColor}; transition:0.2s;">
                ♥
            </button>
            <div class="card-content">
                <h3 onclick="viewListing('${item.listing_id}')" style="cursor:pointer;">${item.title}</h3>
                <p class="price">₹${parseFloat(item.price).toFixed(2)}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                    <span style="font-size: 0.75rem; opacity: 0.7">📍 ${item.location || 'Unknown'}</span>
                    <span style="font-size: 0.75rem; opacity: 0.7">📅 ${timeAgo(item.created_at)}</span>
                </div>
                <button class="btn-primary" style="width:100%; margin-top:10px; padding: 5px;" onclick="openChat('${item.listing_id}', '${item.title}')">Chat</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function handleSort() {
    filterCategory(currentCategory); 
}

function filterCategory(category) {
    currentCategory = category;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText === category || (category === 'all' && btn.innerText === 'All')) {
            btn.classList.add('active');
        }
    });

    const searchTerm = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
    const locTerm = document.getElementById('locationFilter') ? document.getElementById('locationFilter').value.toLowerCase() : '';
    const sortSelect = document.getElementById('sortSelect');
    const sortValue = sortSelect ? sortSelect.value : 'newest';
    
    let filtered = allListings.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm) || 
                              item.description.toLowerCase().includes(searchTerm) ||
                              (item.subcategory && item.subcategory.toLowerCase().includes(searchTerm));
        const matchesCategory = category === 'all' || item.category === category;
        const matchesLocation = item.location ? item.location.toLowerCase().includes(locTerm) : true;
        return matchesSearch && matchesCategory && matchesLocation;
    });

    if (sortValue === 'price_low') {
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortValue === 'price_high') {
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortValue === 'popular') {
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    renderListings(filtered);
}

// --- Detail View Logic ---
async function viewListing(id) {
    try {
        const res = await fetch(`${API_URL}/listings/${id}`);
        if (!res.ok) return alert("Item not found");
        const item = await res.json();

        document.getElementById('detailTitle').innerText = item.title;
        document.getElementById('detailPrice').innerText = `₹${parseFloat(item.price).toFixed(2)}`;
        document.getElementById('detailDesc').innerText = item.description;
        document.getElementById('detailCategory').innerText = item.category;
        document.getElementById('detailSub').innerText = item.subcategory || ""; 
        document.getElementById('detailLoc').innerText = `📍 ${item.location || 'Unknown'}`;

        const mainImg = document.getElementById('detailImage');
        const thumbContainer = document.getElementById('detailThumbnails');
        thumbContainer.innerHTML = ''; 

        let images = item.images && item.images.length > 0 ? item.images : [];
        
        if (images.length > 0) {
             mainImg.src = images[0].startsWith('http') ? images[0] : `${API_URL}${images[0]}`;
        } else {
             mainImg.src = 'https://placehold.co/400x300/2d3436/FFF?text=No+Image';
        }
        mainImg.onerror = function() { handleImgError(this); };

        if (images.length > 1) {
            images.forEach(img => {
                const src = img.startsWith('http') ? img : `${API_URL}${img}`;
                const thumb = document.createElement('img');
                thumb.src = src;
                thumb.style.width = '60px';
                thumb.style.height = '60px';
                thumb.style.borderRadius = '5px';
                thumb.style.cursor = 'pointer';
                thumb.style.objectFit = 'cover';
                thumb.style.border = '2px solid transparent';
                thumb.onerror = function() { handleImgError(this); };
                
                thumb.onclick = () => {
                    mainImg.src = src;
                    Array.from(thumbContainer.children).forEach(t => t.style.border = '2px solid transparent');
                    thumb.style.border = '2px solid #6c5ce7';
                };
                thumbContainer.appendChild(thumb);
            });
        }

        document.getElementById('detailChatBtn').onclick = () => { closeModal('detailsModal'); openChat(item.listing_id, item.title); };
        const wishBtn = document.getElementById('detailWishlistBtn');
        wishBtn.onclick = () => toggleWishlist(item.listing_id, wishBtn);
        
        wishBtn.innerText = wishlistIds.includes(item.listing_id) ? "♥" : "♡";
        wishBtn.style.background = wishlistIds.includes(item.listing_id) ? "#ff7675" : "rgba(255,255,255,0.2)";

        renderRelated(item.category, item.listing_id);
        openModal('detailsModal');
    } catch (err) { console.error(err); }
}

function renderRelated(category, currentId) {
    const grid = document.getElementById('relatedGrid');
    grid.innerHTML = '';
    const related = allListings.filter(i => i.category === category && i.listing_id !== currentId && i.status !== 'sold').slice(0, 4);
    if (related.length === 0) { grid.innerHTML = '<p style="opacity:0.6;">No similar items.</p>'; return; }
    related.forEach(item => {
        let imageUrl = 'https://placehold.co/200x120/2d3436/FFF?text=No+Image';
        if (item.images && item.images.length > 0) imageUrl = item.images[0].startsWith('http') ? item.images[0] : `${API_URL}${item.images[0]}`;
        const card = document.createElement('div');
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.borderRadius = '10px';
        card.style.padding = '10px';
        card.style.cursor = 'pointer';
        card.onclick = () => viewListing(item.listing_id);
        card.innerHTML = `<img src="${imageUrl}" onerror="handleImgError(this)" style="width:100%; height:120px; object-fit:cover; border-radius:5px;"><h4 style="margin:5px 0;">${item.title}</h4><p style="color:#00b894; font-weight:bold;">₹${parseFloat(item.price).toFixed(2)}</p>`;
        grid.appendChild(card);
    });
}

// --- ADMIN LOGIC ---
async function openAdmin() {
    const token = localStorage.getItem('token');
    try {
        const resStats = await fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` }});
        if(!resStats.ok) return alert("Access Denied: Admins Only");
        const stats = await resStats.json();
        
        document.getElementById('statUsers').innerText = stats.total_users;
        document.getElementById('statListings').innerText = stats.total_listings;
        document.getElementById('statSold').innerText = stats.total_sold;

        adminShow('users');
        openModal('adminModal');
    } catch (err) { console.error(err); alert("Failed to load admin panel"); }
}

async function adminShow(type) {
    const token = localStorage.getItem('token');
    const content = document.getElementById('adminDynamicContent');
    const title = document.getElementById('adminSectionTitle');
    content.innerHTML = '<p>Loading...</p>';
    
    if (type === 'users') {
        title.innerText = "User Management";
        try {
            const res = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` }});
            const users = await res.json();
            content.innerHTML = '';
            users.forEach(u => {
                const div = document.createElement('div');
                div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.padding = '10px'; div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                div.innerHTML = `<span>${u.name} (${u.email}) - <small>${u.role}</small></span>${u.role !== 'admin' ? `<button onclick="banUser('${u.user_id}')" style="background:#d63031;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">Ban</button>` : ''}`;
                content.appendChild(div);
            });
        } catch (e) { content.innerHTML = '<p>Error loading users</p>'; }
    } 
    else if (type === 'listings') {
        title.innerText = "Active Listings Management";
        const active = allListings.filter(i => i.status !== 'sold');
        content.innerHTML = '';
        active.forEach(item => {
            const div = document.createElement('div');
            div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.padding = '10px'; div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = `<span>${item.title} ($${item.price})</span> <button onclick="deleteListing('${item.listing_id}')" style="background:#d63031;color:white;border:none;padding:2px 8px;border-radius:4px;">Del</button>`;
            content.appendChild(div);
        });
    } 
    else if (type === 'sold') {
        title.innerText = "Sold Items History";
        const sold = allListings.filter(i => i.status === 'sold');
        content.innerHTML = '';
        if(sold.length === 0) content.innerHTML = '<p>No sold items.</p>';
        sold.forEach(item => {
            const div = document.createElement('div');
            div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.padding = '10px'; div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = `<span style="opacity:0.6">${item.title} (Sold)</span> <button onclick="deleteListing('${item.listing_id}')" style="background:#d63031;color:white;border:none;padding:2px 8px;border-radius:4px;">Del</button>`;
            content.appendChild(div);
        });
    }
}

async function banUser(id) {
    if(!confirm("Ban user?")) return;
    try {
        await fetch(`${API_URL}/admin/user/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
        alert("User Banned"); adminShow('users');
    } catch(err) { alert("Error"); }
}

// --- Common Utils ---
async function fetchWishlistIds() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/wishlist/ids`, { headers: { 'Authorization': `Bearer ${token}` }});
        wishlistIds = await res.json();
        renderListings(allListings);
    } catch (err) { console.error(err); }
}

async function toggleWishlist(id, btn) {
    const token = localStorage.getItem('token');
    if (!token) return alert("Please login to wishlist");
    const isLiked = wishlistIds.includes(id);
    if (isLiked) { wishlistIds = wishlistIds.filter(itemId => itemId !== id); btn.style.color = 'white'; } 
    else { wishlistIds.push(id); btn.style.color = '#ff7675'; }
    try { await fetch(`${API_URL}/wishlist/toggle/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }}); } catch (err) {}
}

// --- Profile & Management ---
async function openProfile() {
    const token = localStorage.getItem('token');
    if (!token) return alert("Please login");

    try {
        const response = await fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await response.json();
        
        document.getElementById('profileName').innerText = data.user.name || "Student";
        document.getElementById('profileEmail').innerText = data.user.email;
        
        if (data.user.avatar) {
            document.getElementById('profileAvatar').src = `${API_URL}${data.user.avatar}`;
        } else {
            document.getElementById('profileAvatar').src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiIgd2lkdGg9IjEwMHB4IiBoZWlnaHQ9IjEwMHB4Ij48cGF0aCBkPSZNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+PC9zdmc+";
        }

        const myGrid = document.getElementById('myListingsGrid');
        myGrid.innerHTML = '';
        
        if (data.listings.length === 0) {
            myGrid.innerHTML = '<p>No active listings.</p>';
        } else {
            data.listings.forEach(item => {
                const div = document.createElement('div');
                div.style.background = 'rgba(255,255,255,0.05)';
                div.style.padding = '10px';
                div.style.marginBottom = '10px';
                div.style.borderRadius = '8px';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';

                const statusBadge = item.status === 'sold' 
                    ? '<span style="color:#ff7675; font-weight:bold;">(SOLD)</span>' 
                    : '<span style="color:#55efc4; font-weight:bold;">(Active)</span>';

                div.innerHTML = `
                    <div style="font-size:0.9rem;">
                        <strong>${item.title}</strong><br> ₹${item.price} ${statusBadge}
                    </div>
                    <div style="display:flex; gap:10px;">
                        ${item.status !== 'sold' ? `
                        <button onclick="editListing('${item.listing_id}')" style="background:#0984e3; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; color:white;">✎</button>
                        <button onclick="markSold('${item.listing_id}')" style="background:#00b894; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; color:white;">✔</button>
                        ` : ''}
                        <button onclick="deleteListing('${item.listing_id}')" style="background:#d63031; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; color:white;">🗑</button>
                    </div>
                `;
                myGrid.appendChild(div);
            });
        }
        openModal('profileModal');
    } catch (err) { console.error(err); }
}

async function editProfileDetails() {
    const newName = prompt("Enter your new name:");
    if (!newName) return;

    try {
        const res = await fetch(`${API_URL}/user/profile`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ name: newName })
        });
        
        if (res.ok) {
            alert("Name updated!");
            openProfile(); 
        } else {
            alert("Failed to update name");
        }
    } catch(err) { console.error(err); alert("Error updating profile"); }
}

async function deleteListing(id) {
    if(!confirm("Are you sure you want to delete this listing?")) return;
    try {
        const res = await fetch(`${API_URL}/listings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (res.ok) { 
            alert("Item Deleted"); 
            const adminModal = document.getElementById('adminModal');
            if (adminModal && adminModal.style.display === 'flex') {
                const isSoldView = document.getElementById('adminSectionTitle').innerText.includes('Sold');
                adminShow(isSoldView ? 'sold' : 'listings');
            } else {
                openProfile(); 
            }
            fetchListings(); 
        } else {
            alert("Failed to delete.");
        }
    } catch (err) { console.error(err); }
}

async function markSold(id) {
    if(!confirm("Mark as sold?")) return;
    try {
        const res = await fetch(`${API_URL}/listings/${id}/sold`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) { alert("Sold!"); openProfile(); fetchListings(); }
    } catch (err) { console.error(err); }
}

async function uploadAvatar() {
    const file = document.getElementById('avatarInput').files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
        const res = await fetch(`${API_URL}/user/avatar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        const data = await res.json();
        if (res.ok) { document.getElementById('profileAvatar').src = `${API_URL}${data.avatar}`; alert("Updated!"); }
    } catch (err) { alert("Error"); }
}

// --- Auth & Sell ---
function toggleAuthMode(e) {
    e.preventDefault();
    const h2 = document.querySelector('#loginModal h2');
    const btn = document.querySelector('#loginModal button');
    const tog = document.getElementById('toggleRegister');
    if (h2.innerText.includes('Welcome')) { h2.innerText='Create Account'; btn.innerText='Register'; tog.innerText='Login'; }
    else { h2.innerText='Welcome Back'; btn.innerText='Login'; tog.innerText='Register'; }
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isReg = document.querySelector('#loginModal h2').innerText.includes('Create');
    try {
        const res = await fetch(`${API_URL}/auth${isReg?'/register':'/login'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: isReg ? email.split('@')[0] : undefined })
        });
        const data = await res.json();
        if (res.ok) { 
            localStorage.setItem('token', data.token); 
            localStorage.setItem('role', data.role); 
            location.reload(); 
        } else {
            const errDiv = document.getElementById('authError');
            if(errDiv) {
                errDiv.style.display = 'block';
                errDiv.innerText = data.error || 'Authentication Failed';
            }
        }
    } catch (e) { alert('Error: ' + e.message); }
}

function checkLoginState() {
    const nav = document.getElementById('navLinks');
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    if (token) {
        let adminBtn = role === 'admin' ? `<button onclick="openAdmin()" class="btn-primary" style="margin-right:10px; background:#d63031;">Admin</button>` : '';
        nav.innerHTML = `${adminBtn}<button onclick="openProfile()" class="btn-primary" style="margin-right:10px; background:#6c5ce7;">Profile</button><button onclick="logout()" class="btn-primary" style="background:#ff7675">Logout</button>`;
    } else nav.innerHTML = '<button onclick="openModal(\'loginModal\')" class="btn-primary">Login / Register</button>';
}

function logout() { 
    localStorage.removeItem('token'); 
    localStorage.removeItem('role'); 
    currentUser=null; 
    location.reload(); 
}

// --- Utils Exports ---
function updateSubCategories() {
    const cat = document.getElementById('itemCategory').value;
    const subSel = document.getElementById('itemSubCategory');
    subSel.innerHTML = ''; 
    if (subCategories[cat]) {
        subCategories[cat].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub; opt.innerText = sub; subSel.appendChild(opt);
        });
        subSel.parentElement.style.display = 'block'; 
    } else subSel.parentElement.style.display = 'none'; 
}

function openSellModal() {
    isEditingId = null; 
    document.getElementById('sellForm').reset();
    document.querySelector('#sellModal h2').innerText = "Sell an Item";
    document.querySelector('#sellModal button[type="submit"]').innerText = "Post Listing";
    document.getElementById('imageUploadSection').style.display = 'block'; 
    document.getElementById('itemCategory').value = 'Engineering';
    updateSubCategories();
    closeModal('profileModal');
    openModal('sellModal');
}

function editListing(id) {
    const item = allListings.find(l => l.listing_id == id);
    if (!item) return;
    
    isEditingId = id; 
    document.getElementById('itemTitle').value = item.title;
    document.getElementById('itemDesc').value = item.description;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemLocation').value = item.location || '';
    document.getElementById('itemCondition').value = item.condition;
    
    const catSelect = document.getElementById('itemCategory');
    catSelect.value = item.category;
    updateSubCategories(); 
    
    const subSelect = document.getElementById('itemSubCategory');
    if (item.subcategory) {
        subSelect.value = item.subcategory;
    }

    document.getElementById('imageUploadSection').style.display = 'none'; 
    document.querySelector('#sellModal h2').innerText = "Edit Item";
    document.querySelector('#sellModal button[type="submit"]').innerText = "Update Listing";
    
    closeModal('profileModal');
    openModal('sellModal');
}

async function handleSellItem(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const formData = new FormData();
    formData.append('title', document.getElementById('itemTitle').value);
    formData.append('description', document.getElementById('itemDesc').value);
    formData.append('price', document.getElementById('itemPrice').value);
    formData.append('location', document.getElementById('itemLocation').value);
    formData.append('category', document.getElementById('itemCategory').value);
    formData.append('subcategory', document.getElementById('itemSubCategory').value);
    formData.append('condition', document.getElementById('itemCondition').value);

    const files = document.getElementById('itemImages').files;
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    if (isEditingId) {
        const data = {};
        formData.forEach((value, key) => data[key] = value);
        delete data.images; 

        try {
            const res = await fetch(`${API_URL}/listings/${isEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (res.ok) { alert('Updated!'); closeModal('sellModal'); fetchListings(); } 
            else { 
                const err = await res.json();
                document.getElementById('sellError').innerText = err.message || 'Update failed';
                document.getElementById('sellError').style.display = 'block';
            }
        } catch (err) { alert('Error'); }
    } else {
        try {
            const res = await fetch(`${API_URL}/listings`, { 
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${token}` }, 
                body: formData 
            });
            if (res.ok) { 
                alert('Posted!'); 
                closeModal('sellModal'); 
                fetchListings(); 
            } else { 
                const err = await res.json(); 
                const errMsg = document.getElementById('sellError');
                if(errMsg) {
                    errMsg.style.display = 'block';
                    errMsg.innerText = "Error: " + (err.message || res.statusText);
                } else {
                    alert('Failed to post'); 
                }
            }
        } catch (e) { alert('Error posting: ' + e.message); }
    }
}

// --- Global Functions (Required for onclick in HTML) ---
window.openModal = (id) => {
    const m = document.getElementById(id);
    if(m) {
        m.style.display = 'flex';
        if(document.getElementById('authError')) document.getElementById('authError').style.display='none';
        if(document.getElementById('sellError')) document.getElementById('sellError').style.display='none';
    }
};
window.closeModal = (id) => { const m = document.getElementById(id); if(m) m.style.display = 'none'; };
window.sendMessage = sendMessage;
window.logout = logout;
window.openProfile = openProfile;
window.uploadAvatar = uploadAvatar;
window.deleteListing = deleteListing;
window.markSold = markSold;
window.toggleWishlist = toggleWishlist;
window.openAdmin = openAdmin;
window.adminShow = adminShow;
window.banUser = banUser;
window.editListing = editListing; 
window.openSellModal = openSellModal; 
window.viewListing = viewListing; 
window.handleSort = handleSort;
window.filterCategory = filterCategory;
window.updateSubCategories = updateSubCategories;
window.toggleAuthMode = toggleAuthMode; 
window.handleAuth = handleAuth;
window.detectUserLocation = detectUserLocation;
window.editProfileDetails = editProfileDetails;
