require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./config/db'); // Import the new Postgres DB
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
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)){ 
    fs.mkdirSync(uploadDir); 
    console.log("📂 Created root 'uploads' folder at:", uploadDir);
}

app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ 2. IMAGE STORAGE ENGINE
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
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

// --- LISTINGS ROUTES (Updated for PostgreSQL) ---

// GET ALL LISTINGS
app.get('/api/listings', async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT listings.*, users.username FROM listings JOIN users ON listings.user_id = users.id`);
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// CREATE LISTING
app.post('/api/listings', authenticateToken, upload.single('image'), async (req, res) => {
    const { title, price, description, branch, condition, is_exchange } = req.body;
    const imageUrl = req.file ? `uploads/${req.file.filename}` : null; 
    try {
        await db.query(
            `INSERT INTO listings (user_id, title, price, description, image_url, branch, condition, is_exchange) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
        const { rows } = await db.query("SELECT * FROM listings WHERE id = $1", [id]);
        const listing = rows[0];
        
        if (!listing) return res.status(404).json({ message: "Listing not found" });
        if (listing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        let imageUrl = listing.image_url;
        if (req.file) {
            imageUrl = `uploads/${req.file.filename}`;
            if (listing.image_url && fs.existsSync(path.join(process.cwd(), listing.image_url))) {
                try { fs.unlinkSync(path.join(process.cwd(), listing.image_url)); } catch(e) {}
            }
        }

        await db.query(
            `UPDATE listings SET title=$1, price=$2, description=$3, image_url=$4, branch=$5, condition=$6, is_exchange=$7 WHERE id=$8`,
            [title, price, description, imageUrl, branch, condition, is_exchange, id]
        );
        res.json({ message: "Listing updated successfully" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE LISTING
app.delete('/api/listings/:id', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM listings WHERE id = $1", [req.params.id]);
        const listing = rows[0];
        
        if (!listing) return res.status(404).json({ message: "Not found" });
        if (listing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        if (listing.image_url && fs.existsSync(path.join(process.cwd(), listing.image_url))) {
            try { fs.unlinkSync(path.join(process.cwd(), listing.image_url)); } catch(e) {}
        }
        
        await db.query("DELETE FROM listings WHERE id = $1", [req.params.id]);
        res.json({ message: "Listing deleted" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- PROFILE ROUTES ---
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { rows } = await db.query("SELECT id, username, email FROM users WHERE id = $1", [req.user.id]);
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    const { username, email, password } = req.body;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query("UPDATE users SET username = $1, email = $2, password_hash = $3 WHERE id = $4", [username, email, hashedPassword, req.user.id]);
        } else {
            await db.query("UPDATE users SET username = $1, email = $2 WHERE id = $3", [username, email, req.user.id]);
        }
        res.json({ message: "Profile updated successfully" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ✅ 5. DATABASE INIT (PostgreSQL Syntax)
async function initDB() {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'user')`);
        await db.query(`CREATE TABLE IF NOT EXISTS listings (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title TEXT, price REAL, description TEXT, image_url TEXT, branch TEXT, condition TEXT, is_exchange INTEGER)`);
        await db.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, room TEXT, sender_id INTEGER, sender_name TEXT, content TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

        // Check for Admin
        const { rows } = await db.query("SELECT * FROM users WHERE email = 'admin@example.com'");
        if (rows.length === 0) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await db.query("INSERT INTO users (username, email, password_hash, role) VALUES ('Super Admin', 'admin@example.com', $1, 'admin')", [hashedPassword]);
            console.log("👑 Admin Account Created");
        }
        console.log("✅ Database Tables Ready");
    } catch (err) {
        console.error("❌ Database Init Error:", err);
    }
}
initDB();

// ✅ 6. SOCKET.IO (PostgreSQL Syntax)
io.on('connection', (socket) => {
    socket.on('join_room', async ({ room }) => { 
        socket.join(room); 
        const { rows } = await db.query("SELECT * FROM messages WHERE room = $1 ORDER BY id ASC", [room]); 
        socket.emit('load_history', rows); 
    });

    socket.on('send_message', async (data) => { 
        const { room, sender_id, sender_name, content } = data; 
        await db.query("INSERT INTO messages (room, sender_id, sender_name, content) VALUES ($1, $2, $3, $4)", [room, sender_id, sender_name, content]); 
        io.to(room).emit('receive_message', data); 
    });

    socket.on('get_inbox', async (userId) => {
        const { rows } = await db.query("SELECT * FROM messages WHERE room LIKE $1 OR room LIKE $2 ORDER BY id DESC", [`%_${userId}`, `%_${userId}_%`]);
        
        const inbox = [];
        const processedRooms = new Set();

        for (const msg of rows) {
            if (processedRooms.has(msg.room)) continue;
            
            const parts = msg.room.split('_'); 
            const otherId = parseInt(parts[1]) == userId ? parseInt(parts[2]) : parseInt(parts[1]);

            const userRes = await db.query("SELECT username FROM users WHERE id = $1", [otherId]);
            if (userRes.rows.length > 0) {
                inbox.push({
                    otherId: otherId,
                    name: userRes.rows[0].username,
                    lastMsg: msg.content
                });
            }
            processedRooms.add(msg.room);
        }
        socket.emit('inbox_data', inbox);
    });
});

app.get('/ping', (req, res) => res.send('Server is awake!'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
