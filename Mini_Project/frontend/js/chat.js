// ✅ UPDATED chat.js - Handle Auto Message + Socket.io

const socket = io();
const token = localStorage.getItem("token");
const msgInput = document.getElementById("msgInput");
const messagesDiv = document.getElementById("messages");

// ✅ Check Auth
if (!token) {
  window.location.href = "login.html";
}

// ✅ Initialize Chat & Handle Auto Message
function initChat() {
  const urlParams = new URLSearchParams(window.location.search);
  const autoMessage = urlParams.get("message");

  if (autoMessage) {
    // Pre-fill the message input
    msgInput.value = decodeURIComponent(autoMessage);
    msgInput.focus();
    // Optional: Auto-send immediately
    // sendMessage();
  }

  // Load chat history from server
  loadChatHistory();
}

// ✅ Load Chat History
function loadChatHistory() {
  fetch("/api/chat/history", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      messagesDiv.innerHTML = "";
      data.forEach((msg) => {
        displayMessage(msg.sender, msg.text, msg.senderName);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    })
    .catch((err) => console.error("Error loading history:", err));
}

// ✅ Send Message Function
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  // Emit via Socket.io
  socket.emit("send_message", { text, token });
  msgInput.value = "";
}

// ✅ Display Message on UI
function displayMessage(sender, text, senderName) {
  const msgEl = document.createElement("div");
  msgEl.className = sender === "user" ? "message user-msg" : "message seller-msg";
  msgEl.innerHTML = `<strong>${senderName || sender}:</strong> ${text}`;
  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ✅ Listen for Messages from Socket.io
socket.on("receive_message", (data) => {
  displayMessage(data.sender, data.text, data.senderName);
});

// ✅ Handle Errors
socket.on("error", (err) => {
  console.error("Chat error:", err);
  alert("Chat connection error. Please refresh.");
});

// ✅ Allow Send on Enter Key
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ✅ Initialize on Page Load
window.addEventListener("DOMContentLoaded", initChat);
