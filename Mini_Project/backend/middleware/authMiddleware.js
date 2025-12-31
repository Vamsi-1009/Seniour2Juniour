const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  // 🔥 FIX: Handle both formats - "Bearer token" OR just "token"
  let token = authHeader;
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_secret"
    );

    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
