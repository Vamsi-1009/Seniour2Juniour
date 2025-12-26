const API_URL = "http://localhost:5000";
let allProducts = [];
let userLocation = null;

/* =================================================
   DEMO PRODUCTS (fallback only)
================================================= */
const demoProducts = [
  {
    id: 1,
    title: "DBMS – Concepts & Practice",
    price: 300,
    type: "sell",
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c",
    fromBackend: false
  },
  {
    id: 2,
    title: "Operating Systems",
    price: 150,
    type: "rent",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    fromBackend: false
  },
  {
    id: 3,
    title: "Computer Networks",
    price: 280,
    type: "sell",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
    fromBackend: false
  },
  {
    id: 4,
    title: "Data Structures",
    price: 200,
    type: "rent",
    image: "https://images.unsplash.com/photo-1513258496099-48168024aec0",
    fromBackend: false
  },
  {
    id: 5,
    title: "Java Programming",
    price: 350,
    type: "sell",
    image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159",
    fromBackend: false
  },
  {
    id: 6,
    title: "Engineering Graph Sheet Set",
    price: 120,
    type: "sell",
    image: "https://i.imgur.com/0kXQJZp.png",
    fromBackend: false
  },
  {
    id: 7,
    title: "Medical Stethoscope",
    price: 600,
    type: "sell",
    image: "https://i.imgur.com/7FqRZzK.jpg",
    fromBackend: false
  },
  {
    id: 8,
    title: "MBBS Anatomy Notes",
    price: 300,
    type: "rent",
    image: "https://i.imgur.com/5f7oT5p.jpg",
    fromBackend: false
  }
];

/* =================================================
   RENDER PRODUCTS
================================================= */
function renderProducts(products) {
  const container = document.getElementById("listings");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No items found near you.</p>";
    return;
  }

  products.forEach(p => {
    const imgSrc = p.fromBackend ? `${API_URL}${p.image}` : p.image;

    container.innerHTML += `
      <div class="product-card" onclick="openProduct(${p.id})">
        <img src="${imgSrc}" alt="${p.title}">
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
   LOCATION – GET USER LOCATION (5 KM)
================================================= */
function getUserLocation() {
  if (!navigator.geolocation) {
    loadWithoutLocation();
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
      loadWithoutLocation();
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    }
  );
}

/* =================================================
   LOAD PRODUCTS NEAR USER (BACKEND)
================================================= */
function loadProductsNearMe() {
  fetch(
    `${API_URL}/api/listings?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=5`
  )
    .then(res => res.json())
    .then(data => {
      if (!data || data.length === 0) {
        allProducts = demoProducts.slice();
      } else {
        allProducts = data.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          type: p.type,
          image: JSON.parse(p.images)[0],
          fromBackend: true
        }));
      }
      renderProducts(allProducts);
    })
    .catch(() => {
      loadWithoutLocation();
    });
}

/* =================================================
   FALLBACK – NO LOCATION
================================================= */
function loadWithoutLocation() {
  fetch(`${API_URL}/api/listings`)
    .then(res => res.json())
    .then(data => {
      if (!data || data.length === 0) {
        allProducts = demoProducts.slice();
      } else {
        allProducts = data.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          type: p.type,
          image: JSON.parse(p.images)[0],
          fromBackend: true
        }));
      }
      renderProducts(allProducts);
    })
    .catch(() => {
      allProducts = demoProducts.slice();
      renderProducts(allProducts);
    });
}

/* =================================================
   FILTERS & SEARCH
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
  if (searchInput) searchInput.value = "";
  if (priceSlider && priceValue) {
    priceSlider.value = 2000;
    priceValue.textContent = "₹2000";
  }
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
   START APP
================================================= */
getUserLocation();

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "login.html";
}
