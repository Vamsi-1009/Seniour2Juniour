const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Supabase client for storage
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Use memory storage — avatars go to Supabase Storage, not local disk
const upload = multer({
    storage: multer.memoryStorage(),
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
        const { name, email, location, bio } = req.body;

        // Check if new email already taken by another user
        if (email) {
            const existing = await pool.query(
                'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
                [email, req.user.user_id]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use by another account' });
            }
        }

        const result = await pool.query(
            'UPDATE users SET name = $1, email = COALESCE($2, email), location = $3, bio = $4 WHERE user_id = $5 RETURNING user_id, name, email, avatar, location, bio',
            [name, email || null, location, bio, req.user.user_id]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Public user info (for chat header — shows seller name/avatar)
router.get('/public/:userId', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT user_id, name, avatar FROM users WHERE user_id = $1',
            [req.params.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Upload avatar to Supabase Storage
        const filename = `avatars/${req.user.user_id}-${Date.now()}${path.extname(req.file.originalname)}`;
        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

        if (uploadError) throw new Error('Avatar upload failed: ' + uploadError.message);

        const { data } = supabase.storage.from('uploads').getPublicUrl(filename);
        const avatarUrl = data.publicUrl;

        await pool.query('UPDATE users SET avatar = $1 WHERE user_id = $2', [avatarUrl, req.user.user_id]);
        res.json({ success: true, avatar: avatarUrl });
    } catch (error) {
        console.error('Avatar upload error:', error);
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
