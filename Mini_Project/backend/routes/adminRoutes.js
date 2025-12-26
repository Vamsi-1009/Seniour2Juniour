const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

// 🔒 ADMIN ONLY MIDDLEWARE
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only."
    });
  }
  next();
};

// 👥 ALL USERS
router.get(
  "/users",
  authMiddleware,
  adminOnly,
  adminController.getUsers
);

// 📦 ALL LISTINGS
router.get(
  "/listings",
  authMiddleware,
  adminOnly,
  adminController.getListings
);

// ❌ DELETE LISTING
router.delete(
  "/listings/:id",
  authMiddleware,
  adminOnly,
  adminController.deleteListing
);

module.exports = router;
