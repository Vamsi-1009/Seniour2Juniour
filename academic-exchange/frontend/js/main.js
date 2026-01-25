const API_URL = ''; // Relative path for production

// --- 1. Socket Connection (Safe Mode) ---
let socket = null;
try {
    if (typeof io !== 'undefined') {
        socket = io(API_URL);
        console.log("Socket connected");
    }
} catch (e) { console.warn("Socket failed:", e); }

// --- 2. Global State ---
let allListings = [];
let wishlistIds = [];
let currentRoom = null;
let currentUser = null;
let isEditingId = null; 
let currentCategory = 'all'; 

// --- 3. Helper Functions (Global) ---
window.parseJwt = (token) => {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
};

window.timeAgo = (dateString) => {
    if(!dateString) return 'Recently';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60; if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
};

window.handleImgError = (img) => {
    if (img.dataset.hasError) return; 
    img.dataset.hasError = true;
    // Shows a clean placeholder if the server wiped the image
    img.src = 'https://placehold.co/400x300/2d3436/FFF?text=Image+Missing\n(Server+Reset)';
};

// --- 4. Sub-Categories Data ---
const subCategories = {
    'Engineering': ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'IT', 'Chemical', 'Aerospace', 'Other'],
    'MBBS': ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Internship', 'Dental (BDS)', 'Ayush'],
    'Law': ['LLB', 'LLM', 'CLAT Prep', 'Civil Law', 'Criminal Law', 'Constitution', 'Other'],
    'Intermediate': ['1st Year (MPC)', '1st Year (BiPC)', '1st Year (CEC/MEC)', '2nd Year (MPC)', '2nd Year (BiPC)', '2nd Year (CEC/MEC)'],
    'EAMCET': ['Engineering Stream', 'Agriculture & Medical', 'Previous Papers', 'Study Material'],
    'GATE': ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Instrumentation', 'General Aptitude'],
    'PG': ['MTech - CSE', 'MTech - ECE', 'MBA - Finance', 'MBA - Marketing', 'MBA - HR', 'MSc - Maths', 'MSc - Physics', 'MSc - Chemistry', 'MCA'],
    'Competitive Exams': ['UPSC', 'SSC', 'Banking', 'RRB', 'GRE/TOEFL', 'CAT', 'Defense'],
    'Gadgets': ['Laptops', 'Phones', 'Scientific Calculators', 'Drafters', 'Lab Coats', 'Aprons'],
    'Other': ['Fiction', 'Non-Fiction', 'Self Help', 'Stationery']
};

// --- 5. Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const token = localStorage.getItem('token');
    if (token) {
        currentUser = window.parseJwt(token)?.user_id;
        window.fetchWishlistIds();
        window.checkLoginState();
    } else {
        window.checkLoginState();
    }

    // Load Data
    window.fetchListings();

    // Attach Listeners
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.addEventListener('input', () => window.filterCategory(currentCategory));

    const locInput = document.getElementById('locationFilter');
    if(locInput) locInput.addEventListener('input', () => window.filterCategory(currentCategory));

    // Force Attach Location Click (Fixes your issue)
    const locIcon = document.querySelector('.location-icon'); 
    if(locIcon) locIcon.onclick = window.detectUserLocation;

    // Attach Form Handlers
    const toggleBtn = document.getElementById('toggleRegister');
    if(toggleBtn) toggleBtn.onclick = window.toggleAuthMode;

    const loginForm = document.getElementById('loginForm');
    if(loginForm) loginForm.onsubmit = window.handleAuth;

    const sellForm = document.getElementById('sellForm');
    if(sellForm) sellForm.onsubmit = window.handleSellItem;
});

// --- 6. Core Logic (Global) ---

window.checkLoginState = () => {
    const nav = document.getElementById('navLinks');
    if (!nav) return;
    
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token) {
        // Only show Admin button if role is 'admin'
        let adminBtn = (role === 'admin') 
            ? `<button onclick="window.openAdmin()" class="btn-primary" style="background:#d63031; margin-right:10px;">Admin</button>` 
            : '';

        nav.innerHTML = `
            ${adminBtn}
            <button onclick="window.openProfile()" class="btn-primary" style="margin-right:10px;">Profile</button>
            <button onclick="window.logout()" class="btn-primary" style="background:#ff7675">Logout</button>
        `;
    } else {
        nav.innerHTML = '<button onclick="window.openModal(\'loginModal\')" class="btn-primary">Login / Register</button>';
    }
};

