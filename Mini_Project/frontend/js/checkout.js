const API_URL = "http://localhost:5000";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let product = null;

// ================= LOAD PRODUCT =================
fetch(`${API_URL}/api/listings/${productId}`)
  .then(res => res.json())
  .then(data => {
    product = data;

    document.getElementById("productTitle").textContent = product.title;
    document.getElementById("productType").textContent = product.type;
    document.getElementById("productPrice").textContent = product.price;
  })
  .catch(() => alert("Failed to load product"));

// ================= CONFIRM ORDER =================
function confirmOrder() {
  const name = document.getElementById("buyerName").value.trim();
  const phone = document.getElementById("buyerPhone").value.trim();
  const address = document.getElementById("buyerAddress").value.trim();

  if (!name || !phone || !address) {
    alert("Please fill all details");
    return;
  }

  alert(
    `Order Confirmed!\n\n` +
    `Product: ${product.title}\n` +
    `Type: ${product.type}\n` +
    `Price: ₹${product.price}\n\n` +
    `Seller will contact you soon.`
  );

  // Later → save this to DB / chat auto-open
  window.location.href = "index.html";
}
