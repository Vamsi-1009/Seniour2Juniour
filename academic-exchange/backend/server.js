require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); 
const { Server } = require('socket.io'); 
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listingRoutes');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);

// --- 🛠️ DATABASE INITIALIZATION (The Fix) ---
async function initDB() {
    try {
        const db = await connectDB();
        
        // 1. Create USERS Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT DEFAULT 'user'
            )
        `);

        // 2. Create LISTINGS Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT,
                price REAL,
                description TEXT,
                image_url TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

        // 3. Create MESSAGES Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room TEXT,
                sender_id INTEGER,
                sender_name TEXT,
                content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("✅ Database Tables Verified/Created!");
    } catch (error) {
        console.error("❌ Database Init Failed:", error);
    }
}
initDB();

// --- 💬 CHAT SYSTEM ---
io.on('connection', (socket) => {
    console.log('⚡ Client Connected:', socket.id);

    socket.on('join_room', async ({ room }) => {
        socket.join(room);
        const db = await connectDB();
        const history = await db.all("SELECT * FROM messages WHERE room = ? ORDER BY id ASC", [room]);
        socket.emit('load_history', history);
    });

    // GET INBOX
    socket.on('get_inbox', async (userId) => {
        if (!userId) return socket.emit('inbox_data', []);
        
        try {
            const db = await connectDB();
            const allRooms = await db.all("SELECT DISTINCT room FROM messages");
            const myChats = [];
            const targetId = parseInt(userId);

            for (const r of allRooms) {
                const parts = r.room.split('_');
                if (parts.length < 3) continue; 
                const u1 = parseInt(parts[1]);
                const u2 = parseInt(parts[2]);
                if (isNaN(u1) || isNaN(u2)) continue;

                if (u1 === targetId || u2 === targetId) {
                    const otherId = (u1 === targetId) ? u2 : u1;
                    const otherUser = await db.get("SELECT username FROM users WHERE id = ?", [otherId]);
                    const lastMsg = await db.get("SELECT content, timestamp FROM messages WHERE room = ? ORDER BY id DESC LIMIT 1", [r.room]);

                    if (otherUser) {
                        myChats.push({
                            otherId: otherId,
                            name: otherUser.username,
                            lastMsg: lastMsg ? lastMsg.content : "Start chatting...",
                            time: lastMsg ? lastMsg.timestamp : ""
                        });
                    }
                }
            }
            socket.emit('inbox_data', myChats);
        } catch (err) {
            console.error(err);
            socket.emit('inbox_data', []);
        }
    });

    socket.on('send_message', async (data) => {
        const { room, sender_id, sender_name, content } = data;
        const db = await connectDB();
        await db.run("INSERT INTO messages (room, sender_id, sender_name, content) VALUES (?, ?, ?, ?)", [room, sender_id, sender_name, content]);
        io.to(room).emit('receive_message', data);
    });
});

const PORT = process.env.PORT || 5000;
// Find your server.listen line and change it to this:
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is live for mobile at http://172.20.10.2:${PORT}`);
});
