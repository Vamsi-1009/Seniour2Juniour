const API_URL = "http://localhost:5000/api/auth";
const LISTINGS_URL = "http://localhost:5000/api/listings";

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
    socket = io("http://localhost:5000");

    socket.on('connect', () => console.log("⚡ Connected to Chat System"));

    socket.on('receive_message', (data) => {
        const chatBox = document.getElementById('chat-box');
        if (!chatBox.classList.contains('hidden') && currentChatRoom === data.room) {
            appendMessage(data.content, data.sender_id === currentUserId);
        } 
        else if (data.sender_id !== currentUserId) {
            showToastNotification(data.sender_id, data.sender_name, data.content);
        }
    });

    socket.on('load_history', (messages) => {
        const chatContainer = document.getElementById('chat-messages');
        chatContainer.innerHTML = ''; 
        messages.forEach(msg => appendMessage(msg.content, msg.sender_id === currentUserId));
        scrollToBottom();
    });

    socket.on('inbox_data', (chats) => {
        const container = document.getElementById('inbox-list');
        container.innerHTML = '';

        if (!chats || chats.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 mt-10">No conversations yet.</p>';
            return;
        }

        chats.forEach(chat => {
            container.innerHTML += `
                <div onclick="openChat(${chat.otherId}, '${chat.name}'); closeInbox();" class="bg-white p-3 mb-2 rounded shadow cursor-pointer hover:bg-blue-50 transition border-l-4 border-blue-500 relative">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-bold text-gray-800">${chat.name}</h4>
                        <span class="text-[10px] text-gray-400">Open ➤</span>
                    </div>
                    <p class="text-sm text-gray-600 truncate">${chat.lastMsg}</p>
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

    document.getElementById('inbox-modal').classList.remove('hidden');
    socket.emit('get_inbox', userId);
}

function closeInbox() {
    document.getElementById('inbox-modal').classList.add('hidden');
}

function openChat(receiverId, receiverName) {
    if (!currentUserId) currentUserId = parseInt(localStorage.getItem('userId'));
    if (currentUserId === receiverId) return alert("You cannot chat with yourself.");

    const userIds = [currentUserId, receiverId].sort((a,b) => a-b);
    currentChatRoom = `chat_${userIds[0]}_${userIds[1]}`;

    document.getElementById('chat-box').classList.remove('hidden');
    document.getElementById('chat-with-name').innerText = receiverName;
    document.getElementById('chat-messages').innerHTML = '<p class="text-center text-gray-400 text-xs mt-2">Loading...</p>';

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
    const div = document.createElement('div');
    div.className = isMe 
        ? "self-end bg-blue-600 text-white px-3 py-1 rounded-lg rounded-br-none max-w-[80%] text-sm break-words"
        : "self-start bg-gray-200 text-gray-800 px-3 py-1 rounded-lg rounded-bl-none max-w-[80%] text-sm break-words";
    div.innerText = text;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() { const c = document.getElementById('chat-messages'); c.scrollTop = c.scrollHeight; }
function closeToast() { document.getElementById('msg-toast').classList.add('hidden'); }
function toggleChatWindow() { document.getElementById('chat-box').classList.toggle('hidden'); }
function toggleProfileMenu() { document.getElementById('profile-menu').classList.toggle('hidden'); }
function showRegister() { document.getElementById('login-form').classList.add('hidden'); document.getElementById('register-form').classList.remove('hidden'); }
function showLogin() { document.getElementById('register-form').classList.add('hidden'); document.getElementById('login-form').classList.remove('hidden'); }
function toggleSellForm() { document.getElementById('sell-book-section').classList.toggle('hidden'); }
function resetAndHideForm() { document.getElementById('sell-book-section').classList.add('hidden'); }

// --- 4. LISTINGS & DASHBOARD ---

async function loadListings() {
    try {
        const response = await fetch(LISTINGS_URL);
        allBooks = await response.json();
        allBooks.sort((a, b) => b.id - a.id);
        filterBooks();
    } catch (err) { console.error(err); }
}

function filterBooks() {
    const searchText = document.getElementById('search-box').value.toLowerCase();
    const container = document.getElementById('listings-container');
    const currentUser = localStorage.getItem('username'); 

    let filtered = allBooks.filter(book => book.title.toLowerCase().includes(searchText));
    container.innerHTML = '';

    filtered.forEach(book => {
        const img = book.image_url ? `http://localhost:5000${book.image_url}` : null;
        const imgHTML = img ? `<img src="${img}" class="w-full h-48 object-cover rounded mb-2">` : `<div class="w-full h-48 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400">No Image</div>`;
        
        const actionBtn = book.username === currentUser 
            ? `<button onclick="startEdit(${book.id})" class="text-yellow-600 font-bold text-sm">✏️ Edit</button>`
            : `<button onclick="openChat(${book.user_id}, '${book.username}')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 font-bold flex items-center gap-1">💬 Chat</button>`;

        container.innerHTML += `
            <div class="bg-white p-4 rounded shadow border hover:shadow-lg transition">
                ${imgHTML}
                <h4 class="font-bold text-lg text-blue-900 truncate">${book.title}</h4>
                <span class="text-green-700 font-bold">₹${book.price}</span>
                <p class="text-xs text-gray-500 mt-1 mb-2">Seller: ${book.username}</p>
                <div class="mt-4 pt-2 border-t flex justify-between items-center">${actionBtn}</div>
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

// ✅ FIXED loadAdminData to show images correctly
async function loadAdminData() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/users`, { headers: { 'Authorization': token } });
        if(res.ok) {
            const users = await res.json();
            document.getElementById('stat-total-users').innerText = users.length;
            const table = document.getElementById('admin-users-table');
            table.innerHTML = '';
            users.forEach(u => table.innerHTML += `<tr class="border-b"><td class="p-2">#${u.id}</td><td class="p-2 font-bold">${u.username}</td><td class="p-2 text-right"><button onclick="deleteUser(${u.id})" class="text-red-500 font-bold">🗑</button></td></tr>`);
        }
    } catch(e) {}
    try {
        const res = await fetch(LISTINGS_URL);
        const books = await res.json();
        document.getElementById('stat-total-books').innerText = books.length;
        const container = document.getElementById('admin-listings-container');
        container.innerHTML = '';
        books.forEach(b => {
            const img = b.image_url ? `http://localhost:5000${b.image_url}` : null;
            const imgHTML = img ? `<img src="${img}" class="h-32 w-full object-cover rounded mb-2">` : `<div class="h-32 bg-gray-200 mb-2 flex items-center justify-center text-gray-400 text-xs">No Image</div>`;
            
            container.innerHTML += `
            <div class="bg-white p-4 border rounded shadow">
                ${imgHTML}
                <h4 class="font-bold text-blue-900 truncate">${b.title}</h4>
                <p class="text-xs text-gray-500 mb-2">Seller: ${b.username}</p>
                <button onclick="deleteListing(${b.id})" class="w-full bg-red-500 text-white py-1 rounded mt-2 font-bold hover:bg-red-600 transition">Force Delete</button>
            </div>`;
        });
    } catch(e) {}
}

function toggleSection(s) {
    document.getElementById('admin-section-users').className = s === 'users' ? 'block bg-white p-4' : 'hidden';
    document.getElementById('admin-section-books').className = s === 'books' ? 'block' : 'hidden';
}

async function deleteUser(id) {
    if(!confirm("Delete User?")) return;
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': localStorage.getItem('token') } });
    loadAdminData();
}

function showMyListings() {
    const currentUser = localStorage.getItem('username');
    document.getElementById('dashboard-title').innerText = "📦 My Products";
    const container = document.getElementById('listings-container');
    const myBooks = allBooks.filter(book => book.username === currentUser);
    container.innerHTML = '';
    myBooks.forEach(book => {
         const img = book.image_url ? `http://localhost:5000${book.image_url}` : '';
         const imgHTML = img ? `<img src="${img}" class="w-full h-48 object-cover rounded mb-2">` : `<div class="w-full h-48 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400">No Image</div>`;
         container.innerHTML += `
         <div class="bg-blue-50 p-4 rounded border relative">
            <span class="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">YOURS</span>
            ${imgHTML}
            <h4 class="font-bold text-blue-900 truncate">${book.title}</h4>
            <div class="flex gap-2 mt-2">
                <button onclick="startEdit(${book.id})" class="flex-1 bg-yellow-500 text-white py-1 rounded text-sm font-bold hover:bg-yellow-600 transition">✏️ Edit</button>
                <button onclick="deleteListing(${book.id})" class="flex-1 bg-red-500 text-white py-1 rounded text-sm font-bold hover:bg-red-600 transition">🗑 Delete</button>
            </div>
         </div>`;
    });
}

async function deleteListing(id) {
    if(!confirm("Delete?")) return;
    await fetch(`${LISTINGS_URL}/${id}`, { method: 'DELETE', headers: { 'Authorization': localStorage.getItem('token') } });
    if(localStorage.getItem('role') === 'admin') loadAdminData();
    else if(document.getElementById('dashboard-title').innerText.includes("My")) showMyListings();
    else loadListings();
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
    document.getElementById('form-title').innerText = "✏️ Edit Book Details";
    document.getElementById('form-submit-btn').innerText = "Update Listing";
    document.getElementById('form-submit-btn').className = "mt-4 bg-blue-600 text-white font-bold p-3 rounded w-full md:w-auto hover:bg-blue-700 shadow";
    form.scrollIntoView({ behavior: 'smooth' });
}

async function handleFormSubmit() {
    const id = document.getElementById('edit-book-id').value;
    const title = document.getElementById('book-title').value;
    const price = document.getElementById('book-price').value;
    const desc = document.getElementById('book-desc').value;
    const fileInput = document.getElementById('book-image');
    const token = localStorage.getItem('token');
    if (!title || !price) return alert("Fill required fields");
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
            alert(id ? "Updated!" : "Posted!");
            resetAndHideForm();
            if (document.getElementById('dashboard-title').innerText.includes("My Products")) showMyListings();
            else loadListings();
        } else alert("Failed");
    } catch (err) { console.error(err); }
}
