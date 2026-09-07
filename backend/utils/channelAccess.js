import mongoose from "mongoose"
import Channel from "../models/Channel.js"
import WorkspaceMembership from "../models/WorkspaceMembership.js"

const getChannelAccess = async (userId, channelId) => {
  if (!mongoose.isValidObjectId(channelId)) {
    return { channel: null, membership: null }
  }

  const channel = await Channel.findById(channelId)
  if (!channel) {
    return { channel: null, membership: null }
  }

  const membership = await WorkspaceMembership.findOne({
    userId,
    workspaceId: channel.workspaceId,
  })

  if (!membership) {
    return { channel: null, membership: null }
  }

  const isPrivateMember = channel.members.some(
    (memberId) => memberId.toString() === userId.toString(),
  )
  const isWorkspaceAdmin = ["OWNER", "ADMIN"].includes(membership.role)

  if (channel.type === "PRIVATE" && !isPrivateMember && !isWorkspaceAdmin) {
    return { channel: null, membership: null }
  }

  return { channel, membership }
}

export default getChannelAccess