const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const db = require("./config/db");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const freetimeRoutes = require("./routes/freetime");
const bookingRoutes = require("./routes/booking");
const uploadRoutes = require("./routes/upload");
const technologiesRoutues = require("./routes/technologies");
const chatGroupRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message")(io);

const cron = require("node-cron");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: ["https://mentor-steel.vercel.app", "http://localhost:8080"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

db();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: ["https://mentor-steel.vercel.app", "http://localhost:8080"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/freetime", freetimeRoutes);
app.use("/booking", bookingRoutes);
app.use("/v2", uploadRoutes);
app.use("/technologies", technologiesRoutues);
app.use("/chat-groups", chatGroupRoutes);
app.use("/messages", messageRoutes);
app.use("/uploads", express.static("uploads"));

cron.schedule("*/1 * * * *", () => {
  console.log("Running a task every 1 minute");
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("joinRoom", (groupId) => {
    socket.join(groupId);
    console.log(`User joined room: ${groupId}`);
  });

  socket.on("sendMessage", (messageData) => {
    const { groupId, message } = messageData;
    io.to(groupId).emit("newMessage", message);
    console.log(`Message sent to group ${groupId}: ${message}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
