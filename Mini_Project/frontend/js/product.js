const API_URL = "http://localhost:5000";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id") || '1'; // Default to ID 1 for testing

let product = null;
let images = [];
let currentIndex = 0;

// ================= LOAD PRODUCT - BULLETPROOF =================
async function loadProductData() {
  console.log("🔍 Loading product ID:", productId);
  
  // Try ALL possible endpoints
  const endpoints = [
    `${API_URL}/api/listings/${productId}`,
    `${API_URL}/api/listing/${productId}`,
    `${API_URL}/api/admin/listings/${productId}`,
    `${API_URL}/api/products/${productId}`
  ];
  
  for (let i = 0; i < endpoints.length; i++) {
    try {
      console.log(`Trying endpoint ${i + 1}:`, endpoints[i]);
      const res = await fetch(endpoints[i]);
      if (res.ok) {
        const data = await res.json();
        console.log("✅ SUCCESS:", data);
        return data;
      }
    } catch (err) {
      console.log(`❌ Endpoint ${i + 1} failed:`, err.message);
    }
  }
  
  throw new Error("No working endpoints found");
}

// ================= MAIN EXECUTION =================
loadProductData()
  .then(data => {
    product = data;
    try {
      images = JSON.parse(product.images || "[]");
    } catch (e) {
      images = [];
    }
    
    console.log("📦 Product loaded:", product);
    console.log("🖼️ Images:", images);
    
    // Hide loading, show product
    document.getElementById("loading").style.display = "none";
    document.getElementById("productCard").style.display = "grid";
    
    loadProduct();
    renderThumbnails();
  })
  .catch(err => {
    console.error("💥 FULL ERROR:", err);
    
    document.getElementById("loading").innerHTML = `
      <div style="text-align: center; padding: 3rem; max-width: 400px; margin: auto;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
        <h2>Product Not Found</h2>
        <p style="color: #666; margin-bottom: 2rem;">
          This product doesn't exist or has been deleted.<br>
          ID tried: <strong>${productId}</strong>
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button onclick="window.history.back()" class="primary-btn" style="
            background: #28a745; color: white; padding: 12px 24px; 
            border: none; border-radius: 8px; font-size: 16px; cursor: pointer;
          ">
            ← Go Back
          </button>
          <a href="index.html" class="primary-btn" style="
            background: #2874f0; color: white; padding: 12px 24px; 
            text-decoration: none; border-radius: 8px; font-size: 16px;
          ">
            🏠 Home
          </a>
        </div>
      </div>
    `;
  });

function loadProduct() {
  // Update all fields safely
  document.getElementById("title").textContent = product.title || "No Title";
  document.getElementById("description").textContent = product.description || "No description available";
  document.getElementById("price").textContent = `₹${product.price || 0}`;
  document.getElementById("type").textContent = (product.type || 'N/A').toUpperCase();
  
  // Update seller
  const sellerName = product.seller_name || product.seller || product.user_name || 'Unknown Seller';
  document.querySelector('.seller-name').textContent = sellerName;
  document.querySelector('.seller-listings').textContent = `${product.total_listings || 1} listing${product.total_listings !== 1 ? 's' : ''}`;
  
  // Fix buttons
  document.querySelectorAll('.primary-btn')[0].onclick = goToCheckout;
  
  if (images.length > 0) {
    showImage(0);
  }
}

function showImage(index) {
  if (!images.length || !document.getElementById("mainImage")) return;
  
  currentIndex = index;
  const mainImage = document.getElementById("mainImage");
  const filename = images[index];
  
  console.log("🖼️ Trying image:", filename); // DEBUG
  
  // Show filename in alt text
  mainImage.alt = `Image: ${filename || 'NO FILENAME'}`;
  
  if (!filename) {
    mainImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDQwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyODAiIGZpbGw9IiNGRkY4RjAiLz48dGV4dCB4PSIyMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2UgRm9ybmFtZTwvdGV4dD48L3N2Zz4=';
    return;
  }
  
  // PERFECT PATHS
  const paths = [
    `/uploads/${filename}`,
    `${API_URL}/uploads/${filename}`,
    `/images/${filename}`,
    `${API_URL}/images/${filename}`
  ];
  
  console.log("🔗 Paths tried:", paths); // DEBUG
  
  let pathIndex = 0;
  const tryNext = () => {
    if (pathIndex < paths.length) {
      console.log(`📍 Trying path ${pathIndex + 1}:`, paths[pathIndex]);
      mainImage.src = paths[pathIndex];
      pathIndex++;
    } else {
      console.log("💥 All image paths failed");
      mainImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDQwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyODAiIGZpbGw9IiNGRkY4RjAiLz48dGV4dCB4PSIyMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RmlsZW5hbWU6ICR7ZmlsZW5hbWV9PC90ZXh0Pjwvc3ZnPg==';
    }
  };
  
  mainImage.onerror = tryNext;
  tryNext(); // Start first path
}


function nextImage() { if (images.length) showImage((currentIndex + 1) % images.length); }
function prevImage() { if (images.length) showImage((currentIndex - 1 + images.length) % images.length); }

function renderThumbnails() {
  const thumbs = document.getElementById("thumbnails");
  if (!thumbs) return;
  
  thumbs.innerHTML = "";
  
  if (!images.length) {
    thumbs.innerHTML = '<div style="padding: 2rem; text-align: center; color: #999; width: 100%;">📷 No images available</div>';
    return;
  }
  
  images.slice(0, 6).forEach((img, i) => { // Max 6 thumbs
    const thumb = document.createElement("img");
    thumb.src = `/uploads/${img}`;
    thumb.className = "thumb";
    thumb.onclick = () => showImage(i);
    thumb.onerror = () => thumb.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA3MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNzAiIGhlaWdodD0iNTAiIGZpbGw9IiNGRkY4RjAiLz48L3N2Zz4=';
    thumbs.appendChild(thumb);
  });
}

function goToCheckout() {
  window.location.href = `checkout.html?id=${productId}`;
}

function openChat() {
  window.location.href = `chat.html?listingId=${productId}&sellerId=${product.user_id || product.seller_id}`;
}

function openWhatsApp() {
  const message = encodeURIComponent(`Hi! I'm interested in "${product?.title || 'this product'}" for ₹${product?.price || 0}`);
  window.open(`https://wa.me/919876543210?text=${message}`, '_blank');
}

// ================= DEBUG INFO =================
console.log("🚀 Product page loaded for ID:", productId);
console.log("🌐 API_URL:", API_URL);
