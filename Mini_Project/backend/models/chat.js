const db = require("../config/db");

const Chat = {
  sendMessage: (data, callback) => {
    const sql = `
      INSERT INTO messages
      (listing_id, sender_id, receiver_id, message, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    db.run(
      sql,
      [
        data.listing_id,
        data.sender_id,
        data.receiver_id,
        data.message
      ],
      callback
    );
  },

  getChatHistory: (listingId, userId, otherUserId, callback) => {
    const sql = `
      SELECT *
      FROM messages
      WHERE listing_id = ?
        AND (
          (sender_id = ? AND receiver_id = ?)
          OR
          (sender_id = ? AND receiver_id = ?)
        )
      ORDER BY created_at ASC
    `;
    db.all(
      sql,
      [listingId, userId, otherUserId, otherUserId, userId],
      callback
    );
  }
};

module.exports = Chat;
