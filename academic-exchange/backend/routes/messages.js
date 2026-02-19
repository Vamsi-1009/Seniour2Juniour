const router = require('express').Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

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

// GET ALL USER CHATS
router.get('/my-chats', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT ON (m.listing_id)
                m.listing_id,
                l.title as listing_title,
                l.images[1] as listing_image,
                l.user_id as seller_id,
                m.content as last_message,
                m.created_at as last_message_time,
                (SELECT COUNT(*) FROM messages WHERE listing_id = m.listing_id AND receiver_id = $1 AND is_read = FALSE) as unread_count,
                -- other person: if I am the sender use receiver, else use sender
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_user_id,
                CASE WHEN m.sender_id = $1 THEN ru.name    ELSE su.name    END as other_user_name,
                CASE WHEN m.sender_id = $1 THEN ru.avatar  ELSE su.avatar  END as other_user_avatar
             FROM messages m
             LEFT JOIN listings l ON m.listing_id = l.listing_id
             LEFT JOIN users su ON m.sender_id   = su.user_id
             LEFT JOIN users ru ON m.receiver_id = ru.user_id
             WHERE m.sender_id = $1 OR m.receiver_id = $1
             ORDER BY m.listing_id, m.created_at DESC`,
            [req.user.user_id]
        );

        res.json({ success: true, chats: result.rows });
    } catch (err) {
        console.error('Get chats error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

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

module.exports = router;
