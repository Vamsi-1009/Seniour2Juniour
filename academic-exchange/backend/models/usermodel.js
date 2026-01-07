const connectDB = require('../config/db');

class User {
    static async findByEmail(email) {
        const db = await connectDB();
        return db.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    static async create(username, email, passwordHash) {
        const db = await connectDB();
        return db.run(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, 'user']
        );
    }

    // ✅ THIS FIXES THE "LOADING..." BUG
    static async findAll() {
        const db = await connectDB();
        return db.all('SELECT id, username, email, role FROM users');
    }

    // ✅ THIS ALLOWS DELETING USERS
    static async delete(id) {
        const db = await connectDB();
        return db.run('DELETE FROM users WHERE id = ?', [id]);
    }
}

module.exports = User;
