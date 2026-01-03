const API_URL = "http://localhost:5000";

/* ============= LOGIN ============= */
function login() {
  const email = document.getElementById("loginEmail")?.value;
  const password = document.getElementById("loginPassword")?.value;
  
  if (!email || !password) {
    alert("Enter email and password");
    return;
  }
  
  console.log('🔍 Attempting login with:', email);
  
  fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(r => {
    console.log('📡 Response status:', r.status);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(d => {
    console.log('📦 Full response data:', d);
    
    if (d.token) {
      // ✅ STORE TOKEN
      localStorage.setItem("token", d.token);
      console.log('✅ Token stored');
      
      // ✅ GET USERNAME - TRY ALL SOURCES
      let username = 'User';
      
      // Try from response object first
      if (d.user?.name) {
        username = d.user.name;
        console.log('✅ Username from d.user.name:', username);
      } else if (d.user?.username) {
        username = d.user.username;
        console.log('✅ Username from d.user.username:', username);
      } else if (d.name) {
        username = d.name;
        console.log('✅ Username from d.name:', username);
      } else if (d.username) {
        username = d.username;
        console.log('✅ Username from d.username:', username);
      } else {
        // ✅ FALLBACK: DECODE JWT TOKEN
        try {
          const token = d.token;
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔐 JWT payload:', payload);
          
          // Try to get name from JWT
          if (payload.name) {
            username = payload.name;
            console.log('✅ Username from JWT.name:', username);
          } else if (payload.email) {
            // Use email if no name in JWT
            username = payload.email.split('@')[0]; // Get part before @
            console.log('✅ Username from JWT.email (cleaned):', username);
          } else if (payload.username) {
            username = payload.username;
            console.log('✅ Username from JWT.username:', username);
          }
        } catch(e) {
          console.warn('⚠️ Could not decode JWT:', e);
          // If token decode fails, try email from login form
          username = email.split('@')[0]; // Get part before @
          console.log('⚠️ Using email as username:', username);
        }
      }
      
      // ✅ STORE USERNAME
      localStorage.setItem("username", username);
      console.log('✅ Username stored in localStorage:', username);
      
      // ✅ VERIFY STORAGE
      console.log('✅ Verification - Token:', localStorage.getItem("token").substring(0, 20) + '...');
      console.log('✅ Verification - Username:', localStorage.getItem("username"));
      
      // ✅ REDIRECT
      alert(`Welcome, ${username}!`);
      window.location.href = "index.html";
    } else {
      console.error('❌ No token in response');
      alert(d.message || "Login failed");
    }
  })
  .catch(error => {
    console.error('❌ Login error:', error);
    alert("Network error or server offline: " + error.message);
  });
}

/* ============= EMAIL VALIDATION ============= */
function validateEmail() {
  const email = document.getElementById("regEmail")?.value || "";
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    const emailError = document.getElementById("emailError");
    if (emailError) emailError.innerText = "Invalid email format";
    return false;
  }

  const emailError = document.getElementById("emailError");
  if (emailError) emailError.innerText = "";
  return true;
}

/* ============= PHONE VALIDATION ============= */
function validatePhone() {
  const phone = document.getElementById("regPhone");
  if (!phone) return true;
  
  phone.value = phone.value.replace(/\D/g, "");
  if (phone.value.length !== 10) {
    const phoneError = document.getElementById("phoneError");
    if (phoneError) phoneError.innerText = "Phone must be 10 digits";
    return false;
  }

  const phoneError = document.getElementById("phoneError");
  if (phoneError) phoneError.innerText = "";
  return true;
}

/* ============= PASSWORD STRENGTH ============= */
function updateStrength() {
  const password = document.getElementById("regPassword")?.value || "";
  const strengthMeter = document.getElementById("strengthMeter");
  const strengthText = document.getElementById("strengthText");
  
  let strength = 0;
  if (password.length >= 6) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;

  if (strengthMeter) strengthMeter.value = strength;
  
  const text = ["Very Weak", "Weak", "Okay", "Good", "Strong"];
  if (strengthText) strengthText.innerText = text[strength] || "Very Weak";
}

/* ============= REGISTER ============= */
function register() {
  if (!validateEmail() || !validatePhone()) {
    alert("Fix errors before submitting");
    return;
  }

  const name = document.getElementById("regName")?.value;
  const email = document.getElementById("regEmail")?.value;
  const phone = document.getElementById("regPhone")?.value;
  const password = document.getElementById("regPassword")?.value;
  
  if (!name || !email || !phone || !password) {
    alert("Fill all fields");
    return;
  }
  
  console.log('📝 Registering user:', { name, email, phone });

  fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone, password })
  })
  .then(r => {
    console.log('📡 Register response status:', r.status);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(d => {
    console.log('📦 Register response:', d);
    alert(d.message || "Registration response received");
    
    if (d.message && (d.message.toLowerCase().includes("success") || d.message.toLowerCase().includes("created"))) {
      window.location.href = "login.html";
    }
  })
  .catch(error => {
    console.error('❌ Register error:', error);
    alert("Registration failed: " + error.message);
  });
}

/* ============= GLOBAL EXPORTS ============= */
window.login = login;
window.register = register;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.updateStrength = updateStrength;
