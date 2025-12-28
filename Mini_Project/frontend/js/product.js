const API_URL = "http://localhost:5000";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let product = null;
let images = [];
let currentIndex = 0;

// ================= FETCH PRODUCT =================
fetch(`http://localhost:5000/api/listings/${productId}`)
  .then(res => res.json())
  .then(data => {
    product = data;
    images = JSON.parse(prod uct.images); // 👈 all 3 images
    loadProduct();
    renderThumbnails();
    initMap();
  })
  .catch(() => {
    alert("Failed to load product");
  });

// ================= LOAD PRODUCT DETAILS =================
function loadProduct() {
  document.getElementById("title").textContent = product.title;
  document.getElementById("description").textContent =
    product.description || "No description provided";
  document.getElementById("price").textContent = `₹${product.price}`;
  document.getElementById("type").textContent = product.type;

  showImage(0);
}

// ================= IMAGE SLIDER =================
function showImage(index) {
  if (!images.length) return;

  currentIndex = index;

  document.getElementById("mainImage").src =
    `${API_URL}${images[currentIndex]}`;
}

function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  showImage(currentIndex);
}

function prevImage() {
  currentIndex =
    (currentIndex - 1 + images.length) % images.length;
  showImage(currentIndex);
}

// ================= THUMBNAILS =================
function renderThumbnails() {
  const thumbs = document.getElementById("thumbnails");
  thumbs.innerHTML = "";

  images.forEach((img, i) => {
    const thumb = document.createElement("img");
    thumb.src = `${API_URL}${img}`;
    thumb.className = "thumb";
    thumb.onclick = () => showImage(i);
    thumbs.appendChild(thumb);
  });
}

// ================= CHAT =================
function openChat() {
  window.location.href =
    `chat.html?listingId=${product.id}&sellerId=${product.user_id}`;
}

// ================= GOOGLE MAP (5 KM RADIUS) =================
function initMap() {
  if (!product.latitude || !product.longitude) return;

  const loc = {
    lat: Number(product.latitude),
    lng: Number(product.longitude)
  };

  const map = new google.maps.Map(
    document.getElementById("map"),
    {
      center: loc,
      zoom: 13
    }
  );

  new google.maps.Marker({
    position: loc,
    map
  });

  new google.maps.Circle({
    map,
    center: loc,
    radius: 5000,
    fillColor: "#2874f0",
    fillOpacity: 0.15,
    strokeOpacity: 0.4
  });
}
