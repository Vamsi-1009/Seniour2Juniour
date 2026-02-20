const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Supabase client for storage
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Use memory storage — files go to Supabase Storage, not local disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed'));
        }
    }
});

// Get user's own listings
router.get('/my-items', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM listings WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.user_id]
        );
        res.json({ success: true, listings: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { category, search, sort, minPrice, maxPrice, condition, location, latitude, longitude, range } = req.query;
        let query = 'SELECT l.*, u.name as seller_name, u.avatar as seller_avatar FROM listings l JOIN users u ON l.user_id = u.user_id WHERE l.status = $1';
        const params = ['active'];

        if (category) {
            params.push(category);
            query += ' AND l.category = $' + params.length;
        }

        if (search) {
            params.push('%' + search + '%');
            query += ' AND (l.title ILIKE $' + params.length + ' OR l.description ILIKE $' + params.length + ')';
        }

        if (minPrice) {
            params.push(minPrice);
            query += ' AND l.price >= $' + params.length;
        }

        if (maxPrice) {
            params.push(maxPrice);
            query += ' AND l.price <= $' + params.length;
        }

        if (condition) {
            params.push(condition);
            query += ' AND l.condition = $' + params.length;
        }

        if (location) {
            params.push('%' + location + '%');
            query += ' AND l.location ILIKE $' + params.length;
        }

        if (sort === 'price_low') query += ' ORDER BY l.price ASC';
        else if (sort === 'price_high') query += ' ORDER BY l.price DESC';
        else if (sort === 'popular') query += ' ORDER BY l.views DESC';
        else if (sort === 'newest') query += ' ORDER BY l.created_at DESC';
        else query += ' ORDER BY l.created_at DESC';

        const result = await pool.query(query, params);
        res.json({ success: true, listings: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const { title, description, price, category, condition, location, latitude, longitude } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'At least one image required' });
        }

        // Upload each image to Supabase Storage
        const imageUrls = [];
        for (const file of req.files) {
            const filename = `listings/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, file.buffer, { contentType: file.mimetype });

            if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);

            const { data } = supabase.storage.from('uploads').getPublicUrl(filename);
            imageUrls.push(data.publicUrl);
        }

        const lat = latitude ? parseFloat(latitude) : null;
        const lng = longitude ? parseFloat(longitude) : null;

        const result = await pool.query(
            'INSERT INTO listings (user_id, title, description, price, category, condition, images, location, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [req.user.user_id, title, description, price, category, condition, imageUrls, location, lat, lng]
        );

        res.status(201).json({ success: true, listing: result.rows[0] });
    } catch (error) {
        console.error('Listing creation error:', error);
        res.status(500).json({ error: 'Failed to create listing', details: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        await pool.query('UPDATE listings SET views = views + 1 WHERE listing_id = $1', [req.params.id]);
        const result = await pool.query(
            'SELECT l.*, u.name as seller_name, u.avatar as seller_avatar, u.user_id as seller_id FROM listings l JOIN users u ON l.user_id = u.user_id WHERE l.listing_id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, listing: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch listing' });
    }
});

// Edit listing (title, description, price, condition, location)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, price, condition, location } = req.body;
        const check = await pool.query('SELECT user_id FROM listings WHERE listing_id = $1', [req.params.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        if (check.rows[0].user_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const result = await pool.query(
            'UPDATE listings SET title=$1, description=$2, price=$3, condition=$4, location=$5 WHERE listing_id=$6 RETURNING *',
            [title, description, price, condition, location, req.params.id]
        );
        res.json({ success: true, listing: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update listing' });
    }
});

// Mark as sold / reactivate
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'sold'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
        const check = await pool.query('SELECT user_id FROM listings WHERE listing_id = $1', [req.params.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        if (check.rows[0].user_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await pool.query('UPDATE listings SET status=$1 WHERE listing_id=$2', [status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const check = await pool.query('SELECT user_id FROM listings WHERE listing_id = $1', [req.params.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        if (check.rows[0].user_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await pool.query('DELETE FROM listings WHERE listing_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

module.exports = router;
