const Listing = require("../models/Listing");

/* ================= ADD LISTING ================= */
exports.addListing = (req, res) => {
  const { title, description, price, type, latitude, longitude } = req.body;

  if (!title || !price || !type) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!req.files || req.files.length !== 3) {
    return res.status(400).json({
      message: "Exactly 3 images are required"
    });
  }

  const images = req.files.map(f => `/uploads/${f.filename}`);

  Listing.create(
    {
      user_id: req.user.id,
      title,
      description: description || "",
      price,
      type,
      images: JSON.stringify(images),
      latitude: latitude || null,
      longitude: longitude || null
    },
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to add product" });
      }

      res.json({ message: "Product added successfully" });
    }
  );
};

/* ================= GET LISTINGS ================= */
exports.getAllListings = (req, res) => {
  const { lat, lng, radius } = req.query;

  if (lat && lng && radius) {
    Listing.getNearBy(
      Number(lat),
      Number(lng),
      Number(radius),
      (err, rows) => {
        if (err) {
          return res.status(500).json({ message: "Failed to fetch nearby listings" });
        }
        res.json(rows);
      }
    );
  } else {
    Listing.getAll((err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Failed to fetch listings" });
      }
      res.json(rows);
    });
  }
};

// ===============================
// GET MY LISTINGS (LOGGED-IN USER)
// ===============================
exports.getMyListings = (req, res) => {
  Listing.getByUser(req.user.id, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch listings" });
    }
    res.json(rows);
  });
};
