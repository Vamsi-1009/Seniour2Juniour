const API_URL = "http://10.10.1.128:5000";
let allProducts = [];
let userLocation = null;

/* =================================================
   RENDER PRODUCTS (FROM DB ONLY)
================================================= */
function renderProducts(products) {
  const container = document.getElementById("listings");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No items found.</p>";
    return;
  }

  products.forEach(p => {
    const imagePath = p.images
      ? `${API_URL}${JSON.parse(p.images)[0]}`
      : "";

    container.innerHTML += `
      <div class="product-card" onclick="openProduct(${p.id})">
        <img src="${imagePath}" alt="${p.title}">
        <div class="product-info">
          <div class="product-title">${p.title}</div>
          <div class="product-price">₹${p.price}</div>
          <span class="badge">${p.type}</span>
        </div>
      </div>
    `;
  });
}

/* =================================================
   GET USER LOCATION (OPTIONAL – 5 KM)
================================================= */
function getUserLocation() {
  if (!navigator.geolocation) {
    loadProducts();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      loadProductsNearMe();
    },
    () => {
      loadProducts();
    }
  );
}

/* =================================================
   LOAD PRODUCTS WITH LOCATION
================================================= */
function loadProductsNearMe() {
  fetch(
    `${API_URL}/api/listings?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=5`
  )
    .then(res => res.json())
    .then(data => {
      allProducts = data || [];
      renderProducts(allProducts);
    })
    .catch(() => loadProducts());
}

/* =================================================
   LOAD ALL PRODUCTS (NO LOCATION)
================================================= */
function loadProducts() {
  fetch(`${API_URL}/api/listings`)
    .then(res => res.json())
    .then(data => {
      allProducts = data || [];
      renderProducts(allProducts);
    })
    .catch(() => {
      document.getElementById("listings").innerHTML =
        "<p>Failed to load products.</p>";
    });
}

/* =================================================
   SEARCH & FILTER
================================================= */
const priceSlider = document.getElementById("priceSlider");
const priceValue = document.getElementById("priceValue");
const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", function () {
    const text = this.value.toLowerCase();
    renderProducts(
      allProducts.filter(p =>
        p.title.toLowerCase().includes(text)
      )
    );
  });
}

function applyFilters() {
  const max = Number(priceSlider.value);
  renderProducts(allProducts.filter(p => p.price <= max));
}

function clearFilters() {
  searchInput.value = "";
  priceSlider.value = 2000;
  priceValue.textContent = "2000";
  renderProducts(allProducts);
}

function toggleFilters() {
  document.getElementById("filterPanel").classList.toggle("hidden");
}

/* =================================================
   NAVIGATION
================================================= */
function openProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

/* =================================================
   LOGOUT
================================================= */
function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

/* =================================================
   START APP
================================================= */
getUserLocation();
