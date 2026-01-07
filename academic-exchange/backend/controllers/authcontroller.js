const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findByEmail(email);
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await User.create(username, email, passwordHash);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ... (Keep your imports and register function) ...

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email);
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // ✅ FIX: HARDCODE THE SAME SECRET KEY HERE
        const token = jwt.sign(
            { id: user.id, role: user.role || 'user' }, 
            'my_super_secret_key_123',  // <--- MATCHING KEY
            { expiresIn: '1h' }
        );

        res.json({ 
            message: 'Login successful',
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                role: user.role || 'user' 
            } 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ... (Keep getAllUsers and deleteUser functions) ...
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.delete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
