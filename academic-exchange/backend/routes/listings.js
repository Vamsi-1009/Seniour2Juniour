const router = require('express').Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const supabase = require('../config/supabaseClient'); // Import the Supabase client

// --- 1. Use Memory Storage (Required for Supabase Uploads) ---
// We don't save to disk anymore. Files are held in RAM temporarily.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 2. CREATE LISTING (Now Uploads to Supabase) ---
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const { title, description, price, category, condition, subcategory, location } = req.body;
        const imageUrls = [];

        // Upload each file to Supabase Storage
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // Generate a unique file name
                const fileName = `listing-${Date.now()}-${Math.round(Math.random() * 1E9)}`;

                // Upload to the 'uploads' bucket
                const { data, error } = await supabase
                    .storage
                    .from('uploads') // Make sure your Supabase bucket is named 'uploads'
                    .upload(fileName, file.buffer, {
                        contentType: file.mimetype
                    });

                if (error) {
                    console.error("Supabase Upload Error:", error);
                    throw error;
                }

                // Get the Public URL for the database
                const { data: publicData } = supabase
                    .storage
                    .from('uploads')
                    .getPublicUrl(fileName);
                
                imageUrls.push(publicData.publicUrl);
            }
        }

        // Save the listing to the database with the new Supabase URLs
        const newListing = await pool.query(
            `INSERT INTO listings (user_id, title, description, price, category, condition, images, subcategory, location) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.user.user_id, title, description, price, category, condition, imageUrls, subcategory, location]
        );

        res.json(newListing.rows[0]);
    } catch (err) {
        console.error("Listing Creation Error:", err.message);
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

// GET ALL LISTINGS
router.get('/', async (req, res) => {
    try {
        const allListings = await pool.query('SELECT * FROM listings ORDER BY created_at DESC');
        res.json(allListings.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// GET SINGLE LISTING
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await pool.query('SELECT * FROM listings WHERE listing_id = $1', [id]);
        if (listing.rows.length === 0) return res.status(404).json({ msg: "Listing not found" });
        
        await pool.query('UPDATE listings SET views = views + 1 WHERE listing_id = $1', [id]);
        res.json(listing.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// UPDATE LISTING
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, category, condition, subcategory, location } = req.body;

        const checkOwner = await pool.query('SELECT user_id FROM listings WHERE listing_id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Not Found");
        if (checkOwner.rows[0].user_id !== req.user.user_id) return res.status(403).json("Not Authorized");

        const update = await pool.query(
            `UPDATE listings 
             SET title = $1, description = $2, price = $3, category = $4, condition = $5, subcategory = $6, location = $7 
             WHERE listing_id = $8 RETURNING *`,
            [title, description, price, category, condition, subcategory, location, id]
        );
        res.json(update.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// MARK SOLD
router.put('/:id/sold', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const checkOwner = await pool.query('SELECT user_id FROM listings WHERE listing_id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Not Found");
        if (checkOwner.rows[0].user_id !== req.user.user_id) return res.status(403).json("Not Authorized");

        await pool.query("UPDATE listings SET status = 'sold' WHERE listing_id = $1", [id]);
        res.json("Marked as sold");
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// DELETE LISTING (Deletes Messages & Wishlist first)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Check if item exists
        const checkOwner = await pool.query('SELECT user_id FROM listings WHERE listing_id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Not Found");

        // 2. Permission Check (Owner OR Admin)
        if (checkOwner.rows[0].user_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json("Not Authorized");
        }

        // 3. DELETE RELATED DATA FIRST
        await pool.query('DELETE FROM messages WHERE listing_id = $1', [id]); 
        await pool.query('DELETE FROM wishlist WHERE listing_id = $1', [id]); 

        // 4. Delete the Listing
        await pool.query('DELETE FROM listings WHERE listing_id = $1', [id]);
        
        res.json("Listing deleted");
    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
