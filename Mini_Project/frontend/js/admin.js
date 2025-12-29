const API_URL = "http://10.10.1.128:5000";

// ================= AUTH CHECK =================
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "admin") {
  alert("Admin access only");
  window.location.href = "admin-login.html";
}

// ================= LOAD USERS =================
fetch(`${API_URL}/api/admin/users`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(res => {
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  })
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
  })
  .catch(err => {
    console.error(err);
    alert("Failed to load users");
  });

// ================= LOAD PRODUCTS =================
fetch(`${API_URL}/api/admin/listings`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(res => {
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  })
  .then(products => {
    document.getElementById("totalProducts").textContent = products.length;

    const tbody = document.querySelector("#productsTable tbody");
    tbody.innerHTML = "";

    products.forEach(p => {
      const images = JSON.parse(p.images || "[]");
      const firstImage = images.length
        ? `${API_URL}${images[0]}`
        : "";

      tbody.innerHTML += `
        <tr>
          <td>${p.id}</td>
          <td>${p.title}</td>
          <td>₹${p.price}</td>
          <td>${p.type}</td>
          <td>
            ${
              firstImage
                ? `<img src="${firstImage}" width="60" height="60" style="object-fit:cover;border-radius:6px;">`
                : "No image"
            }
          </td>
          <td>
            <button onclick="deleteProduct(${p.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  })
  .catch(err => {
    console.error(err);
    alert("Failed to load products");
  });

// ================= DELETE PRODUCT =================
function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  fetch(`${API_URL}/api/admin/listings/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    })
    .then(() => location.reload())
    .catch(() => alert("Delete failed"));
}
