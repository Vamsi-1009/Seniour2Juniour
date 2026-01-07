const connectDB = require('../config/db');

class Listing {
    static async create(userId, title, price, description, imageUrl) {
        const db = await connectDB();
        return db.run(
            'INSERT INTO listings (user_id, title, price, description, image_url) VALUES (?, ?, ?, ?, ?)',
            [userId, title, price, description, imageUrl]
        );
    }

    static async findAll() {
        const db = await connectDB();
        return db.all(`
            SELECT listings.*, users.username, users.email 
            FROM listings 
            JOIN users ON listings.user_id = users.id
            ORDER BY listings.id DESC
        `);
    }

    static async findById(id) {
        const db = await connectDB();
        return db.get('SELECT * FROM listings WHERE id = ?', [id]);
    }

    // ✅ NEW: UPDATE FUNCTION
    static async update(id, title, price, description, imageUrl) {
        const db = await connectDB();
        // If a new image is uploaded, update it. Otherwise, keep the old one.
        if (imageUrl) {
            return db.run(
                'UPDATE listings SET title = ?, price = ?, description = ?, image_url = ? WHERE id = ?',
                [title, price, description, imageUrl, id]
            );
        } else {
            return db.run(
                'UPDATE listings SET title = ?, price = ?, description = ? WHERE id = ?',
                [title, price, description, id]
            );
        }
    }

    static async delete(id) {
        const db = await connectDB();
        return db.run('DELETE FROM listings WHERE id = ?', [id]);
    }
}

module.exports = Listing;
