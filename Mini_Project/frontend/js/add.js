const API_URL = "http://localhost:5000";
const token = localStorage.getItem("token");

// 🔐 AUTH CHECK
if (!token) {
  alert("Login required");
  window.location.href = "login.html";
}

// ================= ADD PRODUCT =================
async function addProduct() {
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const price = document.getElementById("price").value;
  const type = document.getElementById("type").value;
  const imageFiles = document.getElementById("images").files;

  if (!title || !description || !price || imageFiles.length === 0) {
    alert("Please fill all fields and upload at least 1 image");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  formData.append("price", price);
  formData.append("type", type);
  
  // ✅ Add ALL images to FormData
  for (let i = 0; i < imageFiles.length; i++) {
    formData.append("images", imageFiles[i]);
  }

  try {
    const response = await fetch("http://localhost:5000/api/listings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      alert("Product added successfully!");
      window.location.href = "index.html";
    } else {
      alert("Error adding product");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error uploading product");
  }
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
