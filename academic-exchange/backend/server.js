require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);

// ✅ ALLOW ALL ORIGINS
const io = new Server(server, { 
    cors: { origin: "*" } 
});

const SECRET_KEY = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// ✅ 1. SETUP UPLOADS FOLDER
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){ 
    fs.mkdirSync(uploadDir); 
    console.log("📂 Created 'uploads' folder successfully.");
}

app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ 2. IMAGE STORAGE ENGINE
const storage = multer.diskStorage({
    destination: (req, file, cb) => { 
        // ✅ USE THE VARIABLE 'uploadDir' WE CREATED EARLIER
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => { 
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')); 
    }
});
const upload = multer({ storage });

// ✅ 3. ROUTES
app.use('/api/auth', require('./routes/auth_routes'));
app.use('/api/users', require('./routes/user_routes'));

// ✅ 4. AUTH MIDDLEWARE
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: "Access Denied: No Token" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid Token" });
        req.user = user;
        next();
    });
};

// --- LISTINGS ROUTES ---

// GET ALL LISTINGS
app.get('/api/listings', async (req, res) => {
    try {
        const db = await connectDB();
        const listings = await db.all(`SELECT listings.*, users.username FROM listings JOIN users ON listings.user_id = users.id`);
        res.json(listings);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// CREATE LISTING
app.post('/api/listings', authenticateToken, upload.single('image'), async (req, res) => {
    const { title, price, description, branch, condition, is_exchange } = req.body;
    const imageUrl = req.file ? `uploads/${req.file.filename}` : null; 
    try {
        const db = await connectDB();
        await db.run(
            `INSERT INTO listings (user_id, title, price, description, image_url, branch, condition, is_exchange) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title, price, description, imageUrl, branch, condition, is_exchange]
        );
        res.status(201).json({ message: "Listing created" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// UPDATE LISTING
app.put('/api/listings/:id', authenticateToken, upload.single('image'), async (req, res) => {
    const { title, price, description, branch, condition, is_exchange } = req.body;
    const { id } = req.params;
    try {
        const db = await connectDB();
        const listing = await db.get("SELECT * FROM listings WHERE id = ?", [id]);
        
        if (!listing) return res.status(404).json({ message: "Listing not found" });
        if (listing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        let imageUrl = listing.image_url;
        if (req.file) {
            imageUrl = `uploads/${req.file.filename}`;
            if (listing.image_url && fs.existsSync(path.join(__dirname, listing.image_url))) {
                try { fs.unlinkSync(path.join(__dirname, listing.image_url)); } catch(e) {}
            }
        }

        await db.run(
            `UPDATE listings SET title=?, price=?, description=?, image_url=?, branch=?, condition=?, is_exchange=? WHERE id=?`,
            [title, price, description, imageUrl, branch, condition, is_exchange, id]
        );
        res.json({ message: "Listing updated successfully" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE LISTING
app.delete('/api/listings/:id', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const listing = await db.get("SELECT * FROM listings WHERE id = ?", [req.params.id]);
        
        if (!listing) return res.status(404).json({ message: "Not found" });
        if (listing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        if (listing.image_url && fs.existsSync(path.join(__dirname, listing.image_url))) {
            try { fs.unlinkSync(path.join(__dirname, listing.image_url)); } catch(e) {}
        }
        
        await db.run("DELETE FROM listings WHERE id = ?", [req.params.id]);
        res.json({ message: "Listing deleted" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- PROFILE ROUTES ---
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const user = await db.get("SELECT id, username, email FROM users WHERE id = ?", [req.user.id]);
        res.json(user);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const db = await connectDB();
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.run("UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?", [username, email, hashedPassword, req.user.id]);
        } else {
            await db.run("UPDATE users SET username = ?, email = ? WHERE id = ?", [username, email, req.user.id]);
        }
        res.json({ message: "Profile updated successfully" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ✅ 5. DATABASE INIT
async function initDB() {
    const db = await connectDB();
    await db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'user')`);
    await db.exec(`CREATE TABLE IF NOT EXISTS listings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, price REAL, description TEXT, image_url TEXT, FOREIGN KEY(user_id) REFERENCES users(id))`);
    await db.exec(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, sender_id INTEGER, sender_name TEXT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);

    const newColumns = ['branch TEXT', 'condition TEXT', 'is_exchange INTEGER'];
    for (const sql of newColumns) { try { await db.exec(`ALTER TABLE listings ADD COLUMN ${sql}`); } catch (e) {} }

    const adminExists = await db.get("SELECT * FROM users WHERE email = 'admin@example.com'");
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await db.run("INSERT INTO users (username, email, password_hash, role) VALUES ('Super Admin', 'admin@example.com', ?, 'admin')", [hashedPassword]);
    }
    console.log("✅ Database Ready");
}
initDB();

// ✅ 6. SOCKET.IO
io.on('connection', (socket) => {
    socket.on('join_room', async ({ room }) => { 
        socket.join(room); 
        const db = await connectDB(); 
        const history = await db.all("SELECT * FROM messages WHERE room = ? ORDER BY id ASC", [room]); 
        socket.emit('load_history', history); 
    });
    socket.on('send_message', async (data) => { 
        const { room, sender_id, sender_name, content } = data; 
        const db = await connectDB(); 
        await db.run("INSERT INTO messages (room, sender_id, sender_name, content) VALUES (?, ?, ?, ?)", [room, sender_id, sender_name, content]); 
        io.to(room).emit('receive_message', data); 
    });
});

// ✅ Add this simple check instead
app.get('/ping', (req, res) => {
    res.send('Server is awake!');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
