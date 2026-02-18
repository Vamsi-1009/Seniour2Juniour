const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(express.json());
// Images are stored in Supabase Storage — no local uploads folder needed

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/user', require('./routes/user'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/admin', require('./routes/admin'));

// Socket.io for real-time chat
io.on('connection', (socket) => {
    // User joins their own room for receiving DMs
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined socket room`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
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
