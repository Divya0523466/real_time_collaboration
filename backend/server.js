import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Message from "./models/Message.js";
import authRoutes from "./routes/authRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import channelRoutes from "./routes/channelRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  },
});
const onlineUsers = new Map();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", invitationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", channelRoutes);
app.use("/api/messages", messageRoutes);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error || !decoded?.userId) {
      return next(new Error("Invalid or expired token"));
    }
    socket.userId = decoded.userId.toString();
    next();
  });
});

io.engine.on("connection_error", (error) => {
  console.error("Socket connection error:", error.message);
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  const userSockets = onlineUsers.get(socket.userId) || new Set();
  userSockets.add(socket.id);
  onlineUsers.set(socket.userId, userSockets);
  socket.emit("connection-success", {
    message: "Socket connected successfully",
  });

  socket.on("send-direct-message", async ({ receiverId, content } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (!socket.userId) {
      console.log("Direct message rejected: no authenticated socket user");
      socket.emit("send-direct-message-error", {
        message: "Authentication failed",
      });
      return;
    }
    if (!receiverId) {
      console.log("Direct message rejected: receiverId is required");
      socket.emit("send-direct-message-error", {
        message: "Receiver ID is required",
      });
      return;
    }
    if (!trimmedContent) {
      console.log("Direct message rejected: message is empty");
      socket.emit("send-direct-message-error", {
        message: "Message cannot be empty",
      });
      return;
    }

    let receiver;
    try {
      receiver = await User.findById(receiverId).select("_id");
    } catch (error) {
      console.error("Error finding receiver:", error);
      receiver = null;
    }

    if (!receiver) {
      console.log("Direct message rejected: invalid receiverId", receiverId);
      socket.emit("send-direct-message-error", {
        message: "Receiver not found",
      });
      return;
    }

    if (socket.userId.toString() === receiverId.toString()) {
      console.log("Direct message rejected: cannot message yourself");
      socket.emit("send-direct-message-error", {
        message: "Cannot send message to yourself",
      });
      return;
    }

    try {

      const savedMessage = await Message.create({
        senderId: socket.userId,
        receiverId: receiverId.toString(),
        content: trimmedContent,
      });

      const messagePayload = {
        id: savedMessage._id,
        senderId: savedMessage.senderId,
        receiverId: savedMessage.receiverId,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt,
      };

      const receiverSockets = onlineUsers.get(receiverId.toString());
      if (receiverSockets && receiverSockets.size > 0) {
        receiverSockets.forEach((socketId) => {
          io.to(socketId).emit("receive-direct-message", messagePayload);
        });
        console.log("Direct message sent to receiver:", receiverId);
      } else {
        console.log(
          "Receiver is offline, message saved to database:",
          receiverId,
        );
      }

      socket.emit("direct-message-sent", messagePayload);
    } catch (error) {
      console.error("Error saving message:", error);
      socket.emit("send-direct-message-error", {
        message: "Failed to send message",
      });
    }
  });

  socket.on("disconnect", () => {
    const sockets = onlineUsers.get(socket.userId);
    sockets?.delete(socket.id);
    if (!sockets || sockets.size === 0) {
      onlineUsers.delete(socket.userId);
    }
    console.log("Socket disconnected:", socket.id);
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
