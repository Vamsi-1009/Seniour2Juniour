const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

// ===============================
// 🔒 ADMIN ONLY MIDDLEWARE
// ===============================
const adminOnly = (req, res, next) => {
  // authMiddleware already decoded token → req.user
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only."
    });
  }
  next();
};

// ===============================
// 👥 GET ALL USERS
// ===============================
router.get(
  "/users",
  authMiddleware,
  adminOnly,
  adminController.getUsers
);

// ===============================
// 📦 GET ALL LISTINGS
// ===============================
router.get(
  "/listings",
  authMiddleware,
  adminOnly,
  adminController.getListings
);

// ===============================
// ❌ DELETE LISTING BY ID
// ===============================
router.delete(
  "/listings/:id",
  authMiddleware,
  adminOnly,
  adminController.deleteListing
);

module.exports = router;
