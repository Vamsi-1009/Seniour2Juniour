const Listing = require('../models/listingmodel');

exports.createListing = async (req, res) => {
    try {
        const { title, price, description } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        await Listing.create(req.user.id, title, price, description, imageUrl);
        res.status(201).json({ message: 'Book listed successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllListings = async (req, res) => {
    try {
        const listings = await Listing.findAll();
        res.json(listings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ NEW: UPDATE LOGIC
exports.updateListing = async (req, res) => {
    try {
        const listingId = req.params.id;
        const { title, price, description } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
        // 1. Check Ownership
        const listing = await Listing.findById(listingId);
        if (!listing) return res.status(404).json({ message: 'Listing not found' });
        
        if (listing.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to edit this' });
        }

        // 2. Perform Update
        await Listing.update(listingId, title, price, description, imageUrl);
        res.json({ message: 'Listing updated successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteListing = async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await Listing.findById(listingId);
        if (!listing) return res.status(404).json({ message: 'Listing not found' });

        if (listing.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Listing.delete(listingId);
        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
