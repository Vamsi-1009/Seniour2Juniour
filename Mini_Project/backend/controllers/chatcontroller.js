/* ===========================
   CHAT CONTROLLER - Academic Exchange
   Full Socket.io + REST API Support
   =========================== */

const Chat = require("../models/Chat");
const Message = require("../models/Message");
const jwt = require("jsonwebtoken");

/* =================================================
   SOCKET.IO HANDLER (Real-time Messaging)
   Initialize this in your server.js
   ================================================= */

exports.handleSocketConnection = (io) => {
  io.on("connection", (socket) => {
    console.log("✅ User connected via Socket.io:", socket.id);

    // ✅ JOIN CHAT ROOM
    socket.on("join_chat", (data) => {
      const { listingId, recipientId } = data;
      const roomId = `chat_${listingId}_${recipientId}`;
      
      socket.join(roomId);
      console.log(`✅ User ${socket.id} joined room: ${roomId}`);
      
      socket.emit("room_joined", { 
        status: "ok", 
        message: "Joined chat room" 
      });
    });

    // ✅ SEND MESSAGE EVENT (Real-time)
    socket.on("send_message", async (data, callback) => {
      const { content, token, listingId, recipientId, sender } = data;

      if (!content || !token) {
        console.error("❌ Missing content or token");
        if (callback) callback({ status: "error", message: "Invalid data" });
        return;
      }

      try {
        // Verify JWT Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        const senderId = decoded.id;

        console.log(`📤 Sending message from ${senderId} to ${recipientId} for listing ${listingId}`);

        // Save message to database
        const messageData = {
          listing_id: listingId || null,
          sender_id: senderId,
          receiver_id: recipientId || null,
          message: content,
          timestamp: new Date().toISOString(),
        };

        Chat.sendMessage(messageData, (err, result) => {
          if (err) {
            console.error("❌ Failed to save message:", err);
            if (callback) callback({ status: "error", message: "Database error" });
            return;
          }

          console.log("✅ Message saved to DB:", result);

          // ✅ Broadcast message to room
          const roomId = `chat_${listingId}_${recipientId}`;
          const broadcastData = {
            sender: sender || "user",
            senderName: decoded.username || "User",
            content: content,
            message: content, // Keep both for compatibility
            text: content,
            timestamp: new Date().toISOString(),
            sender_id: senderId,
            receiver_id: recipientId,
          };

          // Emit to everyone in the room
          io.to(roomId).emit("receive_message", broadcastData);

          // Acknowledge sender
          if (callback) callback({ status: "ok" });

          console.log("📤 Message broadcast to room:", roomId);
        });
      } catch (error) {
        console.error("❌ Token verification failed:", error.message);
        if (callback) callback({ status: "error", message: "Invalid token" });
      }
    });

    // ✅ USER DISCONNECT EVENT
    socket.on("disconnect", () => {
      console.log("⚠️ User disconnected:", socket.id);
    });
  });
};

/* =================================================
   REST API: SEND MESSAGE (Buyer ↔ Seller)
   Route: POST /api/chat/send
   Body: { listingId, recipientId, message }
   ================================================= */

exports.sendMessage = (req, res) => {
  const { listingId, recipientId, content, message } = req.body;
  const messageText = content || message; // Support both field names

  if (!recipientId || !messageText) {
    return res.status(400).json({
      error: "Missing required fields: recipientId, message/content",
    });
  }

  const messageData = {
    listing_id: listingId || null,
    sender_id: req.user.id,
    receiver_id: recipientId,
    message: messageText,
    timestamp: new Date().toISOString(),
  };

  Chat.sendMessage(messageData, (err, result) => {
    if (err) {
      console.error("❌ Error sending message:", err);
      return res.status(500).json({
        error: "Failed to send message",
      });
    }

    console.log("✅ Message sent and saved to DB");
    res.json({
      success: true,
      message: "Message sent successfully",
      id: result.insertId || result.id,
      sender_id: req.user.id,
      receiver_id: recipientId,
      content: messageText,
      timestamp: new Date().toISOString(),
    });
  });
};

/* =================================================
   REST API: GET CHAT BETWEEN TWO USERS
   Route: GET /api/chat/:listingId/:otherUserId
   ================================================= */

exports.getChat = (req, res) => {
  const { listingId, otherUserId } = req.params;
  const userId = req.user.id;

  console.log(`📩 Fetching chat for listing ${listingId} between ${userId} and ${otherUserId}`);

  Chat.getChat(listingId, userId, otherUserId, (err, rows) => {
    if (err) {
      console.error("❌ Error loading chat:", err);
      return res.status(500).json({
        error: "Failed to load chat",
      });
    }

    if (!rows || rows.length === 0) {
      console.log("⚠️ No messages found, returning empty array");
      return res.json([]);
    }

    console.log("✅ Found messages:", rows.length);
    res.json(rows);
  });
};

/* =================================================
   REST API: GET ALL CHAT THREADS (INBOX)
   Route: GET /api/chat
   ================================================= */

exports.getMyChats = (req, res) => {
  const userId = req.user.id;

  console.log("📥 Fetching all chats for user:", userId);

  Chat.getMyChats(userId, (err, rows) => {
    if (err) {
      console.error("❌ Error loading inbox:", err);
      return res.status(500).json({
        error: "Failed to load chats",
      });
    }

    if (!rows || rows.length === 0) {
      console.log("⚠️ No chats found");
      return res.json([]);
    }

    console.log("✅ Found chats:", rows.length);
    res.json(rows);
  });
};

/* =================================================
   REST API: DELETE CHAT THREAD
   Route: DELETE /api/chat/:listingId/:otherUserId
   ================================================= */

exports.deleteChat = (req, res) => {
  const { listingId, otherUserId } = req.params;
  const userId = req.user.id;

  console.log(`🗑️ Deleting chat for listing ${listingId}`);

  Chat.deleteChat(listingId, userId, otherUserId, (err) => {
    if (err) {
      console.error("❌ Error deleting chat:", err);
      return res.status(500).json({
        error: "Failed to delete chat",
      });
    }

    console.log("✅ Chat deleted successfully");
    res.json({ 
      success: true,
      message: "Chat deleted successfully" 
    });
  });
};
