// ✅ AUTOMATIC IP CONFIGURATION
const BASE_URL = window.location.origin;
const API_URL = `${BASE_URL}/api/auth`;
const LISTINGS_URL = `${BASE_URL}/api/listings`;

let allBooks = []; 
let socket = null; 
let currentChatRoom = null; 
let currentUserId = null;
let userLat = null;
let userLng = null;
let currentFilter = 'All';

// ✅ AUTO-CONNECT
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (token && username && userId) {
        if (localStorage.getItem('role') === 'admin') showAdminDashboard();
        else showDashboard(username);
        initSocket(userId);
    }
});

// --- AUTHENTICATION ---
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('role', data.user.role); 
            localStorage.setItem('userId', data.user.id);
            initSocket(data.user.id);
            if (data.user.role === 'admin') showAdminDashboard();
            else showDashboard(data.user.username);
        } else {
            alert(data.message || "Login failed");
        }
    } catch (err) { 
        console.error("Login Error:", err);
        alert("Cannot connect to server."); 
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) return alert("Fill all fields.");

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        if (response.ok) { alert("Success! Login now."); showLogin(); }
        else { const d = await response.json(); alert(d.message || "Error"); }
    } catch (err) { console.error(err); }
}

function logout() {
    if(socket) socket.disconnect();
    localStorage.clear();
    window.location.reload();
}

// --- 📍 LOCATION LOGIC ---
function getPosition() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
            () => resolve(null), 
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}

function initUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            document.getElementById('location-bar').classList.remove('hidden');
            filterBooks();
        });
    }
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

// --- LISTINGS ---
async function loadListings() {
    try {
        const response = await fetch(LISTINGS_URL);
        allBooks = await response.json();
        allBooks.sort((a, b) => b.id - a.id);
        
        if(document.getElementById('dashboard-title')) document.getElementById('dashboard-title').innerText = ""; 
        
        initUserLocation();
        filterBooks();
    } catch (e) { console.error(e); }
}

// ✅ NEW: Filter Logic
function filterByBranch(category) {
    currentFilter = category;
    
    // Highlight active button (Optional UI polish)
    document.querySelectorAll('.branch-chip').forEach(btn => {
        if (btn.innerText.includes(category) || (category === 'All' && btn.innerText === 'All')) {
            btn.classList.remove('bg-white', 'text-slate-500', 'border');
            btn.classList.add('bg-indigo-600', 'text-white');
        } else {
            btn.classList.add('bg-white', 'text-slate-500', 'border');
            btn.classList.remove('bg-indigo-600', 'text-white');
        }
    });

    filterBooks();
}

function filterBooks() {
    const term = document.getElementById('search-box').value.toLowerCase();
    const rangeKm = document.getElementById('range-slider').value;
    document.getElementById('range-val').innerText = `${rangeKm} km`;

    // 1. Filter by Branch
    let filtered = currentFilter === 'All' ? allBooks : allBooks.filter(b => b.branch === currentFilter);

    // 2. Filter by Search Text
    filtered = filtered.filter(b => b.title.toLowerCase().includes(term) || b.username.toLowerCase().includes(term));
    
    // 3. Filter by Location
    if (userLat && userLng) {
        filtered.forEach(book => {
            if (book.lat && book.lng) {
                book.distance = getDistanceKm(userLat, userLng, book.lat, book.lng);
            } else {
                book.distance = Infinity; 
            }
        });
        filtered = filtered.filter(b => b.distance <= rangeKm || b.distance === Infinity);
        filtered.sort((a, b) => a.distance - b.distance);
    }

    renderListings(filtered);
}

