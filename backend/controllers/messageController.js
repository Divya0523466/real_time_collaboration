import Message from "../models/Message.js"
import User from "../models/User.js"
import ChannelMessage from "../models/ChannelMessage.js"
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
      .select("_id senderId receiverId content createdAt updatedAt isEdited isDeleted")
      .sort({ createdAt: 1 })

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
      })),
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
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

    return res.json({ messages: messages.map(formatChannelMessage) })
  } catch (error) {
    console.error("Error fetching channel messages:", error)
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export { getDirectMessages, getChannelMessages, formatChannelMessage, buildReplyToMessage }
