const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await pool.query('SELECT COUNT(*) FROM users');
        const listings = await pool.query('SELECT COUNT(*) FROM listings WHERE status = $1', ['active']);
        const sold = await pool.query('SELECT COUNT(*) FROM listings WHERE status = $1', ['sold']);
        res.json({
            success: true,
            total_users: parseInt(users.rows[0].count),
            total_listings: parseInt(listings.rows[0].count),
            total_sold: parseInt(sold.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT user_id, name, email, role, created_at, is_active FROM users ORDER BY created_at DESC');
        res.json({ success: true, users: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
