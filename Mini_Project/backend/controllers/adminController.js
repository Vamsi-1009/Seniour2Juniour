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

// ================= PRODUCTS =================
exports.getListings = (req, res) => {
  db.all(
    "SELECT id, title, price, type FROM listings ORDER BY id DESC",
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

// ================= DELETE PRODUCT =================
exports.deleteListing = (req, res) => {
  db.run(
    "DELETE FROM listings WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Delete failed" });
      }
      res.json({ message: "Product deleted successfully" });
    }
  );
};