window.detectUserLocation = () => {
    const locInput = document.getElementById('locationFilter');
    if (!navigator.geolocation) { return alert("Geolocation not supported"); }
    
    const oldPlaceholder = locInput.placeholder;
    locInput.placeholder = "Locating...";
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const city = data.address.city || data.address.town || data.address.village;
            
            if (city) {
                locInput.value = city;
                // We do NOT auto-filter here to prevent items disappearing
            }
            locInput.placeholder = oldPlaceholder;
        } catch (err) { 
            console.error(err); 
            locInput.placeholder = "City/College";
        }
    }, () => { alert("Location access denied"); locInput.placeholder = "City/College"; });
};

window.logout = () => {
    localStorage.clear();
    location.reload();
};

window.toggleAuthMode = (e) => {
    e.preventDefault();
    const h2 = document.querySelector('#loginModal h2');
    const btn = document.querySelector('#loginModal button');
    
    if (h2.innerText.includes('Welcome')) {
        h2.innerText = 'Create Account';
        btn.innerText = 'Register';
    } else {
        h2.innerText = 'Welcome Back';
        btn.innerText = 'Login';
    }
};

window.handleAuth = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isReg = document.querySelector('#loginModal h2').innerText.includes('Create');
    
    try {
        const res = await fetch(`${API_URL}/auth/${isReg ? 'register' : 'login'}`, {
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
            if (errDiv) {
                errDiv.style.display = 'block';
                errDiv.innerText = data.error || 'Authentication Failed';
            }
        }
    } catch (err) { alert("Server Error. Please try again later."); }
};

// --- Listings ---

window.fetchListings = async () => {
    try {
        const res = await fetch(`${API_URL}/listings`);
        if(!res.ok) throw new Error("Failed to fetch");
        allListings = await res.json();
        window.renderListings(allListings);
    } catch (e) { console.error("Fetch Error:", e); }
};

window.renderListings = (items) => {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    
    if (!items || items.length === 0) {
        grid.innerHTML = '<p style="color:white; text-align:center; width:100%; grid-column: 1 / -1;">No listings found.</p>';
        return;
    }

    grid.innerHTML = items.map((item, index) => {
        if (item.status === 'sold') return ''; 

        // Image URL Logic
        let imageUrl = (item.images && item.images.length > 0) 
            ? (item.images[0].startsWith('http') ? item.images[0] : `${API_URL}${item.images[0]}`)
            : 'https://placehold.co/400x300/2d3436/FFF?text=No+Image';

        const heartColor = wishlistIds.includes(item.listing_id) ? '#ff7675' : 'white';
        const delay = index * 0.05;
        const safeTitle = item.title.replace(/'/g, "\\'");

        return `
        <div class="listing-card" style="animation-delay: ${delay}s; position: relative;">
            <img src="${imageUrl}" class="card-img" 
                 onerror="window.handleImgError(this)" 
                 onclick="window.viewListing('${item.listing_id}')">
            
            <button onclick="window.toggleWishlist('${item.listing_id}', this)" 
                style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.5); border:none; border-radius:50%; width:30px; height:30px; color:${heartColor}; cursor:pointer; font-size:1.2rem;">
                ♥
            </button>
            
            <div class="card-content">
                <h3 onclick="window.viewListing('${item.listing_id}')" style="cursor:pointer">${item.title}</h3>
                <p class="price">₹${parseFloat(item.price).toFixed(2)}</p>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; opacity:0.7; margin-top:5px;">
                    <span>📍 ${item.location || 'Online'}</span>
                    <span>${window.timeAgo(item.created_at)}</span>
                </div>
                <button class="btn-primary" style="width:100%; margin-top:10px;" 
                    onclick="window.openChat('${item.listing_id}', '${safeTitle}')">Chat</button>
            </div>
        </div>`;
    }).join('');
};

window.filterCategory = (cat) => {
    currentCategory = cat;
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        if(b.innerText === cat || (cat === 'all' && b.innerText === 'All')) b.classList.add('active');
    });

    const search = document.getElementById('searchInput').value.toLowerCase();
    const loc = document.getElementById('locationFilter').value.toLowerCase();

    const filtered = allListings.filter(i => {
        const mCat = cat === 'all' || i.category === cat;
        const mSearch = i.title.toLowerCase().includes(search) || i.description.toLowerCase().includes(search);
        const mLoc = i.location ? i.location.toLowerCase().includes(loc) : true;
        return mCat && mSearch && mLoc;
    });
    window.renderListings(filtered);
};

