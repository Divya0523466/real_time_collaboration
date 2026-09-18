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
import ChannelReadState from "./models/ChannelReadState.js";
import getChannelAccess from "./utils/channelAccess.js";
import { formatChannelMessage } from "./controllers/messageController.js";
import WorkspaceMembership from "./models/WorkspaceMembership.js";
import authRoutes from "./routes/authRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import channelRoutes from "./routes/channelRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { createAndSendNotification } from "./utils/notificationService.js";


const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  },
});

app.set("io", io); //enables to use socket.io in route controllers (saves the io instance to express)

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", invitationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);



//socket io authentication middleware
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


//gets the unique usersIds of users who are online 
const getOnlineUserIds = async () => {
  const sockets = await io.fetchSockets();
  return [...new Set(sockets.map((s) => s.userId).filter(Boolean))];
};

io.on("connection", async (socket) => {
  //user room is created to handle multiple devices or tabs user online status
  const userRoom = `user:${socket.userId}`;
  const existingSockets = await io.in(userRoom).fetchSockets();
  const isFirstConnection = existingSockets.length === 0; // avoids multiple user-online emits

  socket.join(userRoom);
  const activeChannelRooms = new Set();

  // Send current list of online users to newly connected client
  const onlineUsersList = await getOnlineUserIds();
  socket.emit("get-online-users", onlineUsersList);

  // Broadcast to all clients that this user is now online if first active connection
  if (isFirstConnection) {
    io.emit("user-online", { userId: socket.userId });
  }

  socket.emit("connection-success", {
    message: "Socket connected successfully",
  });

  socket.on("request-online-users", async () => {
    const users = await getOnlineUserIds();
    socket.emit("get-online-users", users);
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
    } catch {
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

      // Update sender's read cursor since they just sent a message
      ChannelReadState.findOneAndUpdate(
        { channelId: access.channel._id, userId: socket.userId },
        { $set: { lastReadAt: new Date() } },
        { upsert: true }
      ).catch(() => {});

      io.to(room).emit("receive-channel-message", messagePayload);
      socket.emit("channel-message-sent", messagePayload);

      // Asynchronously dispatch notifications for mentions and channel members
      (async () => {
        try {
          const channel = access.channel;
          let memberUserIds = [];
          if (channel.type === "PUBLIC") {
            const memberships = await WorkspaceMembership.find({ workspaceId: channel.workspaceId }).select("userId");
            memberUserIds = memberships.map((m) => m.userId.toString());
          } else {
            memberUserIds = (channel.members || []).map((m) => m.toString());
          }

          // Parse @mentions
          const mentionMatches = trimmedContent.match(/@([a-zA-Z0-9_.-]+)/g);
          const mentionedUsernames = mentionMatches
            ? [...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))]
            : [];

          let mentionedUserIds = [];
          if (mentionedUsernames.length > 0) {
            const mentionedUsers = await User.find({
              username: { $in: mentionedUsernames.map((u) => new RegExp(`^${u}$`, "i")) },
            }).select("_id username");
            mentionedUserIds = mentionedUsers
              .map((u) => u._id.toString())
              .filter((id) => memberUserIds.includes(id) && id !== socket.userId.toString());
          }

          const senderName = populatedMessage?.senderId?.username || "Someone";
          const snippet = trimmedContent.length > 60 ? trimmedContent.slice(0, 57) + "..." : trimmedContent;

          // 1. Notify mentioned users
          for (const mUserId of mentionedUserIds) {
            await createAndSendNotification(io, {
              recipientId: mUserId,
              actorId: socket.userId,
              type: "CHANNEL_MENTION",
              title: `@${senderName} mentioned you in #${channel.name}`,
              message: snippet,
              workspaceId: channel.workspaceId,
              channelId: channel._id,
              messageId: savedMessage._id,
            });
          }

          // 2. Notify other channel members (excluding sender and already mentioned)
          const otherMemberIds = memberUserIds.filter(
            (id) => id !== socket.userId.toString() && !mentionedUserIds.includes(id)
          );

          for (const recipientId of otherMemberIds) {
            await createAndSendNotification(io, {
              recipientId,
              actorId: socket.userId,
              type: "CHANNEL_MESSAGE",
              title: `New message in #${channel.name}`,
              message: `${senderName}: ${snippet}`,
              workspaceId: channel.workspaceId,
              channelId: channel._id,
              messageId: savedMessage._id,
            });
          }
        } catch {
        }
      })();
    } catch {
      socket.emit("send-channel-message-error", { message: "Failed to send channel message" });
    }
  });

  socket.on("send-direct-message", async ({ receiverId, content } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (!socket.userId) {
      socket.emit("send-direct-message-error", {
        message: "Authentication failed",
      });
      return;
    }
    if (!receiverId) {
      socket.emit("send-direct-message-error", {
        message: "Receiver ID is required",
      });
      return;
    }
    if (!trimmedContent) {
      socket.emit("send-direct-message-error", {
        message: "Message cannot be empty",
      });
      return;
    }

    let receiver;
    try {
      receiver = await User.findById(receiverId).select("_id username");
    } catch {
      receiver = null;
    }

    if (!receiver) {
      socket.emit("send-direct-message-error", {
        message: "Receiver not found",
      });
      return;
    }

    if (socket.userId.toString() === receiverId.toString()) {
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
        isRead: false,
        createdAt: savedMessage.createdAt,
      };

      // Deliver in real-time to receiver's private user room (all their devices/tabs)
      io.to(`user:${receiverId}`).emit("receive-direct-message", messagePayload);
      socket.emit("direct-message-sent", messagePayload);

      // Asynchronously dispatch DM notification
      (async () => {
        try {
          const sender = await User.findById(socket.userId).select("username");
          const senderName = sender?.username || "Someone";
          const snippet = trimmedContent.length > 60 ? trimmedContent.slice(0, 57) + "..." : trimmedContent;

          const isMentioned = receiver?.username
            ? new RegExp(`@${receiver.username}\\b`, "i").test(trimmedContent)
            : false;

          await createAndSendNotification(io, {
            recipientId: receiverId,
            actorId: socket.userId,
            type: isMentioned ? "DM_MENTION" : "DM_NEW_MESSAGE",
            title: isMentioned
              ? `@${senderName} mentioned you in a direct message`
              : `New direct message from ${senderName}`,
            message: snippet,
            messageId: savedMessage._id,
            metadata: {
              senderId: socket.userId,
              receiverId: receiverId.toString(),
            },
          });
        } catch {
        }
      })();
    } catch {
      socket.emit("send-direct-message-error", {
        message: "Failed to send message",
      });
    }
  });

 
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
    } catch {
      socket.emit("edit-channel-message-error", { message: "Failed to edit message" });
    }
  });

  
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
    } catch {
      socket.emit("delete-channel-message-error", { message: "Failed to delete message" });
    }
  });

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

      // Emit to both sender and receiver user rooms
      io.to(`user:${message.senderId}`)
        .to(`user:${message.receiverId}`)
        .emit("direct-message-edited", payload);
    } catch {
      socket.emit("edit-direct-message-error", { message: "Failed to edit message" });
    }
  });

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

      // Emit to both sender and receiver user rooms
      io.to(`user:${message.senderId}`)
        .to(`user:${message.receiverId}`)
        .emit("direct-message-deleted", payload);
    } catch {
      socket.emit("delete-direct-message-error", { message: "Failed to delete message" });
    }
  });

  socket.on("disconnect", async () => {
    // Check if the user has any remaining active sockets in their user room
    const remainingSockets = await io.in(`user:${socket.userId}`).fetchSockets();
    if (remainingSockets.length === 0) {
      io.emit("user-offline", { userId: socket.userId });
    }
  });
});





mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(() => {
    console.error("MongoDB connection failed. Check MONGO_URI and network access.");
  });

server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});