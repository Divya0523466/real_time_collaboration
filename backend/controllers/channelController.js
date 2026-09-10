import Channel from "../models/Channel.js"
import WorkspaceMembership from "../models/WorkspaceMembership.js"
import { createAndSendNotification } from "../utils/notificationService.js"


const createChannel = async (req, res) => {
  try {
    const { workspaceId } = req.params
    const { name, description, type, members = [] } = req.body
    const userId = req.userId

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Channel name is required" })
    }

  
    const membership = await WorkspaceMembership.findOne({ userId, workspaceId })

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return res.status(403).json({ message: "You do not have permission to create channels" })
    }

    const channelType = type && ["PUBLIC", "PRIVATE"].includes(type) ? type : "PUBLIC"
    const initialMembers = [userId]

    if (channelType === "PRIVATE" && Array.isArray(members)) {
      members.forEach((mId) => {
        if (mId && !initialMembers.includes(mId.toString())) {
          initialMembers.push(mId)
        }
      })
    }

    const channel = await Channel.create({
      workspaceId,
      name: name.trim().toLowerCase().replace(/\s+/g, "-"),
      description: description ? description.trim() : "",
      type: channelType,
      createdBy: userId,
      members: initialMembers,
    })

    if (channelType === "PRIVATE" && Array.isArray(members)) {
      const io = req.app.get("io")
      for (const mId of initialMembers) {
        if (mId.toString() !== userId.toString()) {
          createAndSendNotification(io, {
            recipientId: mId,
            actorId: userId,
            type: "CHANNEL_INVITED",
            title: `Added to private channel #${channel.name}`,
            message: `You were added to the private channel #${channel.name}.`,
            workspaceId,
            channelId: channel._id,
          })
        }
      }
    }

    return res.status(201).json({
      message: "Channel created successfully",
      channel: {
        id: channel._id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const updateChannel = async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params
    const { name, description, members } = req.body
    const userId = req.userId

    const requesterMembership = await WorkspaceMembership.findOne({ userId, workspaceId })
    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      return res.status(403).json({ message: "You do not have permission to edit channels" })
    }

    const channel = await Channel.findOne({ _id: channelId, workspaceId })
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" })
    }

    if (name && name.trim()) {
      channel.name = name.trim().toLowerCase().replace(/\s+/g, "-")
    }

    if (typeof description === "string") {
      channel.description = description.trim()
    }

    if (channel.type === "PRIVATE" && Array.isArray(members)) {
      const prevMembers = (channel.members || []).map((m) => m.toString())
      const updatedMembers = [userId]
      members.forEach((mId) => {
        if (mId && !updatedMembers.includes(mId.toString())) {
          updatedMembers.push(mId)
        }
      })
      channel.members = updatedMembers

      const newlyAdded = updatedMembers.filter(
        (mId) => !prevMembers.includes(mId.toString()) && mId.toString() !== userId.toString()
      )
      if (newlyAdded.length > 0) {
        const io = req.app.get("io")
        for (const mId of newlyAdded) {
          createAndSendNotification(io, {
            recipientId: mId,
            actorId: userId,
            type: "CHANNEL_ADDED",
            title: `Added to #${channel.name}`,
            message: `You were added to the private channel #${channel.name}.`,
            workspaceId,
            channelId: channel._id,
          })
        }
      }
    }

    await channel.save()

    return res.json({
      message: "Channel updated successfully",
      channel: {
        id: channel._id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const deleteChannel = async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params
    const userId = req.userId

    const requesterMembership = await WorkspaceMembership.findOne({ userId, workspaceId })
    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      return res.status(403).json({ message: "You do not have permission to delete channels" })
    }

    const totalChannels = await Channel.countDocuments({ workspaceId })
    if (totalChannels <= 1) {
      return res.status(400).json({ message: "Cannot delete the only channel in the workspace" })
    }

    const channel = await Channel.findOne({ _id: channelId, workspaceId })
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" })
    }

    await Channel.deleteOne({ _id: channelId, workspaceId })

    return res.json({ message: "Channel deleted successfully" })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const getWorkspaceChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params
    const userId = req.userId

    const membership = await WorkspaceMembership.findOne({ userId, workspaceId })

    if (!membership) {
      return res.status(403).json({ message: "Access denied" })
    }

    let filter = { workspaceId }
    if (membership.role === "MEMBER") {
      filter = {
        workspaceId,
        $or: [
          { type: "PUBLIC" },
          { type: "PRIVATE", members: userId },
        ],
      }
    }

    const channels = await Channel.find(filter).select("_id name description type createdBy")

    return res.json({
      channels: channels.map((c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        type: c.type,
      })),
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}



const getChannel = async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params
    const userId = req.userId

    const membership = await WorkspaceMembership.findOne({ userId, workspaceId })

    if (!membership) {
      return res.status(403).json({ message: "Access denied" })
    }

    const channel = await Channel.findOne({ _id: channelId, workspaceId }).populate("members", "username email avatar")

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" })
    }

    if (channel.type === "PRIVATE" && membership.role === "MEMBER") {
      const isMember = channel.members.some((m) => m._id.toString() === userId.toString())
      if (!isMember) {
        return res.status(403).json({ message: "Access denied to private channel" })
      }
    }

    return res.json({
      channel: {
        id: channel._id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        members: channel.members.map((m) => ({
          id: m._id,
          username: m.username,
          email: m.email,
          avatar: m.avatar,
        })),
      },
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const addChannelMember = async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params
    const { memberId } = req.body
    const userId = req.userId

    const requesterMembership = await WorkspaceMembership.findOne({ userId, workspaceId })
    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      return res.status(403).json({ message: "You do not have permission to manage channel members" })
    }

    const targetMembership = await WorkspaceMembership.findOne({ userId: memberId, workspaceId })
    if (!targetMembership) {
      return res.status(404).json({ message: "User is not a member of this workspace" })
    }

    const channel = await Channel.findOne({ _id: channelId, workspaceId })
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" })
    }

    if (!channel.members.includes(memberId)) {
      channel.members.push(memberId)
      await channel.save()

      const io = req.app.get("io")
      createAndSendNotification(io, {
        recipientId: memberId,
        actorId: userId,
        type: "CHANNEL_ADDED",
        title: `Added to #${channel.name}`,
        message: `You were added to the channel #${channel.name}.`,
        workspaceId,
        channelId: channel._id,
      })

      if (io) {
        io.to(`user:${memberId}`).emit("channel-member-added", {
          workspaceId,
          channel: {
            id: channel._id.toString(),
            name: channel.name,
            description: channel.description,
            type: channel.type,
          },
        })
        io.to(`channel:${channel._id}`).emit("channel-updated", {
          workspaceId,
          channelId: channel._id.toString(),
          memberId: memberId.toString(),
          action: "added",
        })
      }
    }

    return res.json({ message: "Member added to channel successfully" })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}

