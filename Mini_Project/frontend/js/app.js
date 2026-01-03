const API_URL = "http://localhost:5000";
let allProducts = [];
let userLocation = null;

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function renderProducts(products) {
  const container = document.getElementById("listings");
  if (!container) return;
  
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No items found. <a href='add-product.html'>Add first listing!</a></p>";
    return;
  }

  products.forEach(p => {
    let firstImage = '/uploads/demo.jpg';
    
    if (p.images) {
      try {
        if (Array.isArray(p.images) && p.images.length > 0) {
          firstImage = p.images[0];
        } else if (typeof p.images === 'string') {
          if (p.images.startsWith('[')) {
            const parsed = JSON.parse(p.images);
            if (parsed.length > 0) firstImage = parsed[0];
          } else {
            firstImage = p.images;
          }
        }
      } catch(e) {
        console.warn('Image parse error for product:', p._id || p.id, e);
      }
    }

    const imageUrl = firstImage.startsWith('http') ? firstImage : `${API_URL}${firstImage}`;

    container.innerHTML += `
      <div class="product-card" onclick="openProduct('${p._id || p.id}')">
        <img src="${imageUrl}" alt="${p.title}" onerror="this.src='/uploads/demo.jpg'">
        <div class="product-info">
          <div class="product-title">${p.title}</div>
          <div class="product-price">₹${p.price}</div>
          ${p.type ? `<span class="badge">${p.type}</span>` : ''}
        </div>
      </div>
    `;
  });
}

function loadProducts() {
  const token = localStorage.getItem("token");
  if (!token) return;
  
  fetch(`${API_URL}/api/listings`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("✅ Loaded products:", data);
      allProducts = data || [];
      renderProducts(allProducts);
    })
    .catch(error => {
      console.error('❌ Listings load error:', error);
      const listingsEl = document.getElementById("listings");
      if (listingsEl) {
        listingsEl.innerHTML = "<p>Backend offline. Showing demo products...</p>";
        renderProducts([
          { _id: 'demo1', title: 'Engineering Math', price: 200, type: 'Book', images: ['https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=Math'] },
          { _id: 'demo2', title: 'Physics Notes', price: 150, type: 'Notes', images: ['https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=Physics'] }
        ]);
      }
    });
}

window.openProduct = function(id) {
  console.log("Opening product ID:", id);
  window.location.href = `product.html?id=${id}`;
};

// ✅ FILTER FUNCTIONS
window.toggleFilters = function() {
  const panel = document.getElementById('filterPanel');
  if (panel) panel.classList.toggle('hidden');
};

window.applyFilters = function() {
  const maxPrice = parseInt(document.getElementById('priceSlider')?.value || 1000);
  const filtered = allProducts.filter(p => (p.price || 0) <= maxPrice);
  renderProducts(filtered);
  toggleFilters();
};

window.clearFilters = function() {
  const slider = document.getElementById('priceSlider');
  const priceValue = document.getElementById('priceValue');
  if (slider) slider.value = 1000;
  if (priceValue) priceValue.textContent = '1000';
  renderProducts(allProducts);
  toggleFilters();
};

// ✅ UPDATE USERNAME - SIMPLE & SAFE
function updateUsername() {
  let username = localStorage.getItem("username") || 'User';
  
  const welcomeEl = document.getElementById('welcome-user');
  const profileNameEl = document.getElementById('profileName');
  
  if (welcomeEl) welcomeEl.textContent = `Welcome, ${username}`;
  if (profileNameEl) profileNameEl.textContent = username;
  
  console.log('✅ Username displayed:', username);
}

// ✅ MAIN INITIALIZATION - PRODUCTS + AUTH CHECK
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ Page loaded');
  
  // Check auth (redirect if no token)
  checkAuth();
  
  // Load products
  loadProducts();
  
  // Search functionality
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const filtered = allProducts.filter(p => 
        p.title?.toLowerCase().includes(query) || 
        p.type?.toLowerCase().includes(query)
      );
      renderProducts(filtered);
    });
  }
  
  // Price slider
  const priceSlider = document.getElementById('priceSlider');
  if (priceSlider) {
    priceSlider.addEventListener('input', function() {
      document.getElementById('priceValue').textContent = this.value;
    });
  }
});

// ✅ UPDATE USERNAME AFTER PAGE FULLY LOADS
window.addEventListener('load', function() {
  console.log('✅ Window load event fired');
  updateUsername();
});

// ✅ GLOBAL EXPORTS
window.logout = logout;
window.checkAuth = checkAuth;
window.renderProducts = renderProducts;
window.loadProducts = loadProducts;
window.toggleFilters = toggleFilters;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.updateUsername = updateUsername;
