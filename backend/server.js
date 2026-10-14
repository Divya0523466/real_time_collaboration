import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import User from "./models/User.js";
import Message from "./models/Message.js";
import ChannelMessage from "./models/ChannelMessage.js";
import ChannelReadState from "./models/ChannelReadState.js";
import getChannelAccess from "./utils/channelAccess.js";
import { formatChannelMessage } from "./controllers/messageController.js";
import WorkspaceMembership from "./models/WorkspaceMembership.js";
import SpaceReadState from "./models/SpaceReadState.js";
import authRoutes from "./routes/authRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import channelRoutes from "./routes/channelRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import spaceRoutes from "./routes/spaceRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import Group from "./models/Group.js";
import { formatGroupMessage } from "./controllers/groupController.js";
import { createAndSendNotification } from "./utils/notificationService.js";
import { validateChannelMentions, validateDirectMentions, validateSpaceMentions } from "./utils/mentionValidation.js";
import getSpaceAccess from "./utils/spaceAccess.js";
import { formatSpaceMessage } from "./controllers/spaceController.js";


if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = process.env.FRONTEND_URL.replace(/\/+$/, "");
}

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Dynamic origin callback avoids mismatch caused by trailing slashes
      callback(null, true);
    },
    credentials: true,
  },
});

app.set("io", io); 

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", invitationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);



