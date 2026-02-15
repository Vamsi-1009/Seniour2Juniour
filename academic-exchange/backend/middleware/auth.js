// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401); // Unauthorized

    const jwtSecret = process.env.JWT_SECRET || 'secret';

    if (!process.env.JWT_SECRET) {
        console.warn('WARNING: JWT_SECRET not set in environment variables. Using fallback (INSECURE for production).');
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        req.user.role = user.role; // Preserve role from token
        next();
    });
}

module.exports = authenticateToken;
