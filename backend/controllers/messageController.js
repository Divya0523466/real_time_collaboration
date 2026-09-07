import Message from "../models/Message.js"
import User from "../models/User.js"

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
      .select("_id senderId receiverId content createdAt")
      .sort({ createdAt: 1 })

    return res.json({
      messages: messages.map((msg) => ({
        id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return res
      .status(500)
      .json({ message: "Server error", error: error.message })
  }
}

export { getDirectMessages }