// --- Sell Item ---

window.openSellModal = () => {
    isEditingId = null;
    document.getElementById('sellForm').reset();
    document.querySelector('#sellModal h2').innerText = "Sell an Item";
    document.querySelector('#sellModal button[type="submit"]').innerText = "Post Listing";
    document.getElementById('imageUploadSection').style.display = 'block';
    
    document.getElementById('itemCategory').value = 'Engineering';
    window.updateSubCategories();
    
    window.closeModal('profileModal');
    window.openModal('sellModal');
};

window.updateSubCategories = () => {
    const cat = document.getElementById('itemCategory').value;
    const subSel = document.getElementById('itemSubCategory');
    subSel.innerHTML = ''; 
    if (subCategories[cat]) {
        subCategories[cat].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub; opt.innerText = sub; subSel.appendChild(opt);
        });
        subSel.parentElement.style.display = 'block'; 
    } else {
        subSel.parentElement.style.display = 'none'; 
    }
};

window.handleSellItem = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) return alert("Please login to post.");

    // Visual Feedback
    const submitBtn = document.querySelector('#sellForm button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

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

    try {
        let url = `${API_URL}/listings`;
        let method = 'POST';
        let headers = { 'Authorization': `Bearer ${token}` };
        let body = formData;

        if (isEditingId) {
            url = `${API_URL}/listings/${isEditingId}`;
            method = 'PUT';
            headers['Content-Type'] = 'application/json';
            const jsonData = {};
            formData.forEach((value, key) => jsonData[key] = value);
            delete jsonData.images; 
            body = JSON.stringify(jsonData);
        }

        const res = await fetch(url, { method, headers, body });
        
        if (res.ok) {
            alert(isEditingId ? 'Item Updated!' : 'Item Posted Successfully!');
            window.closeModal('sellModal');
            window.fetchListings();
        } else {
            const err = await res.json();
            alert("Error: " + (err.message || "Failed to save. Check server logs."));
        }
    } catch (err) {
        alert("Network Error. Server might be waking up (wait 30s) or 'uploads' folder is missing.");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
};

window.editListing = (id) => {
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
    window.updateSubCategories(); 
    
    const subSelect = document.getElementById('itemSubCategory');
    if (item.subcategory) subSelect.value = item.subcategory;

    document.getElementById('imageUploadSection').style.display = 'none'; 
    document.querySelector('#sellModal h2').innerText = "Edit Item";
    document.querySelector('#sellModal button[type="submit"]').innerText = "Update Listing";
    
    window.closeModal('profileModal');
    window.openModal('sellModal');
};

// --- View Details ---

window.viewListing = async (id) => {
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

        let images = (item.images && item.images.length > 0) ? item.images : [];
        if (images.length > 0) {
             mainImg.src = images[0].startsWith('http') ? images[0] : `${API_URL}${images[0]}`;
        } else {
             mainImg.src = 'https://placehold.co/400x300/2d3436/FFF?text=No+Image';
        }
        mainImg.onerror = function() { window.handleImgError(this); };

        if (images.length > 1) {
            images.forEach(img => {
                const src = img.startsWith('http') ? img : `${API_URL}${img}`;
                const thumb = document.createElement('img');
                thumb.src = src;
                thumb.style.width = '60px'; thumb.style.height = '60px';
                thumb.style.borderRadius = '5px'; thumb.style.cursor = 'pointer';
                thumb.style.objectFit = 'cover'; thumb.style.border = '2px solid transparent';
                thumb.onerror = function() { window.handleImgError(this); };
                
                thumb.onclick = () => {
                    mainImg.src = src;
                    Array.from(thumbContainer.children).forEach(t => t.style.border = '2px solid transparent');
                    thumb.style.border = '2px solid #6c5ce7';
                };
                thumbContainer.appendChild(thumb);
            });
        }

        document.getElementById('detailChatBtn').onclick = () => { window.closeModal('detailsModal'); window.openChat(item.listing_id, item.title); };
        
        const wishBtn = document.getElementById('detailWishlistBtn');
        wishBtn.onclick = () => window.toggleWishlist(item.listing_id, wishBtn);
        wishBtn.innerText = wishlistIds.includes(item.listing_id) ? "♥" : "♡";
        wishBtn.style.background = wishlistIds.includes(item.listing_id) ? "#ff7675" : "rgba(255,255,255,0.2)";

        window.renderRelated(item.category, item.listing_id);
        window.openModal('detailsModal');
    } catch (err) { console.error(err); }
};

