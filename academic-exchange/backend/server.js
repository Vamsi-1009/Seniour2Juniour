require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./config/db'); 
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const io = new Server(server, { 
    cors: { origin: "*" } 
});

const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

app.use(cors());
app.use(express.json());

// ✅ 1. SETUP UPLOADS FOLDER
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

// ✅ 2. SERVE FRONTEND (This is the fix!)
// This tells the server: "Look in the frontend folder for the website"
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ 3. STORAGE ENGINE
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// ✅ 4. API ROUTES
app.use('/api/auth', require('./routes/auth_routes'));
app.use('/api/users', require('./routes/user_routes'));

// Listings Route
app.get('/api/listings', async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT listings.*, users.username FROM listings JOIN users ON listings.user_id = users.id`);
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/listings', upload.single('image'), async (req, res) => {
    try {
        const { title, price, description, branch, condition, is_exchange } = req.body;
        const imageUrl = req.file ? `uploads/${req.file.filename}` : null;
        await db.query(
            `INSERT INTO listings (user_id, title, price, description, image_url, branch, condition, is_exchange) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [1, title, price, description, imageUrl, branch, condition, is_exchange]
        );
        res.status(201).json({ message: "Listing created" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ✅ 5. CATCH-ALL ROUTE (Fixes "Cannot GET /")
// If the user goes to any page, give them the index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
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
