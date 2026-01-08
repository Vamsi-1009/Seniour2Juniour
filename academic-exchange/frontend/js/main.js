const API_URL = "http://172.20.10.2:5000/api/auth";
const LISTINGS_URL = "http://172.20.10.2:5000/api/listings";

let allBooks = []; 
let socket = null; 
let currentChatRoom = null; 
let currentUserId = null;

// ✅ AUTO-CONNECT ON PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (token && username && userId) {
        if (localStorage.getItem('role') === 'admin') {
            showAdminDashboard();
        } else {
            showDashboard(username);
        }
        initSocket(userId);
    }
});

// --- 1. AUTHENTICATION ---

async function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) return alert("Please fill in all fields.");

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();

        if (response.ok) {
            alert("Registration Successful! Please Login.");
            showLogin(); 
        } else {
            alert("Registration Failed: " + (data.message || data.error || "Unknown error"));
        }
    } catch (err) { 
        console.error(err);
        alert("Server connection failed. Check terminal."); 
    }
}

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
    } catch (err) { alert("Server error. Is backend running?"); }
}

function logout() {
    if(socket) socket.disconnect();
    localStorage.clear();
    window.location.reload();
}

// --- 2. SOCKET, CHAT & INBOX LOGIC ---

function initSocket(userId) {
    if (socket) return; 

    currentUserId = parseInt(userId);
    socket = io("http://172.20.10.2:5000");

    socket.on('connect', () => console.log("⚡ Connected to Chat System"));

    socket.on('receive_message', (data) => {
        const chatBox = document.getElementById('chat-box');
        if (chatBox && !chatBox.classList.contains('hidden') && currentChatRoom === data.room) {
            appendMessage(data.content, data.sender_id === currentUserId);
        } 
        else if (data.sender_id !== currentUserId) {
            showToastNotification(data.sender_id, data.sender_name, data.content);
        }
    });

    socket.on('load_history', (messages) => {
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
            chatContainer.innerHTML = ''; 
            messages.forEach(msg => appendMessage(msg.content, msg.sender_id === currentUserId));
            scrollToBottom();
        }
    });

    socket.on('inbox_data', (chats) => {
        const container = document.getElementById('inbox-list');
        if (!container) return;
        container.innerHTML = '';

        if (!chats || chats.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 mt-10">No conversations yet.</p>';
            return;
        }

        chats.forEach(chat => {
            container.innerHTML += `
                <div onclick="openChat(${chat.otherId}, '${chat.name}'); closeInbox();" class="bg-white p-4 mb-3 rounded-2xl shadow-sm cursor-pointer hover:bg-indigo-50 transition-all border-l-4 border-indigo-500 relative">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-black text-slate-800 text-sm">${chat.name}</h4>
                        <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Open ➤</span>
                    </div>
                    <p class="text-xs text-slate-500 truncate">${chat.lastMsg}</p>
                </div>
            `;
        });
    });
}

function openInbox() {
    const userId = localStorage.getItem('userId');
    if(!userId || !socket) {
        const savedId = localStorage.getItem('userId');
        if(savedId) initSocket(savedId);
        else return alert("Please login first");
    }

    const modal = document.getElementById('inbox-modal');
    if (modal) modal.classList.remove('hidden');
    socket.emit('get_inbox', userId);
}

function closeInbox() {
    const modal = document.getElementById('inbox-modal');
    if (modal) modal.classList.add('hidden');
}

function openChat(receiverId, receiverName) {
    if (!currentUserId) currentUserId = parseInt(localStorage.getItem('userId'));
    if (currentUserId === receiverId) return alert("You cannot chat with yourself.");

    const userIds = [currentUserId, receiverId].sort((a,b) => a-b);
    currentChatRoom = `chat_${userIds[0]}_${userIds[1]}`;

    document.getElementById('chat-box').classList.remove('hidden');
    document.getElementById('chat-with-name').innerText = receiverName;
    document.getElementById('chat-messages').innerHTML = '<p class="text-center text-gray-400 text-xs mt-2 font-black uppercase tracking-widest">Syncing Messages...</p>';

    socket.emit('join_room', { room: currentChatRoom });
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    socket.emit('send_message', {
        room: currentChatRoom,
        sender_id: currentUserId,
        sender_name: localStorage.getItem('username'),
        content: message
    });
    input.value = '';
}

