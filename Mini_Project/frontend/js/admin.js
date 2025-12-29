const API_URL = "http://10.10.1.128:5000";

const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "admin") {
  alert("Admin only");
  window.location.href = "admin-login.html";
}

// USERS
fetch(`${API_URL}/api/admin/users`, {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => res.json())
.then(users => {
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
});

// PRODUCTS
fetch(`${API_URL}/api/admin/listings`, {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => res.json())
.then(products => {
  document.getElementById("totalProducts").textContent = products.length;
  const tbody = document.querySelector("#productsTable tbody");
  tbody.innerHTML = "";
  products.forEach(p => {
    const imgs = JSON.parse(p.images || "[]");
    const img = imgs[0] ? `${API_URL}${imgs[0]}` : "";
    tbody.innerHTML += `
      <tr>
        <td>${p.id}</td>
        <td>${p.title}</td>
        <td>₹${p.price}</td>
        <td>${p.type}</td>
        <td>${img ? `<img src="${img}" width="60">` : "No image"}</td>
        <td><button onclick="deleteProduct(${p.id})">Delete</button></td>
      </tr>
    `;
  });
});

function deleteProduct(id) {
  fetch(`${API_URL}/api/admin/listings/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  }).then(() => location.reload());
}
