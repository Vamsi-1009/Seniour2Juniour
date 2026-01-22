const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Use the shared DB connection

// ✅ CRITICAL FIX: This MUST match the key in server.js EXACTLY
const SECRET_KEY = process.env.JWT_SECRET;

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "All fields are required" });

    try {
        // Check if user exists
        const { rows: existingUsers } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUsers.length > 0) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'user')`,
            [username, email, hashedPassword]
        );
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error registering user: " + err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = rows[0];

        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // ✅ SIGNING TOKEN WITH THE CORRECT KEY
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ message: "Login error: " + err.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { rows: users } = await db.query("SELECT id, username, email, role FROM users");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM users WHERE id = $1", [id]);
        res.json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
