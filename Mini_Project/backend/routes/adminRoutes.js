const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

// 🔒 ADMIN ONLY
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

router.get("/users", authMiddleware, adminOnly, adminController.getUsers);
router.get("/listings", authMiddleware, adminOnly, adminController.getListings);
router.delete(
  "/listings/:id",
  authMiddleware,
  adminOnly,
  adminController.deleteListing
);

module.exports = router;
