const API_URL = "http://localhost:5000";
const token = localStorage.getItem("token");

fetch(`${API_URL}/api/listings/my`, {
  headers: { Authorization: token }
})
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("listings");
    container.innerHTML = "";

    data.forEach(p => {
      const img = JSON.parse(p.images)[0];
      container.innerHTML += `
        <div class="product-card">
          <img src="${API_URL}${img}">
          <div class="product-info">
            <h4>${p.title}</h4>
            <p>₹${p.price}</p>
            <span class="badge">${p.type}</span>
          </div>
        </div>
      `;
    });
  });

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}
