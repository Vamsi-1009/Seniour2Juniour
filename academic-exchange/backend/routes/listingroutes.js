const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingcontroller');
const authMiddleware = require('../middleware/auth_middleware');
const upload = require('../middleware/uploadmiddleware');

// 1. GET ALL
router.get('/', listingController.getAllListings); 

// 2. CREATE (POST)
router.post('/', authMiddleware, upload.single('image'), listingController.createListing);

// 3. UPDATE (PUT) - ✅ NEW
router.put('/:id', authMiddleware, upload.single('image'), listingController.updateListing);

// 4. DELETE
router.delete('/:id', authMiddleware, listingController.deleteListing);

module.exports = router;