window.renderRelated = (category, currentId) => {
    const grid = document.getElementById('relatedGrid');
    grid.innerHTML = '';
    const related = allListings.filter(i => i.category === category && i.listing_id !== currentId && i.status !== 'sold').slice(0, 4);
    
    if (related.length === 0) { grid.innerHTML = '<p style="opacity:0.6;">No similar items.</p>'; return; }
    
    related.forEach(item => {
        let imageUrl = (item.images && item.images.length > 0) 
            ? (item.images[0].startsWith('http') ? item.images[0] : `${API_URL}${item.images[0]}`)
            : 'https://placehold.co/200x120/2d3436/FFF?text=No+Image';
            
        const card = document.createElement('div');
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.borderRadius = '10px';
        card.style.padding = '10px';
        card.style.cursor = 'pointer';
        card.onclick = () => window.viewListing(item.listing_id);
        card.innerHTML = `<img src="${imageUrl}" onerror="window.handleImgError(this)" style="width:100%; height:120px; object-fit:cover; border-radius:5px;"><h4 style="margin:5px 0;">${item.title}</h4><p style="color:#00b894; font-weight:bold;">₹${parseFloat(item.price).toFixed(2)}</p>`;
        grid.appendChild(card);
    });
};

// --- Chat Logic ---

window.openChat = async (listingId, title) => {
    if (!localStorage.getItem('token')) return alert("Please login to chat.");
    document.getElementById('chatTitle').innerText = `Chat: ${title}`;
    currentRoom = listingId;
    
    if (socket) socket.emit('join_room', listingId);
    
    const win = document.getElementById('chatWindow');
    win.innerHTML = '<p style="text-align:center;color:#ccc;">Loading history...</p>';
    
    try {
        const res = await fetch(`${API_URL}/messages/${listingId}`);
        const msgs = await res.json();
        win.innerHTML = '';
        msgs.forEach(m => {
            const isMe = m.sender_id === currentUser;
            window.appendMessageToUI(m.content, isMe ? 'self' : 'other');
        });
    } catch (e) { win.innerHTML = '<p>No history yet.</p>'; }
    window.openModal('chatModal');
};

window.sendMessage = () => {
    const input = document.getElementById('messageInput');
    const msg = input.value;
    if (!msg.trim()) return;
    
    if (socket) {
        socket.emit('send_message', { 
            room: currentRoom, 
            author: currentUser, 
            message: msg, 
            time: new Date().toISOString() 
        });
    }
    window.appendMessageToUI(msg, 'self');
    input.value = "";
};

window.appendMessageToUI = (text, type) => {
    const win = document.getElementById('chatWindow');
    const div = document.createElement('div');
    div.style.textAlign = type === 'self' ? 'right' : 'left';
    div.style.margin = '5px 0';
    div.innerHTML = `<span style="background:${type==='self'?'#6c5ce7':'#555'}; color:white; padding:8px 12px; border-radius:15px; display:inline-block; max-width: 80%; word-wrap: break-word;">${text}</span>`;
    win.appendChild(div);
    win.scrollTop = win.scrollHeight;
};

// --- Admin & Management ---

window.openAdmin = async () => {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` }});
        if(!res.ok) return alert("Access Denied: Admins Only");
        const stats = await res.json();
        
        document.getElementById('statUsers').innerText = stats.total_users;
        document.getElementById('statListings').innerText = stats.total_listings;
        document.getElementById('statSold').innerText = stats.total_sold;

        window.adminShow('users');
        window.openModal('adminModal');
    } catch (err) { alert("Failed to load admin panel"); }
};

window.adminShow = async (type) => {
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
                div.innerHTML = `<span>${u.name} (${u.email}) - <small>${u.role}</small></span>${u.role !== 'admin' ? `<button onclick="window.banUser('${u.user_id}')" style="background:#d63031;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">Ban</button>` : ''}`;
                content.appendChild(div);
            });
        } catch (e) { content.innerHTML = '<p>Error loading users</p>'; }
    } else if (type === 'listings') {
        title.innerText = "Active Listings Management";
        const active = allListings.filter(i => i.status !== 'sold');
        content.innerHTML = '';
        active.forEach(item => {
            const div = document.createElement('div');
            div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.padding = '10px'; div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            div.innerHTML = `<span>${item.title} ($${item.price})</span> <button onclick="window.deleteListing('${item.listing_id}')" style="background:#d63031;color:white;border:none;padding:2px 8px;border-radius:4px;">Del</button>`;
            content.appendChild(div);
        });
    }
};

window.banUser = async (id) => {
    if(!confirm("Ban user?")) return;
    try {
        await fetch(`${API_URL}/admin/user/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
        alert("User Banned"); window.adminShow('users');
    } catch(err) { alert("Error"); }
};

