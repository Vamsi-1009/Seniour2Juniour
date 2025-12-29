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

// ================= USERS =================
fetch(`${API_URL}/api/admin/users`, {
  headers: {
    Authorization: `Bearer ${adminToken}`
  }
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

  document.getElementById("totalUsers").textContent = users.length;

  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "";

  users.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
      </tr>
    `;
  });
})
.catch(err => {
  console.error("Users fetch error:", err);
});

// ================= PRODUCTS =================
fetch(`${API_URL}/api/admin/listings`, {
  headers: {
    Authorization: `Bearer ${adminToken}`
  }
})
.then(res => {
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
})
.then(products => {
  console.log("PRODUCTS FROM API:", products);

  document.getElementById("totalProducts").textContent = products.length;

  const tbody = document.querySelector("#productsTable tbody");
  tbody.innerHTML = "";

  products.forEach(p => {
    let imgs = [];
    try {
      imgs = JSON.parse(p.images || "[]");
    } catch (e) {}

    const img = imgs[0] ? `${API_URL}${imgs[0]}` : "";

    tbody.innerHTML += `
      <tr>
        <td>${p.id}</td>
        <td>${p.title}</td>
        <td>₹${p.price}</td>
        <td>${p.type}</td>
        <td>${img ? `<img src="${img}" width="60">` : "No image"}</td>
        <td>
          <button onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>
    `;
  });
})
.catch(err => {
  console.error("Products fetch error:", err);
});

// ================= DELETE PRODUCT =================
function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  fetch(`${API_URL}/api/admin/listings/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
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
