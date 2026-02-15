const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const supabase = require('../config/supabaseClient');

// --- Multer Setup (Avatar Upload - Memory Storage for Supabase) ---
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // 2MB limit
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(file.originalname.toLowerCase().split('.').pop());
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

// 2. UPDATE AVATAR (Now uploads to Supabase)
router.put('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }

        // Generate unique filename
        const fileName = `avatar-${req.user.user_id}-${Date.now()}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase
            .storage
            .from('uploads')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype
            });

        if (error) {
            console.error("Supabase Upload Error:", error);
            return res.status(500).json({ error: "Failed to upload avatar" });
        }

        // Get public URL
        const { data: publicData } = supabase
            .storage
            .from('uploads')
            .getPublicUrl(fileName);

        const avatarUrl = publicData.publicUrl;

        // Update database with Supabase URL
        await pool.query('UPDATE users SET avatar = $1 WHERE user_id = $2', [avatarUrl, req.user.user_id]);

        res.json({ avatar: avatarUrl, message: 'Avatar updated!' });
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
