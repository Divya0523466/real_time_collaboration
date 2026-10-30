import mongoose from "mongoose"
import Space from "../models/Space.js"
import SpaceReadState from "../models/SpaceReadState.js"
import ChannelMessage from "../models/ChannelMessage.js"
import User from "../models/User.js"
import { getSpaceAccess, isUserSuperAdmin } from "../utils/spaceAccess.js"
import { isUserPro, PLAN_LIMITS } from "../utils/subscriptionUtils.js"
import { createAndSendNotification } from "../utils/notificationService.js"
import { buildReplyToMessage } from "./messageController.js"

export const formatSpaceMessage = (message, currentUserId = null) => ({
  id: message._id,
  spaceId: message.spaceId,
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
    id: att.id || att._id || att.fileId,
    fileId: att.fileId || att._id,
    originalName: att.originalName || "Attachment",
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
  forwardedFrom: message.isDeleted ? null : (message.forwardedFrom || null),
  isEdited: message.isEdited || false,
  isDeleted: message.isDeleted || false,
  isStarred: Boolean(
    message.starredBy &&
    currentUserId &&
    message.starredBy.some((id) => id.toString() === currentUserId.toString())
  ),
  reactions: message.reactions || [],
  readBy: message.readBy || [],
  isPinned: message.isPinned || false,
  pinnedBy: message.pinnedBy || null,
  pinnedAt: message.pinnedAt || null,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
})