function showToastNotification(senderId, senderName, message) {
    const toast = document.getElementById('msg-toast');
    if (!toast) return;

    document.getElementById('toast-sender').innerText = `From: ${senderName}`;
    document.getElementById('toast-preview').innerText = message;
    
    document.getElementById('toast-reply-btn').onclick = function() {
        openChat(senderId, senderName);
        closeToast();
    };

    toast.classList.remove('hidden');
    setTimeout(() => closeToast(), 5000);
}

// --- 3. HELPER UI FUNCTIONS ---

function appendMessage(text, isMe) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    const div = document.createElement('div');
    div.className = isMe 
        ? "self-end bg-gradient-to-br from-indigo-600 to-blue-700 text-white px-5 py-3 rounded-[1.5rem] rounded-br-none shadow-md max-w-[85%] text-sm font-bold animate-slide-up"
        : "self-start bg-white text-slate-700 px-5 py-3 rounded-[1.5rem] rounded-bl-none shadow-sm border border-slate-100 max-w-[85%] text-sm font-bold animate-slide-up";
    div.innerText = text;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() { 
    const c = document.getElementById('chat-messages'); 
    if (c) c.scrollTop = c.scrollHeight; 
}

function closeToast() { 
    const t = document.getElementById('msg-toast');
    if (t) t.classList.add('hidden'); 
}

function toggleChatWindow() { document.getElementById('chat-box').classList.toggle('hidden'); }
function toggleProfileMenu() { document.getElementById('profile-menu').classList.toggle('hidden'); }
function showRegister() { document.getElementById('login-form').classList.add('hidden'); document.getElementById('register-form').classList.remove('hidden'); }
function showLogin() { document.getElementById('register-form').classList.add('hidden'); document.getElementById('login-form').classList.remove('hidden'); }
function toggleSellForm() { document.getElementById('sell-book-section').classList.toggle('hidden'); }
function resetAndHideForm() { 
    document.getElementById('sell-book-section').classList.add('hidden'); 
    document.getElementById('edit-book-id').value = '';
}

// --- 4. LISTINGS & DASHBOARD ---

async function loadListings() {
    try {
        const response = await fetch(LISTINGS_URL);
        allBooks = await response.json();
        allBooks.sort((a, b) => b.id - a.id);
        
        const titleEl = document.getElementById('dashboard-title');
        if (titleEl) titleEl.innerText = ""; 
        
        filterBooks();
    } catch (err) { console.error(err); }
}

function filterBooks() {
    const searchText = document.getElementById('search-box').value.toLowerCase();
    const container = document.getElementById('listings-container');
    const currentUser = localStorage.getItem('username'); 

    let filtered = allBooks.filter(book => 
        book.title.toLowerCase().includes(searchText) || 
        book.username.toLowerCase().includes(searchText)
    );
    container.innerHTML = '';

    filtered.forEach((book, index) => {
        const img = book.image_url ? `http://172.20.10.2:5000${book.image_url}` : null;
        const imgHTML = img ? `<img src="${img}" class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500">` : `<div class="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px] uppercase tracking-widest">No Visual Available</div>`;
        
        const actionBtn = book.username === currentUser 
            ? `<button onclick="startEdit(${book.id})" class="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">✏️ Edit Product</button>`
            : `<button onclick="openChat(${book.user_id}, '${book.username}')" class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95">💬 Chat Seller</button>`;

        container.innerHTML += `
            <div class="product-card group bg-white rounded-[2.5rem] p-4 border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 animate-fade-down" style="animation-delay: ${index * 0.05}s">
                <div class="relative overflow-hidden rounded-[2rem] mb-5 aspect-[4/3] shadow-inner bg-slate-50">
                    ${imgHTML}
                    <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                <div class="px-2">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-black text-slate-800 text-lg tracking-tight truncate w-2/3">${book.title}</h4>
                        <span class="text-indigo-600 font-black text-lg">₹${book.price}</span>
                    </div>
                    <div class="flex items-center gap-2 mb-6">
                        <div class="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-500">
                            ${book.username.charAt(0).toUpperCase()}
                        </div>
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${book.username}</span>
                    </div>
                    <div class="pt-4 border-t border-slate-50 flex justify-between items-center">
                        ${actionBtn}
                    </div>
                </div>
            </div>`;
    });
}

