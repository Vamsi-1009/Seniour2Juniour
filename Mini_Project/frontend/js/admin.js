const API_URL = "http://localhost:5000";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "admin") {
  alert("Admin access only");
  window.location.href = "admin-login.html";
}

// ================= LOAD USERS =================
fetch(`${API_URL}/api/admin/users`, {
  headers: { Authorization: token }
})
  .then(res => res.json())
  .then(users => {
    // Count
    document.getElementById("totalUsers").innerText = users.length;

    // Table
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
  });

// ================= LOAD PRODUCTS =================
fetch(`${API_URL}/api/admin/listings`, {
  headers: { Authorization: token }
})
  .then(res => res.json())
  .then(products => {
    document.getElementById("totalProducts").innerText = products.length;

    const tbody = document.querySelector("#productsTable tbody");
    tbody.innerHTML = "";

    products.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td>${p.id}</td>
          <td>${p.title}</td>
          <td>₹${p.price}</td>
          <td>${p.type}</td>
          <td>
            <button onclick="deleteProduct(${p.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  });

// ================= DELETE =================
function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  fetch(`${API_URL}/api/admin/listings/${id}`, {
    method: "DELETE",
    headers: { Authorization: token }
  })
    .then(() => location.reload());
}

// ================= LOGOUT =================
function logout() {
  localStorage.clear();
  window.location.href = "admin-login.html";
}
