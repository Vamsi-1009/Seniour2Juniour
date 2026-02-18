const router = require('express').Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// GET all conversations for current user
router.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const result = await pool.query(`
            SELECT DISTINCT ON (
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END,
                m.listing_id
            )
                m.*,
                s.name as sender_name,
                r.name as receiver_name,
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_user_id
            FROM messages m
            JOIN users s ON s.user_id = m.sender_id
            JOIN users r ON r.user_id = m.receiver_id
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END,
                m.listing_id,
                m.created_at DESC
        `, [userId]);

        // Reshape into conversations with last_message
        const conversations = result.rows.map(row => ({
            ...row,
            last_message: row.content
        }));

        res.json({ success: true, conversations });
    } catch (err) {
        console.error('Conversations error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load conversations' });
    }
});

// GET messages between current user and another user for a listing
router.get('/:listingId/:otherUserId', authenticateToken, async (req, res) => {
    try {
        const { listingId, otherUserId } = req.params;
        const userId = req.user.user_id;

        const result = await pool.query(`
            SELECT m.*, s.name as sender_name
            FROM messages m
            JOIN users s ON s.user_id = m.sender_id
            WHERE m.listing_id = $1
            AND (
                (m.sender_id = $2 AND m.receiver_id = $3) OR
                (m.sender_id = $3 AND m.receiver_id = $2)
            )
            ORDER BY m.created_at ASC
        `, [listingId, userId, otherUserId]);

        // Mark as read
        await pool.query(`
            UPDATE messages SET is_read = TRUE
            WHERE listing_id = $1 AND receiver_id = $2 AND sender_id = $3
        `, [listingId, userId, otherUserId]);

        res.json({ success: true, messages: result.rows });
    } catch (err) {
        console.error('Messages error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load messages' });
    }
});

// POST send a message
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { receiver_id, listing_id, content } = req.body;
        if (!receiver_id || !listing_id || !content) {
            return res.status(400).json({ error: 'receiver_id, listing_id, and content are required' });
        }

        const result = await pool.query(`
            INSERT INTO messages (sender_id, receiver_id, listing_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [req.user.user_id, receiver_id, listing_id, content]);

        const message = result.rows[0];

        // Emit via socket if available
        const io = req.app.get('io');
        if (io) {
            io.to(receiver_id).emit('new_message', message);
        }

        res.status(201).json({ success: true, message });
    } catch (err) {
        console.error('Send message error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

module.exports = router;
