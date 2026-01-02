✅ UPDATED auth.js - Fixed Version

const API_URL = "http://localhost:5000";

/* ================== LOGIN ================== */

function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  
  if (!email || !password) {
    alert("Please fill all fields");
    return;
  }

  fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(r => r.json())
  .then(data => {
    console.log("Login Response:", data); // Debug
    
    if (data.token) {
      // ✅ Save token AND user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.email.split("@")[0]); // Save username
      localStorage.setItem("userRole", data.role || "user");
      
      // Redirect based on role
      if (data.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "index.html";
      }
    } else {
      alert(data.message || "Login failed");
    }
  })
  .catch(err => {
    console.error("Login Error:", err);
    alert("Error: Unable to connect to server. Make sure backend is running on http://localhost:5000");
  });
}

/* ================== REGISTER ================== */

function register() {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const phone = document.getElementById("regPhone").value;
  const password = document.getElementById("regPassword").value;
  
  if (!name || !email || !phone || !password) {
    alert("Please fill all fields");
    return;
  }

  if (!validateEmail()) return;
  if (!validatePhone()) return;

  fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone, password })
  })
  .then(r => r.json())
  .then(data => {
    console.log("Register Response:", data);
    alert(data.message);
    
    if (data.message && data.message.includes("registered")) {
      window.location.href = "login.html";
    }
  })
  .catch(err => {
    console.error("Register Error:", err);
    alert("Error: Unable to connect to server");
  });
}

/* ================== EMAIL VALIDATION ================== */

function validateEmail() {
  const email = document.getElementById("regEmail").value;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailError = document.getElementById("emailError");
  
  if (!regex.test(email)) {
    emailError.innerText = "Invalid email format";
    return false;
  }
  
  emailError.innerText = "";
  return true;
}

/* ================== PHONE VALIDATION ================== */

function validatePhone() {
  const regPhone = document.getElementById("regPhone");
  const phoneError = document.getElementById("phoneError");
  
  regPhone.value = regPhone.value.replace(/\D/g, "");
  
  if (regPhone.value.length !== 10) {
    phoneError.innerText = "Phone must be 10 digits";
    return false;
  }
  
  phoneError.innerText = "";
  return true;
}

/* ================== PASSWORD STRENGTH ================== */

function updateStrength() {
  const pass = document.getElementById("regPassword").value;
  const strengthMeter = document.getElementById("strengthMeter");
  const strengthText = document.getElementById("strengthText");
  
  let strength = 0;
  if (pass.length >= 6) strength++;
  if (/[A-Z]/.test(pass)) strength++;
  if (/[0-9]/.test(pass)) strength++;
  if (/[@$!%*?&]/.test(pass)) strength++;
  
  if (strengthMeter) strengthMeter.value = strength;
  
  const text = ["Very Weak", "Weak", "Okay", "Good", "Strong"];
  if (strengthText) strengthText.innerText = text[strength];
}
