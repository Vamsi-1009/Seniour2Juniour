require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs'); // To manage folders

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const SECRET_KEY = "supersecretkey"; 

app.use(cors());
app.use(express.json());

// ✅ LOCAL STORAGE SETUP
// 1. Create 'uploads' folder if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// 2. Tell Server to show these files to the public
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../frontend')));

// 3. Configure Multer to save to Disk
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Unique name: timestamp-filename.jpg
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage });

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: "Access Denied" });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid Token" });
        req.user = user;
        next();
    });
};

// --- LISTINGS ROUTES ---
app.get('/api/listings', async (req, res) => {
    try {
        const db = await connectDB();
        const listings = await db.all(`SELECT listings.*, users.username FROM listings JOIN users ON listings.user_id = users.id`);
        res.json(listings);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/listings', authenticateToken, upload.single('image'), async (req, res) => {
    // ✅ Phase 1: Capturing new fields
    const { title, price, description, branch, condition, is_exchange } = req.body;
    
    // ✅ Save Local Path (e.g. "uploads/123-book.jpg")
    const imageUrl = req.file ? `uploads/${req.file.filename}` : null; 

    try {
        const db = await connectDB();
        await db.run(
            `INSERT INTO listings (user_id, title, price, description, image_url, branch, condition, is_exchange) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title, price, description, imageUrl, branch, condition, is_exchange]
        );
        res.status(201).json({ message: "Listing created" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/listings/:id', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const listing = await db.get("SELECT * FROM listings WHERE id = ?", [req.params.id]);
        if (!listing) return res.status(404).json({ message: "Not found" });
        if (listing.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });
        
        // Optional: Delete local file
        if (listing.image_url) {
            const filePath = path.join(__dirname, listing.image_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await db.run("DELETE FROM listings WHERE id = ?", [req.params.id]);
        res.json({ message: "Listing deleted" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- DB INIT (Safe Migration) ---
async function initDB() {
    const db = await connectDB();
    await db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'user')`);
    await db.exec(`CREATE TABLE IF NOT EXISTS listings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, price REAL, description TEXT, image_url TEXT, FOREIGN KEY(user_id) REFERENCES users(id))`);
    await db.exec(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, sender_id INTEGER, sender_name TEXT, content TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    
    // ✅ Add new columns if they don't exist
    const newColumns = ['branch TEXT', 'condition TEXT', 'is_exchange INTEGER'];
    for (const sql of newColumns) {
        try { await db.exec(`ALTER TABLE listings ADD COLUMN ${sql}`); } catch (e) {}
    }
    console.log("✅ Database Ready (Local Storage + Phase 1 Features)");
}
initDB();

// Chat
io.on('connection', (socket) => {
    socket.on('join_room', async ({ room }) => { socket.join(room); const db = await connectDB(); const history = await db.all("SELECT * FROM messages WHERE room = ? ORDER BY id ASC", [room]); socket.emit('load_history', history); });
    socket.on('send_message', async (data) => { const { room, sender_id, sender_name, content } = data; const db = await connectDB(); await db.run("INSERT INTO messages (room, sender_id, sender_name, content) VALUES (?, ?, ?, ?)", [room, sender_id, sender_name, content]); io.to(room).emit('receive_message', data); });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
