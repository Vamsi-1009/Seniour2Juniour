// ================= BASIC SETUP =================
const API_URL = "http://localhost:5000";
const adminToken = localStorage.getItem("token");
const role = localStorage.getItem("role");

console.log("ADMIN JS LOADED");
console.log("TOKEN USED:", adminToken);
console.log("ROLE:", role);

// ================= AUTH CHECK =================
if (!adminToken || role !== "admin") {
  alert("Admin only");
  window.location.href = "admin-login.html";
}

// ================= GLOBAL STATE =================
let adminUsers = [];
let adminProducts = [];
let currentSection = 'dashboard';

// ================= SHOW SECTION =================
function showSection(section) {
  // Hide all sections
  document.querySelectorAll(".admin-section").forEach(sec => {
    sec.style.display = "none";
  });
  
  // Show selected section
  document.getElementById(`${section}Section`).style.display = "block";
  
  // Update active tab styling
  document.querySelectorAll(".stat-card").forEach(card => {
    card.classList.remove("active");
  });
  event.target.closest(".stat-card").classList.add("active");
  
  // Update current section
  currentSection = section;
  
  // Load data for section (sorted latest first)
  if (section === 'users') {
    loadUsersTable(adminUsers);
  } else if (section === 'products') {
    loadProductsTable(adminProducts);
  }
}

// ================= BACK TO DASHBOARD =================
function goBackToDashboard() {
  // Hide all sections
  document.querySelectorAll(".admin-section").forEach(sec => {
    sec.style.display = "none";
  });
  
  // Show dashboard stats only
  const stats = document.querySelector(".admin-stats");
  if (stats) stats.style.display = "flex";
  
  // Reset active cards
  document.querySelectorAll(".stat-card").forEach(card => {
    card.classList.remove("active");
  });
  
  // Update title
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = "Admin Dashboard";
  
  currentSection = 'dashboard';
}

// ================= LOAD USERS TABLE (LATEST FIRST) =================
function loadUsersTable(users) {
  const tbody = document.querySelector("#usersTable tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  // Sort by latest registered first
  const sortedUsers = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  sortedUsers.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td>${u.id || '-'}</td>
        <td>${u.name || 'N/A'}</td>
        <td>${u.email || 'N/A'}</td>
        <td><span style="color: ${u.role === 'admin' ? '#ff4d4d' : '#28a745'}; font-weight: bold;">${u.role || 'user'}</span></td>
        <td>${u.phone || '-'}</td>
        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '-'}</td>
      </tr>
    `;
  });
}

// ================= LOAD PRODUCTS TABLE (PERFECT IMAGES) =================
function loadProductsTable(products) {
  const tbody = document.querySelector("#productsTable tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  // Sort by latest uploads first
  const sortedProducts = [...products].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  sortedProducts.forEach(p => {
    let imgs = [];
    try {
      imgs = JSON.parse(p.images || "[]");
    } catch (e) {
      console.log("Image parse error for", p.title, ":", p.images);
    }

    // Seller name from multiple fields
    const sellerName = p.seller_name || p.seller || p.user_name || p.user?.name || 'Unknown';

    tbody.innerHTML += `
      <tr>
        <td>${p.id}</td>
        <td>${p.title}</td>
        <td>₹${p.price}</td>
        <td><span style="color: ${p.type === 'sell' ? '#28a745' : '#ffc107'}; font-weight: bold;">${p.type?.toUpperCase() || 'N/A'}</span></td>
        <td>${sellerName}</td>
        <td>
          ${imgs[0] ? `
            <div style="position:relative;width:68px;height:60px;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#f8f9fa,#e9ecef);border:2px solid #f0f0f0;">
              <img src="/uploads/${imgs[0]}" 
                   style="width:100%;height:100%;object-fit:cover;border-radius:6px;" 
                   onerror="this.style.display='none';this.parentNode.style.background='linear-gradient(135deg,#f8f9fa,#e9ecef)';this.nextSibling.style.display='flex';"
                   loading="lazy">
              <div style="display:none;position:absolute;top:0;left:0;width:100%;height:100%;align-items:center;justify-content:center;color:#999;font-size:12px;font-weight:500;background:rgba(255,255,255,0.9);">
                📷
              </div>
            </div>
          ` : `
            <div style="width:68px;height:60px;background:linear-gradient(135deg,#f8f9fa,#e9ecef);border-radius:8px;border:2px solid #f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;font-weight:500;">
              📷
            </div>
          `}
        </td>
        <td>
          <button onclick="deleteProduct(${p.id})" class="delete-btn" title="Delete Product">🗑️</button>
        </td>
      </tr>
    `;
  });
}

// ================= USERS API =================
fetch(`${API_URL}/api/admin/users`, {
  headers: { Authorization: `Bearer ${adminToken}` }
})
.then(res => {
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      alert("Session expired. Please login again.");
      localStorage.clear();
      window.location.href = "admin-login.html";
    }
    throw new Error("Failed to fetch users");
  }
  return res.json();
})
.then(users => {
  console.log("USERS FROM API:", users);
  adminUsers = users;
  const totalUsersEl = document.getElementById("totalUsers");
  if (totalUsersEl) totalUsersEl.textContent = users.length;
})
.catch(err => console.error("Users fetch error:", err));

// ================= PRODUCTS API =================
fetch(`${API_URL}/api/admin/listings`, {
  headers: { Authorization: `Bearer ${adminToken}` }
})
.then(res => {
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
})
.then(products => {
  console.log("PRODUCTS FROM API:", products);
  adminProducts = products;
  const totalProductsEl = document.getElementById("totalProducts");
  if (totalProductsEl) totalProductsEl.textContent = products.length;
  
  // Log first product for debugging
  if (products[0]) {
    console.log("FIRST PRODUCT:", products[0]);
  }
})
.catch(err => console.error("Products fetch error:", err));

// ================= DELETE PRODUCT =================
function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  fetch(`${API_URL}/api/admin/listings/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  })
  .then(res => {
    if (!res.ok) throw new Error("Delete failed");
    location.reload();
  })
  .catch(err => {
    alert("Failed to delete product");
    console.error(err);
  });
}

// ================= CLICK HANDLERS =================
document.addEventListener("DOMContentLoaded", function() {
  // Stat card clicks
  const usersCard = document.getElementById("usersCard");
  const productsCard = document.getElementById("productsCard");
  
  if (usersCard) {
    usersCard.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      showSection("users");
    });
  }
  
  if (productsCard) {
    productsCard.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      showSection("products");
    });
  }
  
  // Back button
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", goBackToDashboard);
  }
  
  // Make stat cards clickable + hover effects
  document.querySelectorAll(".stat-card").forEach(card => {
    card.style.cursor = "pointer";
    card.style.transition = "all 0.3s ease";
  });
  
  // Show dashboard by default
  setTimeout(() => {
    const usersSection = document.getElementById("usersSection");
    const stats = document.querySelector(".admin-stats");
    if (usersSection) usersSection.style.display = "none";
    if (stats) stats.style.display = "flex";
  }, 100);
});
