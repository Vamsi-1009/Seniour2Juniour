/* ===========================
   CHAT.JS - Frontend Socket.io Implementation
   Academic Exchange Messaging System
   =========================== */

// ✅ GET STORED TOKEN & CURRENT USER
const token = localStorage.getItem("token");
const currentUserJson = localStorage.getItem("currentUser");
const currentUser = currentUserJson ? JSON.parse(currentUserJson) : { id: null, username: "User" };

let currentChatUserId = null;
let currentListingId = null;
let socket;

// ✅ INITIALIZE SOCKET.IO CONNECTION
function initializeSocket() {
  socket = io();

  socket.on("connect", () => {
    console.log("✅ Connected to Socket.io server:", socket.id);
  });

  socket.on("disconnect", () => {
    console.warn("⚠️ Disconnected from Socket.io server");
  });

  // ✅ LISTEN FOR INCOMING MESSAGES
  socket.on("receive_message", (data) => {
    console.log("📩 Received message:", data);
    
    // Only add message if it's for the current chat
    if (data.receiver_id === currentUser.id || data.sender_id === currentUser.id) {
      appendMessage(data, data.sender_id === currentUser.id);
      scrollToBottom();
    }
  });

  socket.on("room_joined", (data) => {
    console.log("✅ Joined chat room:", data);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error);
  });
}

