const PORT = 5000;
const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const app = require("./app");
const server = http.createServer(app);

const db = require("./config/db");

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", socket => {
  console.log("User connected");

  socket.on("joinRoom", roomId => {
    socket.join(roomId);
  });

  socket.on("sendMessage", data => {
    const { roomId, senderId, receiverId, message } = data;

    // save to DB
    db.run(
      `INSERT INTO messages (room_id, sender_id, receiver_id, message)
       VALUES (?, ?, ?, ?)`,
      [roomId, senderId, receiverId, message]
    );

    // send realtime
    io.to(roomId).emit("receiveMessage", data);
  });
});


server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});


