const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Get Token from Header
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // ✅ FIX: USE THE EXACT SAME KEY AS THE CONTROLLER
        const decoded = jwt.verify(token, 'my_super_secret_key_123');

        // 3. Attach User to Request
        req.user = decoded; 
        next();
    } catch (err) {
        console.log("------------------------------------------------");
        console.log("1. Received Token:", token);
        console.log("2. Using Key: my_super_secret_key_123"); 
        console.log("3. Verification Failed:", err.message);
        console.log("------------------------------------------------");
        res.status(401).json({ message: 'Token is not valid' });
    }
};
