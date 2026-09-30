import mongoose from "mongoose"
import Message from "../models/Message.js"
import User from "../models/User.js"
import Channel from "../models/Channel.js"
import ChannelMessage from "../models/ChannelMessage.js"
import ChannelReadState from "../models/ChannelReadState.js"
import WorkspaceMembership from "../models/WorkspaceMembership.js"
import File from "../models/File.js"
import Notification from "../models/Notification.js"
import getChannelAccess from "../utils/channelAccess.js"

const populateLegacyMessageAttachments = async (messages) => {
  if (!messages || messages.length === 0) return messages;

  const needsLookup = messages.some(
    (m) =>
      !m.isDeleted &&
      (!m.attachments || m.attachments.length === 0) &&
      typeof m.content === "string" &&
      (m.content.includes("res.cloudinary.com") ||
        /\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)(\?.*)?$/i.test(m.content))
  );

  if (!needsLookup) return messages;

  try {
    const allFiles = await File.find().sort({ createdAt: -1 }).lean();
    if (allFiles.length === 0) return messages;

    return messages.map((msg) => {
      if (
        !msg.isDeleted &&
        (!msg.attachments || msg.attachments.length === 0) &&
        typeof msg.content === "string" &&
        (msg.content.includes("res.cloudinary.com") ||
          /\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)(\?.*)?$/i.test(msg.content))
      ) {
        const trimmed = msg.content.trim();
        const matched = allFiles.find((f) => {
          if (f.url && trimmed.includes(f.url)) return true;
          if (f.previewUrl && trimmed.includes(f.previewUrl)) return true;
          if (f.publicId && trimmed.includes(f.publicId)) return true;
          return false;
        });

        if (matched) {
          const att = {
            id: matched._id,
            fileId: matched._id,
            originalName: matched.originalName,
            url: matched.url,
            previewUrl: matched.previewUrl || "",
            publicId: matched.publicId || "",
            resourceType: matched.resourceType || "auto",
            format: matched.format || "",
            mimeType: matched.mimeType || "",
            size: matched.size || 0,
            extension: matched.extension || "",
          };

          const isPureUrl =
            trimmed === matched.url ||
            trimmed === matched.previewUrl ||
            (matched.publicId && trimmed.endsWith(matched.publicId));

          const obj = typeof msg.toObject === "function" ? msg.toObject() : { ...msg };
          return {
            ...obj,
            content: isPureUrl ? "" : msg.content.replace(matched.url, "").trim(),
            attachments: [att],
          };
        }
      }
      return msg;
    });
  } catch {
    return messages;
  }
};

const getDirectMessages = async (req, res) => {
  try {
    const currentUserId = req.userId
    const { userId: otherUserId } = req.params

    const otherUser = await User.findById(otherUserId).select("_id")
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" })
    }

    if (currentUserId.toString() === otherUserId.toString()) {
      return res.status(400).json({ message: "Cannot message yourself" })
    }

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    })
      .select("_id senderId receiverId content attachments mentions createdAt updatedAt isEdited isDeleted isRead starredBy")
      .sort({ createdAt: 1 })

    const populatedMessages = await populateLegacyMessageAttachments(messages);

    // Automatically mark unread messages from otherUser as read
    await Message.updateMany(
      { senderId: otherUserId, receiverId: currentUserId, isRead: false },
      { $set: { isRead: true } }
    )

    return res.json({
      messages: populatedMessages.map((msg) => ({
        id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.isDeleted ? null : msg.content,
        attachments: msg.isDeleted ? [] : (msg.attachments || []),
        mentions: msg.isDeleted
          ? []
          : (msg.mentions || []).map((m) => ({
              userId: m.userId?._id ? m.userId._id.toString() : m.userId?.toString() || m.toString(),
            })),
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        isEdited: msg.isEdited || false,
        isDeleted: msg.isDeleted || false,
        isRead: msg.isRead || false,
        isStarred: Boolean(
          msg.starredBy &&
          msg.starredBy.some((id) => id.toString() === currentUserId.toString())
        ),
      })),
    })
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message })
  }
}

const buildReplyToMessage = (parent) => {
  if (!parent) return null
  return {
    id: parent._id,
    content: parent.isDeleted ? null : parent.content,
    attachments: parent.isDeleted ? [] : (parent.attachments || []),
    isDeleted: parent.isDeleted || false,
    sender: parent.senderId?._id
      ? {
          id: parent.senderId._id,
          username: parent.senderId.username,
        }
      : undefined,
  }
}

