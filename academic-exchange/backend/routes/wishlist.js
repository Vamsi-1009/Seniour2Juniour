const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, u.name as seller_name, w.created_at as added_at
            FROM wishlist w
            JOIN listings l ON w.listing_id = l.listing_id
            JOIN users u ON l.user_id = u.user_id
            WHERE w.user_id = $1
            ORDER BY w.created_at DESC
        `, [req.user.user_id]);
        res.json({ success: true, wishlist: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
});

router.post('/:listingId', authenticateToken, async (req, res) => {
    try {
        const check = await pool.query('SELECT * FROM wishlist WHERE user_id = $1 AND listing_id = $2', [req.user.user_id, req.params.listingId]);
        if (check.rows.length > 0) {
            await pool.query('DELETE FROM wishlist WHERE user_id = $1 AND listing_id = $2', [req.user.user_id, req.params.listingId]);
            res.json({ success: true, action: 'removed' });
        } else {
            await pool.query('INSERT INTO wishlist (user_id, listing_id) VALUES ($1, $2)', [req.user.user_id, req.params.listingId]);
            res.json({ success: true, action: 'added' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update wishlist' });
    }
});

module.exports = router;
