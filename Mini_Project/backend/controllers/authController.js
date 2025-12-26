const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ADMIN_EMAIL = "admin@academicexchange.com";

// =======================
// REGISTER (USER ONLY)
// =======================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    // ❌ Prevent admin email from registering
    if (email === ADMIN_EMAIL) {
      return res.status(403).json({
        message: "Admin account cannot be registered"
      });
    }

    User.findByEmail(email, async (err, user) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      User.create(
        {
          name,
          email,
          password: hashedPassword,
          role: "user" // 👈 USER ROLE
        },
        err => {
          if (err) return res.status(500).json({ message: "Registration failed" });
          res.status(201).json({ message: "Registration successful" });
        }
      );
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// LOGIN (USER + ADMIN)
// =======================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // ================= ADMIN LOGIN =================
  if (email === ADMIN_EMAIL && password === "Admin@123") {
    const token = jwt.sign(
      { id: 0, email, role: "admin" },
      process.env.JWT_SECRET || "dev_secret_key",
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      role: "admin"
    });
  }

  // ================= USER LOGIN =================
  User.findByEmail(email, async (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: "user" },
      process.env.JWT_SECRET || "dev_secret_key",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: "user"
    });
  });
};