//socket io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error || !decoded?.userId || decoded?.purpose === "2fa_pending") {
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
  const activeSpaceRooms = new Set();

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

  socket.on("join-space", async ({ spaceId } = {}) => {
    try {
      const { space } = await getSpaceAccess(socket.userId, spaceId);
      if (!space) {
        socket.emit("join-space-error", { message: "Access denied to Space" });
        return;
      }

      const room = `space:${space._id}`;
      socket.join(room);
      activeSpaceRooms.add(room);
      socket.emit("space-joined", { spaceId: space._id });
    } catch {
      socket.emit("join-space-error", { message: "Unable to join Space" });
    }
  });

  socket.on("leave-space", ({ spaceId } = {}) => {
    const room = spaceId ? `space:${spaceId}` : null;
    if (room) {
      socket.leave(room);
      activeSpaceRooms.delete(room);
    }
  });

  socket.on("join-group", async ({ groupId } = {}) => {
    try {
      if (!groupId || !mongoose.isValidObjectId(groupId)) {
        socket.emit("join-group-error", { message: "Invalid group ID" });
        return;
      }
      const group = await Group.findById(groupId);
      if (!group || !group.members.some((m) => m.toString() === socket.userId)) {
        socket.emit("join-group-error", { message: "Access denied to group" });
        return;
      }
      const room = `group:${groupId}`;
      socket.join(room);
      socket.emit("group-joined", { groupId });
    } catch {
      socket.emit("join-group-error", { message: "Unable to join group" });
    }
  });

  socket.on("leave-group", ({ groupId } = {}) => {
    if (groupId) {
      socket.leave(`group:${groupId}`);
    }
  });

  socket.on("send-channel-message", async ({ channelId, content, attachments = [], replyTo = null, mentions = [], forwardedFrom = null } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!channelId || (!trimmedContent && !hasAttachments && !forwardedFrom)) {
      socket.emit("send-channel-message-error", {
        message: "Channel and message content, attachment, or forwarded message are required",
      });
      return;
    }

    try {
      const access = await getChannelAccess(socket.userId, channelId);
      if (!access.channel) {
        socket.emit("send-channel-message-error", { message: "Access denied to channel" });
        return;
      }

      const mentionValidation = await validateChannelMentions(mentions, access.channel, socket.userId);
      if (!mentionValidation.isValid) {
        socket.emit("send-channel-message-error", { message: mentionValidation.error });
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

      const formattedAttachments = (attachments || []).map((att) => ({
        fileId: att.fileId || att.id || att._id,
        originalName: att.originalName || "Attachment",
        url: att.url,
        previewUrl: att.previewUrl || "",
        publicId: att.publicId || "",
        resourceType: att.resourceType || "auto",
        format: att.format || "",
        mimeType: att.mimeType || "",
        size: att.size || 0,
        extension: att.extension || "",
      }));

      const savedMessage = await ChannelMessage.create({
        channelId: access.channel._id,
        senderId: socket.userId,
        content: trimmedContent,
        attachments: formattedAttachments,
        mentions: mentionValidation.mentions,
        replyTo: validatedReplyTo,
        forwardedFrom: forwardedFrom || null,
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
          const sender = await User.findById(socket.userId).select("username");
          const senderName = sender?.username || "Someone";
          const channel = access.channel;
          let memberUserIds = [];
          if (channel.type === "PUBLIC") {
            const memberships = await WorkspaceMembership.find({ workspaceId: channel.workspaceId }).select("userId");
            memberUserIds = memberships.map((m) => m.userId.toString());
          } else {
            memberUserIds = (channel.members || []).map((m) => m.toString());
          }

          // Parse @mentions from message content
          const mentionMatches = trimmedContent.match(/@([a-zA-Z0-9_.-]+)/g);
          const mentionedUsernames = mentionMatches
            ? [...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))]
            : [];

          let textMentionUserIds = [];
          const hasAllMention = mentionedUsernames.includes("all");
          if (hasAllMention) {
            textMentionUserIds = memberUserIds.filter((id) => id !== socket.userId.toString());
          } else if (mentionedUsernames.length > 0) {
            const mentionedUsers = await User.find({
              username: { $in: mentionedUsernames.map((u) => new RegExp(`^${u}$`, "i")) },
            }).select("_id username");
            textMentionUserIds = mentionedUsers
              .map((u) => u._id.toString())
              .filter((id) => memberUserIds.includes(id) && id !== socket.userId.toString());
          }

          // Extract mentioned user IDs from savedMessage.mentions (e.g. from autocomplete)
          // ONLY users who are actual members of this channel are eligible for notifications
          const explicitMentionIds = (savedMessage.mentions || [])
            .map((m) => (m.userId?._id || m.userId || m)?.toString())
            .filter((id) => id && memberUserIds.includes(id) && id !== socket.userId.toString());

          // Final list of mentioned channel participants to notify
          const mentionedUserIds = [...new Set([...explicitMentionIds, ...textMentionUserIds])];

          // Ensure savedMessage in MongoDB has all mentioned user IDs recorded
          if (mentionedUserIds.length > 0) {
            await ChannelMessage.updateOne(
              { _id: savedMessage._id },
              {
                $addToSet: {
                  mentions: {
                    $each: mentionedUserIds.map((id) => ({
                      userId: new mongoose.Types.ObjectId(id),
                    })),
                  },
                },
              }
            ).catch((err) => console.error("Error updating channel mentions in DB:", err));
          }

          const snippet = trimmedContent
            ? (trimmedContent.length > 60 ? trimmedContent.slice(0, 57) + "..." : trimmedContent)
            : (hasAttachments ? `[Attachment: ${formattedAttachments[0]?.originalName || "File"}]` : "Sent a message");

          // 1. Notify mentioned users
          for (const mUserId of mentionedUserIds) {
            await createAndSendNotification(io, {
              recipientId: mUserId,
              actorId: socket.userId,
              type: "CHANNEL_MENTION",
              title: hasAllMention
                ? `@${senderName} mentioned @all in #${channel.name}`
                : `@${senderName} mentioned you in #${channel.name}`,
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
        } catch (notifErr) {
          console.error("Error dispatching channel notifications:", notifErr);
        }
      })();
    } catch {
      socket.emit("send-channel-message-error", { message: "Failed to send channel message" });
    }
  });

  socket.on("send-space-message", async ({ spaceId, content, attachments = [], replyTo = null, mentions = [], forwardedFrom = null } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!spaceId || (!trimmedContent && !hasAttachments && !forwardedFrom)) {
      socket.emit("send-space-message-error", {
        message: "Space and message content, attachment, or forwarded message are required",
      });
      return;
    }

    try {
      const { space } = await getSpaceAccess(socket.userId, spaceId);
      if (!space) {
        socket.emit("send-space-message-error", { message: "Access denied to Space" });
        return;
      }

      const mentionValidation = await validateSpaceMentions(mentions, space, socket.userId);
      if (!mentionValidation.isValid) {
        socket.emit("send-space-message-error", { message: mentionValidation.error });
        return;
      }

      const room = `space:${space._id}`;
      if (!activeSpaceRooms.has(room)) {
        socket.join(room);
        activeSpaceRooms.add(room);
      }

      let validatedReplyTo = null;
      if (replyTo) {
        const parent = await ChannelMessage.findOne({
          _id: replyTo,
          spaceId: space._id,
        }).populate("senderId", "username");
        if (!parent) {
          socket.emit("send-space-message-error", { message: "Referenced message not found in this Space" });
          return;
        }
        validatedReplyTo = parent._id;
      }

      const formattedAttachments = (attachments || []).map((att) => {
        const rawFileId = att.fileId || att.id || att._id;
        const validFileId = rawFileId && mongoose.isValidObjectId(rawFileId) ? rawFileId : undefined;
        return {
          fileId: validFileId,
          originalName: att.originalName || "Attachment",
          url: att.url,
          previewUrl: att.previewUrl || "",
          publicId: att.publicId || "",
          resourceType: att.resourceType || "auto",
          format: att.format || "",
          mimeType: att.mimeType || "",
          size: att.size || 0,
          extension: att.extension || "",
        };
      });

      const savedMessage = await ChannelMessage.create({
        spaceId: space._id,
        senderId: socket.userId,
        content: trimmedContent,
        attachments: formattedAttachments,
        mentions: mentionValidation.mentions,
        replyTo: validatedReplyTo,
        forwardedFrom: forwardedFrom || null,
      });

      const populatedMessage = await ChannelMessage.findById(savedMessage._id)
        .populate("senderId", "username avatar")
        .populate({ path: "replyTo", populate: { path: "senderId", select: "username" } });

      const messagePayload = formatSpaceMessage(populatedMessage, socket.userId);

      // Update sender's read cursor
      SpaceReadState.findOneAndUpdate(
        { spaceId: space._id, userId: socket.userId },
        { $set: { lastReadAt: new Date() } },
        { upsert: true }
      ).catch(() => {});

      io.to(room).emit("receive-space-message", messagePayload);
      socket.emit("space-message-sent", messagePayload);

      // Dispatch notifications for space mentions and other members
      (async () => {
        try {
          const sender = await User.findById(socket.userId).select("username");
          const senderName = sender?.username || "Someone";
          const memberUserIds = (space.members || []).map((m) => m.toString());

          // Parse text mentions
          const mentionMatches = trimmedContent.match(/@([a-zA-Z0-9_.-]+)/g);
          const mentionedUsernames = mentionMatches
            ? [...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))]
            : [];

          let textMentionUserIds = [];
          if (mentionedUsernames.length > 0) {
            const mentionedUsers = await User.find({
              username: { $in: mentionedUsernames.map((u) => new RegExp(`^${u}$`, "i")) },
            }).select("_id username");
            textMentionUserIds = mentionedUsers
              .map((u) => u._id.toString())
              .filter((id) => memberUserIds.includes(id) && id !== socket.userId.toString());
          }

          const explicitMentionIds = (savedMessage.mentions || [])
            .map((m) => (m.userId?._id || m.userId || m)?.toString())
            .filter((id) => id && memberUserIds.includes(id) && id !== socket.userId.toString());

          const mentionedUserIds = [...new Set([...explicitMentionIds, ...textMentionUserIds])];

          if (mentionedUserIds.length > 0) {
            await ChannelMessage.updateOne(
              { _id: savedMessage._id },
              {
                $addToSet: {
                  mentions: {
                    $each: mentionedUserIds.map((id) => ({
                      userId: new mongoose.Types.ObjectId(id),
                    })),
                  },
                },
              }
            ).catch(() => {});
          }

          const snippet = trimmedContent
            ? (trimmedContent.length > 60 ? trimmedContent.slice(0, 57) + "..." : trimmedContent)
            : (hasAttachments ? `[Attachment: ${formattedAttachments[0]?.originalName || "File"}]` : "Sent a message");

          // Notify mentioned users
          for (const mUserId of mentionedUserIds) {
            await createAndSendNotification(io, {
              recipientId: mUserId,
              actorId: socket.userId,
              type: "SPACE_MENTION",
              title: `@${senderName} mentioned you in Space "${space.name}"`,
              message: snippet,
              workspaceId: space.workspaceId,
              spaceId: space._id,
              messageId: savedMessage._id,
            });
          }

          // Notify other space members
          const otherMemberIds = memberUserIds.filter(
            (id) => id !== socket.userId.toString() && !mentionedUserIds.includes(id)
          );

          for (const recipientId of otherMemberIds) {
            await createAndSendNotification(io, {
              recipientId,
              actorId: socket.userId,
              type: "SPACE_MESSAGE",
              title: `New message in Space "${space.name}"`,
              message: `${senderName}: ${snippet}`,
              workspaceId: space.workspaceId,
              spaceId: space._id,
              messageId: savedMessage._id,
            });
          }
        } catch (notifErr) {
          console.error("Error dispatching space notifications:", notifErr);
        }
      })();
    } catch {
      socket.emit("send-space-message-error", { message: "Failed to send space message" });
    }
  });

  socket.on("send-group-message", async ({ groupId, content, attachments = [] } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!groupId || (!trimmedContent && !hasAttachments)) {
      socket.emit("send-group-message-error", { message: "Group and message content or attachment required" });
      return;
    }

    try {
      const group = await Group.findById(groupId);
      if (!group || !group.members.some((m) => m.toString() === socket.userId)) {
        socket.emit("send-group-message-error", { message: "Access denied to group" });
        return;
      }

      const room = `group:${groupId}`;
      socket.join(room);

      const savedMessage = await ChannelMessage.create({
        groupId: group._id,
        senderId: socket.userId,
        content: trimmedContent,
        attachments: attachments || [],
      });

      const populated = await ChannelMessage.findById(savedMessage._id).populate(
        "senderId",
        "username avatar email displayName"
      );

      const formatted = formatGroupMessage(populated);
      io.to(room).emit("receive-group-message", formatted);
    } catch {
      socket.emit("send-group-message-error", { message: "Failed to send group message" });
    }
  });

  socket.on("send-direct-message", async ({ receiverId, content, attachments = [], mentions = [], forwardedFrom = null } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

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
    if (!trimmedContent && !hasAttachments && !forwardedFrom) {
      socket.emit("send-direct-message-error", {
        message: "Message content, attachment, or forwarded message is required",
      });
      return;
    }

    let receiver;
    try {
      receiver = await User.findById(receiverId).select("_id username blockedUsers");
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

    const sender = await User.findById(socket.userId).select("blockedUsers");
    const isSenderBlocking = (sender?.blockedUsers || []).some(
      (id) => id.toString() === receiverId.toString()
    );
    const isReceiverBlocking = (receiver?.blockedUsers || []).some(
      (id) => id.toString() === socket.userId.toString()
    );
    if (isSenderBlocking || isReceiverBlocking) {
      socket.emit("send-direct-message-error", {
        message: isSenderBlocking
          ? "You have blocked this user. Unblock them to send messages."
          : "This user is not accepting direct messages at this time.",
      });
      return;
    }

    try {
      // Validate mentions if provided
      const mentionValidation = await validateDirectMentions(mentions, socket.userId, receiverId);
      if (!mentionValidation.isValid) {
        socket.emit("send-direct-message-error", {
          message: mentionValidation.error,
        });
        return;
      }

      const formattedAttachments = (attachments || []).map((att) => ({
        fileId: att.fileId || att.id || att._id,
        originalName: att.originalName || "Attachment",
        url: att.url,
        previewUrl: att.previewUrl || "",
        publicId: att.publicId || "",
        resourceType: att.resourceType || "auto",
        format: att.format || "",
        mimeType: att.mimeType || "",
        size: att.size || 0,
        extension: att.extension || "",
      }));

      const savedMessage = await Message.create({
        senderId: socket.userId,
        receiverId: receiverId.toString(),
        content: trimmedContent,
        attachments: formattedAttachments,
        mentions: mentionValidation.mentions,
        forwardedFrom: forwardedFrom || null,
      });

      const messagePayload = {
        id: savedMessage._id,
        senderId: savedMessage.senderId,
        receiverId: savedMessage.receiverId,
        content: savedMessage.content,
        attachments: savedMessage.attachments || [],
        mentions: (savedMessage.mentions || []).map((m) => ({
          userId: m.userId?.toString() || m.toString(),
        })),
        forwardedFrom: savedMessage.forwardedFrom || null,
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
          const snippet = trimmedContent
            ? (trimmedContent.length > 60 ? trimmedContent.slice(0, 57) + "..." : trimmedContent)
            : (hasAttachments ? `[Attachment: ${formattedAttachments[0]?.originalName || "File"}]` : "Sent a message");

          const isReceiverMentioned =
            (savedMessage.mentions || []).some(
              (m) => (m.userId?._id || m.userId || m)?.toString() === receiverId.toString()
            ) ||
            (receiver?.username
              ? new RegExp(`@${receiver.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(trimmedContent)
              : false);

          // If receiver was mentioned, ensure receiver is in mentions
          if (isReceiverMentioned) {
            await Message.updateOne(
              { _id: savedMessage._id },
              { $addToSet: { mentions: { userId: new mongoose.Types.ObjectId(receiverId) } } }
            ).catch(() => {});
          }

          // In a 1-to-1 direct message, only the conversation participant (receiverId) receives a notification.
          // Mentioning third-party users (e.g. @R) is a reference only — they must NOT receive notifications,
          // socket events, or Mentions tab entries.
          await createAndSendNotification(io, {
            recipientId: receiverId,
            actorId: socket.userId,
            type: isReceiverMentioned ? "DM_MENTION" : "DM_NEW_MESSAGE",
            title: isReceiverMentioned
              ? `@${senderName} mentioned you in a direct message`
              : `New direct message from ${senderName}`,
            message: snippet,
            messageId: savedMessage._id,
            metadata: {
              senderId: socket.userId,
              receiverId: receiverId.toString(),
            },
          });
        } catch (dmNotifErr) {
          console.error("Error dispatching DM notifications:", dmNotifErr);
        }
      })();
    } catch {
      socket.emit("send-direct-message-error", {
        message: "Failed to send message",
      });
    }
  });

  socket.on("forward-message", async ({ targetType, targetId, content = "", forwardedFrom } = {}) => {
    if (!socket.userId) {
      socket.emit("forward-message-error", { message: "Authentication required" });
      return;
    }
    if (!targetType || !targetId || !forwardedFrom) {
      socket.emit("forward-message-error", { message: "targetType, targetId, and forwardedFrom are required" });
      return;
    }

    try {
      const formattedAttachments = (forwardedFrom.originalAttachments || []).map((att) => ({
        fileId: att.fileId || att.id || att._id,
        originalName: att.originalName || "Attachment",
        url: att.url,
        previewUrl: att.previewUrl || "",
        publicId: att.publicId || "",
        resourceType: att.resourceType || "auto",
        format: att.format || "",
        mimeType: att.mimeType || "",
        size: att.size || 0,
        extension: att.extension || "",
      }));

      const formattedForwardedFrom = {
        originalMessageId: forwardedFrom.originalMessageId ? new mongoose.Types.ObjectId(forwardedFrom.originalMessageId) : null,
        senderId: forwardedFrom.senderId ? new mongoose.Types.ObjectId(forwardedFrom.senderId) : null,
        senderName: forwardedFrom.senderName || "Unknown",
        senderAvatar: forwardedFrom.senderAvatar || "",
        originalContent: forwardedFrom.originalContent || "",
        originalAttachments: formattedAttachments,
        originalCreatedAt: forwardedFrom.originalCreatedAt ? new Date(forwardedFrom.originalCreatedAt) : new Date(),
        sourceType: forwardedFrom.sourceType || "",
        sourceName: forwardedFrom.sourceName || "",
        sourceId: forwardedFrom.sourceId || forwardedFrom.channelId || forwardedFrom.otherUserId || "",
      };

      const trimmedContent = typeof content === "string" ? content.trim() : "";

      if (targetType === "CHANNEL") {
        const access = await getChannelAccess(socket.userId, targetId);
        if (!access.channel) {
          socket.emit("forward-message-error", { message: "Access denied to channel" });
          return;
        }

        const savedMessage = await ChannelMessage.create({
          channelId: access.channel._id,
          senderId: socket.userId,
          content: trimmedContent,
          attachments: [],
          mentions: [],
          forwardedFrom: formattedForwardedFrom,
        });

        const populatedMessage = await ChannelMessage.findById(savedMessage._id)
          .populate("senderId", "username avatar");

        const messagePayload = formatChannelMessage(populatedMessage, socket.userId);

        const room = `channel:${access.channel._id}`;
        io.to(room).emit("receive-channel-message", messagePayload);
        socket.emit("forward-message-success", { message: messagePayload, targetType: "CHANNEL" });
      } else if (targetType === "DIRECT") {
        if (socket.userId.toString() === targetId.toString()) {
          socket.emit("forward-message-error", { message: "Cannot forward message to yourself" });
          return;
        }

        const targetUser = await User.findById(targetId).select("_id username avatar");
        if (!targetUser) {
          socket.emit("forward-message-error", { message: "User not found" });
          return;
        }

        const savedMessage = await Message.create({
          senderId: socket.userId,
          receiverId: targetId,
          content: trimmedContent,
          attachments: [],
          mentions: [],
          forwardedFrom: formattedForwardedFrom,
        });

        const messagePayload = {
          id: savedMessage._id,
          senderId: savedMessage.senderId,
          receiverId: savedMessage.receiverId,
          content: savedMessage.content,
          attachments: savedMessage.attachments || [],
          mentions: [],
          forwardedFrom: savedMessage.forwardedFrom || null,
          isRead: false,
          createdAt: savedMessage.createdAt,
        };

        io.to(`user:${targetId}`).emit("receive-direct-message", messagePayload);
        io.to(`user:${socket.userId}`).emit("direct-message-sent", messagePayload);
        socket.emit("forward-message-success", { message: messagePayload, targetType: "DIRECT" });
      } else if (targetType === "SPACE") {
        const { space } = await getSpaceAccess(socket.userId, targetId);
        if (!space) {
          socket.emit("forward-message-error", { message: "Access denied to Space" });
          return;
        }

        const savedMessage = await ChannelMessage.create({
          spaceId: space._id,
          senderId: socket.userId,
          content: trimmedContent,
          attachments: [],
          mentions: [],
          forwardedFrom: formattedForwardedFrom,
        });

        const populatedMessage = await ChannelMessage.findById(savedMessage._id)
          .populate("senderId", "username avatar");

        const messagePayload = formatSpaceMessage(populatedMessage, socket.userId);

        const room = `space:${space._id}`;
        io.to(room).emit("receive-space-message", messagePayload);
        socket.emit("forward-message-success", { message: messagePayload, targetType: "SPACE" });
      } else {
        socket.emit("forward-message-error", { message: "Invalid targetType" });
      }
    } catch {
      socket.emit("forward-message-error", { message: "Failed to forward message" });
    }
  });

  socket.on("edit-channel-message", async ({ messageId, content, mentions } = {}) => {
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

      if (mentions !== undefined) {
        const mentionValidation = await validateChannelMentions(mentions, access.channel, socket.userId);
        if (!mentionValidation.isValid) {
          socket.emit("edit-channel-message-error", { message: mentionValidation.error });
          return;
        }
        message.mentions = mentionValidation.mentions;
      }

      message.content = trimmedContent;
      message.isEdited = true;
      await message.save();

      const payload = {
        id: message._id,
        channelId: message.channelId,
        content: message.content,
        mentions: (message.mentions || []).map((m) => ({
          userId: m.userId?._id ? m.userId._id.toString() : m.userId?.toString() || m.toString(),
        })),
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

  socket.on("edit-space-message", async ({ messageId, content, mentions } = {}) => {
    const trimmedContent = typeof content === "string" ? content.trim() : "";
    if (!messageId || !trimmedContent) {
      socket.emit("edit-space-message-error", { message: "Message ID and content are required" });
      return;
    }

    try {
      const message = await ChannelMessage.findById(messageId);
      if (!message || !message.spaceId) {
        socket.emit("edit-space-message-error", { message: "Message not found" });
        return;
      }
      if (message.senderId.toString() !== socket.userId) {
        socket.emit("edit-space-message-error", { message: "You can only edit your own messages" });
        return;
      }
      if (message.isDeleted) {
        socket.emit("edit-space-message-error", { message: "Cannot edit a deleted message" });
        return;
      }

      const { space } = await getSpaceAccess(socket.userId, message.spaceId.toString());
      if (!space) {
        socket.emit("edit-space-message-error", { message: "Access denied to Space" });
        return;
      }

      if (mentions !== undefined) {
        const mentionValidation = await validateSpaceMentions(mentions, space, socket.userId);
        if (!mentionValidation.isValid) {
          socket.emit("edit-space-message-error", { message: mentionValidation.error });
          return;
        }
        message.mentions = mentionValidation.mentions;
      }

      message.content = trimmedContent;
      message.isEdited = true;
      await message.save();

      const payload = {
        id: message._id,
        spaceId: message.spaceId,
        content: message.content,
        mentions: (message.mentions || []).map((m) => ({
          userId: m.userId?._id ? m.userId._id.toString() : m.userId?.toString() || m.toString(),
        })),
        isEdited: true,
        updatedAt: message.updatedAt,
      };

      const room = `space:${message.spaceId}`;
      io.to(room).emit("space-message-edited", payload);
    } catch {
      socket.emit("edit-space-message-error", { message: "Failed to edit message" });
    }
  });

  socket.on("delete-space-message", async ({ messageId } = {}) => {
    if (!messageId) {
      socket.emit("delete-space-message-error", { message: "Message ID is required" });
      return;
    }

    try {
      const message = await ChannelMessage.findById(messageId);
      if (!message || !message.spaceId) {
        socket.emit("delete-space-message-error", { message: "Message not found" });
        return;
      }

      const { space, isSuperAdmin: isSuper } = await getSpaceAccess(socket.userId, message.spaceId.toString());
      if (!space) {
        socket.emit("delete-space-message-error", { message: "Access denied to Space" });
        return;
      }

      if (message.senderId.toString() !== socket.userId && !isSuper) {
        socket.emit("delete-space-message-error", { message: "You can only delete your own messages" });
        return;
      }

      message.isDeleted = true;
      await message.save();

      const payload = { id: message._id, spaceId: message.spaceId };
      const room = `space:${message.spaceId}`;
      io.to(room).emit("space-message-deleted", payload);
    } catch {
      socket.emit("delete-space-message-error", { message: "Failed to delete message" });
    }
  });

  socket.on("edit-direct-message", async ({ messageId, content, mentions } = {}) => {
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

      if (mentions !== undefined) {
        const mentionValidation = await validateDirectMentions(mentions, message.senderId, message.receiverId);
        if (!mentionValidation.isValid) {
          socket.emit("edit-direct-message-error", { message: mentionValidation.error });
          return;
        }
        message.mentions = mentionValidation.mentions;
      }

      message.content = trimmedContent;
      message.isEdited = true;
      await message.save();

      const payload = {
        id: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        mentions: (message.mentions || []).map((m) => ({
          userId: m.userId?.toString() || m.toString(),
        })),
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