function showDashboard(username) {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-display').innerText = `Welcome, ${username}!`;
    document.getElementById('profile-initial').innerText = username.charAt(0).toUpperCase();
    loadListings();
}

function showAdminDashboard() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadAdminData();
}

async function loadAdminData() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/users`, { headers: { 'Authorization': token } });
        if(res.ok) {
            const users = await res.json();
            document.getElementById('stat-total-users').innerText = users.length;
            const table = document.getElementById('admin-users-table');
            table.innerHTML = '';
            
            users.forEach(u => {
                const isLocalAdmin = u.role === 'admin';
                const roleBadge = isLocalAdmin 
                    ? `<span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-200">🛡️ Admin</span>`
                    : `<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">👤 User</span>`;

                table.innerHTML += `
                    <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td class="p-4 text-slate-400 font-mono text-xs">#${u.id}</td>
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <span class="font-black text-slate-700">${u.username}</span>
                                ${roleBadge}
                            </div>
                        </td>
                        <td class="p-4 text-right">
                            ${!isLocalAdmin ? `<button onclick="deleteUser(${u.id})" class="text-red-400 font-black p-2 hover:bg-red-50 rounded-lg transition-all text-xs">🗑 DELETE</button>` : '<span class="text-[10px] text-slate-300 font-black uppercase tracking-widest italic">Protected</span>'}
                        </td>
                    </tr>`;
            });
        }
    } catch(e) { console.error(e); }
    try {
        const res = await fetch(LISTINGS_URL);
        const books = await res.json();
        document.getElementById('stat-total-books').innerText = books.length;
        const container = document.getElementById('admin-listings-container');
        container.innerHTML = '';
        books.forEach((b, index) => {
            const img = b.image_url ? `http://172.20.10.2:5000${b.image_url}` : null;
            const imgHTML = img ? `<img src="${img}" class="h-32 w-full object-cover rounded-2xl mb-3">` : `<div class="h-32 bg-slate-100 mb-3 flex items-center justify-center text-slate-400 text-[10px] rounded-2xl font-black uppercase tracking-widest">No Image</div>`;
            
            container.innerHTML += `
            <div class="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm animate-fade-down" style="animation-delay: ${index * 0.05}s">
                ${imgHTML}
                <h4 class="font-black text-slate-800 truncate text-sm uppercase tracking-tight">${b.title}</h4>
                <p class="text-[10px] text-slate-400 font-black mb-4 uppercase tracking-widest">Seller: ${b.username}</p>
                <button onclick="deleteListing(${b.id})" class="w-full bg-red-50 text-red-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Force Delete</button>
            </div>`;
        });
    } catch(e) { console.error(e); }
}

function toggleSection(s) {
    document.getElementById('admin-section-users').className = s === 'users' ? 'block bg-white p-8 rounded-[2.5rem] shadow-xl border animate-fade-down' : 'hidden';
    document.getElementById('admin-section-books').className = s === 'books' ? 'block animate-fade-down' : 'hidden';
}

async function deleteUser(id) {
    if(!confirm("Are you sure you want to remove this user?")) return;
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': localStorage.getItem('token') } });
    loadAdminData();
}

