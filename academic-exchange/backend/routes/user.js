const express = require('express');
const router = express.Router();
// NOTE: Ensure this path points to your actual db.js file. 
// If your db.js is in the root of 'backend', use require('../db');
// If it is in a 'config' folder, use require('../config/db');
const pool = require('../config/db'); 
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

// --- Middleware: Verify Token ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- Multer Setup (Avatar Upload) ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // 2MB limit
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb('Error: Images Only!');
    }
});

// --- ROUTES ---

// 1. GET MY PROFILE (Info + My Listings)
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Get User Info
        const user = await pool.query('SELECT user_id, name, email, avatar FROM users WHERE user_id = $1', [req.user.user_id]);
        
        // Get User's Listings
        const listings = await pool.query('SELECT * FROM listings WHERE user_id = $1 ORDER BY created_at DESC', [req.user.user_id]);

        res.json({
            user: user.rows[0],
            listings: listings.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 2. UPDATE AVATAR
router.put('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }

        const avatarPath = `/uploads/${req.file.filename}`;
        
        await pool.query('UPDATE users SET avatar = $1 WHERE user_id = $2', [avatarPath, req.user.user_id]);

        res.json({ avatar: avatarPath, message: 'Avatar updated!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 3. UPDATE USER NAME (Profile Details)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: "Name is required" });
        }

        await pool.query('UPDATE users SET name = $1 WHERE user_id = $2', [name, req.user.user_id]);
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
