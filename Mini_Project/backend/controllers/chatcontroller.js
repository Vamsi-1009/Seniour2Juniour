const Chat = require("../models/Chat");

/*
=================================================
SEND MESSAGE (Buyer ↔ Seller, Listing-specific)
Route: POST /api/chat/send
=================================================
*/
exports.sendMessage = (req, res) => {
  const { listingId, receiverId, message } = req.body;

  if (!listingId || !receiverId || !message) {
    return res.status(400).json({
      message: "Missing required fields"
    });
  }

  Chat.sendMessage(
    {
      listing_id: listingId,
      sender_id: req.user.id,
      receiver_id: receiverId,
      message
    },
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Failed to send message"
        });
      }

      res.json({ message: "Message sent successfully" });
    }
  );
};

/*
=================================================
GET CHAT BETWEEN TWO USERS FOR A LISTING
Route: GET /api/chat/:listingId/:otherUserId
=================================================
*/
exports.getChat = (req, res) => {
  const { listingId, otherUserId } = req.params;

  Chat.getChat(
    listingId,
    req.user.id,
    otherUserId,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Failed to load chat"
        });
      }

      res.json(rows);
    }
  );
};

/*
=================================================
GET ALL CHAT THREADS FOR LOGGED-IN USER
(INBOX like OLX)
Route: GET /api/chat
=================================================
*/
exports.getMyChats = (req, res) => {
  Chat.getMyChats(req.user.id, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: "Failed to load chats"
      });
    }

    res.json(rows);
  });
};
