// ✅ AUTOMATIC CONFIGURATION (Using Relative Paths for Stability)
const BASE_URL = window.location.origin; // For Socket.io
const API_AUTH = '/api/auth';
const API_LISTINGS = '/api/listings';
const API_USERS = '/api/users';
const API_PROFILE = '/api/profile';

let allBooks = []; 
let socket = null; 
let currentChatRoom = null; 
let currentUserId = null;
let userLat = null;
let userLng = null;
let currentFilter = 'All';

// ✅ DATA: Filter Hierarchy
const filterTree = {
    "ROOT": [
        { label: "All", value: "All", color: "indigo" },
        { label: "🎒 School", value: "School", color: "rose" },
        { label: "🏫 Intermediate", expand: "INTER_GROUPS", color: "orange" },
        { label: "⚙️ Engineering", expand: "ENG_BRANCHES", color: "blue" },
        { label: "🩺 Medical", expand: "MED_BRANCHES", color: "emerald" },
        { label: "⚖️ Law", expand: "LAW_BRANCHES", color: "amber" }
    ],
    "INTER_GROUPS": [
        { label: "⬅ Back", goBack: "ROOT", color: "slate" },
        { label: "MPC (Maths)", expand: "INTER_MPC", color: "orange" },
        { label: "BiPC (Bio)", expand: "INTER_BIPC", color: "orange" },
        { label: "CEC (Commerce)", expand: "INTER_CEC", color: "orange" }
    ],
    "INTER_MPC": [
        { label: "⬅ Back", goBack: "INTER_GROUPS", color: "slate" },
        { label: "1st Year", value: "Inter-MPC-1", color: "indigo" },
        { label: "2nd Year", value: "Inter-MPC-2", color: "indigo" }
    ],
    "INTER_BIPC": [
        { label: "⬅ Back", goBack: "INTER_GROUPS", color: "slate" },
        { label: "1st Year", value: "Inter-BiPC-1", color: "indigo" },
        { label: "2nd Year", value: "Inter-BiPC-2", color: "indigo" }
    ],
    "INTER_CEC": [
        { label: "⬅ Back", goBack: "INTER_GROUPS", color: "slate" },
        { label: "1st Year", value: "Inter-CEC-1", color: "indigo" },
        { label: "2nd Year", value: "Inter-CEC-2", color: "indigo" }
    ],
    "ENG_BRANCHES": [
        { label: "⬅ Back", goBack: "ROOT", color: "slate" },
        { label: "CSE", value: "Eng-CSE", color: "blue" },
        { label: "ECE", value: "Eng-ECE", color: "blue" },
        { label: "EEE", value: "Eng-EEE", color: "blue" },
        { label: "Mech", value: "Eng-Mech", color: "blue" },
        { label: "Civil", value: "Eng-Civil", color: "blue" },
        { label: "IT", value: "Eng-IT", color: "blue" }
    ],
    "MED_BRANCHES": [
        { label: "⬅ Back", goBack: "ROOT", color: "slate" },
        { label: "MBBS", value: "Med-MBBS", color: "emerald" },
        { label: "BDS", value: "Med-BDS", color: "emerald" },
        { label: "Pharmacy", value: "Med-Pharm", color: "emerald" }
    ],
    "LAW_BRANCHES": [
        { label: "⬅ Back", goBack: "ROOT", color: "slate" },
        { label: "LLB (3 Yrs)", value: "Law-LLB", color: "amber" },
        { label: "BA LLB (5 Yrs)", value: "Law-BA-LLB", color: "amber" }
    ]
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        const uid = localStorage.getItem('userId');
        
        initSocket(uid);
        if (role === 'admin') showAdminDashboard();
        else showDashboard(username);
    }
});

