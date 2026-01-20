const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); 

const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

// ✅ REGISTER ROUTE
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // 1. Check if user exists
        const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) return res.status(400).json({ message: "User already exists" });

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Save to Database
        await db.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Server Error during Registration" });
    }
});

// ✅ LOGIN ROUTE (This was likely missing!)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Find user
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        // 2. Check password
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 3. Generate Token
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        
        // 4. Send Success Response
        res.json({ 
            token, 
            username: user.username, 
            role: user.role,
            message: "Login successful"
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server Error during Login" });
    }
});

module.exports = router;