// --- Profile ---

window.openProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return alert("Please login");

    try {
        const response = await fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await response.json();
        
        document.getElementById('profileName').innerText = data.user.name || "Student";
        document.getElementById('profileEmail').innerText = data.user.email;
        
        if (data.user.avatar) {
            document.getElementById('profileAvatar').src = `${API_URL}${data.user.avatar}`;
        }

        const myGrid = document.getElementById('myListingsGrid');
        myGrid.innerHTML = '';
        
        if (data.listings.length === 0) {
            myGrid.innerHTML = '<p>No active listings.</p>';
        } else {
            data.listings.forEach(item => {
                const div = document.createElement('div');
                div.style.background = 'rgba(255,255,255,0.05)';
                div.style.padding = '10px'; div.style.marginBottom = '10px';
                div.style.borderRadius = '8px'; div.style.display = 'flex';
                div.style.justifyContent = 'space-between'; div.style.alignItems = 'center';

                const statusBadge = item.status === 'sold' ? '<span style="color:#ff7675;">(SOLD)</span>' : '<span style="color:#55efc4;">(Active)</span>';

                div.innerHTML = `
                    <div style="font-size:0.9rem;"><strong>${item.title}</strong><br> ₹${item.price} ${statusBadge}</div>
                    <div style="display:flex; gap:10px;">
                        ${item.status !== 'sold' ? `
                        <button onclick="window.editListing('${item.listing_id}')" style="background:#0984e3; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">✎</button>
                        <button onclick="window.markSold('${item.listing_id}')" style="background:#00b894; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">✔</button>` : ''}
                        <button onclick="window.deleteListing('${item.listing_id}')" style="background:#d63031; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">🗑</button>
                    </div>`;
                myGrid.appendChild(div);
            });
        }
        window.openModal('profileModal');
    } catch (err) { console.error(err); }
};

window.deleteListing = async (id) => {
    if(!confirm("Are you sure you want to delete?")) return;
    try {
        const res = await fetch(`${API_URL}/listings/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) { 
            alert("Item Deleted");
            const adminModal = document.getElementById('adminModal');
            if (adminModal && adminModal.style.display === 'flex') {
                window.adminShow('listings');
            } else {
                window.openProfile(); 
            }
            window.fetchListings(); 
        } else {
            const data = await res.json();
            alert("Failed to delete: " + (data.error || "Unknown error"));
        }
    } catch (err) { console.error(err); }
};

window.markSold = async (id) => {
    if(!confirm("Mark as sold?")) return;
    try {
        const res = await fetch(`${API_URL}/listings/${id}/sold`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) { alert("Sold!"); window.openProfile(); window.fetchListings(); }
    } catch (err) { console.error(err); }
};

window.toggleWishlist = async (id, btn) => {
    const token = localStorage.getItem('token');
    if (!token) return alert("Please login to wishlist");
    const isLiked = wishlistIds.includes(id);
    if (isLiked) { wishlistIds = wishlistIds.filter(itemId => itemId !== id); btn.style.color = 'white'; } 
    else { wishlistIds.push(id); btn.style.color = '#ff7675'; }
    try { await fetch(`${API_URL}/wishlist/toggle/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }}); } catch (err) {}
};

window.fetchWishlistIds = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/wishlist/ids`, { headers: { 'Authorization': `Bearer ${token}` }});
        wishlistIds = await res.json();
        window.renderListings(allListings);
    } catch (err) { console.error(err); }
};

// --- Modals ---
window.openModal = (id) => {
    const m = document.getElementById(id);
    if(m) {
        m.style.display = 'flex';
        if(document.getElementById('authError')) document.getElementById('authError').style.display='none';
    }
};
window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; };
