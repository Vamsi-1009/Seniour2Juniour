require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./config/db'); 
const fs = require('fs');

// Route Imports
const authRoutes = require('./routes/auth_routes');
const userRoutes = require('./routes/user_routes');
const listingRoutes = require('./routes/listingroutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, { 
    cors: { origin: "*" } 
});

app.use(cors());
app.use(express.json());

// ✅ 1. SETUP UPLOADS FOLDER
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

// ✅ 2. SERVE FRONTEND (Corrected Path Logic)
// Try to find the frontend folder in common locations
let frontendPath = path.join(__dirname, '../frontend');
if (!fs.existsSync(frontendPath)) frontendPath = path.join(__dirname, '../client');

console.log(`📂 Serving Frontend from: ${frontendPath}`);
app.use(express.static(frontendPath));

// ✅ 4. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);

// ✅ 5. CATCH-ALL ROUTE (Fixes "Cannot GET /")
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`<h1>Backend is Running!</h1><p>But index.html was not found at: ${indexPath}</p>`);
    }
});

// ✅ 6. DATABASE INIT
async function initDB() {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'user')`);
        await db.query(`CREATE TABLE IF NOT EXISTS listings (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title TEXT, price REAL, description TEXT, image_url TEXT, branch TEXT, condition TEXT, is_exchange INTEGER)`);
        await db.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, room TEXT, sender_id INTEGER, sender_name TEXT, content TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        console.log("✅ Database Tables Ready");
    } catch (err) { console.error("❌ DB Init Error:", err); }
}
initDB();

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
