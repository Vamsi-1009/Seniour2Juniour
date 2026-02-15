const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// REGISTER USER
router.post('/register', async (req, res) => {
    // 1. Destructure name, email, password (allow name to be passed)
    const { name, email, password } = req.body;
    
    try {
        // 2. Check if user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(401).json({ error: 'User already exists' });
        }

        // 3. Hash password
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 4. Determine Name (Use provided name, or default to "Student")
        const userName = name || 'Student';

        // 5. Insert into DB
        const newUser = await pool.query(
            'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [email, bcryptPassword, userName, 'student']
        );

        // 6. Generate Token (Include role in token for middleware)
        const token = jwt.sign(
            {
                user_id: newUser.rows[0].user_id,
                role: newUser.rows[0].role
            },
            process.env.JWT_SECRET || 'secret', // Fallback key
            { expiresIn: "24h" }
        );

        res.json({ token, role: newUser.rows[0].role });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// LOGIN USER
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Check if user exists
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid Credential' });
        }

        // 2. Check password
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid Credential' });
        }

        // 3. Generate Token (Include role in token for middleware)
        const token = jwt.sign(
            {
                user_id: user.rows[0].user_id,
                role: user.rows[0].role
            },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: "24h" }
        );

        res.json({ token, role: user.rows[0].role });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
