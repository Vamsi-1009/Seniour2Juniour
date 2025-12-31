const db = require("../config/db");

const User = {
  // CREATE USER
  create: (user, callback) => {
    const sql = `
      INSERT INTO users (name, email, password)
      VALUES (?, ?, ?)
    `;
    db.run(sql, [user.name, user.email, user.password], callback);
  },

  // FIND USER BY EMAIL (SINGLE USER)
  findByEmail: (email, callback) => {
    const sql = `SELECT * FROM users WHERE email = ?`;
    db.get(sql, [email], callback); // 👈 IMPORTANT FIX
  }
};

module.exports = User;
