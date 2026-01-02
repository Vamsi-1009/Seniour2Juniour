/* ===========================
   SERVER.JS - Academic Exchange
   Full Socket.io + Express Integration
   =========================== */

const PORT = process.env.PORT || 5000;
const dotenv = require("dotenv");
dotenv.config();

const express = require('express');
const http = require("http");
const path = require("path");
const app = require("./app"); // Import the Express app setup
const server = http.createServer(app);

const db = require("./config/db");
const chatController = require("./controllers/chatController"); // Updated controller

// ✅ Initialize Socket.io with CORS settings
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (Change this to your frontend URL in production)
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

// ✅ Attach IO instance to app (Optional: allows accessing io in routes)
app.io = io;

// ✅ Pass IO instance to Chat Controller
// This initializes the socket listeners defined in your controller
chatController.handleSocketConnection(io);

// ✅ Log Socket.io connections for debugging
io.on("connection", (socket) => {
  console.log(`\n✅ New Socket.io connection: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`⚠️ Socket disconnected: ${socket.id}\n`);
  });
});

// ✅ Test Route for Status
app.get("/api/status", (req, res) => {
  res.json({
    status: "Server is running",
    socketio: "Connected",
    timestamp: new Date().toISOString()
  });
});

// ✅ Global Error Handler for Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
  // process.exit(1); // Optional: Restart server if critical
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Rejection at:", promise, "reason:", reason);
});

// ✅ Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("\n📛 SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    // db.end(); // Close DB connection if using mysql/pg
    process.exit(0);
  });
});

// ✅ Start Server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔═════════════════════════════════════════════════╗
║     🚀 ACADEMIC EXCHANGE SERVER STARTED         ║
╚═════════════════════════════════════════════════╝

  📍 URL:           http://localhost:${PORT}
  💬 Socket.io:     Enabled ✅
  🗄️  Database:      SQLite3 ✅
  🌐 CORS:          Enabled (All origins)
  
╔═════════════════════════════════════════════════╗
`);
});

module.exports = { app, server, io };