export const createSpace = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const isSuper = await isUserSuperAdmin(req.userId);
    const hasPro = isUserPro(user);

    if (!isSuper && !hasPro) {
      const userSpacesCount = await Space.countDocuments({ createdBy: req.userId });
      if (userSpacesCount >= PLAN_LIMITS.FREE.maxSpaces) {
        return res.status(403).json({
          message:
            "Free plan limit reached: You can create up to 3 spaces on the Free plan. Upgrade to WorkNest Pro for unlimited spaces.",
          limitReached: "spaces",
          upgradeRequired: true,
        });
      }
    }

    const { name, description = "", members = [], workspaceId = null } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Space name is required" })
    }

    const initialMembers = [req.userId]
    if (Array.isArray(members)) {
      for (const mId of members) {
        let idStr = (mId?._id || mId?.id)?.toString()
        if (!idStr && typeof mId === "string") {
          if (mongoose.isValidObjectId(mId)) {
            idStr = mId
          } else if (mId.includes("@")) {
            const foundUser = await User.findOne({ email: mId.trim().toLowerCase() }).select("_id")
            if (!foundUser) {
              return res.status(404).json({ message: `User with email "${mId}" not found` })
            }
            idStr = foundUser._id.toString()
          }
        }
        if (idStr && mongoose.isValidObjectId(idStr) && !initialMembers.includes(idStr)) {
          initialMembers.push(idStr)
        }
      }
    }

    const space = await Space.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      workspaceId: workspaceId && mongoose.isValidObjectId(workspaceId) ? workspaceId : null,
      createdBy: req.userId,
      members: initialMembers,
    })

    const populatedSpace = await Space.findById(space._id)
      .populate("createdBy", "_id username email avatar")
      .populate("members", "_id username email avatar role")

    const io = req.app.get("io")
    if (io) {
      initialMembers.forEach((memberId) => {
        io.to(`user:${memberId}`).emit("space-created", populatedSpace)
      })

      // Notify added members (except creator)
      for (const memberId of initialMembers) {
        if (memberId.toString() !== req.userId.toString()) {
          createAndSendNotification(io, {
            recipientId: memberId,
            actorId: req.userId,
            type: "SPACE_ADDED",
            title: `Added to Space "${space.name}"`,
            message: `You were added to the Space "${space.name}".`,
            workspaceId: space.workspaceId,
            spaceId: space._id,
          })
        }
      }
    }

    return res.status(201).json({
      message: "Space created successfully",
      space: populatedSpace,
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const getSpaces = async (req, res) => {
  try {
    const isSuper = await isUserSuperAdmin(req.userId)
    const { workspaceId } = req.query

    let filter = {}
    if (isSuper) {
      if (workspaceId && mongoose.isValidObjectId(workspaceId)) {
        filter.$or = [
          { workspaceId: new mongoose.Types.ObjectId(workspaceId) },
          { workspaceId: null },
          { workspaceId: { $exists: false } },
        ]
      }
    } else {
      filter.members = req.userId
      if (workspaceId && mongoose.isValidObjectId(workspaceId)) {
        filter.$or = [
          { workspaceId: new mongoose.Types.ObjectId(workspaceId) },
          { workspaceId: null },
          { workspaceId: { $exists: false } },
          { members: req.userId },
        ]
      }
    }

    const spaces = await Space.find(filter)
      .populate("createdBy", "_id username email avatar")
      .populate("members", "_id username email avatar role")
      .sort({ createdAt: -1 })

    return res.json({ spaces })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const getSpace = async (req, res) => {
  try {
    const { spaceId } = req.params
    const { space, isSuperAdmin: isSuper } = await getSpaceAccess(req.userId, spaceId)

    if (!space) {
      return res.status(403).json({ message: "Access denied. You are not a member of this Space." })
    }

    const populated = await Space.findById(space._id)
      .populate("createdBy", "_id username email avatar")
      .populate("members", "_id username email avatar role status isActive")
      .lean()

    return res.json({ space: populated, isSuperAdmin: isSuper })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const updateSpace = async (req, res) => {
  try {
    const isSuper = await isUserSuperAdmin(req.userId)
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Super Admins can update Spaces." })
    }

    const { spaceId } = req.params
    const { name, description } = req.body

    const space = await Space.findById(spaceId)
    if (!space) {
      return res.status(404).json({ message: "Space not found" })
    }

    if (name && name.trim()) {
      space.name = name.trim()
    }
    if (typeof description === "string") {
      space.description = description.trim()
    }

    await space.save()

    const populated = await Space.findById(space._id)
      .populate("createdBy", "_id username email avatar")
      .populate("members", "_id username email avatar role")

    const io = req.app.get("io")
    if (io) {
      io.to(`space:${space._id}`).emit("space-updated", populated)
      ;(space.members || []).forEach((mId) => {
        io.to(`user:${mId}`).emit("space-updated", populated)
      })
    }

    return res.json({ message: "Space updated successfully", space: populated })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const deleteSpace = async (req, res) => {
  try {
    const isSuper = await isUserSuperAdmin(req.userId)
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Super Admins can delete Spaces." })
    }

    const { spaceId } = req.params
    const space = await Space.findById(spaceId)
    if (!space) {
      return res.status(404).json({ message: "Space not found" })
    }

    const memberIds = [...(space.members || [])]

    await Space.findByIdAndDelete(spaceId)
    await ChannelMessage.deleteMany({ spaceId })
    await SpaceReadState.deleteMany({ spaceId })

    const io = req.app.get("io")
    if (io) {
      io.to(`space:${spaceId}`).emit("space-deleted", { spaceId })
      memberIds.forEach((mId) => {
        io.to(`user:${mId}`).emit("space-deleted", { spaceId })
      })
    }

    return res.json({ message: "Space deleted successfully", spaceId })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const addSpaceMembers = async (req, res) => {
  try {
    const isSuper = await isUserSuperAdmin(req.userId)
    if (!isSuper) {
      return res.status(403).json({ message: "Access denied. Only Super Admins can add members to Spaces." })
    }

    const { spaceId } = req.params
    const { members, memberIds, userId, email } = req.body

    const space = await Space.findById(spaceId)
    if (!space) {
      return res.status(404).json({ message: "Space not found" })
    }

    const existingMemberIds = new Set((space.members || []).map((m) => m.toString()))

    if (email && typeof email === "string" && email.trim()) {
      const trimmedEmail = email.trim()
      const escaped = trimmedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const user = await User.findOne({
        $or: [
          { email: { $regex: `^${escaped}$`, $options: "i" } },
          { username: { $regex: `^${escaped}$`, $options: "i" } }
        ]
      })
      if (!user) {
        return res.status(404).json({ message: "User with this email not found" })
      }
      if (existingMemberIds.has(user._id.toString())) {
        return res.status(400).json({ message: "User is already a member of this Space" })
      }

      space.members.push(user._id)
      await space.save()

      const populated = await Space.findById(space._id)
        .populate("createdBy", "_id username email avatar")
        .populate("members", "_id username email avatar role")

      const io = req.app.get("io")
      if (io) {
        io.to(`space:${spaceId}`).emit("space-updated", populated)
        io.to(`user:${user._id}`).emit("space-created", populated)
        createAndSendNotification(io, {
          recipientId: user._id,
          actorId: req.userId,
          type: "SPACE_ADDED",
          title: `Added to Space "${space.name}"`,
          message: `You were added to the Space "${space.name}".`,
          workspaceId: space.workspaceId,
          spaceId: space._id,
        })
      }

      return res.json({
        message: "Member added successfully",
        space: populated,
        addedCount: 1,
      })
    }

    const toAdd = []
    if (userId && mongoose.isValidObjectId(userId)) toAdd.push(userId.toString())
    if (Array.isArray(members)) {
      members.forEach((m) => {
        const id = (m?._id || m?.id || m)?.toString()
        if (id && mongoose.isValidObjectId(id)) toAdd.push(id)
      })
    }
    if (Array.isArray(memberIds)) {
      memberIds.forEach((m) => {
        const id = (m?._id || m?.id || m)?.toString()
        if (id && mongoose.isValidObjectId(id)) toAdd.push(id)
      })
    }

    const newlyAdded = []

    for (const id of toAdd) {
      if (!existingMemberIds.has(id)) {
        const userExists = await User.findById(id).select("_id")
        if (userExists) {
          space.members.push(new mongoose.Types.ObjectId(id))
          existingMemberIds.add(id)
          newlyAdded.push(id)
        }
      }
    }

    await space.save()

    const populated = await Space.findById(space._id)
      .populate("createdBy", "_id username email avatar")
      .populate("members", "_id username email avatar role")

    const io = req.app.get("io")
    if (io) {
      io.to(`space:${spaceId}`).emit("space-updated", populated)
      newlyAdded.forEach((newId) => {
        io.to(`user:${newId}`).emit("space-created", populated)
        createAndSendNotification(io, {
          recipientId: newId,
          actorId: req.userId,
          type: "SPACE_ADDED",
          title: `Added to Space "${space.name}"`,
          message: `You were added to the Space "${space.name}".`,
          workspaceId: space.workspaceId,
          spaceId: space._id,
        })
      })
    }

    return res.json({
      message: "Members added successfully",
      space: populated,
      addedCount: newlyAdded.length,
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const removeSpaceMember = async (req, res) => {
  try {
    const { spaceId, userId } = req.params
    const isSelf = req.userId?.toString() === userId?.toString()
    const isSuper = await isUserSuperAdmin(req.userId)
    if (!isSelf && !isSuper) {
      return res.status(403).json({ message: "Access denied. Only Super Admins can remove members from Spaces." })
    }
    const space = await Space.findById(spaceId)
    if (!space) {
      return res.status(404).json({ message: "Space not found" })
    }

    space.members = space.members.filter((m) => m.toString() !== userId.toString())
    await space.save()

    const populated = await Space.findById(space._id)
      .populate("createdBy", "_id username email avatar")
      .populate("members", "_id username email avatar role")

    const io = req.app.get("io")
    if (io) {
      io.to(`space:${spaceId}`).emit("space-updated", populated)
      io.to(`user:${userId}`).emit("space-member-removed", { spaceId, userId, spaceName: space.name })
      createAndSendNotification(io, {
        recipientId: userId,
        actorId: req.userId,
        type: "SPACE_REMOVED",
        title: `Removed from Space "${space.name}"`,
        message: `You have been removed from the Space "${space.name}".`,
        workspaceId: space.workspaceId,
        spaceId: space._id,
      })
    }

    return res.json({ message: "Member removed successfully", space: populated })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const getSpaceMembers = async (req, res) => {
  try {
    const { spaceId } = req.params
    const { space } = await getSpaceAccess(req.userId, spaceId)
    if (!space) {
      return res.status(403).json({ message: "Access denied to Space members list." })
    }

    const populated = await Space.findById(space._id).populate(
      "members",
      "_id username email avatar role status isActive"
    )

    return res.json({ members: populated?.members || [] })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const getSpaceMessages = async (req, res) => {
  try {
    const { spaceId } = req.params
    const { space } = await getSpaceAccess(req.userId, spaceId)
    if (!space) {
      return res.status(403).json({ message: "Access denied to Space messages." })
    }

    const messages = await ChannelMessage.find({ spaceId })
      .populate("senderId", "username avatar")
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: "username" },
      })
      .sort({ createdAt: 1 })
      .lean()

    // Update read state automatically
    await SpaceReadState.findOneAndUpdate(
      { spaceId, userId: req.userId },
      { $set: { lastReadAt: new Date() } },
      { upsert: true }
    ).catch(() => {})

    const currentUser = await User.findById(req.userId).select("username avatar");
    if (currentUser) {
      await ChannelMessage.updateMany(
        {
          spaceId,
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
        io.to(`space:${spaceId}`).emit("space-messages-read", {
          spaceId,
          user: {
            userId: currentUser._id,
            username: currentUser.username,
            avatar: currentUser.avatar || "",
          },
        });
      }
    }

    return res.json({
      messages: messages.map((msg) => formatSpaceMessage(msg, req.userId)),
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const markSpaceAsRead = async (req, res) => {
  try {
    const { spaceId } = req.params
    const { space } = await getSpaceAccess(req.userId, spaceId)
    if (!space) {
      return res.status(403).json({ message: "Access denied to Space" })
    }

    await SpaceReadState.findOneAndUpdate(
      { spaceId, userId: req.userId },
      { $set: { lastReadAt: new Date() } },
      { upsert: true }
    )

    return res.json({ success: true, spaceId, isRead: true })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const markSpaceAsUnread = async (req, res) => {
  try {
    const { spaceId } = req.params
    const { space } = await getSpaceAccess(req.userId, spaceId)
    if (!space) {
      return res.status(403).json({ message: "Access denied to Space" })
    }

    await SpaceReadState.findOneAndUpdate(
      { spaceId, userId: req.userId },
      { $set: { lastReadAt: new Date(0) } },
      { upsert: true }
    )

    return res.json({ success: true, spaceId, isRead: false })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const getSpaceUnreadCounts = async (req, res) => {
  try {
    const userId = req.userId
    const isSuper = await isUserSuperAdmin(userId)
    const { workspaceId } = req.query

    let filter = {}
    if (isSuper) {
      if (workspaceId && mongoose.isValidObjectId(workspaceId)) {
        filter.$or = [
          { workspaceId: new mongoose.Types.ObjectId(workspaceId) },
          { workspaceId: null },
          { workspaceId: { $exists: false } },
        ]
      }
    } else {
      filter.members = userId
      if (workspaceId && mongoose.isValidObjectId(workspaceId)) {
        filter.$or = [
          { workspaceId: new mongoose.Types.ObjectId(workspaceId) },
          { workspaceId: null },
          { workspaceId: { $exists: false } },
          { members: userId },
        ]
      }
    }

    const accessibleSpaces = await Space.find(filter).select("_id").lean()
    const spaceIds = accessibleSpaces.map((s) => s._id)

    const readStates = await SpaceReadState.find({
      userId,
      spaceId: { $in: spaceIds },
    }).lean()

    const readStateMap = new Map()
    readStates.forEach((rs) => {
      readStateMap.set(rs.spaceId.toString(), rs.lastReadAt)
    })

    const spaceCounts = {}
    if (spaceIds.length > 0) {
      const spaceConditions = spaceIds.map((sId) => {
        const sIdStr = sId.toString()
        const lastRead = readStateMap.get(sIdStr) || new Date(0)
        return {
          spaceId: new mongoose.Types.ObjectId(sId),
          createdAt: { $gt: lastRead },
        }
      })

      const spaceAgg = await ChannelMessage.aggregate([
        {
          $match: {
            $or: spaceConditions,
            senderId: { $ne: new mongoose.Types.ObjectId(userId) },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$spaceId",
            count: { $sum: 1 },
          },
        },
      ])

      spaceAgg.forEach((entry) => {
        if (entry.count > 0) {
          spaceCounts[entry._id.toString()] = entry.count
        }
      })
    }

    return res.json({ spaces: spaceCounts })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

export const checkSpaceMemberByEmail = async (req, res) => {
  try {
    const { email } = req.query
    if (!email || !email.trim()) {
      return res.status(200).json({ exists: false, message: "Email is required" })
    }
    const trimmedEmail = email.trim()
    const escaped = trimmedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const user = await User.findOne({
      $or: [
        { email: { $regex: `^${escaped}$`, $options: "i" } },
        { username: { $regex: `^${escaped}$`, $options: "i" } },
      ],
    }).select("_id username email avatar role")

    if (!user) {
      return res.status(200).json({ exists: false, message: "User with this email not found" })
    }
    return res.status(200).json({ exists: true, user })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}
