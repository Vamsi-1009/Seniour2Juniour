const db = require('../config/db');

class User {
    static async findByEmail(email) {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return rows[0];
    }

    static async create(username, email, passwordHash) {
        return db.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
            [username, email, passwordHash, 'user']
        );
    }

    // ✅ THIS FIXES THE "LOADING..." BUG
    static async findAll() {
        const { rows } = await db.query('SELECT id, username, email, role FROM users');
        return rows;
    }

    // ✅ THIS ALLOWS DELETING USERS
    static async delete(id) {
        return db.query('DELETE FROM users WHERE id = $1', [id]);
    }
}

module.exports = User;
