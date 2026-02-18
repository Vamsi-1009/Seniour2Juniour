const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const supabase = require('../config/supabaseClient');
const { authenticateToken } = require('../middleware/auth');

// Use memory storage — files go to Supabase, not local disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed (jpeg, jpg, png, webp)'));
        }
    }
});

// Upload a single file buffer to Supabase Storage, return public URL
async function uploadToSupabase(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `listing-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const { error } = await supabase.storage
        .from('listings')
        .upload(filename, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });
    if (error) throw new Error('Upload failed: ' + error.message);
    const { data } = supabase.storage.from('listings').getPublicUrl(filename);
    return data.publicUrl;
}

// GET /api/listings
router.get('/', async (req, res) => {
    try {
        const { category, search, sort, condition, lat, lng, radius } = req.query;
        let query = 'SELECT l.*, u.name as seller_name, u.avatar as seller_avatar FROM listings l JOIN users u ON l.user_id = u.user_id WHERE l.status = $1 AND l.is_draft = FALSE';
        const params = ['active'];

        if (category) {
            params.push(category);
            query += ' AND l.category = $' + params.length;
        }
        if (condition) {
            params.push(condition);
            query += ' AND l.condition = $' + params.length;
        }
        if (search) {
            params.push('%' + search + '%');
            query += ' AND (l.title ILIKE $' + params.length + ' OR l.description ILIKE $' + params.length + ')';
        }

        if (sort === 'price_low') query += ' ORDER BY l.price ASC';
        else if (sort === 'price_high') query += ' ORDER BY l.price DESC';
        else if (sort === 'popular') query += ' ORDER BY l.views DESC';
        else query += ' ORDER BY l.created_at DESC';

        const result = await pool.query(query, params);
        let listings = result.rows;

        // Location filter (Haversine)
        if (lat && lng && radius) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            const radiusKm = parseFloat(radius);
            listings = listings.filter(listing => {
                if (!listing.latitude || !listing.longitude) return true;
                const dLat = (listing.latitude - userLat) * Math.PI / 180;
                const dLng = (listing.longitude - userLng) * Math.PI / 180;
                const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
                    Math.cos(userLat*Math.PI/180)*Math.cos(listing.latitude*Math.PI/180)*
                    Math.sin(dLng/2)*Math.sin(dLng/2);
                const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return distance <= radiusKm;
            });
        }

        res.json({ success: true, listings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

// POST /api/listings  (create)
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const { title, description, price, category, condition, location, latitude, longitude } = req.body;
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'At least one image required' });
        }

        // Upload all images to Supabase Storage in parallel
        const imageUrls = await Promise.all(req.files.map(uploadToSupabase));

        const lat = latitude ? parseFloat(latitude) : null;
        const lng = longitude ? parseFloat(longitude) : null;
        const result = await pool.query(
            'INSERT INTO listings (user_id, title, description, price, category, condition, images, location, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
            [req.user.user_id, title, description, price, category, condition, imageUrls, location, lat, lng]
        );
        res.status(201).json({ success: true, listing: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create listing' });
    }
});

// GET /api/listings/:id
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

// DELETE /api/listings/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const check = await pool.query('SELECT user_id, images FROM listings WHERE listing_id = $1', [req.params.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        if (check.rows[0].user_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Delete images from Supabase Storage
        const images = check.rows[0].images || [];
        const filenames = images.map(url => {
            const parts = url.split('/');
            return parts[parts.length - 1];
        }).filter(Boolean);
        if (filenames.length > 0) {
            await supabase.storage.from('listings').remove(filenames);
        }

        await pool.query('DELETE FROM listings WHERE listing_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

module.exports = router;
