const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({
    storage: multer.diskStorage({
        destination: './uploads/',
        filename: (req, file, cb) => cb(null, 'avatar-' + Date.now() + path.extname(file.originalname))
    }),
    limits: { fileSize: 2 * 1024 * 1024 }
});

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT user_id, name, email, role, avatar, location, bio FROM users WHERE user_id = $1', [req.user.user_id]);
        const listings = await pool.query('SELECT * FROM listings WHERE user_id = $1 ORDER BY created_at DESC', [req.user.user_id]);
        res.json({ success: true, user: user.rows[0], listings: listings.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, location, bio } = req.body;
        const result = await pool.query(
            'UPDATE users SET name = $1, location = $2, bio = $3 WHERE user_id = $4 RETURNING user_id, name, email, avatar, location, bio',
            [name, location, bio, req.user.user_id]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const avatarUrl = '/uploads/' + req.file.filename;
        await pool.query('UPDATE users SET avatar = $1 WHERE user_id = $2', [avatarUrl, req.user.user_id]);
        res.json({ success: true, avatar: avatarUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// Change Password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const bcrypt = require('bcrypt');

        // Get current user
        const userResult = await pool.query('SELECT password FROM users WHERE user_id = $1', [req.user.user_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);

        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.query('UPDATE users SET password = $1 WHERE user_id = $2', [hashedPassword, req.user.user_id]);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
