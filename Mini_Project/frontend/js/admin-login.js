const API_URL = "http://10.10.1.128:5000";

/*
  Dummy fixed admin credentials for this project
  Email: admin@admin.com
  Password: admin123
*/

function adminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  // Basic validation
  if (!email || !password) {
    alert("Please enter admin email and password");
    return;
  }

  // ✅ HARD-CODED ADMIN CHECK
  if (email !== "admin@admin.com" || password !== "admin123") {
    alert("Invalid admin credentials");
    return;
  }

  // ✅ Create dummy admin session
  const dummyToken = "admin_dummy_token_123";

  localStorage.setItem("token", dummyToken);
  localStorage.setItem("role", "admin");

  // Redirect to admin dashboard
  window.location.href = "admin.html";
}
