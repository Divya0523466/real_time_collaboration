import mongoose from "mongoose";
import Message from "../models/Message.js";
import ChannelMessage from "../models/ChannelMessage.js";
import Channel from "../models/Channel.js";
import Space from "../models/Space.js";
import Group from "../models/Group.js";
import WorkspaceMembership from "../models/WorkspaceMembership.js";

export const globalSearch = async (req, res) => {
  try {
    const rawUserId = req.userId || req.user?.id || req.user?._id;
    if (!rawUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { q, workspaceId, page = 1, limit = 20 } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({ message: "Query must be at least 2 characters." });
    }

    const trimmedQuery = q.trim();
    const skip = Math.max(0, (Number(page) - 1) * Number(limit));
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));

    // Escape regex characters safely
    const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const currentUserIdStr = rawUserId.toString();
    const currentUserId = mongoose.isValidObjectId(currentUserIdStr)
      ? new mongoose.Types.ObjectId(currentUserIdStr)
      : currentUserIdStr;

    let accessibleChannels = [];
    let memberSpaces = [];
    let memberGroups = [];

    if (workspaceId && mongoose.isValidObjectId(workspaceId)) {
      const wsObjectId = new mongoose.Types.ObjectId(workspaceId);

      const membership = await WorkspaceMembership.findOne({
        workspaceId: wsObjectId,
        userId: currentUserId,
      }).lean().catch(() => null);

      const channelQuery = { workspaceId: wsObjectId };
      if (!membership) {
        channelQuery.members = currentUserId;
      } else {
        channelQuery.$or = [{ type: "PUBLIC" }, { members: currentUserId }];
      }

      const results = await Promise.allSettled([
        Channel.find(channelQuery).select("_id name type").lean(),
        Space.find({ workspaceId: wsObjectId, members: currentUserId }).select("_id name").lean(),
        Group.find({ workspaceId: wsObjectId, members: currentUserId }).select("_id name").lean(),
      ]);

      accessibleChannels = results[0].status === "fulfilled" ? results[0].value : [];
      memberSpaces = results[1].status === "fulfilled" ? results[1].value : [];
      memberGroups = results[2].status === "fulfilled" ? results[2].value : [];
    } else {
      // If workspaceId is not specified or invalid, query across all accessible spaces/groups/channels
      const results = await Promise.allSettled([
        Channel.find({ members: currentUserId }).select("_id name type").lean(),
        Space.find({ members: currentUserId }).select("_id name").lean(),
        Group.find({ members: currentUserId }).select("_id name").lean(),
      ]);

      accessibleChannels = results[0].status === "fulfilled" ? results[0].value : [];
      memberSpaces = results[1].status === "fulfilled" ? results[1].value : [];
      memberGroups = results[2].status === "fulfilled" ? results[2].value : [];
    }

    const channelIds = accessibleChannels.map((c) => c._id);
    const spaceIds = memberSpaces.map((s) => s._id);
    const groupIds = memberGroups.map((g) => g._id);

    const channelMap = Object.fromEntries(accessibleChannels.map((c) => [c._id.toString(), c]));
    const spaceMap = Object.fromEntries(memberSpaces.map((s) => [s._id.toString(), s]));
    const groupMap = Object.fromEntries(memberGroups.map((g) => [g._id.toString(), g]));

    const baseFilter = { isDeleted: false, content: regex };

    // Parallel searches with settled handling so one failure won't 500 the whole request
    const searchTasks = await Promise.allSettled([
      channelIds.length > 0
        ? ChannelMessage.find({ ...baseFilter, channelId: { $in: channelIds } })
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .populate("senderId", "username avatar")
            .lean()
        : Promise.resolve([]),

      spaceIds.length > 0
        ? ChannelMessage.find({ ...baseFilter, spaceId: { $in: spaceIds } })
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .populate("senderId", "username avatar")
            .lean()
        : Promise.resolve([]),

      groupIds.length > 0
        ? ChannelMessage.find({ ...baseFilter, groupId: { $in: groupIds } })
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .populate("senderId", "username avatar")
            .lean()
        : Promise.resolve([]),

      Message.find({
        ...baseFilter,
        $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
        deletedBy: { $nin: [currentUserId] },
      })
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .populate("senderId", "username avatar")
        .populate("receiverId", "username avatar")
        .lean(),
    ]);

    const channelMsgs = searchTasks[0].status === "fulfilled" ? searchTasks[0].value : [];
    const spaceMsgs = searchTasks[1].status === "fulfilled" ? searchTasks[1].value : [];
    const groupMsgs = searchTasks[2].status === "fulfilled" ? searchTasks[2].value : [];
    const dmMsgs = searchTasks[3].status === "fulfilled" ? searchTasks[3].value : [];

    // Shape results
    const results = [
      ...channelMsgs.map((m) => ({
        _id: m._id,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.senderId,
        sourceType: "channel",
        sourceName: channelMap[m.channelId?.toString()]?.name || "Channel",
        sourceId: m.channelId?.toString(),
        isPrivate: channelMap[m.channelId?.toString()]?.type === "PRIVATE",
        attachments: m.attachments || [],
      })),
      ...spaceMsgs.map((m) => ({
        _id: m._id,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.senderId,
        sourceType: "space",
        sourceName: spaceMap[m.spaceId?.toString()]?.name || "Space",
        sourceId: m.spaceId?.toString(),
        attachments: m.attachments || [],
      })),
      ...groupMsgs.map((m) => ({
        _id: m._id,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.senderId,
        sourceType: "group",
        sourceName: groupMap[m.groupId?.toString()]?.name || "Group",
        sourceId: m.groupId?.toString(),
        attachments: m.attachments || [],
      })),
      ...dmMsgs.map((m) => {
        const myId = currentUserIdStr;
        const other =
          (m.senderId?._id || m.senderId)?.toString() === myId
            ? m.receiverId
            : m.senderId;
        return {
          _id: m._id,
          content: m.content,
          createdAt: m.createdAt,
          sender: m.senderId,
          sourceType: "dm",
          sourceName: other?.username || "Direct Message",
          sourceId: (other?._id || other)?.toString(),
          attachments: m.attachments || [],
        };
      }),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + safeLimit);

    return res.json({ results, query: trimmedQuery, page: Number(page), limit: safeLimit });
  } catch (err) {
    console.error("Global search error:", err);
    return res.status(500).json({ message: err.message || "Search failed. Please try again." });
  }
};
