const API_URL = "http://localhost:5000";
let allProducts = [];
let userLocation = null;

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

function checkAuth() {
  const token = localStorage.getItem("token");
  const navActions = document.querySelector(".nav-actions");
  
  if (token) {
    navActions.innerHTML = `
 
      <a href="add-product.html">Add Item</a>
      <a href="my-products.html">My Products</a>
      <a href="#" onclick="logout()">Logout</a>
    `;
  } else {
    window.location.href = "login.html";
  }
}

function renderProducts(products) {
  const container = document.getElementById("listings");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No items found. <a href='add-product.html'>Add first listing!</a></p>";
    return;
  }

  products.forEach(p => {
    // ✅ FIXED: Robust image handling
    let firstImage = '/uploads/demo.jpg';
    
    if (p.images) {
      try {
        if (Array.isArray(p.images) && p.images.length > 0) {
          firstImage = p.images[0];
        } else if (typeof p.images === 'string') {
          // Handle stringified array or single path
          if (p.images.startsWith('[')) {
            const parsed = JSON.parse(p.images);
            if (parsed.length > 0) firstImage = parsed[0];
          } else {
            firstImage = p.images;
          }
        }
      } catch(e) {
        console.warn('Image parse error for product:', p.id, e);
        firstImage = '/uploads/demo.jpg';
      }
    }

    // Ensure image path is absolute URL
    const imageUrl = firstImage.startsWith('http') ? firstImage : `${API_URL}${firstImage}`;

    container.innerHTML += `
      <div class="product-card" onclick="openProduct('${p._id || p.id}')">
        <img src="${imageUrl}" alt="${p.title}" onerror="this.src='/uploads/demo.jpg'">
        <div class="product-info">
          <div class="product-title">${p.title}</div>
          <div class="product-price">₹${p.price}</div>
          <span class="badge">${p.type}</span>
        </div>
      </div>
    `;
  });
}

function loadProducts() {
  fetch(`${API_URL}/api/listings`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem("token")}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error('API error');
      return res.json();
    })
    .then(data => {
      console.log("Loaded products:", data);
      allProducts = data || [];
      renderProducts(allProducts);
    })
    .catch(error => {
      console.error('Listings load error:', error);
      document.getElementById("listings").innerHTML = "<p>Backend offline or error.</p>";
    });
}

window.openProduct = function(id) {
  console.log("Opening product ID:", id);
  window.location.href = `product.html?id=${id}`;
};

// Filter functions
window.toggleFilters = function() {
  document.getElementById('filterPanel').classList.toggle('hidden');
};

window.applyFilters = function() {
  const maxPrice = document.getElementById('priceSlider').value;
  const filtered = allProducts.filter(p => p.price <= maxPrice);
  renderProducts(filtered);
};

window.clearFilters = function() {
  document.getElementById('priceSlider').value = 1000;
  document.getElementById('priceValue').innerText = 1000;
  renderProducts(allProducts);
};

window.onload = function() {
  checkAuth();
  loadProducts();
};
