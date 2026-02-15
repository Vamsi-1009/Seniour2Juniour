const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Create transactions table if not exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(listing_id) ON DELETE CASCADE,
    payment_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// Initialize table
pool.query(createTableQuery).catch(err => console.error('Transaction table error:', err));

// Record a transaction
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { payment_id, amount, listing_id, payment_method, status } = req.body;

        const result = await pool.query(
            `INSERT INTO transactions (user_id, listing_id, payment_id, amount, payment_method, status)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user.user_id, listing_id, payment_id, amount, payment_method, status || 'completed']
        );

        // Update listing status to sold if payment successful
        if (status === 'completed' && listing_id) {
            await pool.query(
                'UPDATE listings SET status = $1 WHERE listing_id = $2',
                ['sold', listing_id]
            );
        }

        res.status(201).json({ success: true, transaction: result.rows[0] });
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ error: 'Failed to record transaction' });
    }
});

// Get user transactions
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.*, l.title as item_title, l.images
             FROM transactions t
             LEFT JOIN listings l ON t.listing_id = l.listing_id
             WHERE t.user_id = $1
             ORDER BY t.created_at DESC`,
            [req.user.user_id]
        );

        res.json({ success: true, transactions: result.rows });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Get all transactions (Admin only)
router.get('/all', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const result = await pool.query(
            `SELECT t.*, u.name as user_name, u.email, l.title as item_title
             FROM transactions t
             LEFT JOIN users u ON t.user_id = u.user_id
             LEFT JOIN listings l ON t.listing_id = l.listing_id
             ORDER BY t.created_at DESC`
        );

        res.json({ success: true, transactions: result.rows });
    } catch (error) {
        console.error('Get all transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.*, l.title as item_title, l.images, u.name as buyer_name
             FROM transactions t
             LEFT JOIN listings l ON t.listing_id = l.listing_id
             LEFT JOIN users u ON t.user_id = u.user_id
             WHERE t.transaction_id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check if user owns this transaction or is admin
        if (result.rows[0].user_id !== req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ success: true, transaction: result.rows[0] });
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});

// Update transaction status (for refunds, etc.)
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { status } = req.body;
        const result = await pool.query(
            'UPDATE transactions SET status = $1 WHERE transaction_id = $2 RETURNING *',
            [status, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ success: true, transaction: result.rows[0] });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
