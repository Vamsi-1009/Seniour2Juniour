const db = require("../config/db");

const Listing = {
  // CREATE
  create: (data, callback) => {
    const sql = `
      INSERT INTO listings 
      (user_id, title, description, price, type, images, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
      sql,
      [
        data.user_id,
        data.title,
        data.description,
        data.price,
        data.type,
        data.images,
        data.latitude,
        data.longitude
      ],
      callback
    );
  },

  // GET ALL (for homepage)
  getAll: callback => {
    const sql = `
      SELECT listings.*, users.name AS seller
      FROM listings
      JOIN users ON listings.user_id = users.id
      ORDER BY listings.created_at DESC
    `;
    db.all(sql, [], callback);
  },

  // ✅ GET LISTINGS OF LOGGED-IN USER
  getByUser: (userId, callback) => {
    const sql = `
      SELECT * FROM listings
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    db.all(sql, [userId], callback);
  }
};

module.exports = Listing;
