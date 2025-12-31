const API_URL = "http://localhost:5000";
const token = localStorage.getItem("token");

// 🔐 AUTH CHECK
if (!token) {
  alert("Login required");
  window.location.href = "login.html";
}

// ================= ADD PRODUCT =================
function addProduct() {
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const price = document.getElementById("price").value;
  const type = document.getElementById("type").value;
  const files = document.getElementById("images").files;

  // VALIDATION
  if (!title || !price || !type) {
    alert("Please fill all required fields");
    return;
  }

  if (files.length !== 3) {
    alert("Please upload exactly 3 images");
    return;
  }

  // LOCATION (OPTIONAL)
  if (!navigator.geolocation) {
    submitProduct(files, null, null);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      submitProduct(files, pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      submitProduct(files, null, null);
    }
  );
}

// ================= SUBMIT =================
function submitProduct(files, lat, lng) {
  const formData = new FormData();

  formData.append("title", title.value);
  formData.append("description", description.value || "");
  formData.append("price", price.value);
  formData.append("type", type.value);

  if (lat && lng) {
    formData.append("latitude", lat);
    formData.append("longitude", lng);
  }

  for (let i = 0; i < files.length; i++) {
    formData.append("images", files[i]);
  }

  fetch(`${API_URL}/api/listings`, {
    method: "POST",
    headers: {
      Authorization: token
    },
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || "Product added successfully");
      window.location.href = "index.html";
    })
    .catch(() => {
      alert("Failed to add product");
    });
}

// ================= LOGOUT =================
function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}
