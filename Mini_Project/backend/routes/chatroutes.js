const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

/*
  SEND MESSAGE
  Buyer or Seller sends message for a specific listing
*/
router.post(
  "/send",
  authMiddleware,
  chatController.sendMessage
);

/*
  GET CHAT BETWEEN LOGGED-IN USER & OTHER USER FOR A LISTING
  Example:
  /api/chat/12/45
  (listingId = 12, otherUserId = 45)
*/
router.get(
  "/:listingId/:otherUserId",
  authMiddleware,
  chatController.getChat
);

/*
  GET ALL CHAT THREADS FOR LOGGED-IN USER
  (Inbox like OLX)
*/
router.get(
  "/",
  authMiddleware,
  chatController.getMyChats
);

module.exports = router;
