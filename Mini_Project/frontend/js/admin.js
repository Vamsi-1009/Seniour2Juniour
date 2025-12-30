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
  document.querySelectorAll(".admin-stats").forEach(stats => {
    stats.style.display = "flex";
  });
  
  // Reset active cards
  document.querySelectorAll(".stat-card").forEach(card => {
    card.classList.remove("active");
  });
  
  currentSection = 'dashboard';
}

// ================= LOAD USERS TABLE (LATEST FIRST) =================
function loadUsersTable(users) {
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "";
  
  // Sort by latest registered first
  const sortedUsers = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  sortedUsers.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span style="color: ${u.role === 'admin' ? '#ff4d4d' : '#28a745'}; font-weight: bold;">${u.role || 'user'}</span></td>
        <td>${u.phone || '-'}</td>
        <td>${new Date(u.created_at).toLocaleDateString('en-IN')}</td>
      </tr>
    `;
  });
}

// ================= LOAD PRODUCTS TABLE (FIXED IMAGES + SELLER) =================
function loadProductsTable(products) {
  const tbody = document.querySelector("#productsTable tbody");
  tbody.innerHTML = "";
  
  // Sort by latest uploads first
  const sortedProducts = [...products].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  sortedProducts.forEach(p => {
    let imgs = [];
    try {
      imgs = JSON.parse(p.images || "[]");
    } catch (e) {
      console.log("Image parse error:", p.images);
    }

    // FIXED IMAGE PATHS - TRY MULTIPLE LOCATIONS
    let imgSrc = "";
    if (imgs[0]) {
      const filename = imgs[0];
      // Test these paths automatically:
      const paths = [
        `/uploads/${filename}`,                    // Static serve (MOST COMMON)
        `${API_URL}/uploads/${filename}`,          // Backend API
        `/images/${filename}`,                     // Alternative folder
        `${API_URL}/images/${filename}`,           // Backend images
        filename                                   // Direct filename
      ];
      
      imgSrc = paths[0]; // Start with static uploads/
    }

    // Seller name from multiple fields
    const sellerName = p.seller_name || p.seller || p.user_name || p.user?.name || 'Unknown';

    tbody.innerHTML += `
      <tr>
        <td>${p.id}</td>
        <td>${p.title}</td>
        <td>₹${p.price}</td>
        <td><span style="color: ${p.type === 'sell' ? '#28a745' : '#ffc107'}; font-weight: bold;">${p.type.toUpperCase()}</span></td>
        <td>${sellerName}</td>
        <td>
          ${imgSrc ? `
            <img src="${imgSrc}" 
                 width="60" height="60" 
                 style="border-radius: 6px; object-fit: cover; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border: 2px solid #f0f0f0;" 
                 onerror="fixImage(this, '${imgSrc}')" 
                 loading="lazy">
          ` : `
            <div style="width:68px;height:60px;background:linear-gradient(135deg,#f8f9fa,#e9ecef);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px;font-weight:500;border:2px solid #f0f0f0;">
              📷 No Image
            </div>
          `}
        </td>
        <td>
          <button onclick="deleteProduct(${p.id})" class="delete-btn">🗑️ Delete</button>
        </td>
      </tr>
    `;
  });
}

// ================= IMAGE FIX FUNCTION =================
function fixImage(img, originalSrc) {
  // Try alternative paths
  const altPaths = [
    originalSrc.replace(API_URL, '/uploads'),
    originalSrc.replace('/uploads/', '/images/'),
    originalSrc.replace(API_URL, '/images/'),
    '/uploads/placeholder.jpg'
  ];
  
  let pathIndex = 0;
  const tryNextPath = () => {
    if (pathIndex < altPaths.length) {
      img.src = altPaths[pathIndex];
      pathIndex++;
      img.onerror = tryNextPath;
    } else {
      // Final fallback
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNGRkY4RjAiLz48dGV4dCB4PSIzMCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
      img.style.background = 'linear-gradient(135deg, #f8f9fa, #e9ecef)';
    }
  };
  
  tryNextPath();
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
  document.getElementById("totalUsers").textContent = users.length;
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
  document.getElementById("totalProducts").textContent = products.length;
  
  // Log first product images for debugging
  if (products[0]) {
    console.log("FIRST PRODUCT IMAGES:", products[0].images);
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
