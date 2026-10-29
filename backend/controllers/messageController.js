import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Channel from "../models/Channel.js";
import ChannelMessage from "../models/ChannelMessage.js";
import ChannelReadState from "../models/ChannelReadState.js";
import WorkspaceMembership from "../models/WorkspaceMembership.js";
import File from "../models/File.js";
import Notification from "../models/Notification.js";
import getChannelAccess from "../utils/channelAccess.js";
import getSpaceAccess, { isUserSuperAdmin } from "../utils/spaceAccess.js";
import Space from "../models/Space.js";
import SpaceReadState from "../models/SpaceReadState.js";

const populateLegacyMessageAttachments = async (messages) => {
  if (!messages || messages.length === 0) return messages;

  const candidateMessages = messages.filter(
    (m) =>
      !m.isDeleted &&
      (!m.attachments || m.attachments.length === 0) &&
      typeof m.content === "string" &&
      (m.content.includes("res.cloudinary.com") ||
        /\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)(\?.*)?$/i.test(
          m.content,
        )),
  );

  if (candidateMessages.length === 0) return messages;

  try {
    // extracting urls from messages
    const urlCandidates = new Set();
    for (const msg of candidateMessages) {
      const trimmed = msg.content.trim();
      urlCandidates.add(trimmed);
      const extractedUrls = trimmed.match(/https?:\/\/[^\s]+/g);
      if (extractedUrls) {
        extractedUrls.forEach((u) => urlCandidates.add(u));
      }
    }

    const urlList = Array.from(urlCandidates).filter(Boolean);
    if (urlList.length === 0) return messages;

    //metadata of files with matching url or preview url
    const matchedFiles = await File.find({
      $or: [{ url: { $in: urlList } }, { previewUrl: { $in: urlList } }],
    }).lean();

    if (matchedFiles.length === 0) return messages;

    return messages.map((msg) => {
      if (
        !msg.isDeleted &&
        (!msg.attachments || msg.attachments.length === 0) &&
        typeof msg.content === "string" &&
        (msg.content.includes("res.cloudinary.com") ||
          /\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)(\?.*)?$/i.test(
            msg.content,
          ))
      ) {
        const trimmed = msg.content.trim();
        const matched = matchedFiles.find((f) => {
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

          const obj =
            typeof msg.toObject === "function" ? msg.toObject() : { ...msg };
          return {
            ...obj,
            content: isPureUrl
              ? ""
              : msg.content.replace(matched.url, "").trim(),
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
    const currentUserId = req.userId;
    const { userId: otherUserId } = req.params;

    const otherUser = await User.findById(otherUserId).select("_id");
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUserId.toString() === otherUserId.toString()) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;
    const otherUserObjId = mongoose.Types.ObjectId.isValid(otherUserId)
      ? new mongoose.Types.ObjectId(otherUserId)
      : otherUserId;

    const messages = await Message.find({
      $or: [
        { senderId: userObjId, receiverId: otherUserObjId },
        { senderId: otherUserObjId, receiverId: userObjId },
      ],
      deletedBy: { $nin: [userObjId, currentUserId] },
    })
      .populate("senderId", "username avatar")
      .select(
        "_id senderId receiverId content attachments mentions forwardedFrom createdAt updatedAt isEdited isDeleted isRead starredBy isPinned pinnedBy pinnedAt reactions",
      )
      .sort({ createdAt: 1 })
      .lean();

    const populatedMessages = await populateLegacyMessageAttachments(messages);

    await Message.updateMany(
      { senderId: otherUserId, receiverId: currentUserId, isRead: false },
      { $set: { isRead: true } },
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${otherUserId}`).emit("direct-messages-read", {
        readerId: currentUserId,
      });
    }

    return res.json({
      messages: populatedMessages.map((msg) => ({
        id: msg._id,
        senderId: msg.senderId?._id || msg.senderId,
        sender: msg.senderId?._id
          ? {
              id: msg.senderId._id,
              username: msg.senderId.username,
              avatar: msg.senderId.avatar,
            }
          : undefined,
        receiverId: msg.receiverId,
        content: msg.isDeleted ? null : msg.content,
        attachments: msg.isDeleted ? [] : msg.attachments || [],
        mentions: msg.isDeleted
          ? []
          : (msg.mentions || []).map((m) => ({
              userId: m.userId?._id
                ? m.userId._id.toString()
                : m.userId?.toString() || m.toString(),
            })),
        forwardedFrom: msg.isDeleted ? null : msg.forwardedFrom || null,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        isEdited: msg.isEdited || false,
        isDeleted: msg.isDeleted || false,
        isRead: msg.isRead || false,
        isStarred: Boolean(
          msg.starredBy &&
          msg.starredBy.some(
            (id) => id.toString() === currentUserId.toString(),
          ),
        ),
        reactions: msg.reactions || [],
        isPinned: msg.isPinned || false,
        pinnedBy: msg.pinnedBy || null,
        pinnedAt: msg.pinnedAt || null,
      })),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const buildReplyToMessage = (parent) => {
  if (!parent) return null;
  return {
    id: parent._id,
    content: parent.isDeleted ? null : parent.content,
    attachments: parent.isDeleted ? [] : parent.attachments || [],
    isDeleted: parent.isDeleted || false,
    sender: parent.senderId?._id
      ? {
          id: parent.senderId._id,
          username: parent.senderId.username,
        }
      : undefined,
  };
};

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
  attachments: message.isDeleted
    ? []
    : (message.attachments || []).map((att) => ({
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
        userId: m.userId?._id
          ? m.userId._id.toString()
          : m.userId?.toString() || m.toString(),
      })),
  replyTo: message.replyTo?._id || message.replyTo || null,
  replyToMessage: buildReplyToMessage(
    message.replyTo?._id ? message.replyTo : null,
  ),
  forwardedFrom: message.isDeleted ? null : message.forwardedFrom || null,
  isEdited: message.isEdited || false,
  isDeleted: message.isDeleted || false,
  isStarred: Boolean(
    message.starredBy &&
    currentUserId &&
    message.starredBy.some((id) => id.toString() === currentUserId.toString()),
  ),
  reactions: message.reactions || [],
  readBy: message.readBy || [],
  isPinned: message.isPinned || false,
  pinnedBy: message.pinnedBy || null,
  pinnedAt: message.pinnedAt || null,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const access = await getChannelAccess(req.userId, channelId);

    if (!access.channel) {
      return res.status(403).json({ message: "Access denied to channel" });
    }

    const messages = await ChannelMessage.find({ channelId })
      .populate("senderId", "username avatar")
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: "username" },
      })
      .sort({ createdAt: 1 })
      .lean();

    const populatedMessages = await populateLegacyMessageAttachments(messages);

    // Automatically update channel read cursor for current user
    await ChannelReadState.findOneAndUpdate(
      { channelId, userId: req.userId },
      { $set: { lastReadAt: new Date() } },
      { upsert: true },
    );

    const currentUser = await User.findById(req.userId).select("username avatar");
    if (currentUser) {
      await ChannelMessage.updateMany(
        {
          channelId,
          senderId: { $ne: req.userId },
          "readBy.userId": { $ne: req.userId },
        },
        {
          $addToSet: {
            readBy: {
              userId: currentUser._id,
              username: currentUser.username,
              avatar: currentUser.avatar || "",
            },
          },
        }
      );
      const io = req.app.get("io");
      if (io) {
        io.to(`channel:${channelId}`).emit("channel-messages-read", {
          channelId,
          user: {
            userId: currentUser._id,
            username: currentUser.username,
            avatar: currentUser.avatar || "",
          },
        });
      }
    }

    return res.json({
      messages: populatedMessages.map((msg) =>
        formatChannelMessage(msg, req.userId),
      ),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getUnreadMessageCounts = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const userId = req.userId;

    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      return res
        .status(400)
        .json({ message: "Valid workspaceId query parameter is required" });
    }

    const isSuperAdmin = await isUserSuperAdmin(userId);
    const membership = await WorkspaceMembership.findOne({
      userId,
      workspaceId,
    });
    if (!membership && !isSuperAdmin) {
      return res.status(403).json({ message: "Access denied to workspace" });
    }

    // 1. Channels unread counts
    let channelFilter = { workspaceId };
    if (!isSuperAdmin && membership && membership.role === "MEMBER") {
      channelFilter = {
        workspaceId,
        $or: [{ type: "PUBLIC" }, { type: "PRIVATE", members: userId }],
      };
    }

    const accessibleChannels = await Channel.find(channelFilter).select("_id");
    const channelIds = accessibleChannels.map((c) => c._id);

    // Find all read states for user in these channels
    const readStates = await ChannelReadState.find({
      userId,
      channelId: { $in: channelIds },
    });

    const readStateMap = new Map();
    readStates.forEach((rs) => {
      readStateMap.set(rs.channelId.toString(), rs.lastReadAt);
    });

    const channelCounts = {};
    if (channelIds.length > 0) {
      const channelConditions = channelIds.map((cId) => {
        const cIdStr = cId.toString();
        const lastReadAt =
          readStateMap.get(cIdStr) || membership.createdAt || new Date(0);
        return {
          channelId: new mongoose.Types.ObjectId(cId),
          createdAt: { $gt: lastReadAt },
        };
      });

      const channelAgg = await ChannelMessage.aggregate([
        {
          $match: {
            $or: channelConditions,
            senderId: { $ne: new mongoose.Types.ObjectId(userId) },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$channelId",
            count: { $sum: 1 },
          },
        },
      ]);

      channelAgg.forEach((entry) => {
        if (entry.count > 0) {
          channelCounts[entry._id.toString()] = entry.count;
        }
      });
    }

    // 2. Direct Messages unread counts (from members of this workspace)
    const workspaceMemberships = await WorkspaceMembership.find({
      workspaceId,
    }).select("userId");
    const workspaceMemberUserIds = workspaceMemberships
      .map((m) => m.userId)
      .filter((mUserId) => mUserId && mUserId.toString() !== userId.toString());

    const dmCounts = {};
    if (workspaceMemberUserIds.length > 0) {
      const dmAgg = await Message.aggregate([
        {
          $match: {
            receiverId: new mongoose.Types.ObjectId(userId),
            senderId: {
              $in: workspaceMemberUserIds.map(
                (id) => new mongoose.Types.ObjectId(id),
              ),
            },
            isRead: false,
            isDeleted: false,
            deletedBy: { $ne: new mongoose.Types.ObjectId(userId) },
          },
        },
        {
          $group: {
            _id: "$senderId",
            count: { $sum: 1 },
          },
        },
      ]);

      dmAgg.forEach((entry) => {
        dmCounts[entry._id.toString()] = entry.count;
      });
    }

    return res.json({
      channels: channelCounts,
      dms: dmCounts,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const markChannelAsRead = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.userId;

    const access = await getChannelAccess(userId, channelId);
    if (!access.channel) {
      return res.status(403).json({ message: "Access denied to channel" });
    }

    const now = new Date();
    await ChannelReadState.findOneAndUpdate(
      { channelId, userId },
      { $set: { lastReadAt: now } },
      { upsert: true, new: true },
    );

    await Notification.updateMany(
      { recipientId: userId, channelId, isRead: false },
      { $set: { isRead: true } },
    );

    return res.json({ success: true, channelId, lastReadAt: now });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const markChannelAsUnread = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.userId;

    const access = await getChannelAccess(userId, channelId);
    if (!access.channel) {
      return res.status(403).json({ message: "Access denied to channel" });
    }

    // Set lastReadAt to past (epoch 0) so all messages are considered unread
    const past = new Date(0);
    await ChannelReadState.findOneAndUpdate(
      { channelId, userId },
      { $set: { lastReadAt: past } },
      { upsert: true, new: true },
    );

    return res.json({ success: true, channelId, lastReadAt: past });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const markDirectMessagesAsRead = async (req, res) => {
  try {
    const { userId: senderUserId } = req.params;
    const currentUserId = req.userId;

    if (!mongoose.isValidObjectId(senderUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    await Message.updateMany(
      {
        senderId: senderUserId,
        receiverId: currentUserId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      },
    );

    await Notification.updateMany(
      {
        recipientId: currentUserId,
        actorId: senderUserId,
        type: "DM_MENTION",
        isRead: false,
      },
      { $set: { isRead: true } },
    );

    return res.json({ success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const markDirectMessagesAsUnread = async (req, res) => {
  try {
    const { userId: senderUserId } = req.params;
    const currentUserId = req.userId;

    if (!mongoose.isValidObjectId(senderUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Find the latest message between senderUserId and currentUserId (or received from senderUserId)
    const latestMessage = await Message.findOne({
      senderId: senderUserId,
      receiverId: currentUserId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    if (latestMessage) {
      latestMessage.isRead = false;
      await latestMessage.save();
    }

    return res.json({ success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const isFileMessageRecord = (msg) => {
  if (!msg) return false;
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) return true;
  const content = (msg.content || "").toString().trim().toLowerCase();
  if (!content) return false;
  return (
    content.includes("res.cloudinary.com") ||
    /\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)(\?.*)?$/i.test(
      content,
    )
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
      return res
        .status(400)
        .json({ message: "Only text messages can be starred" });
    }

    if (type === "CHANNEL") {
      if (message.spaceId) {
        const { space } = await getSpaceAccess(userId, message.spaceId);
        if (!space) {
          return res.status(403).json({ message: "Access denied to Space" });
        }
      } else {
        const access = await getChannelAccess(userId, message.channelId);
        if (!access.channel) {
          return res.status(403).json({ message: "Access denied to channel" });
        }
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
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
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
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
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
            userId: m.userId?._id
              ? m.userId._id.toString()
              : m.userId?.toString() || m.toString(),
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
        { deletedBy: { $nin: [userId, userObjId] } },
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
          msg.senderId?._id?.toString() === userId.toString()
            ? msg.receiverId
            : msg.senderId;
        return {
          id: msg._id,
          messageId: msg._id,
          type: "DIRECT",
          otherUserId: otherUser?._id,
          otherUserName: otherUser?.username || "Direct Message",
          content: msg.content,
          mentions: (msg.mentions || []).map((m) => ({
            userId: m.userId?._id
              ? m.userId._id.toString()
              : m.userId?.toString() || m.toString(),
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

    // 1b. Space messages starred by current user
    const spaceMessages = await ChannelMessage.find({
      spaceId: { $ne: null },
      $or: [{ starredBy: userId }, { starredBy: userObjId }],
      isDeleted: false,
    })
      .populate("spaceId", "name workspaceId")
      .populate("senderId", "username avatar")
      .sort({ updatedAt: -1 })
      .lean();

    const validSpaceMessages = [];
    for (const msg of spaceMessages) {
      if (!msg.spaceId) continue;
      if (isFileMessageRecord(msg)) continue;
      if (
        wsIdStr &&
        msg.spaceId.workspaceId &&
        msg.spaceId.workspaceId.toString() !== wsIdStr
      ) {
        continue;
      }

      const { space } = await getSpaceAccess(userId, msg.spaceId._id);
      if (space) {
        validSpaceMessages.push({
          id: msg._id,
          messageId: msg._id,
          type: "SPACE",
          spaceId: msg.spaceId._id,
          spaceName: msg.spaceId.name,
          workspaceId: msg.spaceId.workspaceId,
          content: msg.content,
          mentions: (msg.mentions || []).map((m) => ({
            userId: m.userId?._id
              ? m.userId._id.toString()
              : m.userId?.toString() || m.toString(),
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

    const allStarred = [
      ...validChannelMessages,
      ...validSpaceMessages,
      ...validDmMessages,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ starredMessages: allStarred });
  } catch (error) {
    console.error("Error in getStarredMessages:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
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
      type: { $in: ["CHANNEL_MENTION", "DM_MENTION", "SPACE_MENTION"] },
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
          (m) => (m._id || m)?.toString() === userId.toString(),
        );
        if (isMember) {
          accessibleChannelMap.set(chan._id.toString(), chan);
        }
      }
    }

    const accessibleChannelIds = Array.from(accessibleChannelMap.keys()).map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const readStates = await ChannelReadState.find({
      userId,
      channelId: { $in: accessibleChannelIds },
    }).lean();

    const readStateMap = new Map();
    readStates.forEach((rs) => {
      readStateMap.set(rs.channelId.toString(), rs.lastReadAt);
    });

    // 3. Find channel messages mentioning this user in channels the user has access to
    let channelMessages = [];
    if (accessibleChannelIds.length > 0) {
      const channelMentionFilters = [
        { "mentions.userId": { $in: [userId, userObjId] } },
      ];
      if (currentUsername) {
        const escapedUsername = currentUsername.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        channelMentionFilters.push({
          content: { $regex: `@(${escapedUsername}|all)\\b`, $options: "i" },
        });
      }
      const channelNotifMsgIds = mentionNotifications
        .filter((n) => n.type === "CHANNEL_MENTION" && n.messageId)
        .map((n) => n.messageId);
      if (channelNotifMsgIds.length > 0) {
        channelMentionFilters.push({ _id: { $in: channelNotifMsgIds } });
      }

      channelMessages = await ChannelMessage.find({
        channelId: { $in: accessibleChannelIds },
        senderId: { $ne: userObjId },
        $or: channelMentionFilters,
        isDeleted: false,
      })
        .populate("senderId", "username avatar")
        .populate("channelId", "name type workspaceId")
        .sort({ createdAt: -1 })
        .lean();
    }

    const validChannelMessages = [];
    const seenMessageIds = new Set();

    for (const msg of channelMessages) {
      const msgIdStr = msg._id.toString();
      if (seenMessageIds.has(msgIdStr)) continue;
      seenMessageIds.add(msgIdStr);

      const chan = msg.channelId;
      if (
        !chan ||
        !accessibleChannelMap.has(chan._id?.toString() || chan.toString())
      )
        continue;

      if (
        workspaceId &&
        workspaceId !== "undefined" &&
        workspaceId !== "null" &&
        chan.workspaceId?.toString() !== workspaceId.toString()
      ) {
        continue;
      }

      const matchingNotif = notifByMessageId.get(msgIdStr);

      const chanLastRead = readStateMap.get(chan._id.toString());
      const isRead = matchingNotif
        ? Boolean(matchingNotif.isRead)
        : chanLastRead
          ? new Date(msg.createdAt) <= new Date(chanLastRead)
          : false;

      validChannelMessages.push({
        id: msg._id,
        messageId: msg._id,
        type: "CHANNEL",
        channelId: chan._id,
        channelName: chan.name,
        channelType: chan.type,
        content: msg.content,
        mentions: (msg.mentions || []).map((m) => ({
          userId: m.userId?._id
            ? m.userId._id.toString()
            : m.userId?.toString() || m.toString(),
        })),
        sender: {
          id: msg.senderId?._id,
          username: msg.senderId?.username || "Unknown",
          avatar: msg.senderId?.avatar,
        },
        isRead,
        notificationId: matchingNotif ? matchingNotif._id : null,
        createdAt: msg.createdAt,
      });
    }

    // 3b. Find space messages mentioning this user in accessible spaces
    let spaceQuery = {};
    const isSuper = await isUserSuperAdmin(userId);
    if (!isSuper) {
      spaceQuery.members = userObjId;
    }
    if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") {
      spaceQuery.$or = [
        { workspaceId },
        { workspaceId: null },
        { workspaceId: { $exists: false } },
      ];
    }
    const allSpacesInScope = await Space.find(spaceQuery).lean();
    const accessibleSpaceMap = new Map();
    for (const sp of allSpacesInScope) {
      accessibleSpaceMap.set(sp._id.toString(), sp);
    }
    const accessibleSpaceIds = Array.from(accessibleSpaceMap.keys()).map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const spaceReadStates = await SpaceReadState.find({
      userId,
      spaceId: { $in: accessibleSpaceIds },
    }).lean();

    const spaceReadStateMap = new Map();
    spaceReadStates.forEach((rs) => {
      spaceReadStateMap.set(rs.spaceId.toString(), rs.lastReadAt);
    });

    let spaceMessages = [];
    if (accessibleSpaceIds.length > 0) {
      const spaceMentionFilters = [
        { "mentions.userId": { $in: [userId, userObjId] } },
      ];
      if (currentUsername) {
        const escapedUsername = currentUsername.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        spaceMentionFilters.push({
          content: { $regex: `@(${escapedUsername}|all)\\b`, $options: "i" },
        });
      }
      const spaceNotifMsgIds = mentionNotifications
        .filter((n) => n.type === "SPACE_MENTION" && n.messageId)
        .map((n) => n.messageId);
      if (spaceNotifMsgIds.length > 0) {
        spaceMentionFilters.push({ _id: { $in: spaceNotifMsgIds } });
      }

      spaceMessages = await ChannelMessage.find({
        spaceId: { $in: accessibleSpaceIds },
        senderId: { $ne: userObjId },
        $or: spaceMentionFilters,
        isDeleted: false,
      })
        .populate("senderId", "username avatar")
        .populate("spaceId", "name workspaceId")
        .sort({ createdAt: -1 })
        .lean();
    }

    const validSpaceMessages = [];
    for (const msg of spaceMessages) {
      const msgIdStr = msg._id.toString();
      if (seenMessageIds.has(msgIdStr)) continue;
      seenMessageIds.add(msgIdStr);

      const sp = msg.spaceId;
      if (!sp || !accessibleSpaceMap.has(sp._id?.toString() || sp.toString()))
        continue;

      if (
        workspaceId &&
        workspaceId !== "undefined" &&
        workspaceId !== "null" &&
        sp.workspaceId &&
        sp.workspaceId.toString() !== workspaceId.toString()
      ) {
        continue;
      }

      const matchingNotif = notifByMessageId.get(msgIdStr);
      const spaceLastRead = spaceReadStateMap.get(sp._id.toString());
      const isRead = matchingNotif
        ? Boolean(matchingNotif.isRead)
        : spaceLastRead
          ? new Date(msg.createdAt) <= new Date(spaceLastRead)
          : false;

      validSpaceMessages.push({
        id: msg._id,
        messageId: msg._id,
        type: "SPACE",
        spaceId: sp._id,
        spaceName: sp.name,
        workspaceId: sp.workspaceId,
        content: msg.content,
        mentions: (msg.mentions || []).map((m) => ({
          userId: m.userId?._id
            ? m.userId._id.toString()
            : m.userId?.toString() || m.toString(),
        })),
        sender: {
          id: msg.senderId?._id,
          username: msg.senderId?.username || "Unknown",
          avatar: msg.senderId?.avatar,
        },
        isRead,
        notificationId: matchingNotif ? matchingNotif._id : null,
        createdAt: msg.createdAt,
      });
    }

    // 4. DM messages mentioning current user
    // A DM mention only belongs to the current user if the current user is a conversation participant (receiverId)
    const dmSubFilters = [{ "mentions.userId": { $in: [userId, userObjId] } }];
    if (currentUsername) {
      const escapedUsername = currentUsername.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      dmSubFilters.push({
        content: { $regex: `@${escapedUsername}\\b`, $options: "i" },
      });
    }
    const dmNotifMsgIds = mentionNotifications
      .filter((n) => n.type === "DM_MENTION" && n.messageId)
      .map((n) => n.messageId);
    if (dmNotifMsgIds.length > 0) {
      dmSubFilters.push({ _id: { $in: dmNotifMsgIds } });
    }

    // Current user MUST be the receiver in this DM conversation (not an outside reference)
    const dmMessages = await Message.find({
      receiverId: userObjId,
      senderId: { $ne: userObjId },
      deletedBy: { $nin: [userId, userObjId] },
      $or: dmSubFilters,
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
        msg.senderId?._id?.toString() === userId.toString()
          ? msg.receiverId
          : msg.senderId;

      const matchingNotif = notifByMessageId.get(msgIdStr);

      validDmMessages.push({
        id: msg._id,
        messageId: msg._id,
        type: "DIRECT",
        otherUserId: otherUser?._id,
        otherUserName: otherUser?.username || "Direct Message",
        content: msg.content,
        mentions: (msg.mentions || []).map((m) => ({
          userId: m.userId?._id
            ? m.userId._id.toString()
            : m.userId?.toString() || m.toString(),
        })),
        sender: {
          id: msg.senderId?._id,
          username: msg.senderId?.username || "Unknown",
          avatar: msg.senderId?.avatar,
        },
        isRead: matchingNotif
          ? Boolean(matchingNotif.isRead)
          : Boolean(msg.isRead),
        notificationId: matchingNotif ? matchingNotif._id : null,
        createdAt: msg.createdAt,
      });
    }

    // 5. Fallback: Any mention notifications whose messages weren't queried directly
    for (const notif of mentionNotifications) {
      const notifMsgIdStr = notif.messageId
        ? notif.messageId.toString()
        : notif._id.toString();
      if (seenMessageIds.has(notifMsgIdStr)) continue;
      seenMessageIds.add(notifMsgIdStr);

      const isChannel = notif.type === "CHANNEL_MENTION";
      const isSpace = notif.type === "SPACE_MENTION";
      const chan = notif.channelId;
      const sp = notif.spaceId;

      if (
        workspaceId &&
        workspaceId !== "undefined" &&
        workspaceId !== "null" &&
        notif.workspaceId &&
        notif.workspaceId.toString() !== workspaceId.toString()
      ) {
        continue;
      }

      // If DM mention notification, ensure recipient was actually the receiver in the DM conversation
      if (!isChannel && !isSpace) {
        const receiverIdFromMeta = notif.metadata?.receiverId?.toString();
        if (receiverIdFromMeta && receiverIdFromMeta !== userId.toString()) {
          continue;
        }
      }

      // If channel mention notification, ensure current user has access to that channel
      if (isChannel && chan) {
        const cIdStr = (chan._id || chan).toString();
        if (!accessibleChannelMap.has(cIdStr)) {
          continue;
        }
      }

      // If space mention notification, ensure current user has access to that space
      if (isSpace && sp) {
        const sIdStr = (sp._id || sp).toString();
        if (!accessibleSpaceMap.has(sIdStr)) {
          continue;
        }
      }

      const actor = notif.actorId;
      validChannelMessages.push({
        id: notif._id,
        messageId: notif.messageId || notif._id,
        type: isSpace ? "SPACE" : isChannel ? "CHANNEL" : "DIRECT",
        channelId: chan?._id || chan,
        channelName: chan?.name || "channel",
        spaceId: sp?._id || sp,
        spaceName:
          (sp && accessibleSpaceMap.get((sp._id || sp).toString())?.name) ||
          "Space",
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

    const allMentions = [
      ...validChannelMessages,
      ...validSpaceMessages,
      ...validDmMessages,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ mentions: allMentions });
  } catch (error) {
    console.error("Error in getUserMentions:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const markMentionAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;

    const notifQuery = {
      recipientId: userId,
      type: { $in: ["CHANNEL_MENTION", "DM_MENTION", "SPACE_MENTION"] },
    };
    if (mongoose.isValidObjectId(messageId)) {
      notifQuery.$or = [{ messageId: messageId }, { _id: messageId }];
    } else {
      notifQuery.messageId = messageId;
    }

    await Notification.updateMany(notifQuery, { $set: { isRead: true } });

    return res.json({ success: true, message: "Mention marked as read" });
  } catch (error) {
    console.error("Error in markMentionAsRead:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const markAllMentionsAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { workspaceId } = req.query;

    const filter = {
      recipientId: userId,
      type: { $in: ["CHANNEL_MENTION", "DM_MENTION", "SPACE_MENTION"] },
      isRead: false,
    };
    if (workspaceId && workspaceId !== "undefined" && workspaceId !== "null") {
      filter.workspaceId = workspaceId;
    }

    await Notification.updateMany(filter, { $set: { isRead: true } });

    return res.json({ success: true, message: "All mentions marked as read" });
  } catch (error) {
    console.error("Error in markAllMentionsAsRead:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const forwardMessage = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { targetType, targetId, content = "", forwardedFrom } = req.body;

    if (!targetType || !targetId || !forwardedFrom) {
      return res.status(400).json({
        message: "targetType, targetId, and forwardedFrom are required",
      });
    }

    if (!["CHANNEL", "DIRECT"].includes(targetType)) {
      return res
        .status(400)
        .json({ message: "Invalid targetType. Must be CHANNEL or DIRECT." });
    }

    const io = req.app.get("io");
    const currentUser = await User.findById(currentUserId)
      .select("username avatar")
      .lean();
    const senderName = currentUser?.username || "Someone";

    const formattedAttachments = (forwardedFrom.originalAttachments || []).map(
      (att) => ({
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
      }),
    );

    let origSenderName = forwardedFrom.senderName || "";
    let origSenderAvatar = forwardedFrom.senderAvatar || "";

    if (
      forwardedFrom.senderId &&
      (!origSenderName ||
        origSenderName === "User" ||
        origSenderName === "Unknown")
    ) {
      try {
        const origUser = await User.findById(forwardedFrom.senderId)
          .select("username avatar")
          .lean();
        if (origUser) {
          origSenderName = origUser.username || origSenderName;
          origSenderAvatar = origUser.avatar || origSenderAvatar;
        }
      } catch (err) {
        console.warn("Could not populate original sender:", err.message);
      }
    }

    const formattedForwardedFrom = {
      originalMessageId: forwardedFrom.originalMessageId
        ? new mongoose.Types.ObjectId(forwardedFrom.originalMessageId)
        : null,
      senderId: forwardedFrom.senderId
        ? new mongoose.Types.ObjectId(forwardedFrom.senderId)
        : null,
      senderName: origSenderName || "User",
      senderAvatar: origSenderAvatar || "",
      originalContent: forwardedFrom.originalContent || "",
      originalAttachments: formattedAttachments,
      originalCreatedAt: forwardedFrom.originalCreatedAt
        ? new Date(forwardedFrom.originalCreatedAt)
        : new Date(),
      sourceType: forwardedFrom.sourceType || "",
      sourceName: forwardedFrom.sourceName || "",
      sourceId:
        forwardedFrom.sourceId ||
        forwardedFrom.channelId ||
        forwardedFrom.otherUserId ||
        "",
    };

    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (targetType === "CHANNEL") {
      const access = await getChannelAccess(currentUserId, targetId);
      if (!access.channel) {
        return res
          .status(403)
          .json({ message: "Access denied to target channel" });
      }

      const savedMessage = await ChannelMessage.create({
        channelId: access.channel._id,
        senderId: currentUserId,
        content: trimmedContent,
        attachments: [],
        mentions: [],
        forwardedFrom: formattedForwardedFrom,
      });

      const populatedMessage = await ChannelMessage.findById(
        savedMessage._id,
      ).populate("senderId", "username avatar");

      const messagePayload = formatChannelMessage(
        populatedMessage,
        currentUserId,
      );

      // Update sender read state
      ChannelReadState.findOneAndUpdate(
        { channelId: access.channel._id, userId: currentUserId },
        { $set: { lastReadAt: new Date() } },
        { upsert: true },
      ).catch(() => {});

      if (io) {
        const room = `channel:${access.channel._id}`;
        io.to(room).emit("receive-channel-message", messagePayload);
      }

      return res.status(201).json({
        success: true,
        message: messagePayload,
        targetType: "CHANNEL",
        channelId: access.channel._id,
      });
    } else {
      // DIRECT
      if (currentUserId.toString() === targetId.toString()) {
        return res
          .status(400)
          .json({ message: "Cannot forward message to yourself" });
      }

      const targetUser = await User.findById(targetId).select(
        "_id username avatar",
      );
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      const savedMessage = await Message.create({
        senderId: currentUserId,
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
        isStarred: false,
        createdAt: savedMessage.createdAt,
      };

      if (io) {
        io.to(`user:${targetId}`).emit(
          "receive-direct-message",
          messagePayload,
        );
        io.to(`user:${currentUserId}`).emit(
          "direct-message-sent",
          messagePayload,
        );
      }

      return res.status(201).json({
        success: true,
        message: messagePayload,
        targetType: "DIRECT",
        receiverId: targetId,
      });
    }
  } catch (error) {
    console.error("Error in forwardMessage:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const deleteDirectConversation = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { userId: otherUserId } = req.params;

    if (!mongoose.isValidObjectId(otherUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;
    const otherUserObjId = mongoose.Types.ObjectId.isValid(otherUserId)
      ? new mongoose.Types.ObjectId(otherUserId)
      : otherUserId;
    await Message.updateMany(
      {
        $or: [
          { senderId: userObjId, receiverId: otherUserObjId },
          { senderId: otherUserObjId, receiverId: userObjId },
        ],
      },
      {
        $addToSet: { deletedBy: userObjId },
      },
    );

    await Message.updateMany(
      {
        senderId: otherUserObjId,
        receiverId: userObjId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      },
    );

    return res.json({
      success: true,
      message: "Conversation history deleted for your account",
    });
  } catch (error) {
    console.error("Error in deleteDirectConversation:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const toggleBlockUser = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const { userId: targetUserId } = req.params;

    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isBlocked = (currentUser.blockedUsers || []).some(
      (id) => id.toString() === targetUserId.toString(),
    );

    if (isBlocked) {
      currentUser.blockedUsers = currentUser.blockedUsers.filter(
        (id) => id.toString() !== targetUserId.toString(),
      );
    } else {
      currentUser.blockedUsers = currentUser.blockedUsers || [];
      currentUser.blockedUsers.push(targetUserId);
    }

    await currentUser.save();

    return res.json({
      success: true,
      isBlocked: !isBlocked,
      blockedUsers: (currentUser.blockedUsers || []).map((id) => id.toString()),
      message: !isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
    });
  } catch (error) {
    console.error("Error in toggleBlockUser:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, conversationType } = req.body;
    const userId = req.userId;

    if (!emoji || !emoji.trim()) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const user = await User.findById(userId).select("username displayName").lean();
    const username = user?.displayName || user?.username || "Someone";

    let message = null;
    let isDirect = false;

    if (conversationType === "DIRECT" || conversationType === "dm") {
      message = await Message.findById(messageId);
      isDirect = true;
    } else {
      message = await ChannelMessage.findById(messageId);
      if (!message) {
        message = await Message.findById(messageId);
        if (message) isDirect = true;
      }
    }

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Cannot react to deleted message" });
    }

    message.reactions = message.reactions || [];
    const emojiStr = emoji.trim();

    // Check if user previously reacted with any emoji on this message
    let previousEmoji = null;
    for (const group of message.reactions) {
      const idx = group.users.findIndex(
        (u) => (u.userId?._id || u.userId).toString() === userId.toString()
      );
      if (idx !== -1) {
        previousEmoji = group.emoji;
        group.users.splice(idx, 1);
        break;
      }
    }

    let hasReacted = false;
    // If the user clicked the same emoji they already had, it's a toggle off
    if (previousEmoji === emojiStr) {
      hasReacted = false;
    } else {
      // User clicked a new emoji or replaced previous emoji
      let targetGroup = message.reactions.find((r) => r.emoji === emojiStr);
      if (targetGroup) {
        targetGroup.users.push({ userId, username });
      } else {
        message.reactions.push({
          emoji: emojiStr,
          users: [{ userId, username }],
        });
      }
      hasReacted = true;
    }

    // Clean up empty reaction groups
    message.reactions = message.reactions.filter((r) => r.users && r.users.length > 0);

    await message.save();

    const io = req.app.get("io");
    if (io) {
      const payload = {
        messageId: message._id.toString(),
        reactions: message.reactions,
        userId: userId.toString(),
        emoji: emojiStr,
        hasReacted,
      };

      if (isDirect) {
        io.to(`user:${message.senderId}`).to(`user:${message.receiverId}`).emit("message:reaction-updated", {
          ...payload,
          conversationType: "dm",
        });
      } else if (message.channelId) {
        io.to(`channel:${message.channelId}`).emit("message:reaction-updated", {
          ...payload,
          conversationType: "channel",
          channelId: message.channelId.toString(),
        });
      } else if (message.spaceId) {
        io.to(`space:${message.spaceId}`).emit("message:reaction-updated", {
          ...payload,
          conversationType: "space",
          spaceId: message.spaceId.toString(),
        });
      } else if (message.groupId) {
        io.to(`group:${message.groupId}`).emit("message:reaction-updated", {
          ...payload,
          conversationType: "group",
          groupId: message.groupId.toString(),
        });
      }
    }

    return res.json({
      success: true,
      messageId: message._id,
      reactions: message.reactions,
      hasReacted,
    });
  } catch (error) {
    console.error("Error in toggleReaction:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Pin or unpin a message across channels, spaces, groups, and DMs
const togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    let message = await ChannelMessage.findById(messageId);
    let isChannelMsg = true;

    if (!message) {
      message = await Message.findById(messageId);
      isChannelMsg = false;
    }

    if (!message || message.isDeleted) {
      return res.status(404).json({ message: "Message not found" });
    }

    const nextIsPinned = !message.isPinned;
    const now = nextIsPinned ? new Date() : null;
    const pinnedByUser = nextIsPinned ? userId : null;

    message.isPinned = nextIsPinned;
    message.pinnedBy = pinnedByUser;
    message.pinnedAt = now;
    await message.save();

    const currentUser = await User.findById(userId).select("username displayName avatar");
    const pinnerInfo = nextIsPinned && currentUser ? {
      userId: currentUser._id,
      username: currentUser.username || currentUser.displayName || "User",
      avatar: currentUser.avatar || "",
    } : null;

    // Real-time broadcast via Socket.io
    const io = req.app.get("io");
    if (io) {
      const payload = {
        messageId: message._id.toString(),
        isPinned: nextIsPinned,
        pinnedBy: pinnerInfo,
        pinnedAt: now,
      };

      if (isChannelMsg) {
        if (message.channelId) {
          io.to(`channel:${message.channelId}`).emit("message:pinned-updated", { ...payload, conversationType: "channel", channelId: message.channelId });
        } else if (message.spaceId) {
          io.to(`space:${message.spaceId}`).emit("message:pinned-updated", { ...payload, conversationType: "space", spaceId: message.spaceId });
        } else if (message.groupId) {
          io.to(`group:${message.groupId}`).emit("message:pinned-updated", { ...payload, conversationType: "group", groupId: message.groupId });
        }
      } else {
        io.to(`user:${message.senderId}`).to(`user:${message.receiverId}`).emit("message:pinned-updated", { ...payload, conversationType: "dm" });
      }
    }

    return res.json({
      success: true,
      messageId: message._id,
      isPinned: nextIsPinned,
      pinnedBy: pinnerInfo,
      pinnedAt: now,
    });
  } catch (error) {
    console.error("Error in togglePinMessage:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get pinned messages (workspace-wide or filtered by conversation)
const getPinnedMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { workspaceId, channelId, spaceId, groupId, otherUserId } = req.query;

    // Filter by channel
    if (channelId) {
      const pinned = await ChannelMessage.find({ channelId, isPinned: true, isDeleted: false })
        .populate("senderId", "username avatar displayName")
        .populate("pinnedBy", "username avatar displayName")
        .sort({ pinnedAt: -1 })
        .lean();
      return res.json({
        success: true,
        pinnedMessages: pinned.map((m) => ({
          id: m._id,
          _id: m._id,
          content: m.content,
          attachments: m.attachments || [],
          sender: m.senderId,
          pinnedBy: m.pinnedBy,
          pinnedAt: m.pinnedAt,
          isPinned: m.isPinned,
          createdAt: m.createdAt,
        })),
      });
    }

    if (spaceId) {
      const pinned = await ChannelMessage.find({ spaceId, isPinned: true, isDeleted: false })
        .populate("senderId", "username avatar displayName")
        .populate("pinnedBy", "username avatar displayName")
        .sort({ pinnedAt: -1 })
        .lean();
      return res.json({
        success: true,
        pinnedMessages: pinned.map((m) => ({
          id: m._id,
          _id: m._id,
          content: m.content,
          attachments: m.attachments || [],
          sender: m.senderId,
          pinnedBy: m.pinnedBy,
          pinnedAt: m.pinnedAt,
          isPinned: m.isPinned,
          createdAt: m.createdAt,
        })),
      });
    }

    if (groupId) {
      const pinned = await ChannelMessage.find({ groupId, isPinned: true, isDeleted: false })
        .populate("senderId", "username avatar displayName")
        .populate("pinnedBy", "username avatar displayName")
        .sort({ pinnedAt: -1 })
        .lean();
      return res.json({
        success: true,
        pinnedMessages: pinned.map((m) => ({
          id: m._id,
          _id: m._id,
          content: m.content,
          attachments: m.attachments || [],
          sender: m.senderId,
          pinnedBy: m.pinnedBy,
          pinnedAt: m.pinnedAt,
          isPinned: m.isPinned,
          createdAt: m.createdAt,
        })),
      });
    }

    if (otherUserId) {
      const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      const otherUserObjId = mongoose.Types.ObjectId.isValid(otherUserId) ? new mongoose.Types.ObjectId(otherUserId) : otherUserId;
      const pinned = await Message.find({
        $or: [
          { senderId: userObjId, receiverId: otherUserObjId },
          { senderId: otherUserObjId, receiverId: userObjId },
        ],
        isPinned: true,
        isDeleted: false,
      })
        .populate("senderId", "username avatar displayName")
        .populate("pinnedBy", "username avatar displayName")
        .sort({ pinnedAt: -1 })
        .lean();
      return res.json({
        success: true,
        pinnedMessages: pinned.map((m) => ({
          id: m._id,
          _id: m._id,
          content: m.content,
          attachments: m.attachments || [],
          sender: m.senderId,
          pinnedBy: m.pinnedBy,
          pinnedAt: m.pinnedAt,
          isPinned: m.isPinned,
          createdAt: m.createdAt,
        })),
      });
    }

    // Workspace-wide pinned messages across channels, spaces, groups, and DMs
    const [channelMsgs, dmMsgs] = await Promise.all([
      ChannelMessage.find({ isPinned: true, isDeleted: false })
        .populate("channelId", "name workspaceId")
        .populate("spaceId", "name")
        .populate("groupId", "name")
        .populate("senderId", "username avatar displayName")
        .populate("pinnedBy", "username avatar displayName")
        .sort({ pinnedAt: -1 })
        .lean(),
      Message.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
        isPinned: true,
        isDeleted: false,
      })
        .populate("senderId", "username avatar displayName")
        .populate("receiverId", "username avatar displayName")
        .populate("pinnedBy", "username avatar displayName")
        .sort({ pinnedAt: -1 })
        .lean(),
    ]);

    const formattedChannel = channelMsgs.map((m) => ({
      id: m._id,
      _id: m._id,
      content: m.content,
      attachments: m.attachments || [],
      sender: m.senderId,
      pinnedBy: m.pinnedBy,
      pinnedAt: m.pinnedAt,
      channelId: m.channelId?._id || m.channelId,
      channelName: m.channelId?.name,
      spaceId: m.spaceId?._id || m.spaceId,
      spaceName: m.spaceId?.name,
      groupId: m.groupId?._id || m.groupId,
      groupName: m.groupId?.name,
      sourceType: m.spaceId ? "SPACE" : m.groupId ? "GROUP" : "CHANNEL",
      createdAt: m.createdAt,
    }));

    const formattedDM = dmMsgs.map((m) => {
      const otherUser = m.senderId?._id?.toString() === userId.toString() ? m.receiverId : m.senderId;
      return {
        id: m._id,
        _id: m._id,
        content: m.content,
        attachments: m.attachments || [],
        sender: m.senderId,
        pinnedBy: m.pinnedBy,
        pinnedAt: m.pinnedAt,
        otherUser,
        sourceType: "DIRECT",
        createdAt: m.createdAt,
      };
    });

    const allPinned = [...formattedChannel, ...formattedDM].sort(
      (a, b) => new Date(b.pinnedAt || b.createdAt) - new Date(a.pinnedAt || a.createdAt)
    );

    return res.json({
      success: true,
      pinnedMessages: allPinned,
    });
  } catch (error) {
    console.error("Error in getPinnedMessages:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export {
  togglePinMessage,
  getPinnedMessages,
  getDirectMessages,
  getChannelMessages,
  formatChannelMessage,
  buildReplyToMessage,
  getUnreadMessageCounts,
  markChannelAsRead,
  markChannelAsUnread,
  markDirectMessagesAsRead,
  markDirectMessagesAsUnread,
  starMessage,
  unstarMessage,
  getStarredMessages,
  getUserMentions,
  markMentionAsRead,
  markAllMentionsAsRead,
  forwardMessage,
  deleteDirectConversation,
  toggleBlockUser,
  toggleReaction,
};
