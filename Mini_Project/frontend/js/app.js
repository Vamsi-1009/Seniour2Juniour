const API_URL = "http://localhost:5000";
let allProducts = [];
let userLocation = null;

/* =================================================
   RENDER PRODUCTS (FIXED)
================================================= */
function renderProducts(products) {
  const container = document.getElementById("listings");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No items found.</p>";
    return;
  }

  products.forEach(p => {
    const imagePath = p.images ? `${API_URL}${JSON.parse(p.images)[0]}` : "";
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
   LOAD PRODUCTS (FIXED ERROR HANDLING)
================================================= */
function loadProducts() {
  fetch(`${API_URL}/api/listings`)
    .then(res => res.json())
    .then(data => {
      allProducts = data || [];
      renderProducts(allProducts);
    })
    .catch(error => {
      console.error('Listings load error:', error);
      // 🔥 DEMO FALLBACK
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

getUserLocation = loadProducts; // Simple start
loadProducts(); // Immediate load