function renderListings(books) {
    const cont = document.getElementById('listings-container');
    cont.innerHTML = '';
    
    if (books.length === 0) {
        cont.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">No products found.</div>`;
        return;
    }

    const user = localStorage.getItem('username'); 

    books.forEach((b, i) => {
        // ✅ Local Image Handling
        let imgSrc = "https://via.placeholder.com/300?text=No+Image";
        if (b.image_url) {
            const cleanPath = b.image_url.replace(/\\/g, '/').replace(/^\//, '');
            imgSrc = `${BASE_URL}/${cleanPath}`;
        }
        
        // Badges
        let distBadge = '';
        if (b.distance && b.distance !== Infinity) {
            const distDisplay = b.distance < 1 ? `${(b.distance * 1000).toFixed(0)}m` : `${b.distance.toFixed(1)} km`;
            distBadge = `<span class="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 absolute top-2 right-2 shadow-sm">📍 ${distDisplay}</span>`;
        }

        const conditionBadge = b.condition ? `<span class="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-100">${b.condition}</span>` : '';
        const exchangeBadge = b.is_exchange ? `<span class="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-1 rounded-full border border-purple-100">🔄 Swap</span>` : '';
        const branchBadge = b.branch ? `<span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${b.branch}</span>` : '';

        const actionBtn = b.username === user 
            ? `<button onclick="startEdit(${b.id})" class="text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition">Edit</button>` 
            : `<button onclick="openChat(${b.user_id}, '${b.username}')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition">Chat</button>`;

        cont.innerHTML += `
            <div class="product-card bg-white p-4 rounded-2xl border animate-fade-down" style="animation-delay: ${i*0.05}s">
                <div class="overflow-hidden rounded-xl mb-3 relative">
                    <img src="${imgSrc}" class="w-full h-48 object-cover">
                    ${distBadge}
                    <div class="absolute top-2 left-2 flex gap-1">${conditionBadge} ${exchangeBadge}</div>
                </div>
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-bold truncate w-2/3">${b.title}</h4>
                    <span class="text-indigo-600 font-bold text-sm">₹${b.price}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    ${branchBadge}
                    <p class="text-[10px] text-gray-400 uppercase">Seller: ${b.username}</p>
                </div>
                <div class="mt-2 pt-2 border-t flex justify-between items-center">${actionBtn}</div>
            </div>`;
    });
}

function showDashboard(u) {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-display').innerText = `Welcome, ${u}!`;
    document.getElementById('profile-initial').innerText = u.charAt(0).toUpperCase();
    loadListings();
}

// --- SOCKET & CHAT ---
function initSocket(userId) {
    if (socket) return; 
    currentUserId = parseInt(userId);
    socket = io(BASE_URL); 

    socket.on('connect', () => console.log("⚡ Chat Connected"));
    
    socket.on('receive_message', (data) => {
        const chatBox = document.getElementById('chat-box');
        if (chatBox && !chatBox.classList.contains('hidden') && currentChatRoom === data.room) {
            appendMessage(data.content, data.sender_id === currentUserId);
        } else if (data.sender_id !== currentUserId) {
            showToastNotification(data.sender_id, data.sender_name, data.content);
        }
    });

    socket.on('load_history', (messages) => {
        const c = document.getElementById('chat-messages');
        if(c) { 
            c.innerHTML = ''; 
            messages.forEach(msg => appendMessage(msg.content, msg.sender_id === currentUserId)); 
            scrollToBottom(); 
        }
    });

    socket.on('inbox_data', (chats) => {
        const c = document.getElementById('inbox-list');
        if(!c) return;
        c.innerHTML = '';
        if (!chats || chats.length === 0) { c.innerHTML = '<p class="text-center text-gray-400 mt-10 text-xs">No messages.</p>'; return; }
        chats.forEach(chat => {
            c.innerHTML += `
                <div onclick="openChat(${chat.otherId}, '${chat.name}'); closeInbox();" class="bg-white p-4 mb-3 rounded-2xl shadow-sm border-l-4 border-indigo-500 cursor-pointer">
                    <h4 class="font-bold text-sm">${chat.name}</h4>
                    <p class="text-xs text-gray-500 truncate">${chat.lastMsg}</p>
                </div>`;
        });
    });
}

// --- UI HELPERS ---
function openInbox() {
    const uid = localStorage.getItem('userId');
    const modal = document.getElementById('inbox-modal');
    if (!uid) return alert("Login first");
    if (!socket) initSocket(uid);
    if(modal) { modal.classList.remove('hidden'); socket.emit('get_inbox', uid); }
}
function closeInbox() { const m = document.getElementById('inbox-modal'); if(m) m.classList.add('hidden'); }

function openChat(rid, rname) {
    if (!currentUserId) currentUserId = parseInt(localStorage.getItem('userId'));
    if (currentUserId === rid) return alert("Cannot chat with self");
    const uids = [currentUserId, rid].sort((a,b) => a-b);
    currentChatRoom = `chat_${uids[0]}_${uids[1]}`;
    const cb = document.getElementById('chat-box');
    if(cb) {
        cb.classList.remove('hidden');
        document.getElementById('chat-with-name').innerText = rname;
        document.getElementById('chat-messages').innerHTML = '<p class="text-center text-xs mt-2">Loading...</p>';
        socket.emit('join_room', { room: currentChatRoom });
    }
}

function sendChatMessage() {
    const inp = document.getElementById('chat-input');
    const msg = inp.value.trim();
    if (!msg || !socket) return;
    socket.emit('send_message', { room: currentChatRoom, sender_id: currentUserId, sender_name: localStorage.getItem('username'), content: msg });
    inp.value = '';
}

function showToastNotification(sid, sname, msg) {
    const t = document.getElementById('msg-toast');
    if(!t) return;
    document.getElementById('toast-sender').innerText = `From: ${sname}`;
    document.getElementById('toast-preview').innerText = msg;
    document.getElementById('toast-reply-btn').onclick = function() { openChat(sid, sname); closeToast(); };
    t.classList.remove('hidden'); setTimeout(() => closeToast(), 5000);
}

function appendMessage(text, isMe) {
    const c = document.getElementById('chat-messages');
    if(!c) return;
    const d = document.createElement('div');
    d.className = isMe ? "self-end bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm mb-2 max-w-[80%]" : "self-start bg-white text-slate-700 px-4 py-2 rounded-xl border text-sm mb-2 max-w-[80%]";
    d.innerText = text;
    // Wrapper for alignment
    const wrapper = document.createElement('div');
    wrapper.className = isMe ? "flex justify-end" : "flex justify-start";
    wrapper.appendChild(d);
    c.appendChild(wrapper);
    scrollToBottom();
}

function scrollToBottom() { const c = document.getElementById('chat-messages'); if(c) c.scrollTop = c.scrollHeight; }
function closeToast() { const t = document.getElementById('msg-toast'); if(t) t.classList.add('hidden'); }
function toggleChatWindow() { document.getElementById('chat-box').classList.toggle('hidden'); }
function toggleProfileMenu() { document.getElementById('profile-menu').classList.toggle('hidden'); }
function showRegister() { document.getElementById('login-form').classList.add('hidden'); document.getElementById('register-form').classList.remove('hidden'); }
function showLogin() { document.getElementById('register-form').classList.add('hidden'); document.getElementById('login-form').classList.remove('hidden'); }
function toggleSellForm() { document.getElementById('sell-book-section').classList.toggle('hidden'); }
function resetAndHideForm() { 
    document.getElementById('sell-book-section').classList.add('hidden'); 
    document.getElementById('edit-book-id').value = ''; 
    // Clear other fields
    document.getElementById('book-title').value = '';
    document.getElementById('book-price').value = '';
    document.getElementById('book-desc').value = '';
}

// --- ADMIN ---
function showAdminDashboard() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadAdminData();
}

