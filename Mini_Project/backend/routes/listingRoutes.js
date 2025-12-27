const express = require("express");
const router = express.Router();

const listingController = require("../controllers/listingController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// 🌍 PUBLIC — ALL LISTINGS
router.get("/", listingController.getAllListings);

// 👤 USER — MY LISTINGS
router.get(
  "/my",
  authMiddleware,
  listingController.getMyListings
);

// ➕ ADD LISTING
router.post(
  "/",
  authMiddleware,
  upload.array("images", 3),
  listingController.addListing
);

module.exports = router;
