const router = require('express').Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// --- Middleware: Verify Admin ---
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'secret', async (err, user) => {
        if (err) return res.sendStatus(403);
        
        try {
            // Double-check role in Database (Security Best Practice)
            const dbUser = await pool.query('SELECT role FROM users WHERE user_id = $1', [user.user_id]);
            if (dbUser.rows.length === 0 || dbUser.rows[0].role !== 'admin') {
                return res.status(403).json({ error: "Access Denied: Admins Only" });
            }
            req.user = user; // Attach user info to request
            next();
        } catch (error) {
            console.error("Admin Auth Error:", error);
            return res.sendStatus(500);
        }
    });
}

// 1. GET SYSTEM STATS
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const users = await pool.query('SELECT COUNT(*) FROM users');
        const listings = await pool.query("SELECT COUNT(*) FROM listings WHERE status != 'sold'");
        const sold = await pool.query("SELECT COUNT(*) FROM listings WHERE status = 'sold'");
        
        res.json({
            total_users: parseInt(users.rows[0].count),
            total_listings: parseInt(listings.rows[0].count),
            total_sold: parseInt(sold.rows[0].count)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 2. GET ALL USERS
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 3. DELETE USER (Ban) -- FIXED
router.delete('/user/:id', authenticateAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // STEP 1: Delete all listings belonging to this user FIRST
        // (This prevents "Foreign Key Constraint" errors)
        await pool.query('DELETE FROM listings WHERE user_id = $1', [userId]);

        // STEP 2: Delete the user
        await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);

        res.json({ message: "User and all their listings were banned/deleted." });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