async function loadAdminData() {
    const token = localStorage.getItem('token');
    
    // 1. LOAD USERS
    try {
        const res = await fetch(`${API_URL}/users`, { headers: { 'Authorization': token } });
        if(res.ok) {
            const users = await res.json();
            document.getElementById('stat-total-users').innerText = users.length;
            const t = document.getElementById('admin-users-table');
            if(t) {
                t.innerHTML = '';
                users.forEach(u => {
                    const badge = u.role === 'admin' 
                        ? `<span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-200">🛡️ Admin</span>`
                        : `<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">👤 User</span>`;
                    
                    t.innerHTML += `
                        <tr class="border-b hover:bg-slate-50 transition-colors">
                            <td class="p-4 text-slate-400 font-mono text-xs">#${u.id}</td>
                            <td class="p-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        ${u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span class="font-black text-slate-700">${u.username}</span>
                                    ${badge}
                                </div>
                            </td>
                            <td class="p-4 text-right">
                                ${u.role !== 'admin' ? `<button onclick="deleteUser(${u.id})" class="text-red-400 font-black p-2 hover:bg-red-50 rounded-lg transition-all text-xs hover:text-red-600">🗑 DELETE</button>` : '<span class="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">Protected</span>'}
                            </td>
                        </tr>`;
                });
            }
        }
    } catch(e) { console.error("Admin Users Error:", e); }

    // 2. LOAD LISTINGS (WITH LOCATION)
    try {
        const resB = await fetch(LISTINGS_URL);
        const books = await resB.json();
        document.getElementById('stat-total-books').innerText = books.length;
        const c = document.getElementById('admin-listings-container');
        
        if(c) {
            c.innerHTML = '';
            books.forEach((b, index) => {
                // Image Logic
                let adminImg = "https://via.placeholder.com/300?text=No+Image";
                if (b.image_url) {
                    const cleanPath = b.image_url.replace(/\\/g, '/').replace(/^\//, '');
                    adminImg = `${BASE_URL}/${cleanPath}`;
                }
                const adminImgHTML = `<img src="${adminImg}" class="w-full h-32 object-cover rounded-xl mb-3 border border-slate-100">`;

                // Location Logic
                let locationBadge = `<span class="text-[10px] text-slate-300 font-bold flex items-center gap-1">🚫 No Loc</span>`;
                
                if (b.lat && b.lng) {
                    const mapLink = `https://www.google.com/maps?q=${b.lat},${b.lng}`;
                    locationBadge = `
                        <a href="${mapLink}" target="_blank" class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-1">
                            📍 View Map
                        </a>`;
                }

                c.innerHTML += `
                    <div class="bg-white p-5 border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all animate-fade-down" style="animation-delay: ${index * 0.05}s">
                        <div class="relative">
                            ${adminImgHTML}
                            <div class="absolute top-2 right-2">
                                <span class="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">₹${b.price}</span>
                            </div>
                        </div>
                        
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-black text-slate-800 text-sm truncate w-2/3" title="${b.title}">${b.title}</h4>
                        </div>

                        <div class="flex justify-between items-center mb-4 pt-2 border-t border-slate-50">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest">User: ${b.username}</span>
                            </div>
                            ${locationBadge}
                        </div>

                        <button onclick="deleteListing(${b.id})" class="w-full bg-red-50 text-red-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                            Force Delete
                        </button>
                    </div>`;
            });
        }
    } catch(e) { console.error("Admin Listings Error:", e); }
}

function toggleSection(s) {
    const u = document.getElementById('admin-section-users');
    const b = document.getElementById('admin-section-books');
    if(u) u.className = s === 'users' ? 'block bg-white p-6 rounded-3xl shadow-xl animate-fade-down' : 'hidden';
    if(b) b.className = s === 'books' ? 'block animate-fade-down' : 'hidden';
}

async function deleteUser(id) { if(confirm("Delete this user permanently?")) { await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': localStorage.getItem('token') } }); loadAdminData(); } }
async function deleteListing(id) { if(confirm("Permanently delete this product?")) { await fetch(`${LISTINGS_URL}/${id}`, { method: 'DELETE', headers: { 'Authorization': localStorage.getItem('token') } }); if(localStorage.getItem('role') === 'admin') loadAdminData(); else loadListings(); } }

function showMyListings() {
    const u = localStorage.getItem('username');
    const t = document.getElementById('dashboard-title');
    if(t) t.innerText = "📦 My Products";
    const c = document.getElementById('listings-container');
    const my = allBooks.filter(b => b.username === u);
    c.innerHTML = '';
    if (my.length === 0) { c.innerHTML = '<div class="col-span-full py-10 text-center text-gray-400">You haven\'t listed any products.</div>'; return; }
    my.forEach((b,i) => {
        let img = "https://via.placeholder.com/300?text=No+Image";
        if (b.image_url) {
            const cleanPath = b.image_url.replace(/\\/g, '/').replace(/^\//, '');
            img = `${BASE_URL}/${cleanPath}`;
        }
        const imgHTML = `<img src="${img}" class="w-full h-48 object-cover">`;
        c.innerHTML += `<div class="product-card bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-fade-down"><div class="overflow-hidden rounded-xl mb-3">${imgHTML}</div><h4 class="font-bold truncate">${b.title}</h4><div class="flex gap-2 mt-3"><button onclick="startEdit(${b.id})" class="flex-1 bg-white text-indigo-600 rounded-xl py-2 text-xs font-bold border border-indigo-100 shadow-sm hover:bg-indigo-600 hover:text-white transition-all">Edit</button><button onclick="deleteListing(${b.id})" class="flex-1 bg-white text-red-500 rounded-xl py-2 text-xs font-bold border border-red-100 shadow-sm hover:bg-red-500 hover:text-white transition-all">Delete</button></div></div>`;
    });
}

function startEdit(id) {
    const b = allBooks.find(book => book.id === id);
    if(!b) return;
    const f = document.getElementById('sell-book-section');
    if(f) { 
        f.classList.remove('hidden'); 
        document.getElementById('edit-book-id').value = b.id; 
        document.getElementById('book-title').value = b.title; 
        document.getElementById('book-price').value = b.price; 
        document.getElementById('book-desc').value = b.description||''; 
        
        // Populate new fields if they exist
        if(b.branch) document.getElementById('book-branch').value = b.branch;
        if(b.condition) document.getElementById('book-condition').value = b.condition;
        document.getElementById('book-exchange').checked = b.is_exchange === 1;

        document.getElementById('form-submit-btn').innerText="Update Listing"; 
        f.scrollIntoView({behavior:'smooth'}); 
    }
}

// ✅ NEW SUBMIT: Auto-capture location inside this function
async function handleFormSubmit() {
    const id = document.getElementById('edit-book-id').value;
    const title = document.getElementById('book-title').value;
    const price = document.getElementById('book-price').value;
    const desc = document.getElementById('book-desc').value;
    const branch = document.getElementById('book-branch').value;
    const condition = document.getElementById('book-condition').value;
    const isExchange = document.getElementById('book-exchange').checked ? 1 : 0;
    const file = document.getElementById('book-image').files[0];
    
    if(!title || !price || !branch || !condition) return alert("Product Title, Price, Category, and Condition are required.");
    
    // 🌍 AUTO-CAPTURE LOCATION
    const btn = document.getElementById('form-submit-btn');
    const prevText = btn.innerText;
    btn.innerText = "Getting Location...";
    btn.disabled = true;

    const coords = await getPosition(); // Get coordinates (can be null if blocked)

    const fd = new FormData();
    fd.append('title', title); 
    fd.append('price', price); 
    fd.append('description', desc);
    fd.append('branch', branch);
    fd.append('condition', condition);
    fd.append('is_exchange', isExchange);
    
    if(coords) {
        fd.append('lat', coords.lat);
        fd.append('lng', coords.lng);
    }
    
    if(file) fd.append('image', file);
    
    try {
        const res = await fetch(id ? `${LISTINGS_URL}/${id}` : LISTINGS_URL, { 
            method: id ? 'PUT' : 'POST', 
            headers: {'Authorization': localStorage.getItem('token')}, 
            body: fd 
        });
        if(res.ok) { 
            alert(id ? "Product updated successfully!" : "Product listed successfully!"); 
            resetAndHideForm(); 
            loadListings(); 
        } else {
            const err = await res.json();
            alert("Error: " + err.message);
        }
    } catch(e) { 
        console.error("Form Submit Error:", e);
        alert("Failed to submit listing. Check server connection.");
    } finally {
        btn.innerText = prevText;
        btn.disabled = false;
    }
}
