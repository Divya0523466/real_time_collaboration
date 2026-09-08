import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Message from "./models/Message.js";
import ChannelMessage from "./models/ChannelMessage.js";
import getChannelAccess from "./utils/channelAccess.js";
import { formatChannelMessage, buildReplyToMessage } from "./controllers/messageController.js";
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
  const activeChannelRooms = new Set();
  const userSockets = onlineUsers.get(socket.userId) || new Set();
  userSockets.add(socket.id);
  onlineUsers.set(socket.userId, userSockets);
  socket.emit("connection-success", {
    message: "Socket connected successfully",
  });

  socket.on("join-channel", async ({ channelId } = {}) => {
    try {
      const access = await getChannelAccess(socket.userId, channelId);
      if (!access.channel) {
        socket.emit("join-channel-error", { message: "Access denied to channel" });
        return;
      }

      const room = `channel:${access.channel._id}`;
      socket.join(room);
      activeChannelRooms.add(room);
      socket.emit("channel-joined", { channelId: access.channel._id });
    } catch (error) {
      console.error("Error joining channel:", error);
      socket.emit("join-channel-error", { message: "Unable to join channel" });
    }
  });

  socket.on("leave-channel", ({ channelId } = {}) => {
    const room = channelId ? `channel:${channelId}` : null;
    if (room) {
      socket.leave(room);
      activeChannelRooms.delete(room);
    }
  });

  socket.on("send-channel-message", async ({ channelId, content, replyTo = null } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!channelId || !trimmedContent) {
      socket.emit("send-channel-message-error", {
        message: "Channel and message content are required",
      });
      return;
    }

    try {
      const access = await getChannelAccess(socket.userId, channelId);
      if (!access.channel) {
        socket.emit("send-channel-message-error", { message: "Access denied to channel" });
        return;
      }

      const room = `channel:${access.channel._id}`;
      if (!activeChannelRooms.has(room)) {
        socket.emit("send-channel-message-error", { message: "Join the channel before sending messages" });
        return;
      }

      // Validate replyTo if provided — parent must belong to the same channel
      let validatedReplyTo = null;
      if (replyTo) {
        const parent = await ChannelMessage.findOne({
          _id: replyTo,
          channelId: access.channel._id,
        }).populate("senderId", "username");
        if (!parent) {
          socket.emit("send-channel-message-error", { message: "Referenced message not found in this channel" });
          return;
        }
        validatedReplyTo = parent._id;
      }

      const savedMessage = await ChannelMessage.create({
        channelId: access.channel._id,
        senderId: socket.userId,
        content: trimmedContent,
        replyTo: validatedReplyTo,
      });

      // Populate sender and replyTo parent for the broadcast payload
      const populatedMessage = await ChannelMessage.findById(savedMessage._id)
        .populate("senderId", "username avatar")
        .populate({ path: "replyTo", populate: { path: "senderId", select: "username" } });

      const messagePayload = formatChannelMessage(populatedMessage);

      io.to(room).emit("receive-channel-message", messagePayload);
      socket.emit("channel-message-sent", messagePayload);
    } catch (error) {
      console.error("Error sending channel message:", error);
      socket.emit("send-channel-message-error", { message: "Failed to send channel message" });
    }
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

  // ── edit-channel-message ───────────────────────────────────────────────────
  socket.on("edit-channel-message", async ({ messageId, content } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!messageId || !trimmedContent) {
      socket.emit("edit-channel-message-error", { message: "Message ID and content are required" });
      return;
    }

    try {
      const message = await ChannelMessage.findById(messageId);
      if (!message) {
        socket.emit("edit-channel-message-error", { message: "Message not found" });
        return;
      }
      if (message.senderId.toString() !== socket.userId) {
        socket.emit("edit-channel-message-error", { message: "You can only edit your own messages" });
        return;
      }
      if (message.isDeleted) {
        socket.emit("edit-channel-message-error", { message: "Cannot edit a deleted message" });
        return;
      }

      const access = await getChannelAccess(socket.userId, message.channelId.toString());
      if (!access.channel) {
        socket.emit("edit-channel-message-error", { message: "Access denied to channel" });
        return;
      }

      message.content = trimmedContent;
      message.isEdited = true;
      await message.save();

      const payload = {
        id: message._id,
        channelId: message.channelId,
        content: message.content,
        isEdited: true,
        updatedAt: message.updatedAt,
      };

      const room = `channel:${message.channelId}`;
      io.to(room).emit("channel-message-edited", payload);
    } catch (error) {
      console.error("Error editing channel message:", error);
      socket.emit("edit-channel-message-error", { message: "Failed to edit message" });
    }
  });

  // ── delete-channel-message ─────────────────────────────────────────────────
  socket.on("delete-channel-message", async ({ messageId } = {}) => {
    if (!messageId) {
      socket.emit("delete-channel-message-error", { message: "Message ID is required" });
      return;
    }

    try {
      const message = await ChannelMessage.findById(messageId);
      if (!message) {
        socket.emit("delete-channel-message-error", { message: "Message not found" });
        return;
      }
      if (message.senderId.toString() !== socket.userId) {
        socket.emit("delete-channel-message-error", { message: "You can only delete your own messages" });
        return;
      }

      const access = await getChannelAccess(socket.userId, message.channelId.toString());
      if (!access.channel) {
        socket.emit("delete-channel-message-error", { message: "Access denied to channel" });
        return;
      }

      message.isDeleted = true;
      await message.save();

      const payload = { id: message._id, channelId: message.channelId };
      const room = `channel:${message.channelId}`;
      io.to(room).emit("channel-message-deleted", payload);
    } catch (error) {
      console.error("Error deleting channel message:", error);
      socket.emit("delete-channel-message-error", { message: "Failed to delete message" });
    }
  });

  // ── edit-direct-message ────────────────────────────────────────────────────
  socket.on("edit-direct-message", async ({ messageId, content } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!messageId || !trimmedContent) {
      socket.emit("edit-direct-message-error", { message: "Message ID and content are required" });
      return;
    }

    try {
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit("edit-direct-message-error", { message: "Message not found" });
        return;
      }
      if (message.senderId.toString() !== socket.userId) {
        socket.emit("edit-direct-message-error", { message: "You can only edit your own messages" });
        return;
      }
      if (message.isDeleted) {
        socket.emit("edit-direct-message-error", { message: "Cannot edit a deleted message" });
        return;
      }

      message.content = trimmedContent;
      message.isEdited = true;
      await message.save();

      const payload = {
        id: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        isEdited: true,
        updatedAt: message.updatedAt,
      };

      // Emit to both sender and receiver sockets
      const senderSockets = onlineUsers.get(message.senderId.toString());
      const receiverSockets = onlineUsers.get(message.receiverId.toString());
      const targetSockets = new Set([
        ...(senderSockets || []),
        ...(receiverSockets || []),
      ]);
      targetSockets.forEach((socketId) => io.to(socketId).emit("direct-message-edited", payload));
    } catch (error) {
      console.error("Error editing direct message:", error);
      socket.emit("edit-direct-message-error", { message: "Failed to edit message" });
    }
  });

  // ── delete-direct-message ──────────────────────────────────────────────────
  socket.on("delete-direct-message", async ({ messageId } = {}) => {
    if (!messageId) {
      socket.emit("delete-direct-message-error", { message: "Message ID is required" });
      return;
    }

    try {
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit("delete-direct-message-error", { message: "Message not found" });
        return;
      }
      if (message.senderId.toString() !== socket.userId) {
        socket.emit("delete-direct-message-error", { message: "You can only delete your own messages" });
        return;
      }

      message.isDeleted = true;
      await message.save();

      const payload = {
        id: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
      };

      const senderSockets = onlineUsers.get(message.senderId.toString());
      const receiverSockets = onlineUsers.get(message.receiverId.toString());
      const targetSockets = new Set([
        ...(senderSockets || []),
        ...(receiverSockets || []),
      ]);
      targetSockets.forEach((socketId) => io.to(socketId).emit("direct-message-deleted", payload));
    } catch (error) {
      console.error("Error deleting direct message:", error);
      socket.emit("delete-direct-message-error", { message: "Failed to delete message" });
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