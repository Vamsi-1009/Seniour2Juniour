const db = require("../config/db");

const Listing = {
  // =========================
  // CREATE LISTING
  // =========================
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

  // =========================
  // GET ALL LISTINGS
  // =========================
  getAll: callback => {
    const sql = `
      SELECT listings.*, users.name AS seller
      FROM listings
      JOIN users ON users.id = listings.user_id
      ORDER BY listings.created_at DESC
    `;

    db.all(sql, [], callback);
  },

  // =========================
  // GET LISTING BY ID
  // =========================
  getById: (id, callback) => {
    const sql = `
      SELECT * FROM listings WHERE id = ?
    `;
    db.get(sql, [id], callback);
  },

  // =========================
  // GET LISTINGS OF LOGGED-IN USER
  // =========================
  getMyListings: (userId, callback) => {
    const sql = `
      SELECT * FROM listings
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    db.all(sql, [userId], callback);
  },

  // =========================
  // GET NEARBY LISTINGS (5 KM)
  // =========================
  getNearBy: (lat, lng, radiusKm, callback) => {
    const sql = `
      SELECT *,
      (
        6371 * acos(
          cos(radians(?)) *
          cos(radians(latitude)) *
          cos(radians(longitude) - radians(?)) +
          sin(radians(?)) *
          sin(radians(latitude))
        )
      ) AS distance
      FROM listings
      HAVING distance <= ?
      ORDER BY distance ASC
    `;

    db.all(sql, [lat, lng, lat, radiusKm], callback);
  },

  // =========================
  // DELETE LISTING
  // =========================
  deleteById: (id, callback) => {
    const sql = `DELETE FROM listings WHERE id = ?`;
    db.run(sql, [id], callback);
  }
};

module.exports = Listing;