function showMyListings() {
    const currentUser = localStorage.getItem('username');
    const titleEl = document.getElementById('dashboard-title');
    if (titleEl) titleEl.innerText = "📦 My Products";
    
    const container = document.getElementById('listings-container');
    const myBooks = allBooks.filter(book => book.username === currentUser);
    container.innerHTML = '';

    if (myBooks.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-20 text-center animate-fade-down">
                <p class="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Inventory Empty</p>
                <button onclick="toggleSellForm()" class="mt-4 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:underline">Start Selling Now</button>
            </div>
        `;
        return;
    }

    myBooks.forEach((book, index) => {
         const img = book.image_url ? `http://172.20.10.2:5000${book.image_url}` : '';
         const imgHTML = img ? `<img src="${img}" class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500">` : `<div class="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400 font-black uppercase text-[10px]">No Image</div>`;
         
         container.innerHTML += `
         <div class="product-card group bg-indigo-50/30 p-4 rounded-[2.5rem] border border-indigo-100 relative animate-fade-down" style="animation-delay: ${index * 0.05}s">
            <span class="absolute top-6 right-6 bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg z-10">Owner</span>
            <div class="rounded-2xl overflow-hidden mb-4 shadow-inner">
                ${imgHTML}
            </div>
            <h4 class="font-black text-slate-800 text-lg truncate mb-4">${book.title}</h4>
            <div class="flex gap-3">
                <button onclick="startEdit(${book.id})" class="flex-1 bg-white text-indigo-600 border border-indigo-100 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Edit</button>
                <button onclick="deleteListing(${book.id})" class="flex-1 bg-white text-red-500 border border-red-100 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm">Delete</button>
            </div>
         </div>`;
    });
}

async function deleteListing(id) {
    if(!confirm("Permanently remove this listing?")) return;
    await fetch(`${LISTINGS_URL}/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': localStorage.getItem('token') } 
    });
    
    if(localStorage.getItem('role') === 'admin') {
        loadAdminData();
    } else if(document.getElementById('dashboard-title') && document.getElementById('dashboard-title').innerText.includes("My")) {
        const response = await fetch(LISTINGS_URL);
        allBooks = await response.json();
        showMyListings();
    } else {
        loadListings();
    }
}

function startEdit(id) {
    const book = allBooks.find(b => b.id === id);
    if (!book) return;
    const form = document.getElementById('sell-book-section');
    form.classList.remove('hidden');
    document.getElementById('edit-book-id').value = book.id;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-price').value = book.price;
    document.getElementById('book-desc').value = book.description || '';
    
    document.getElementById('form-title').innerText = "✏️ Edit Product Details";
    document.getElementById('form-submit-btn').innerText = "Update Product";
    
    form.scrollIntoView({ behavior: 'smooth' });
}

async function handleFormSubmit() {
    const id = document.getElementById('edit-book-id').value;
    const title = document.getElementById('book-title').value;
    const price = document.getElementById('book-price').value;
    const desc = document.getElementById('book-desc').value;
    const fileInput = document.getElementById('book-image');
    const token = localStorage.getItem('token');
    
    if (!title || !price) return alert("Title and Price are required!");
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    formData.append('description', desc);
    if (fileInput.files[0]) formData.append('image', fileInput.files[0]);
    
    const url = id ? `${LISTINGS_URL}/${id}` : LISTINGS_URL;
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': token },
            body: formData 
        });
        
        if (response.ok) {
            alert(id ? "Product updated successfully!" : "Product listed for sale!");
            resetAndHideForm();
            const refreshRes = await fetch(LISTINGS_URL);
            allBooks = await refreshRes.json();
            
            if (document.getElementById('dashboard-title') && document.getElementById('dashboard-title').innerText.includes("My")) {
                showMyListings();
            } else {
                loadListings();
            }
        } else {
            alert("Action failed. Please try again.");
        }
    } catch (err) { 
        console.error(err); 
    }
}
