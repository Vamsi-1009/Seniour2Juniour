const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');

// 1. GET: Get ALL Users
// Usage: GET http://localhost:5000/api/users
router.get('/', async (req, res) => {
    try {
        const db = await connectDB();
        const users = await db.all("SELECT id, username, email, role FROM users");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. GET: Get ONE User by ID
// Usage: GET http://localhost:5000/api/users/5
router.get('/:id', async (req, res) => {
    try {
        const db = await connectDB();
        const user = await db.get("SELECT id, username, email, role FROM users WHERE id = ?", [req.params.id]);
        
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. POST: Create a new User (Directly)
// Usage: POST http://localhost:5000/api/users
// Body: { "username": "John", "email": "john@test.com", "password": "123" }
router.post('/', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const db = await connectDB();
        // Note: In a real app, you should hash the password here (bcrypt)
        await db.run(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')",
            [username, email, password]
        );
        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. PUT: Update a User by ID
// Usage: PUT http://localhost:5000/api/users/5
// Body: { "username": "NewName", "role": "admin" }
router.put('/:id', async (req, res) => {
    const { username, role } = req.body;
    const { id } = req.params;
    try {
        const db = await connectDB();
        await db.run(
            "UPDATE users SET username = ?, role = ? WHERE id = ?",
            [username, role, id]
        );
        res.json({ message: "User updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. DELETE: Remove a User by ID
// Usage: DELETE http://localhost:5000/api/users/5
router.delete('/:id', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
