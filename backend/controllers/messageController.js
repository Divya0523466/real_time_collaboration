import mongoose from "mongoose"
import Message from "../models/Message.js"
import User from "../models/User.js"
import Channel from "../models/Channel.js"
import ChannelMessage from "../models/ChannelMessage.js"
import ChannelReadState from "../models/ChannelReadState.js"
import WorkspaceMembership from "../models/WorkspaceMembership.js"
import getChannelAccess from "../utils/channelAccess.js"

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
      .select("_id senderId receiverId content createdAt updatedAt isEdited isDeleted isRead")
      .sort({ createdAt: 1 })

    // Automatically mark unread messages from otherUser as read
    await Message.updateMany(
      { senderId: otherUserId, receiverId: currentUserId, isRead: false },
      { $set: { isRead: true } }
    )

    return res.json({
      messages: messages.map((msg) => ({
        id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.isDeleted ? null : msg.content,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        isEdited: msg.isEdited || false,
        isDeleted: msg.isDeleted || false,
        isRead: msg.isRead || false,
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
    isDeleted: parent.isDeleted || false,
    sender: parent.senderId?._id
      ? {
          id: parent.senderId._id,
          username: parent.senderId.username,
        }
      : undefined,
  }
}

const formatChannelMessage = (message) => ({
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
  replyTo: message.replyTo?._id || message.replyTo || null,
  replyToMessage: buildReplyToMessage(message.replyTo?._id ? message.replyTo : null),
  isEdited: message.isEdited || false,
  isDeleted: message.isDeleted || false,
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

    // Automatically update channel read cursor for current user
    await ChannelReadState.findOneAndUpdate(
      { channelId, userId: req.userId },
      { $set: { lastReadAt: new Date() } },
      { upsert: true }
    )

    return res.json({ messages: messages.map(formatChannelMessage) })
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

export {
  getDirectMessages,
  getChannelMessages,
  formatChannelMessage,
  buildReplyToMessage,
  getUnreadMessageCounts,
  markChannelAsRead,
  markDirectMessagesAsRead,
}