const removeChannelMember = async (req, res) => {
  try {
    const { workspaceId, channelId, memberId } = req.params
    const userId = req.userId

    const requesterMembership = await WorkspaceMembership.findOne({ userId, workspaceId })
    if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
      return res.status(403).json({ message: "You do not have permission to manage channel members" })
    }

    const channel = await Channel.findOne({ _id: channelId, workspaceId })
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" })
    }

    channel.members = channel.members.filter((m) => m.toString() !== memberId.toString())
    await channel.save()

    const io = req.app.get("io")
    const onlineUsers = req.app.get("onlineUsers")

    if (io && onlineUsers) {
      const userSockets = onlineUsers.get(memberId.toString())
      if (userSockets) {
        userSockets.forEach((socketId) => {
          const sock = io.sockets.sockets.get(socketId)
          if (sock) {
            sock.leave(`channel:${channel._id}`)
          }
        })
      }
    }

    createAndSendNotification(io, {
      recipientId: memberId,
      actorId: userId,
      type: "CHANNEL_REMOVED",
      title: `Removed from #${channel.name}`,
      message: `You were removed from the channel #${channel.name}.`,
      workspaceId,
      channelId: channel._id,
    })

    if (io) {
      io.to(`user:${memberId}`).emit("channel-member-removed", {
        workspaceId,
        channelId: channel._id.toString(),
        channelName: channel.name,
        type: channel.type,
        memberId: memberId.toString(),
      })
      io.to(`channel:${channel._id}`).emit("channel-updated", {
        workspaceId,
        channelId: channel._id.toString(),
        memberId: memberId.toString(),
        action: "removed",
      })
    }

    return res.json({ message: "Member removed from channel successfully" })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
}




export {
  createChannel,
  getWorkspaceChannels,
  getChannel,
  updateChannel,
  deleteChannel,
  addChannelMember,
  removeChannelMember,
}
