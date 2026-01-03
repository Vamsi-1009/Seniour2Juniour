/* ========================================
   COMPLETE WORKING SERVER.JS - Paste idi motham!
   Academic Exchange + Auth + Socket.io + Listings
   ======================================== */

const PORT = process.env.PORT || 5000;
const dotenv = require("dotenv");
dotenv.config();

const express = require('express');
const http = require("http");
const path = require("path");

// NEW: Auth dependencies
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. Create MAIN app
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 2. SQLite DB for AUTH + PRODUCTS
const db = new sqlite3.Database('./academic.db');

// Create tables
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  email TEXT UNIQUE, 
  password TEXT, 
  role TEXT DEFAULT 'user'
)`);

db.run(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  title TEXT, price REAL, type TEXT, image TEXT
)`);

// Test data
db.run("INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)", 
  ['test@example.com', bcrypt.hashSync('password123', 10), 'user']
);
db.run("INSERT OR IGNORE INTO products VALUES (1, 'Test Book', 100, 'sell', '/uploads/demo.jpg')");

// 3. AUTH ROUTES
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, 'secret');
    res.json({ token, role: user.role });
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (email, password) VALUES (?, ?)', 
    [email, hashed], function(err) {
      if (err) return res.json({ message: 'Email exists' });
      res.json({ message: 'Registered successfully' });
    });
});

// 4. PRODUCTS ROUTE (for index.html app.js)
app.get('/api/listings', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    res.json(rows || []);
  });
});

// 5. HTTP Server + Socket.io
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Socket connection
io.on("connection", (socket) => {
  console.log(`✅ New Socket.io connection: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`⚠️ Socket disconnected: ${socket.id}`);
  });
});

// Status check
app.get("/api/status", (req, res) => {
  res.json({ status: "Server running ✅", timestamp: new Date().toISOString() });
});

// 6. Start Server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  🚀 ACADEMIC EXCHANGE - COMPLETE SERVER READY!       ║
╚══════════════════════════════════════════════════════╝

📍 URL:           http://localhost:${PORT}
🔐 Login:         test@example.com / password123
📦 Products:      /api/listings
💬 Socket.io:     http://localhost:${PORT}
🗄️  DB:           academic.db (SQLite)

TEST: http://localhost:${PORT}/login.html
    `);
});