const formatChannelMessage = (message, currentUserId = null) => ({
  id: message._id,
  channelId: message.channelId,
  senderId: message.senderId?._id || message.senderId,
  sender: message.senderId?._id
    ? {
        id: message.senderId._id,
        username: message.senderId.username,
        avatar: message.senderId.avatar,
      }
    : undefined,
  content: message.isDeleted ? null : message.content,
  attachments: message.isDeleted ? [] : (message.attachments || []).map((att) => ({
    id: att.id || att._id,
    fileId: att.fileId || att._id,
    originalName: att.originalName,
    url: att.url,
    previewUrl: att.previewUrl || "",
    publicId: att.publicId || "",
    resourceType: att.resourceType || "auto",
    format: att.format || "",
    mimeType: att.mimeType || "",
    size: att.size || 0,
    extension: att.extension || "",
  })),
  mentions: message.isDeleted
    ? []
    : (message.mentions || []).map((m) => ({
        userId: m.userId?._id ? m.userId._id.toString() : m.userId?.toString() || m.toString(),
      })),
  replyTo: message.replyTo?._id || message.replyTo || null,
  replyToMessage: buildReplyToMessage(message.replyTo?._id ? message.replyTo : null),
  isEdited: message.isEdited || false,
  isDeleted: message.isDeleted || false,
  isStarred: Boolean(
    message.starredBy &&
    currentUserId &&
    message.starredBy.some((id) => id.toString() === currentUserId.toString())
  ),
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
})

