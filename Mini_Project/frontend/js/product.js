const API_URL = "http://localhost:5000";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let product = null;
let images = [];
let currentIndex = 0;
let selectedAction = 'buy'; // ✅ Global action tracker

fetch(`${API_URL}/api/listings/${productId}`)
  .then(res => {
    if (!res.ok) throw new Error("Not found");
    return res.json();
  })
  .then(data => {
    product = data;
    images = Array.isArray(product.images) ? product.images : [];
    loadProduct();
    renderThumbnails();
  })
  .catch(() => alert("Failed to load product"));

function loadProduct() {
  document.getElementById("title").textContent = product.title;
  document.getElementById("description").textContent = product.description || "";
  document.getElementById("price").textContent = `₹${product.price}`;
  document.getElementById("type").textContent = product.type;
  showImage(0);
}

function showImage(index) {
  if (!images.length) return;
  currentIndex = index;
  document.getElementById("mainImage").src = `${API_URL}${images[index]}`;
}

function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  showImage(currentIndex);
}

function prevImage() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  showImage(currentIndex);
}

function renderThumbnails() {
  const thumbs = document.getElementById("thumbnails");
  thumbs.innerHTML = "";
  images.forEach((img, i) => {
    const t = document.createElement("img");
    t.src = `${API_URL}${img}`;
    t.className = "thumb";
    t.onclick = () => showImage(i);
    thumbs.appendChild(t);
  });
}

// ✅ NEW: Select Buy or Rent
function selectAction(action) {
  selectedAction = action; // 'buy' or 'rent'
  
  // Visual feedback - highlight selected option
  document.querySelectorAll('input[name="action"]').forEach(radio => {
    radio.parentElement.style.opacity = radio.value === action ? '1' : '0.6';
  });
}

// ✅ NEW: Open Chat with Pre-filled Message
function openChat() {
  if (!product) {
    alert("Product not loaded");
    return;
  }

  const sellerId = product.user_id;
  const listingId = product.id;
  
  // ✅ Create auto message based on selected action
  let autoMessage = '';
  if (selectedAction === 'buy') {
    autoMessage = `Hi, I want to buy this product: "${product.title}"`;
  } else if (selectedAction === 'rent') {
    autoMessage = `Hi, I want to rent this product: "${product.title}"`;
  }

  // ✅ Redirect to chat with auto message
  const url = `chat.html?sellerId=${sellerId}&listingId=${listingId}&action=${selectedAction}&message=${encodeURIComponent(autoMessage)}`;
  window.location.href = url;
}

// Add this to js/product.js
function openChat() {
  const action = document.querySelector('input[name="action"]:checked').value;
  const title = document.getElementById("title").innerText;
  
  // Construct the message
  const msg = `Hi, I am interested to ${action} your product: ${title}`;
  
  // Redirect to chat.html with message param
  window.location.href = `chat.html?message=${encodeURIComponent(msg)}`;
}

// On "Chat with Seller" button click
localStorage.setItem('chat_seller_id', sellerId);
localStorage.setItem('chat_listing_id', listingId);
localStorage.setItem('chat_seller_name', sellerName);
window.location.href = 'chat.html';
