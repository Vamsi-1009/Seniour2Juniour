const express = require("express");
const router = express.Router();

const listingController = require("../controllers/listingController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// 🌍 PUBLIC — ALL LISTINGS
router.get("/", listingController.getAllListings);
router.get("/:id", listingController.getListingById);

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

// Add this INSIDE listingRoutes.js
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    db.get('SELECT * FROM listings WHERE id = ?', [id], (err, listing) => {
      if (err || !listing) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Get seller info
      db.get('SELECT name FROM users WHERE id = ?', [listing.user_id], (err, user) => {
        listing.seller_name = user ? user.name : 'Unknown Seller';
        res.json(listing);
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

