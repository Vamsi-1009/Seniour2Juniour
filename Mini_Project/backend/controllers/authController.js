const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🔐 FIXED ADMIN CREDENTIALS
const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin123";

// =======================
// REGISTER (ONLY USERS)
// =======================
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  // ❌ Block admin email from user register
  if (email === ADMIN_EMAIL) {
    return res.status(403).json({
      message: "Admin account cannot be registered"
    });
  }

  User.findByEmail(email, async (err, user) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    User.create(
      {
        name,
        email,
        password: hashedPassword,
        role: "user"
      },
      err => {
        if (err) return res.status(500).json({ message: "Register failed" });
        res.json({ message: "User registered" });
      }
    );
  });
};

// =======================
// LOGIN (USER + ADMIN)
// =======================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // 🔐 ADMIN LOGIN
  if (email === "admin@admin.com" && password === "admin123") {
    const token = jwt.sign(
      { id: 0, email, role: "admin" },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      role: "admin"
    });
  }

  // 👤 USER LOGIN
  User.findByEmail(email, async (err, user) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: "user" },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: "user"
    });
  });
};
