const API_URL = "http://localhost:5000";
const token = localStorage.getItem("token");

// ================== AUTH CHECK ==================
if (!token) {
  alert("Login required");
  window.location.href = "login.html";
}

// ================== ADD PRODUCT ==================
function addProduct() {
  const files = document.getElementById("images").files;

  if (!title.value || !price.value || !type.value) {
    alert("Please fill all required fields");
    return;
  }

  if (files.length < 1 || files.length > 3) {
    alert("Please upload exactly 1 or  3 images");
    return;
  }

  // Try to get user location
  if (!navigator.geolocation) {
    submitWithoutLocation(files);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      submitWithLocation(files, pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      // User denied location
      submitWithoutLocation(files);
    }
  );
}

// ================== SUBMIT WITH LOCATION ==================
function submitWithLocation(files, lat, lng) {
  const formData = new FormData();

  formData.append("title", title.value);
  formData.append("description", description.value || "");
  formData.append("price", price.value);
  formData.append("type", type.value);

  // 📍 Location
  formData.append("latitude", lat);
  formData.append("longitude", lng);

  for (let i = 0; i < files.length; i++) {
    formData.append("images", files[i]);
  }

  sendForm(formData);
}

// ================== SUBMIT WITHOUT LOCATION ==================
function submitWithoutLocation(files) {
  const formData = new FormData();

  formData.append("title", title.value);
  formData.append("description", description.value || "");
  formData.append("price", price.value);
  formData.append("type", type.value);

  for (let i = 0; i < files.length; i++) {
    formData.append("images", files[i]);
  }

  sendForm(formData);
}

// ================== SEND TO BACKEND ==================
function sendForm(formData) {
  fetch(`${API_URL}/api/listings`, {
    method: "POST",
    headers: {
      Authorization: token
    },
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || "Product added");
      window.location.href = "index.html";
    })
    .catch(() => alert("Failed to add product"));
}

// ================== LOGOUT ==================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "login.html";
}