// --- AUTHENTICATION ---
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        // ✅ UPDATED: Using Relative Path
        const response = await fetch(`${API_AUTH}/login`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ email, password }) 
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token); 
            // Fix: ensure we save the right fields from backend response
            localStorage.setItem('username', data.username || data.user?.username); 
            localStorage.setItem('role', data.role || data.user?.role); 
            
            // Handle User ID logic safely
            let userId = data.id || data.user?.id;
            if (!userId && data.token) {
                try {
                     const payload = JSON.parse(atob(data.token.split('.')[1]));
                     userId = payload.id;
                } catch(e) { console.error("Token parse error", e); }
            }
            localStorage.setItem('userId', userId);

            initSocket(userId);
            if (localStorage.getItem('role') === 'admin') showAdminDashboard(); 
            else showDashboard(localStorage.getItem('username'));
        } else { 
            alert(data.message || "Login failed"); 
        }
    } catch (err) { 
        console.error(err); 
        alert("Cannot connect to server. Check console for details."); 
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
        const response = await fetch(`${API_AUTH}/register`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ username, email, password }) 
        });
        if (response.ok) { alert("Success! Login now."); showLogin(); } 
        else { const d = await response.json(); alert(d.message || "Error"); }
    } catch (err) { console.error(err); }
}

function logout() { if(socket) socket.disconnect(); localStorage.clear(); window.location.reload(); }

// --- LISTINGS ---
async function loadListings() {
    try {
        const response = await fetch(API_LISTINGS);
        allBooks = await response.json();
        allBooks.sort((a, b) => b.id - a.id);
        
        if(document.getElementById('dashboard-title')) document.getElementById('dashboard-title').innerText = ""; 
        
        initUserLocation();
        renderFilters("ROOT"); 
        filterBooks('All');
    } catch (e) { console.error(e); }
}

