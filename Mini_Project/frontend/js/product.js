const API_URL = "http://localhost:5000";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let product = null;
let images = [];
let currentIndex = 0;

fetch(`${API_URL}/api/listings/${productId}`)
  .then(res => {
    if (!res.ok) throw new Error("Not found");
    return res.json();
  })
  .then(data => {
    product = data;
    images = JSON.parse(product.images || "[]");
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

function openChat() {
  window.location.href = `chat.html?listingId=${product.id}&sellerId=${product.user_id}`;
}

function goToCheckout() {
  window.location.href = `checkout.html?id=${product.id}`;
}
