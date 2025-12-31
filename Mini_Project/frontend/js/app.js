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
      <a href="chat.html">Chat</a>
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
    // ✅ FIXED: Handle both array and string images
    let firstImage = '/uploads/demo.jpg';
    if (p.images) {
      try {
        if (Array.isArray(p.images)) {
          firstImage = p.images[0];
        } else {
          const imgArray = JSON.parse(p.images);
          firstImage = imgArray[0];
        }
      } catch(e) {
        firstImage = '/uploads/demo.jpg';
      }
    }
    const imagePath = p.images && Array.isArray(p.images) ? '${API_URL}${p.images[0]}' : '${API_URL}/uploads/demo.jpg';
    
    container.innerHTML += `
      <div class="product-card" onclick="openProduct(${p.id})">
        <img src="${imagePath}" alt="${p.title}" onerror="this.src='/uploads/demo.jpg'">
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
  fetch(`${API_URL}/api/listings`)
    .then(res => {
      if (!res.ok) throw new Error('API error');
      return res.json();
    })
    .then(data => {
      allProducts = data || [];
      renderProducts(allProducts);  // "new one" from backend
    })
    .catch(error => {
      console.error('Listings load error:', error);
      document.getElementById("listings").innerHTML = "<p>Backend offline.</p>";
    });
}


window.openProduct = function(id) {
  console.log("Opening product ID:", id);
  window.location.href = `product.html?id=${id}`;
};

window.onload = function() {
  checkAuth();
  loadProducts();
};
