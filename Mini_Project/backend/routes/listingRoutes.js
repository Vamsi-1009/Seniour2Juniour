const express = require("express");
const router = express.Router();

const listingController = require("../controllers/listingController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// GET all listings (with / without location)
router.get("/", listingController.getAllListings);

// ADD listing (protected + 3 images)
router.post(
  "/",
  authMiddleware,
  upload.array("images", 3),
  listingController.addListing
);

module.exports = router;
