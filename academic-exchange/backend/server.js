const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./config/db'); 
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 1. Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. API Routes
app.use('/auth', require('./routes/auth'));
app.use('/listings', require('./routes/listings'));
app.use('/user', require('./routes/user'));
app.use('/wishlist', require('./routes/wishlist'));
app.use('/messages', require('./routes/messages'));
app.use('/admin', require('./routes/admin'));

// 3. Socket.io Logic (Chat)
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    // console.log(`User Connected: ${socket.id}`); // Optional: Uncomment for debugging

    socket.on('join_room', (room) => {
        socket.join(room);
    });

    socket.on('send_message', async (data) => {
        // Send to others in the room
        socket.to(data.room).emit('receive_message', data);

        // Save to Database
        try {
            await pool.query(
                'INSERT INTO messages (listing_id, sender_id, content) VALUES ($1, $2, $3)',
                [data.room, data.author, data.message]
            );
        } catch (err) {
            console.error("Error saving message:", err.message);
        }
    });

    socket.on('disconnect', () => {
        // console.log('User Disconnected', socket.id);
    });
});

// ==========================================
// 4. SMART FRONTEND SERVING
// ==========================================

// Check two possible locations for the frontend
let frontendPath = path.join(__dirname, 'frontend'); // Option A: Inside backend
if (!fs.existsSync(frontendPath)) {
    console.log("Frontend not found inside backend. Checking sibling folder...");
    frontendPath = path.join(__dirname, '../frontend'); // Option B: Next to backend
}

console.log("SERVING FRONTEND FROM:", frontendPath);

if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    
    // Serve index.html for any unknown route (SPA Support)
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    console.error("CRITICAL ERROR: Frontend folder not found in any expected location!");
    app.get('*', (req, res) => res.send("Frontend folder missing. Check server logs."));
}
// ==========================================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
