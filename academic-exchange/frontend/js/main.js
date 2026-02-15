let currentUser = null;
let allListings = [];
const API = '/api';
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadListings();
    setupSearch();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        currentUser = JSON.parse(atob(token.split('.')[1]));
        updateNav();
    }
}

function updateNav() {
    const nav = document.getElementById('navMenu');
    if (currentUser) {
        nav.innerHTML = '<button class="nav-btn" onclick="showSellModal()">+ Sell</button><button class="nav-btn" onclick="showProfile()">Profile</button><button class="nav-btn" onclick="logout()">Logout</button>';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
        localStorage.setItem('token', data.token);
        location.reload();
    } else {
        alert(data.error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const res = await fetch(API + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.success) {
        localStorage.setItem('token', data.token);
        location.reload();
    } else {
        alert(data.error);
    }
}

function logout() {
    localStorage.removeItem('token');
    location.reload();
}

async function loadListings() {
    const res = await fetch(API + '/listings');
    const data = await res.json();
    if (data.success) {
        allListings = data.listings;
        renderListings(allListings);
    }
}

function renderListings(listings) {
    const grid = document.getElementById('listingsGrid');
    if (listings.length === 0) {
        grid.innerHTML = '<p style="text-align:center;width:100%">No listings found</p>';
        return;
    }
    grid.innerHTML = listings.map(item => '<div class="card" onclick="viewListing(\'' + item.listing_id + '\')"><img src="' + item.images[0] + '" class="card-image"><div class="card-content"><h3 class="card-title">' + item.title + '</h3><p class="card-price">₹' + item.price + '</p><div class="card-meta"><span>' + item.condition + '</span><span>' + (item.location || 'Online') + '</span></div></div></div>').join('');
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
    const files = document.getElementById('sellImages').files;
    for (let file of files) formData.append('images', file);
    const res = await fetch(API + '/listings', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
        body: formData
    });
    const data = await res.json();
    if (data.success) {
        alert('Listing created!');
        closeModal('sellModal');
        loadListings();
    }
}

async function viewListing(id) {
    const res = await fetch(API + '/listings/' + id);
    const data = await res.json();
    if (data.success) {
        alert('Viewing: ' + data.listing.title + '\nPrice: ₹' + data.listing.price + '\n' + data.listing.description);
    }
}

async function showProfile() {
    const res = await fetch(API + '/user/profile', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    });
    const data = await res.json();
    if (data.success) {
        const content = document.getElementById('profileContent');
        content.innerHTML = '<p><strong>Name:</strong> ' + data.user.name + '</p><p><strong>Email:</strong> ' + data.user.email + '</p><h3>My Listings</h3>' + data.listings.map(l => '<div style="padding:1rem;background:rgba(255,255,255,0.1);border-radius:10px;margin:0.5rem 0"><p>' + l.title + ' - ₹' + l.price + '</p><small>' + l.status + '</small></div>').join('');
        showModal('profileModal');
    }
}

function filterCategory(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    if (category === 'all') {
        renderListings(allListings);
    } else {
        renderListings(allListings.filter(l => l.category === category));
    }
}

function setupSearch() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        renderListings(allListings.filter(l => l.title.toLowerCase().includes(query) || l.description.toLowerCase().includes(query)));
    });
}

function showModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function showLogin() { closeModal('registerModal'); showModal('loginModal'); }
function showRegister() { closeModal('loginModal'); showModal('registerModal'); }
function showSellModal() { if (!currentUser) { alert('Please login'); return; } showModal('sellModal'); }

window.onclick = (e) => { if (e.target.classList.contains('modal')) e.target.classList.remove('show'); };
