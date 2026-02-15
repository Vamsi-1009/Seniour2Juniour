const router = require('express').Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET MESSAGES FOR A LISTING
router.get('/:listingId', authenticateToken, async (req, res) => {
    try {
        const { listingId } = req.params;
        const result = await pool.query(
            `SELECT m.*, u.name as sender_name
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.user_id
             WHERE m.listing_id = $1
             ORDER BY m.created_at ASC`,
            [listingId]
        );
        res.json({ success: true, messages: result.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// MARK MESSAGES AS READ
router.put('/:messageId/read', authenticateToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        await pool.query(
            'UPDATE messages SET is_read = TRUE WHERE message_id = $1 AND receiver_id = $2',
            [messageId, req.user.user_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// GET UNREAD MESSAGE COUNT
router.get('/unread/count', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = FALSE',
            [req.user.user_id]
        );
        res.json({ success: true, count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
