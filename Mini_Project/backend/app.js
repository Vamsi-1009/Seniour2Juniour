const express = require("express");
const cors = require("cors");
const path = require("path");

// ROUTES
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");

// CREATE APP
const app = express();

// =====================
// MIDDLEWARES
// =====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// STATIC FILES (UPLOADS)
// =====================
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// =====================
// API ROUTES
// =====================
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));


// =====================
// HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Academic Exchange Backend Running"
  });
});

module.exports = app;
