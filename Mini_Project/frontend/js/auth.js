const API_URL = "http://localhost:5000";

function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  
  fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(d => {
    if (d.token) {
      // ✅ STORE BOTH TOKEN + USERNAME
      localStorage.setItem("token", d.token);
      
      // ✅ GET USERNAME FROM RESPONSE - TRY ALL POSSIBLE FIELDS
      let username = 'User';
      if (d.user?.name) username = d.user.name;
      else if (d.user?.username) username = d.user.username;
      else if (d.name) username = d.name;
      else if (d.username) username = d.username;
      
      localStorage.setItem("username", username);
      
      console.log('✅ Login success. Token + Username stored:', username);
      window.location.href = "index.html";
    } else {
      alert(d.message || "Login failed");
    }
  })
  .catch(error => {
    console.error('❌ Login error:', error);
    alert("Network error or server offline");
  });
}

// Rest of your auth.js code...
function validateEmail() {
  const email = document.getElementById("regEmail").value;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    document.getElementById("emailError").innerText = "Invalid email format";
    return false;
  }
  document.getElementById("emailError").innerText = "";
  return true;
}

function validatePhone() {
  const phone = document.getElementById("regPhone");
  phone.value = phone.value.replace(/\D/g, "");
  if (phone.value.length !== 10) {
    document.getElementById("phoneError").innerText = "Phone must be 10 digits";
    return false;
  }
  document.getElementById("phoneError").innerText = "";
  return true;
}

function updateStrength() {
  const pass = document.getElementById("regPassword").value;
  let strength = 0;
  if (pass.length >= 6) strength++;
  if (/[A-Z]/.test(pass)) strength++;
  if (/[0-9]/.test(pass)) strength++;
  if (/[@$!%*?&]/.test(pass)) strength++;
  
  document.getElementById("strengthMeter").value = strength;
  const text = ["Very Weak", "Weak", "Okay", "Good", "Strong"];
  document.getElementById("strengthText").innerText = text[strength];
}

function register() {
  if (!validateEmail() || !validatePhone()) {
    alert("Fix errors before submitting");
    return;
  }
  
  fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: document.getElementById("regName").value,
      email: document.getElementById("regEmail").value,
      phone: document.getElementById("regPhone").value,
      password: document.getElementById("regPassword").value
    })
  })
  .then(r => r.json())
  .then(d => {
    alert(d.message);
    if (d.message.includes("success")) {
      window.location.href = "login.html";
    }
  })
  .catch(error => {
    console.error('Register error:', error);
    alert("Registration failed");
  });
}
