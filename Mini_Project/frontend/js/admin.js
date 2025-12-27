const API_URL = "http://localhost:5000";

function adminLogin() {
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;

  if (!email || !password) {
    alert("Enter email & password");
    return;
  }

  fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token && data.role === "admin") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", "admin");
        window.location.href = "admin.html";
      } else {
        alert("Invalid admin credentials");
      }
    })
    .catch(() => alert("Login failed"));
}
