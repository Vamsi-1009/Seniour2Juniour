const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Rate Limiting
const rateLimiter = require('./middleware/rateLimiter');
app.use(rateLimiter(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('✅ Created uploads folder');
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/user', require('./routes/user'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/transactions', require('./routes/transactions'));

// Socket.io for real-time chat
const pool = require('./config/db');

// Enhanced Socket.io with typing indicators
const userSockets = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_chat', ({ listingId, userId }) => {
        socket.join(listingId);
        userSockets.set(userId, socket.id);
        console.log(`User ${userId} joined chat for listing ${listingId}`);

        // Notify online status
        io.to(listingId).emit('user_online', { userId });
    });

    socket.on('send_message', async (data) => {
        const { listingId, senderId, receiverId, message } = data;
        try {
            const result = await pool.query(
                'INSERT INTO messages (listing_id, sender_id, receiver_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
                [listingId, senderId, receiverId, message]
            );
            io.to(listingId).emit('new_message', result.rows[0]);
        } catch (error) {
            console.error('Message save error:', error);
        }
    });

    socket.on('typing', ({ room, userId }) => {
        socket.to(room).emit('user_typing', { userId });
    });

    socket.on('stopped_typing', ({ room }) => {
        socket.to(room).emit('user_stopped_typing');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Find and remove user from map
        for (let [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                break;
            }
        }
    });
});

// Serve frontend
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════╗
    ║   🎓 Academic Exchange Server       ║
    ║   Running on http://localhost:${PORT}  ║
    ╚══════════════════════════════════════╝
    `);
});
