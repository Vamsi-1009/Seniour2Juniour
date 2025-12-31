const API_URL = "http://localhost:5000";
let allProducts = [];
let userLocation = null;

/* =================================================
   LOGOUT FUNCTION - REQUIRED FOR index.html
================================================= */
function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

/* =================================================
   AUTH CHECK - Hide/show navbar buttons
================================================= */
function checkAuth() {
  const token = localStorage.getItem("token");
  const navActions = document.querySelector(".nav-actions");
  
  if (token) {
    // Logged in - show Add/My/Logout
    navActions.innerHTML = `
      <a href="chat.html">Chat</a>
      <a href="add-product.html">Add Item</a>
      <a href="my-products.html">My Products</a>
      <a href="#" onclick="logout()">Logout</a>
    `;
  } else {
    // Not logged in - redirect
    window.location.href = "login.html";
  }
}

/* =================================================
   RENDER PRODUCTS (PERFECT - NO CHANGES)
================================================= */
function renderProducts(products) {
  const container = document.getElementById("listings");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No items found. <a href='add-product.html'>Add first listing!</a></p>";
    return;
  }

  products.forEach(p => {
    const imagePath = p.images ? `${API_URL}${JSON.parse(p.images)[0]}` : "/uploads/demo.jpg";
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

/* =================================================
   LOAD PRODUCTS (ENHANCED)
================================================= */
function loadProducts() {
  fetch(`${API_URL}/api/listings`)
    .then(res => {
      if (!res.ok) throw new Error('API error');
      return res.json();
    })
    .then(data => {
      allProducts = data || [];
      renderProducts(allProducts);
    })
    .catch(error => {
      console.error('Listings load error:', error);
      // Demo fallback
      allProducts = [
        {id:1, title:"DBMS Book", price:450, type:"rent", images:JSON.stringify(['/uploads/demo.jpg'])},
        {id:2, title:"OS Notes", price:250, type:"buy", images:JSON.stringify(['/uploads/demo.jpg'])}
      ];
      renderProducts(allProducts);
    });
}

function openProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

/* =================================================
   PAGE LOAD - PERFECT ORDER
================================================= */
window.onload = function() {
  checkAuth();  // Navbar + auth check
  loadProducts(); // Load listings
};