const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params
    const access = await getChannelAccess(req.userId, channelId)

    if (!access.channel) {
      return res.status(403).json({ message: "Access denied to channel" })
    }

    const messages = await ChannelMessage.find({ channelId })
      .populate("senderId", "username avatar")
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: "username" },
      })
      .sort({ createdAt: 1 })

    const populatedMessages = await populateLegacyMessageAttachments(messages);

    // Automatically update channel read cursor for current user
    await ChannelReadState.findOneAndUpdate(
      { channelId, userId: req.userId },
      { $set: { lastReadAt: new Date() } },
      { upsert: true }
    )

    return res.json({
      messages: populatedMessages.map((msg) => formatChannelMessage(msg, req.userId)),
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const getUnreadMessageCounts = async (req, res) => {
  try {
    const { workspaceId } = req.query
    const userId = req.userId

    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      return res.status(400).json({ message: "Valid workspaceId query parameter is required" })
    }

    const membership = await WorkspaceMembership.findOne({ userId, workspaceId })
    if (!membership) {
      return res.status(403).json({ message: "Access denied to workspace" })
    }

    // 1. Channels unread counts
    let channelFilter = { workspaceId }
    if (membership.role === "MEMBER") {
      channelFilter = {
        workspaceId,
        $or: [
          { type: "PUBLIC" },
          { type: "PRIVATE", members: userId },
        ],
      }
    }

    const accessibleChannels = await Channel.find(channelFilter).select("_id")
    const channelIds = accessibleChannels.map((c) => c._id)

    // Find all read states for user in these channels
    const readStates = await ChannelReadState.find({
      userId,
      channelId: { $in: channelIds },
    })

    const readStateMap = new Map()
    readStates.forEach((rs) => {
      readStateMap.set(rs.channelId.toString(), rs.lastReadAt)
    })

    const channelCounts = {}
    await Promise.all(
      channelIds.map(async (cId) => {
        const cIdStr = cId.toString()
        const lastReadAt = readStateMap.get(cIdStr) || membership.createdAt || new Date(0)

        const count = await ChannelMessage.countDocuments({
          channelId: cId,
          createdAt: { $gt: lastReadAt },
          senderId: { $ne: userId },
          isDeleted: false,
        })
        if (count > 0) {
          channelCounts[cIdStr] = count
        }
      })
    )

    // 2. Direct Messages unread counts (from members of this workspace)
    const workspaceMemberships = await WorkspaceMembership.find({ workspaceId }).select("userId")
    const workspaceMemberUserIds = workspaceMemberships
      .map((m) => m.userId)
      .filter((mUserId) => mUserId && mUserId.toString() !== userId.toString())

    const dmCounts = {}
    if (workspaceMemberUserIds.length > 0) {
      const dmAgg = await Message.aggregate([
        {
          $match: {
            receiverId: new mongoose.Types.ObjectId(userId),
            senderId: { $in: workspaceMemberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
            isRead: false,
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$senderId",
            count: { $sum: 1 },
          },
        },
      ])

      dmAgg.forEach((entry) => {
        dmCounts[entry._id.toString()] = entry.count
      })
    }

    return res.json({
      channels: channelCounts,
      dms: dmCounts,
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const markChannelAsRead = async (req, res) => {
  try {
    const { channelId } = req.params
    const userId = req.userId

    const access = await getChannelAccess(userId, channelId)
    if (!access.channel) {
      return res.status(403).json({ message: "Access denied to channel" })
    }

    const now = new Date()
    await ChannelReadState.findOneAndUpdate(
      { channelId, userId },
      { $set: { lastReadAt: now } },
      { upsert: true, new: true }
    )

    return res.json({ success: true, channelId, lastReadAt: now })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const markDirectMessagesAsRead = async (req, res) => {
  try {
    const { userId: senderUserId } = req.params
    const currentUserId = req.userId

    if (!mongoose.isValidObjectId(senderUserId)) {
      return res.status(400).json({ message: "Invalid user ID" })
    }

    await Message.updateMany(
      {
        senderId: senderUserId,
        receiverId: currentUserId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    )

    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const isFileMessageRecord = (msg) => {
  if (!msg) return false;
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) return true;
  const content = (msg.content || "").toString().trim().toLowerCase();
  if (!content) return false;
  return (
    content.includes("res.cloudinary.com") ||
    /\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)(\?.*)?$/i.test(content)
  );
};

const starMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    const userObjId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    let message = await ChannelMessage.findById(messageId);
    let type = "CHANNEL";

    if (!message) {
      message = await Message.findById(messageId);
      type = "DIRECT";
    }

    if (!message || message.isDeleted) {
      return res.status(404).json({ message: "Message not found" });
    }

    
    if (isFileMessageRecord(message)) {
      return res.status(400).json({ message: "Only text messages can be starred" });
    }

    if (type === "CHANNEL") {
      const access = await getChannelAccess(userId, message.channelId);
      if (!access.channel) {
        return res.status(403).json({ message: "Access denied to channel" });
      }
      await ChannelMessage.findByIdAndUpdate(messageId, {
        $addToSet: { starredBy: userObjId },
      });
    } else {
      if (
        message.senderId.toString() !== userId.toString() &&
        message.receiverId.toString() !== userId.toString()
      ) {
        return res.status(403).json({ message: "Access denied to message" });
      }
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { starredBy: userObjId },
      });
    }

    return res.json({ success: true, messageId, isStarred: true });
  } catch (error) {
    console.error("Error in starMessage:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const unstarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    const userObjId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    await Promise.all([
      ChannelMessage.findByIdAndUpdate(messageId, {
        $pull: { starredBy: { $in: [userId, userObjId] } },
      }),
      Message.findByIdAndUpdate(messageId, {
        $pull: { starredBy: { $in: [userId, userObjId] } },
      }),
    ]);

    return res.json({ success: true, messageId, isStarred: false });
  } catch (error) {
    console.error("Error in unstarMessage:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getStarredMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const userObjId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    const { workspaceId } = req.query;
    const wsIdStr =
      workspaceId && workspaceId !== "undefined" && workspaceId !== "null"
        ? workspaceId.toString()
        : null;

    // 1. Channel messages starred by current user
    const channelMessages = await ChannelMessage.find({
      $or: [{ starredBy: userId }, { starredBy: userObjId }],
      isDeleted: false,
    })
      .populate("channelId", "name workspaceId type")
      .populate("senderId", "username avatar")
      .sort({ updatedAt: -1 })
      .lean();

    const validChannelMessages = [];
    for (const msg of channelMessages) {
      if (!msg.channelId) continue;
      // Only include text messages
      if (isFileMessageRecord(msg)) continue;
      if (wsIdStr && msg.channelId.workspaceId?.toString() !== wsIdStr) {
        continue;
      }

      const access = await getChannelAccess(userId, msg.channelId._id);
      if (access.channel) {
        validChannelMessages.push({
          id: msg._id,
          messageId: msg._id,
          type: "CHANNEL",
          channelId: msg.channelId._id,
          channelName: msg.channelId.name,
          workspaceId: msg.channelId.workspaceId,
          content: msg.content,
          mentions: (msg.mentions || []).map((m) => ({
            userId: m.userId?._id ? m.userId._id.toString() : m.userId?.toString() || m.toString(),
          })),
          sender: {
            id: msg.senderId?._id,
            username: msg.senderId?.username || "Unknown",
            avatar: msg.senderId?.avatar,
          },
          createdAt: msg.createdAt,
          isStarred: true,
        });
      }
    }

    // 2. DM messages starred by current user
    const dmMessages = await Message.find({
      $and: [
        { $or: [{ starredBy: userId }, { starredBy: userObjId }] },
        { isDeleted: false },
        {
          $or: [
            { senderId: { $in: [userId, userObjId] } },
            { receiverId: { $in: [userId, userObjId] } },
          ],
        },
      ],
    })
      .populate("senderId", "username avatar")
      .populate("receiverId", "username avatar")
      .sort({ updatedAt: -1 })
      .lean();

    const validDmMessages = dmMessages
      .filter((msg) => !isFileMessageRecord(msg))
      .map((msg) => {
        const otherUser =
          msg.senderId?._id?.toString() === userId.toString() ? msg.receiverId : msg.senderId;
        return {
          id: msg._id,
          messageId: msg._id,
          type: "DIRECT",
          otherUserId: otherUser?._id,
          otherUserName: otherUser?.username || "Direct Message",
          content: msg.content,
          mentions: (msg.mentions || []).map((m) => ({
            userId: m.userId?._id ? m.userId._id.toString() : m.userId?.toString() || m.toString(),
          })),
          sender: {
            id: msg.senderId?._id,
            username: msg.senderId?.username || "Unknown",
            avatar: msg.senderId?.avatar,
          },
          createdAt: msg.createdAt,
          isStarred: true,
        };
      });

    const allStarred = [...validChannelMessages, ...validDmMessages].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({ starredMessages: allStarred });
  } catch (error) {
    console.error("Error in getStarredMessages:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getUserMentions = async (req, res) => {
  try {
    const userId = req.userId;
    const userObjId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    const { workspaceId } = req.query;

    const currentUser = await User.findById(userId).select("username").lean();
    const currentUsername = currentUser?.username || "";

    // 1. Fetch mention notifications for current user to track read status and message IDs
    const mentionNotifications = await Notification.find({
      recipientId: userObjId,
      type: { $in: ["CHANNEL_MENTION", "DM_MENTION"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const notifByMessageId = new Map();
    for (const notif of mentionNotifications) {
      if (notif.messageId) {
        notifByMessageId.set(notif.messageId.toString(), notif);
      }
    }

    // 2. Determine accessible channels for current user in the workspace
    let channelQuery = {};
    if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") {
      channelQuery.workspaceId = workspaceId;
    }
    const allChannelsInScope = await Channel.find(channelQuery).lean();
    const accessibleChannelMap = new Map();

    for (const chan of allChannelsInScope) {
      if (chan.type === "PUBLIC") {
        accessibleChannelMap.set(chan._id.toString(), chan);
      } else {
        const isMember = (chan.members || []).some(
          (m) => (m._id || m)?.toString() === userId.toString()
        );
        if (isMember) {
          accessibleChannelMap.set(chan._id.toString(), chan);
        }
      }
    }

    const accessibleChannelIds = Array.from(accessibleChannelMap.keys()).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // 3. Find channel messages mentioning this user:
    // Either by explicit mention object, or regex username/@all in accessible channels
    const channelConditions = [
      { "mentions.userId": userId },
      { "mentions.userId": userObjId },
    ];
    if (accessibleChannelIds.length > 0 && currentUsername) {
      const escapedUsername = currentUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      channelConditions.push({
        channelId: { $in: accessibleChannelIds },
        senderId: { $ne: userObjId },
        content: { $regex: `@(${escapedUsername}|all)\\b`, $options: "i" },
      });
    }

    // Also include messages referenced by channel mention notifications
    const notifMsgIds = mentionNotifications
      .filter((n) => n.type === "CHANNEL_MENTION" && n.messageId)
      .map((n) => n.messageId);
    if (notifMsgIds.length > 0) {
      channelConditions.push({ _id: { $in: notifMsgIds } });
    }

    const channelMessages = await ChannelMessage.find({
      $or: channelConditions,
      isDeleted: false,
    })
      .populate("senderId", "username avatar")
      .populate("channelId", "name type workspaceId")
      .sort({ createdAt: -1 })
      .lean();

    const validChannelMessages = [];
    const seenMessageIds = new Set();

    for (const msg of channelMessages) {
      const msgIdStr = msg._id.toString();
      if (seenMessageIds.has(msgIdStr)) continue;
      seenMessageIds.add(msgIdStr);

      const chan = msg.channelId;
      if (!chan) continue;

      if (
        workspaceId &&
        workspaceId !== "undefined" &&
        workspaceId !== "null" &&
        chan.workspaceId?.toString() !== workspaceId.toString()
      ) {
        continue;
      }

      const matchingNotif = notifByMessageId.get(msgIdStr);

      validChannelMessages.push({
        id: msg._id,
        messageId: msg._id,
        type: "CHANNEL",
        channelId: chan._id,
        channelName: chan.name,
        channelType: chan.type,
        content: msg.content,
        mentions: (msg.mentions || []).map((m) => ({
          userId: m.userId?._id ? m.userId._id.toString() : m.userId?.toString() || m.toString(),
        })),
        sender: {
          id: msg.senderId?._id,
          username: msg.senderId?.username || "Unknown",
          avatar: msg.senderId?.avatar,
        },
        isRead: matchingNotif ? matchingNotif.isRead : true,
        notificationId: matchingNotif ? matchingNotif._id : null,
        createdAt: msg.createdAt,
      });
    }

    // 4. DM messages mentioning current user
    const dmConditions = [
      { "mentions.userId": userId },
      { "mentions.userId": userObjId },
    ];
    if (currentUsername) {
      const escapedUsername = currentUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      dmConditions.push({
        receiverId: userObjId,
        senderId: { $ne: userObjId },
        content: { $regex: `@${escapedUsername}\\b`, $options: "i" },
      });
    }

    const dmNotifMsgIds = mentionNotifications
      .filter((n) => n.type === "DM_MENTION" && n.messageId)
      .map((n) => n.messageId);
    if (dmNotifMsgIds.length > 0) {
      dmConditions.push({ _id: { $in: dmNotifMsgIds } });
    }

    const dmMessages = await Message.find({
      $or: dmConditions,
      isDeleted: false,
    })
      .populate("senderId", "username avatar")
      .populate("receiverId", "username avatar")
      .sort({ createdAt: -1 })
      .lean();

    const validDmMessages = [];
    for (const msg of dmMessages) {
      const msgIdStr = msg._id.toString();
      if (seenMessageIds.has(msgIdStr)) continue;
      seenMessageIds.add(msgIdStr);

      const otherUser =
        msg.senderId?._id?.toString() === userId.toString() ? msg.receiverId : msg.senderId;

      const matchingNotif = notifByMessageId.get(msgIdStr);

      validDmMessages.push({
        id: msg._id,
        messageId: msg._id,
        type: "DIRECT",
        otherUserId: otherUser?._id,
        otherUserName: otherUser?.username || "Direct Message",
        content: msg.content,
        mentions: (msg.mentions || []).map((m) => ({
          userId: m.userId?._id ? m.userId._id.toString() : m.userId?.toString() || m.toString(),
        })),
        sender: {
          id: msg.senderId?._id,
          username: msg.senderId?.username || "Unknown",
          avatar: msg.senderId?.avatar,
        },
        isRead: matchingNotif ? matchingNotif.isRead : true,
        notificationId: matchingNotif ? matchingNotif._id : null,
        createdAt: msg.createdAt,
      });
    }

    // 5. Fallback: Any mention notifications whose messages weren't queried directly
    for (const notif of mentionNotifications) {
      const notifMsgIdStr = notif.messageId ? notif.messageId.toString() : notif._id.toString();
      if (seenMessageIds.has(notifMsgIdStr)) continue;
      seenMessageIds.add(notifMsgIdStr);

      const isChannel = notif.type === "CHANNEL_MENTION";
      const chan = notif.channelId;

      if (
        workspaceId &&
        workspaceId !== "undefined" &&
        workspaceId !== "null" &&
        notif.workspaceId &&
        notif.workspaceId.toString() !== workspaceId.toString()
      ) {
        continue;
      }

      const actor = notif.actorId;
      validChannelMessages.push({
        id: notif._id,
        messageId: notif.messageId || notif._id,
        type: isChannel ? "CHANNEL" : "DIRECT",
        channelId: chan?._id || chan,
        channelName: chan?.name || "channel",
        otherUserId: notif.metadata?.senderId || actor?._id,
        otherUserName: actor?.username || "Direct Message",
        content: notif.message,
        mentions: [{ userId: userId }],
        sender: {
          id: actor?._id,
          username: actor?.username || "Someone",
          avatar: actor?.avatar,
        },
        isRead: notif.isRead,
        notificationId: notif._id,
        createdAt: notif.createdAt,
      });
    }

    const allMentions = [...validChannelMessages, ...validDmMessages].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json({ mentions: allMentions });
  } catch (error) {
    console.error("Error in getUserMentions:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export {
  getDirectMessages,
  getChannelMessages,
  formatChannelMessage,
  buildReplyToMessage,
  getUnreadMessageCounts,
  markChannelAsRead,
  markDirectMessagesAsRead,
  starMessage,
  unstarMessage,
  getStarredMessages,
  getUserMentions,
}
