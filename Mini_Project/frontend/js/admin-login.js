
console.log("ADMIN LOGIN JS LOADED");
const API_URL = "http://localhost:5000";

function adminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      console.log("LOGIN RESPONSE:", data); // 🔥 DEBUG

      if (!data.token) {
        alert("Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      window.location.href = "admin.html";
    })
    .catch(err => {
      console.error(err);
      alert("Server error");
    });
}
