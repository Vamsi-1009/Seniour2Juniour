const db = require('../config/db');

class Listing {
    static async create(userId, title, price, description, imageUrl) {
        return db.query(
            'INSERT INTO listings (user_id, title, price, description, image_url) VALUES ($1, $2, $3, $4, $5)',
            [userId, title, price, description, imageUrl]
        );
    }

    static async findAll() {
        const { rows } = await db.query(`
            SELECT listings.*, users.username, users.email 
            FROM listings 
            JOIN users ON listings.user_id = users.id
            ORDER BY listings.id DESC
        `);
        return rows;
    }

    static async findById(id) {
        const { rows } = await db.query('SELECT * FROM listings WHERE id = $1', [id]);
        return rows[0];
    }

    // ✅ NEW: UPDATE FUNCTION
    static async update(id, title, price, description, imageUrl) {
        // If a new image is uploaded, update it. Otherwise, keep the old one.
        if (imageUrl) {
            return db.query(
                'UPDATE listings SET title = $1, price = $2, description = $3, image_url = $4 WHERE id = $5',
                [title, price, description, imageUrl, id]
            );
        } else {
            return db.query(
                'UPDATE listings SET title = $1, price = $2, description = $3 WHERE id = $4',
                [title, price, description, id]
            );
        }
    }

    static async delete(id) {
        return db.query('DELETE FROM listings WHERE id = $1', [id]);
    }
}

module.exports = Listing;
