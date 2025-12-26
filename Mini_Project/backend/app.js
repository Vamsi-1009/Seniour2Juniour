const express = require("express");
const cors = require("cors");
const path = require("path");

// import routes
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const chatRoutes = require("./routes/chatRoutes");

// create app FIRST
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// serve uploaded images
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// routes
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));

// test route
app.get("/", (req, res) => {
  res.json({ message: "Academic Exchange Backend Running" });
});

module.exports = app;


