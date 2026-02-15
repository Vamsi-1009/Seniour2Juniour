const router = require('express').Router();
const pool = require('../config/db');

// GET MESSAGES FOR A LISTING
router.get('/:listingId', async (req, res) => {
    try {
        const { listingId } = req.params;
        const result = await pool.query(
            `SELECT * FROM messages WHERE listing_id = $1 ORDER BY created_at ASC`,
            [listingId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
