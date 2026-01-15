const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ✅ Import DB directly

// GET ALL USERS
router.get('/', async (req, res) => {
    try {
        const result = await db.query("SELECT id, username, email, role FROM users");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
