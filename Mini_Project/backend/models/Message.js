const db = require("../config/db");

const Message = {
  send: (data, callback) => {
    const sql = `
      INSERT INTO messages (sender_id, receiver_id, message)
      VALUES (?, ?, ?)
    `;
    db.run(sql, [data.sender_id, data.receiver_id, data.message], callback);
  },

  getChat: (user1, user2, callback) => {
    const sql = `
      SELECT * FROM messages
      WHERE 
        (sender_id = ? AND receiver_id = ?)
        OR
        (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `;
    db.all(sql, [user1, user2, user2, user1], callback);
  }
};

module.exports = Message;