// ✅ PROFILE FUNCTIONS
async function showProfileSettings() {
    document.getElementById('sell-book-section').classList.add('hidden');
    document.getElementById('dashboard-title').innerText = "Profile Settings";
    
    try {
        const res = await fetch(API_PROFILE, {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        const user = await res.json();
        
        document.getElementById('profile-username').value = user.username;
        document.getElementById('profile-email').value = user.email;
        
        const p = document.getElementById('profile-section');
        p.classList.remove('hidden');
        p.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error(e);
        alert("Failed to load profile.");
    }
}

function hideProfileSettings() {
    document.getElementById('profile-section').classList.add('hidden');
}

async function updateProfile() {
    const username = document.getElementById('profile-username').value;
    const email = document.getElementById('profile-email').value;
    const password = document.getElementById('profile-password').value;

    if (!username || !email) return alert("Name and Email are required.");

    try {
        const res = await fetch(API_PROFILE, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify({ username, email, password })
        });

        if (res.ok) {
            alert("Profile updated successfully!");
            localStorage.setItem('username', username);
            document.getElementById('user-display').innerText = `Welcome, ${username}!`;
            hideProfileSettings();
        } else {
            const data = await res.json();
            alert("Error: " + data.message);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to update profile.");
    }
}

// ✅ FILTER RENDERER
function renderFilters(levelKey) {
    const container = document.getElementById('filter-container');
    container.innerHTML = ''; 
    
    const buttons = filterTree[levelKey] || filterTree["ROOT"];

    buttons.forEach(btn => {
        const el = document.createElement('button');
        const baseClass = `px-6 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all shadow-sm border`;
        let colorClass = "";
        
        if(btn.color === 'indigo') colorClass = "bg-indigo-600 text-white border-transparent shadow-md";
        else if(btn.color === 'slate') colorClass = "bg-slate-800 text-white border-transparent"; 
        else colorClass = `bg-white text-slate-600 border-slate-200 hover:bg-${btn.color}-50 hover:text-${btn.color}-600 hover:border-${btn.color}-200`;

        el.className = `${baseClass} ${colorClass}`;
        el.innerText = btn.label;

        el.onclick = () => {
            if (btn.goBack) {
                renderFilters(btn.goBack); 
            } else if (btn.expand) {
                renderFilters(btn.expand); 
            } else {
                filterBooks(btn.value);
                Array.from(container.children).forEach(c => c.classList.add('opacity-50'));
                el.classList.remove('opacity-50');
                el.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-500');
            }
        };
        container.appendChild(el);
    });
}

// ✅ FILTER & SORT LOGIC
function filterBooks(categoryValue) {
    if(categoryValue) currentFilter = categoryValue;
    
    const term = document.getElementById('search-box').value.toLowerCase();
    const rangeKm = document.getElementById('range-slider').value;
    const sortMode = document.getElementById('sort-dropdown').value; 

    document.getElementById('range-val').innerText = `${rangeKm} km`;

    let filtered = allBooks.filter(b => {
        const branch = (b.branch || '').toLowerCase();
        const filter = currentFilter.toLowerCase();
        
        if (currentFilter === 'All') return true;
        if (['School'].includes(currentFilter)) return branch.startsWith(filter);
        return branch === filter;
    });

    filtered = filtered.filter(b => b.title.toLowerCase().includes(term) || b.username.toLowerCase().includes(term));
    
    if (userLat && userLng) {
        filtered.forEach(book => {
            if (book.lat && book.lng) book.distance = getDistanceKm(userLat, userLng, book.lat, book.lng);
            else book.distance = Infinity; 
        });
        filtered = filtered.filter(b => b.distance <= rangeKm || b.distance === Infinity);
    }

    if (sortMode === 'PriceLow') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortMode === 'PriceHigh') {
        filtered.sort((a, b) => b.price - a.price);
    } else {
        filtered.sort((a, b) => b.id - a.id); 
    }

    renderListings(filtered);
}

function renderListings(books) {
    const cont = document.getElementById('listings-container');
    cont.innerHTML = '';
    
    if (books.length === 0) {
        cont.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400">No products found. Try a different category!</div>`;
        return;
    }

    const user = localStorage.getItem('username'); 

    books.forEach((b, i) => {
        let imgSrc = "https://via.placeholder.com/300?text=No+Image";
        if (b.image_url) {
            // Fix image paths relative to root
            const cleanPath = b.image_url.replace(/\\/g, '/').replace(/^\//, '');
            imgSrc = `/${cleanPath}`; // Relative path for images too
        }
        
        let distBadge = '';
        if (b.distance && b.distance !== Infinity) {
            const distDisplay = b.distance < 1 ? `${(b.distance * 1000).toFixed(0)}m` : `${b.distance.toFixed(1)} km`;
            distBadge = `<span class="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 absolute top-2 right-2 shadow-sm">📍 ${distDisplay}</span>`;
        }

        const conditionBadge = b.condition ? `<span class="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-100">${b.condition}</span>` : '';
        const exchangeBadge = b.is_exchange ? `<span class="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-1 rounded-full border border-purple-100">🔄 Swap</span>` : '';
        
        let displayBranch = b.branch ? b.branch.replace(/^(Eng-|Inter-|Med-|Law-|School-)/, '') : 'General';
        const branchBadge = `<span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${displayBranch}</span>`;

        const actionBtn = b.username === user 
            ? `<button onclick="startEdit(${b.id})" class="text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition">Edit</button>` 
            : `<button onclick="openChat(${b.user_id}, '${b.username}')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition">Chat</button>`;

        cont.innerHTML += `
            <div class="product-card bg-white p-4 rounded-2xl border animate-fade-down" style="animation-delay: ${i*0.05}s">
                <div class="overflow-hidden rounded-xl mb-3 relative">
                    <img src="${imgSrc}" class="w-full h-48 object-cover">
                    ${distBadge}
                    <div class="absolute top-2 left-2 flex gap-1 flex-wrap pr-10">${conditionBadge} ${exchangeBadge}</div>
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
        if(b.branch) document.getElementById('book-branch').value = b.branch;
        if(b.condition) document.getElementById('book-condition').value = b.condition;
        document.getElementById('book-exchange').checked = b.is_exchange === 1;
        document.getElementById('form-submit-btn').innerText="Update Listing"; 
        document.getElementById('book-image').value = "";
        f.scrollIntoView({behavior:'smooth'}); 
    }
}

async function handleFormSubmit() {
    const id = document.getElementById('edit-book-id').value;
    const title = document.getElementById('book-title').value;
    const price = document.getElementById('book-price').value;
    const desc = document.getElementById('book-desc').value;
    const branch = document.getElementById('book-branch').value;
    const condition = document.getElementById('book-condition').value;
    const isExchange = document.getElementById('book-exchange').checked ? 1 : 0;
    const file = document.getElementById('book-image').files[0];
    
    if (!id && !file) return alert("Please upload an image for new listings.");
    if(!title || !price || !branch || !condition) return alert("Please fill all details.");
    
    const btn = document.getElementById('form-submit-btn');
    const prevText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    const coords = await getPosition(); 
    const fd = new FormData();
    fd.append('title', title); 
    fd.append('price', price); 
    fd.append('description', desc);
    fd.append('branch', branch);
    fd.append('condition', condition);
    fd.append('is_exchange', isExchange);
    if(coords) { fd.append('lat', coords.lat); fd.append('lng', coords.lng); }
    if(file) fd.append('image', file);
    
    try {
        const url = id ? `${API_LISTINGS}/${id}` : API_LISTINGS;
        const method = id ? 'PUT' : 'POST'; 
        const res = await fetch(url, { method: method, headers: {'Authorization': localStorage.getItem('token')}, body: fd });
        if(res.ok) { 
            alert(id ? "Product updated!" : "Product listed!"); 
            resetAndHideForm(); 
            loadListings(); 
        } else { 
            const err = await res.json(); 
            alert("Error: " + err.message); 
        }
    } catch(e) { 
        console.error(e); 
        alert("Connection Error. Please check your internet or try again."); 
    } 
    finally { btn.innerText = prevText; btn.disabled = false; }
}

function resetAndHideForm() { 
    document.getElementById('sell-book-section').classList.add('hidden'); 
    document.getElementById('edit-book-id').value = ''; 
    document.getElementById('book-title').value = ''; 
    document.getElementById('book-price').value = ''; 
    document.getElementById('book-desc').value = ''; 
    document.getElementById('book-image').value = '';
    document.getElementById('form-submit-btn').innerText = "Publish Listing";
}

// --- LOCATION / SOCKET ---
function getPosition(){return new Promise((r)=>{if(!navigator.geolocation){r(null);return;}navigator.geolocation.getCurrentPosition((p)=>r({lat:p.coords.latitude,lng:p.coords.longitude}),()=>r(null),{enableHighAccuracy:true,timeout:5000});});}
function initUserLocation(){if(navigator.geolocation){navigator.geolocation.getCurrentPosition((p)=>{userLat=p.coords.latitude;userLng=p.coords.longitude;document.getElementById('location-bar').classList.remove('hidden');filterBooks();});}}
function getDistanceKm(lat1,lon1,lat2,lon2){const R=6371;const dLat=(lat2-lat1)*Math.PI/180;const dLon=(lon2-lon1)*Math.PI/180;const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));return R*c;}
function initSocket(u){if(socket)return;currentUserId=parseInt(u);socket=io(BASE_URL);socket.on('receive_message',(d)=>{if(document.getElementById('chat-box')&&!document.getElementById('chat-box').classList.contains('hidden')&&currentChatRoom===d.room){appendMessage(d.content,d.sender_id===currentUserId);}else if(d.sender_id!==currentUserId){showToastNotification(d.sender_id,d.sender_name,d.content);}});socket.on('load_history',(m)=>{document.getElementById('chat-messages').innerHTML='';m.forEach(x=>appendMessage(x.content,x.sender_id===currentUserId));scrollToBottom();});socket.on('inbox_data',(c)=>{const l=document.getElementById('inbox-list');if(!l)return;l.innerHTML='';c.forEach(x=>{l.innerHTML+=`<div onclick="openChat(${x.otherId},'${x.name}');closeInbox();" class="bg-white p-4 mb-3 rounded-2xl shadow-sm border-l-4 border-indigo-500 cursor-pointer"><h4 class="font-bold text-sm">${x.name}</h4><p class="text-xs text-gray-500 truncate">${x.lastMsg}</p></div>`;});});}
function openInbox(){const u=localStorage.getItem('userId');if(!u)return alert("Login");if(!socket)initSocket(u);document.getElementById('inbox-modal').classList.remove('hidden');socket.emit('get_inbox',u);}
function closeInbox(){document.getElementById('inbox-modal').classList.add('hidden');}
function openChat(rid,rname){if(!currentUserId)currentUserId=parseInt(localStorage.getItem('userId'));if(currentUserId===rid)return alert("Self chat error");currentChatRoom=`chat_${[currentUserId,rid].sort((a,b)=>a-b).join('_')}`;document.getElementById('chat-box').classList.remove('hidden');document.getElementById('chat-with-name').innerText=rname;document.getElementById('chat-messages').innerHTML='';socket.emit('join_room',{room:currentChatRoom});}
function sendChatMessage(){const i=document.getElementById('chat-input');const m=i.value.trim();if(!m)return;socket.emit('send_message',{room:currentChatRoom,sender_id:currentUserId,sender_name:localStorage.getItem('username'),content:m});i.value='';}
function appendMessage(t,me){const d=document.createElement('div');d.className=me?"self-end bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm mb-2 max-w-[80%]":"self-start bg-white text-slate-700 px-4 py-2 rounded-xl border text-sm mb-2 max-w-[80%]";d.innerText=t;const w=document.createElement('div');w.className=me?"flex justify-end":"flex justify-start";w.appendChild(d);document.getElementById('chat-messages').appendChild(w);scrollToBottom();}
function scrollToBottom(){const c=document.getElementById('chat-messages');if(c)c.scrollTop=c.scrollHeight;}
function toggleChatWindow(){document.getElementById('chat-box').classList.toggle('hidden');}
function toggleProfileMenu(){document.getElementById('profile-menu').classList.toggle('hidden');}
function showRegister(){document.getElementById('login-form').classList.add('hidden');document.getElementById('register-form').classList.remove('hidden');}
function showLogin(){document.getElementById('register-form').classList.add('hidden');document.getElementById('login-form').classList.remove('hidden');}
function toggleSellForm(){document.getElementById('sell-book-section').classList.toggle('hidden');}
function showAdminDashboard(){document.getElementById('login-form').classList.add('hidden');document.getElementById('admin-dashboard').classList.remove('hidden');loadAdminData();}
function showMyListings(){const u=localStorage.getItem('username');const c=document.getElementById('listings-container');const m=allBooks.filter(b=>b.username===u);c.innerHTML='';m.forEach((b,i)=>{let img=b.image_url?`/${b.image_url.replace(/\\/g,'/').replace(/^\//,'')}`:"";c.innerHTML+=`<div class="product-card bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100"><img src="${img}" class="w-full h-48 object-cover rounded-xl"><h4 class="font-bold mt-2">${b.title}</h4><div class="flex gap-2 mt-2"><button onclick="startEdit(${b.id})" class="text-xs font-bold text-indigo-600">Edit</button><button onclick="deleteListing(${b.id})" class="text-xs font-bold text-red-500">Delete</button></div></div>`;});}
async function deleteListing(id){if(confirm("Delete?")){await fetch(`${API_LISTINGS}/${id}`,{method:'DELETE',headers:{'Authorization':localStorage.getItem('token')}});loadListings();}}
function closeToast(){document.getElementById('msg-toast').classList.add('hidden');}
function showToastNotification(id,name,msg){document.getElementById('msg-toast').classList.remove('hidden');document.getElementById('toast-sender').innerText=name;document.getElementById('toast-preview').innerText=msg;document.getElementById('toast-reply-btn').onclick=()=>{openChat(id,name);closeToast();};setTimeout(closeToast,5000);}

// ✅ ADMIN DASHBOARD LOGIC
async function loadAdminData() {
    try {
        const token = localStorage.getItem('token');
        
        // 1. Fetch Users & Listings
        const [resUsers, resBooks] = await Promise.all([
            fetch(API_USERS, { headers: { 'Authorization': token } }), 
            fetch(API_LISTINGS, { headers: { 'Authorization': token } })
        ]);

        const users = await resUsers.json();
        const books = await resBooks.json();

        // 2. Update Stats
        document.getElementById('stat-total-users').innerText = users.length || 0;
        document.getElementById('stat-total-books').innerText = books.length || 0;

        // 3. Render Users Table
        const userTable = document.getElementById('admin-users-table');
        userTable.innerHTML = `
            <tr class="text-xs text-slate-400 border-b">
                <th class="pb-3 pl-4">ID</th>
                <th class="pb-3">NAME</th>
                <th class="pb-3">EMAIL</th>
                <th class="pb-3">ROLE</th>
                <th class="pb-3">ACTION</th>
            </tr>`;
        
        users.forEach(u => {
            const roleBadge = u.role === 'admin' 
                ? `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold">ADMIN</span>` 
                : `<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold">USER</span>`;
            
            const deleteBtn = u.email === 'admin@example.com' 
                ? `<span class="text-gray-300 text-xs">Protected</span>` 
                : `<button onclick="adminDeleteUser(${u.id})" class="text-red-500 hover:underline text-xs font-bold">Remove</button>`;

            userTable.innerHTML += `
                <tr class="border-b last:border-0 hover:bg-slate-50 transition">
                    <td class="py-4 pl-4 text-slate-500 font-mono text-xs">#${u.id}</td>
                    <td class="py-4 font-bold text-sm text-slate-700">${u.username}</td>
                    <td class="py-4 text-sm text-slate-600">${u.email}</td>
                    <td class="py-4">${roleBadge}</td>
                    <td class="py-4">${deleteBtn}</td>
                </tr>`;
        });

        // 4. Render Listings Grid
        const booksContainer = document.getElementById('admin-listings-container');
        booksContainer.innerHTML = '';
        books.forEach(b => {
            let img = b.image_url ? `/${b.image_url.replace(/\\/g, '/').replace(/^\//, '')}` : "https://via.placeholder.com/150";
            booksContainer.innerHTML += `
                <div class="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <img src="${img}" class="w-16 h-16 rounded-lg object-cover">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm truncate">${b.title}</h4>
                        <p class="text-xs text-slate-500">By: ${b.username}</p>
                    </div>
                    <button onclick="adminDeleteListing(${b.id})" class="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition">🗑</button>
                </div>`;
        });

        toggleSection('users');

    } catch (e) {
        console.error("Admin Load Error:", e);
        alert("Failed to load admin data.");
    }
}

function toggleSection(section) {
    document.getElementById('admin-section-users').classList.add('hidden');
    document.getElementById('admin-section-books').classList.add('hidden');
    document.getElementById(`admin-section-${section}`).classList.remove('hidden');
}

async function adminDeleteUser(id) {
    if(!confirm("Are you sure? This will delete the user AND their listings.")) return;
    try {
        const res = await fetch(`${API_USERS}/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        if(res.ok) { loadAdminData(); } 
        else { alert("Failed to delete user"); }
    } catch(e) { console.error(e); }
}

async function adminDeleteListing(id) {
    if(!confirm("Delete this listing permanently?")) return;
    try {
        const res = await fetch(`${API_LISTINGS}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        if(res.ok) { loadAdminData(); }
        else { alert("Failed to delete listing"); }
    } catch(e) { console.error(e); }
}
