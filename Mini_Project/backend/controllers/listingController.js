const Listing = require("../models/Listing");

/* ================= ADD LISTING ================= */
exports.addListing = (req, res) => {
  const { title, description, price, type, latitude, longitude } = req.body;

  if (!title || !price || !type) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // ✅ CHANGED: Accept 1-3 images instead of exactly 3
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      message: "At least 1 image is required"
    });
  }

  if (req.files.length > 3) {
    return res.status(400).json({
      message: "Maximum 3 images allowed"
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
      images: JSON.stringify(images), // Stored as JSON string
      latitude: latitude || null,
      longitude: longitude || null
    },
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to add product" });
      }

      res.json({ 
        message: "Product added successfully",
        images: images // ✅ Return uploaded image paths
      });
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
        // ✅ Parse images for each listing
        rows = rows.map(row => {
          try {
            row.images = JSON.parse(row.images || '[]');
          } catch(e) {
            row.images = [];
          }
          return row;
        });
        res.json(rows);
      }
    );
  } else {
    Listing.getAll((err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Failed to fetch listings" });
      }
      // ✅ Parse images for each listing
      rows = rows.map(row => {
        try {
          row.images = JSON.parse(row.images || '[]');
        } catch(e) {
          row.images = [];
        }
        return row;
      });
      res.json(rows);
    });
  }
};

/* ================= GET MY LISTINGS (LOGGED-IN USER) ================= */
exports.getMyListings = (req, res) => {
  Listing.getByUser(req.user.id, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch listings" });
    }
    // ✅ Parse images for each listing
    rows = rows.map(row => {
      try {
        row.images = JSON.parse(row.images || '[]');
      } catch(e) {
        row.images = [];
      }
      return row;
    });
    res.json(rows);
  });
};

/* ================= GET LISTING BY ID ================= */
exports.getListingById = (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ message: "Listing ID required" });
  }

  Listing.getById(id, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch listing" });
    }

    if (!row) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // ✅ Parse images from JSON string to array
    try {
      row.images = JSON.parse(row.images || '[]');
    } catch(e) {
      row.images = [];
    }

    res.json(row);
  });
};
