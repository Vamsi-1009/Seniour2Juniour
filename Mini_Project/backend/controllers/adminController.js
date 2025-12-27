const db = require("../config/db");

/* ============================
   GET ALL USERS (ADMIN ONLY)
============================ */
exports.getUsers = (req, res) => {
  db.all(
    "SELECT id, name, email, role, created_at FROM users",
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Failed to fetch users"
        });
      }

      res.json(rows);
    }
  );
};

/* ============================
   GET ALL LISTINGS (ADMIN ONLY)
============================ */
exports.getListings = (req, res) => {
  db.all(
    `
    SELECT listings.*, users.name AS seller_name
    FROM listings
    JOIN users ON listings.user_id = users.id
    ORDER BY listings.created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Failed to fetch listings"
        });
      }

      res.json(rows);
    }
  );
};

/* ============================
   DELETE A LISTING (ADMIN ONLY)
============================ */
exports.deleteListing = (req, res) => {
  const listingId = req.params.id;

  db.run(
    "DELETE FROM listings WHERE id = ?",
    [listingId],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Failed to delete listing"
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Listing not found"
        });
      }

      res.json({
        message: "Listing deleted successfully"
      });
    }
  );
};

/* ============================
   DELETE A USER (ADMIN ONLY)
============================ */
exports.deleteUser = (req, res) => {
  const userId = req.params.id;

  // 🔒 Prevent deleting admin account
  if (userId === "0") {
    return res.status(403).json({
      message: "Admin account cannot be deleted"
    });
  }

  db.run(
    "DELETE FROM users WHERE id = ?",
    [userId],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Failed to delete user"
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      res.json({
        message: "User deleted successfully"
      });
    }
  );
};
