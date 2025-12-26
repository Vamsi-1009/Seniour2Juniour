const db = require("../config/db");

exports.getUsers = (req, res) => {
  db.all("SELECT id, name, email FROM users", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

exports.getListings = (req, res) => {
  db.all("SELECT * FROM listings", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

exports.deleteListing = (req, res) => {
  db.run(
    "DELETE FROM listings WHERE id = ?",
    [req.params.id],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Deleted" });
    }
  );
};
