const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // ✅ Import the DB directly (No need to call connectDB())

const SECRET_KEY = process.env.JWT_SECRET;

// REGISTER
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check if user exists
        const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        await db.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
