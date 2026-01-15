const jwt = require('jsonwebtoken');

// ✅ CRITICAL FIX: This matches server.js and authController.js
const SECRET_KEY = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
    // 1. Get Token from Header
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // 2. Verify using the CORRECT key
        const decoded = jwt.verify(token, SECRET_KEY);

        // 3. Attach User to Request
        req.user = decoded; 
        next();
    } catch (err) {
        // console.log("Verification Failed:", err.message); // Optional debug
        res.status(401).json({ message: 'Token is not valid' });
    }
};