// ✅ LOAD ALL CHATS (INBOX)
async function loadChats() {
  try {
    console.log("📥 Loading all conversations...");
    
    const res = await fetch('/api/chat/', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const chats = await res.json();
    console.log("✅ Loaded chats:", chats.length);

    const chatList = document.getElementById('chatList');
    const noChatMsg = document.getElementById('noChatMsg');

    chatList.innerHTML = '';

    if (!chats || chats.length === 0) {
      noChatMsg.classList.remove('hidden');
      return;
    } else {
      noChatMsg.classList.add('hidden');
    }

    // ✅ DISPLAY EACH CHAT
    chats.forEach(chat => {
      const otherUser = chat.other_user_name || "Unknown User";
      const listingTitle = chat.listing_title || "Listing";
      const lastMessage = chat.last_message || "Start a conversation...";
      const otherUserId = chat.other_user_id;
      const listingId = chat.listing_id;

      const div = document.createElement('div');
      div.className = `chat-item ${currentChatUserId === otherUserId ? 'active' : ''}`;
      div.onclick = () => openChat(listingId, otherUserId, otherUser);
      
      const timeDisplay = new Date(chat.last_message_time).toLocaleTimeString([], {
        hour: '2-digit', 
        minute: '2-digit'
      });

      div.innerHTML = `
        <div class="chat-item-header">
          <div class="chat-item-name">${otherUser}</div>
          <div class="chat-item-time">${timeDisplay}</div>
        </div>
        <div class="chat-item-product">📦 ${listingTitle}</div>
        <div class="chat-item-preview">${lastMessage}</div>
      `;
      
      chatList.appendChild(div);
    });

  } catch (err) {
    console.error("❌ Error loading chats:", err);
    alert("Failed to load conversations. Please refresh the page.");
  }
}

// ✅ OPEN A SPECIFIC CHAT
async function openChat(listingId, userId, userName) {
  currentChatUserId = userId;
  currentListingId = listingId;

  console.log(`💬 Opening chat with ${userName} for listing ${listingId}`);

  // Show chat window
  document.getElementById('noChatSelected').classList.add('hidden');
  document.getElementById('chatHeader').classList.remove('hidden');
  document.getElementById('messagesBox').classList.remove('hidden');
  document.getElementById('messageInput').classList.remove('hidden');
  
  document.getElementById('chatUserName').innerText = userName;

  // ✅ JOIN CHAT ROOM via Socket.io
  if (socket && socket.connected) {
    socket.emit('join_chat', { 
      listingId: listingId, 
      recipientId: userId 
    });
  }

  // ✅ LOAD MESSAGE HISTORY
  await loadMessages(listingId, userId);
}

// ✅ LOAD MESSAGE HISTORY FROM DATABASE
async function loadMessages(listingId, userId) {
  const messagesBox = document.getElementById('messagesBox');
  messagesBox.innerHTML = '<p class="text-small" style="text-align:center; padding:10px;">Loading messages...</p>';

  try {
    console.log(`📩 Fetching messages for listing ${listingId} with user ${userId}`);
    
    const res = await fetch(`/api/chat/${listingId}/${userId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const messages = await res.json();
    console.log("✅ Loaded messages:", messages.length);

    messagesBox.innerHTML = '';

    if (Array.isArray(messages) && messages.length > 0) {
      messages.forEach(msg => {
        appendMessage(msg, msg.sender_id === currentUser.id);
      });
    } else {
      messagesBox.innerHTML = '<p class="text-small" style="text-align:center; padding:20px; color:#999;">No messages yet. Start the conversation!</p>';
    }
    
    scrollToBottom();

  } catch (err) {
    console.error("❌ Error loading messages:", err);
    messagesBox.innerHTML = '<p class="text-small" style="color:red; text-align:center; padding:20px;">Failed to load message history.</p>';
  }
}

// ✅ APPEND MESSAGE TO DISPLAY
function appendMessage(msg, isOwn) {
  const messagesBox = document.getElementById('messagesBox');
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isOwn ? 'own' : 'other'}`;
  
  const timestamp = new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  msgDiv.innerHTML = `
    <div class="message-content">
      <p>${escapeHtml(msg.content || msg.message || msg.text)}</p>
    </div>
    <div class="message-time">${timestamp}</div>
  `;
  
  messagesBox.appendChild(msgDiv);
}

// ✅ SEND MESSAGE
async function sendMessage() {
  const input = document.getElementById('msgInput');
  const content = input.value.trim();
  
  if (!content) {
    alert("Please type a message");
    return;
  }

  if (!currentChatUserId || !currentListingId) {
    alert("Please select a conversation first");
    return;
  }

  if (!socket || !socket.connected) {
    console.warn("⚠️ Socket not connected, attempting to send via REST API only");
  }

  try {
    console.log("📤 Sending message...");

    // ✅ SEND VIA REST API (Primary)
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        listingId: currentListingId,
        recipientId: currentChatUserId, 
        content: content
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const savedMsg = await res.json();
    console.log("✅ Message saved to database");

    // ✅ DISPLAY MESSAGE IMMEDIATELY
    appendMessage({
      content: content,
      sender_id: currentUser.id,
      timestamp: new Date().toISOString()
    }, true);

    // ✅ BROADCAST VIA SOCKET.IO (Real-time)
    if (socket && socket.connected) {
      socket.emit('send_message', {
        content: content,
        token: token,
        listingId: currentListingId,
        recipientId: currentChatUserId,
        sender: 'user'
      });
    }

    input.value = '';
    scrollToBottom();
    loadChats(); // Refresh inbox

  } catch (err) {
    console.error("❌ Error sending message:", err);
    alert("❌ Error sending message. Please try again.");
  }
}

// ✅ HANDLE ENTER KEY
function handleEnter(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendMessage();
  }
}

// ✅ FILTER CHATS BY SEARCH
function filterChats() {
  const searchInput = document.getElementById('searchChats').value.toLowerCase();
  const chatItems = document.querySelectorAll('.chat-item');

  chatItems.forEach(item => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(searchInput) ? 'block' : 'none';
  });
}

// ✅ TOGGLE CHAT INFO
function toggleChatInfo() {
  alert(`💬 Chatting with: ${document.getElementById('chatUserName').innerText}`);
}

// ✅ LOGOUT
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  }
}

// ✅ SCROLL TO BOTTOM
function scrollToBottom() {
  const messagesBox = document.getElementById('messagesBox');
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

// ✅ ESCAPE HTML (Prevent XSS)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ✅ INITIALIZE ON PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Page loaded, initializing chat...");
  console.log("👤 Current user:", currentUser);
  
  initializeSocket();
  loadChats();

  // ✅ REFRESH CHATS EVERY 30 SECONDS
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadChats();
    }
  }, 30000);
});

// ✅ REFRESH CHATS WHEN PAGE BECOMES VISIBLE
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log("👁️ Page is now visible, refreshing chats...");
    loadChats();
  }
});
