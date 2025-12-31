const db = require("../config/db");

// ================= USERS =================
exports.getUsers = (req, res) => {
  db.all(
    "SELECT id, name, email FROM users ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to fetch users" });
      }
      res.json(rows);
    }
  );
};

// ================= LISTINGS =================
exports.getListings = (req, res) => {
  db.all(
    "SELECT id, title, price, type, images FROM listings ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to fetch listings" });
      }
      res.json(rows);
    }
  );
};

// ================= DELETE =================
exports.deleteListing = (req, res) => {
  db.run(
    "DELETE FROM listings WHERE id = ?",
    [req.params.id],
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Delete failed" });
      }
      res.json({ message: "Deleted" });
    }
  );
};
