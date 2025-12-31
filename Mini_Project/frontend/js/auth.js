const API_URL = "http://localhost:5000";

/* ---------------- LOGIN ---------------- */
function login() {
  fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: loginEmail.value,
      password: loginPassword.value
    })
  })
  .then(r => r.json())
  .then(d => {
    if (d.token) {
      localStorage.setItem("token", d.token);
      window.location.href = "index.html";
    } else {
      alert(d.message || "Login failed");
    }
  });
}

/* ---------------- EMAIL VALIDATION ---------------- */
function validateEmail() {
  const email = regEmail.value;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    emailError.innerText = "Invalid email format";
    return false;
  }

  emailError.innerText = "";
  return true;
}

/* ---------------- PHONE VALIDATION ---------------- */
function validatePhone() {
  regPhone.value = regPhone.value.replace(/\D/g, "");
  if (regPhone.value.length !== 10) {
    phoneError.innerText = "Phone number must be 10 digits";
    return false;
  }
  phoneError.innerText = "";
  return true;
}

/* ---------------- PASSWORD STRENGTH ---------------- */
function updateStrength() {
  const pass = regPassword.value;
  let strength = 0;

  if (pass.length >= 6) strength++;
  if (/[A-Z]/.test(pass)) strength++;
  if (/[0-9]/.test(pass)) strength++;
  if (/[@$!%*?&]/.test(pass)) strength++;

  strengthMeter.value = strength;

  const text = ["Very Weak", "Weak", "Okay", "Good", "Strong"];
  strengthText.innerText = text[strength];
}

/* ---------------- REGISTER ---------------- */
function register() {
  if (!validateEmail() || !validatePhone()) {
    alert("Fix errors before submitting");
    return;
  }

  fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: regName.value,
      email: regEmail.value,
      phone: regPhone.value,
      password: regPassword.value
    })
  })
  .then(r => r.json())
  .then(d => {
    alert(d.message);
    if (d.message.includes("success")) {
      window.location.href = "login.html";
    }
  });
}
