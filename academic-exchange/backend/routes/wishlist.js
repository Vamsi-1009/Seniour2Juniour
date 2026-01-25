const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware
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

// 1. TOGGLE WISHLIST (Add or Remove)
router.post('/toggle/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params; // Listing ID
        const userId = req.user.user_id;

        // Check if already in wishlist
        const check = await pool.query(
            'SELECT * FROM wishlist WHERE user_id = $1 AND listing_id = $2',
            [userId, id]
        );

        if (check.rows.length > 0) {
            // Already exists -> Remove it
            await pool.query('DELETE FROM wishlist WHERE user_id = $1 AND listing_id = $2', [userId, id]);
            res.json({ status: 'removed' });
        } else {
            // Doesn't exist -> Add it
            await pool.query('INSERT INTO wishlist (user_id, listing_id) VALUES ($1, $2)', [userId, id]);
            res.json({ status: 'added' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 2. GET MY WISHLIST IDs (To show red hearts)
router.get('/ids', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT listing_id FROM wishlist WHERE user_id = $1', [req.user.user_id]);
        const ids = result.rows.map(row => row.listing_id);
        res.json(ids);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 3. GET FULL WISHLIST ITEMS (For Profile)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.* FROM listings l 
             JOIN wishlist w ON l.listing_id = w.listing_id 
             WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
