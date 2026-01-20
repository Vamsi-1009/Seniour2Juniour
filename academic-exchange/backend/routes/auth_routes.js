const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); 

const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

// ✅ REGISTER ROUTE (Now Auto-Lowercases Email)
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // 1. Force Lowercase to prevent "Vamsi" vs "vamsi" errors
    const safeEmail = email.toLowerCase().trim();
    
    console.log(`📝 Registering: ${safeEmail}`); // This shows in Render Logs

    try {
        // 2. Check if user exists
        const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [safeEmail]);
        if (userCheck.rows.length > 0) {
            console.log("❌ Registration Failed: User already exists");
            return res.status(400).json({ message: "User already exists" });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 4. Save to Database
        await db.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
            [username, safeEmail, hashedPassword]
        );

        console.log("✅ Registration Success!");
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error("❌ Register Error:", err);
        res.status(500).json({ message: "Server Error during Registration" });
    }
});

// ✅ LOGIN ROUTE (Debug Version)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // 1. Force Lowercase
    const safeEmail = email.toLowerCase().trim();

    console.log(`🔑 Login Attempt for: ${safeEmail}`); 

    try {
        // 2. Find user
        const result = await db.query("SELECT * FROM users WHERE email = $1", [safeEmail]);
        const user = result.rows[0];

        if (!user) {
            console.log("❌ Login Failed: User NOT found in database.");
            return res.status(401).json({ message: "User not found. Please Register first." });
        }

        // 3. Check password
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            console.log("❌ Login Failed: Wrong Password.");
            return res.status(401).json({ message: "Wrong Password. Try again." });
        }

        // 4. Generate Token
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        
        console.log("✅ Login Success!");
        res.json({ 
            token, 
            id: user.id,
            username: user.username, 
            role: user.role,
            message: "Login successful"
        });
    } catch (err) {
        console.error("❌ Login Server Error:", err);
        res.status(500).json({ message: "Server Error during Login" });
    }
});

module.exports = router;
