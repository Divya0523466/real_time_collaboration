import mongoose from "mongoose";
import User from "../models/User.js";
import WorkspaceMembership from "../models/WorkspaceMembership.js";


export const extractMentionUserIds = (rawMentions) => {
  if (!rawMentions || !Array.isArray(rawMentions) || rawMentions.length === 0) {
    return [];
  }

  const ids = rawMentions
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return item.trim();
      if (item instanceof mongoose.Types.ObjectId) return item.toString();
      if (typeof item === "object") {
        const id = item.userId || item._id || item.id;
        if (id) {
          return id instanceof mongoose.Types.ObjectId ? id.toString() : String(id).trim();
        }
      }
      return null;
    })
    .filter(Boolean);

  // Deduplicate user IDs
  return [...new Set(ids)];
};


export const validateChannelMentions = async (rawMentions, channel, senderId = null) => {
  if (!rawMentions || !Array.isArray(rawMentions) || rawMentions.length === 0) {
    return { isValid: true, mentions: [] };
  }

  const uniqueUserIds = extractMentionUserIds(rawMentions).filter(
    (id) => !senderId || id !== senderId.toString()
  );
  if (uniqueUserIds.length === 0) {
    return { isValid: true, mentions: [] };
  }

  const allValidObjectIds = uniqueUserIds.every((id) => mongoose.isValidObjectId(id));
  if (!allValidObjectIds) {
    return {
      isValid: false,
      error: "One or more mentioned users are invalid.",
      statusCode: 400,
    };
  }


  const foundUsers = await User.find({ _id: { $in: uniqueUserIds } }).select("_id");
  if (foundUsers.length !== uniqueUserIds.length) {
    return {
      isValid: false,
      error: "One or more mentioned users are invalid.",
      statusCode: 400,
    };
  }


  const memberships = await WorkspaceMembership.find({
    workspaceId: channel.workspaceId,
    userId: { $in: uniqueUserIds },
  }).select("userId role");

  if (memberships.length !== uniqueUserIds.length) {
    return {
      isValid: false,
      error: "One or more mentioned users are not members of this channel.",
      statusCode: 400,
    };
  }

  if (channel.type === "PRIVATE") {
    const memberRoleMap = new Map();
    memberships.forEach((m) => memberRoleMap.set(m.userId.toString(), m.role));
    const channelMemberSet = new Set(
      (channel.members || []).map((m) => (m._id ? m._id.toString() : m.toString()))
    );

    for (const userId of uniqueUserIds) {
      const role = memberRoleMap.get(userId);
      const isChannelMember = channelMemberSet.has(userId);
      const isWorkspaceAdmin = ["OWNER", "ADMIN"].includes(role);

      if (!isChannelMember && !isWorkspaceAdmin) {
        return {
          isValid: false,
          error: "One or more mentioned users are not members of this channel.",
          statusCode: 400,
        };
      }
    }
  }

  return {
    isValid: true,
    mentions: uniqueUserIds.map((id) => ({
      userId: new mongoose.Types.ObjectId(id),
    })),
  };
};

export const validateDirectMentions = async (
  rawMentions,
  senderId,
  receiverId,
  workspaceId = null
) => {
  if (!rawMentions || !Array.isArray(rawMentions) || rawMentions.length === 0) {
    return { isValid: true, mentions: [] };
  }

  
  const uniqueUserIds = extractMentionUserIds(rawMentions).filter(
    (id) => !senderId || id !== senderId.toString()
  );
  if (uniqueUserIds.length === 0) {
    return { isValid: true, mentions: [] };
  }

  const allValidObjectIds = uniqueUserIds.every((id) => mongoose.isValidObjectId(id));
  if (!allValidObjectIds) {
    return {
      isValid: false,
      error: "One or more mentioned users are invalid.",
      statusCode: 400,
    };
  }

  
  const foundUsers = await User.find({ _id: { $in: uniqueUserIds } }).select("_id");
  if (foundUsers.length !== uniqueUserIds.length) {
    return {
      isValid: false,
      error: "One or more mentioned users are invalid.",
      statusCode: 400,
    };
  }


  const senderIdStr = senderId ? senderId.toString() : "";
  const receiverIdStr = receiverId ? receiverId.toString() : "";
  const otherMentionedIds = uniqueUserIds.filter(
    (id) => id !== senderIdStr && id !== receiverIdStr
  );

  if (otherMentionedIds.length === 0) {
    return {
      isValid: true,
      mentions: uniqueUserIds.map((id) => ({
        userId: new mongoose.Types.ObjectId(id),
      })),
    };
  }


  if (workspaceId && mongoose.isValidObjectId(workspaceId)) {
   
    const requiredCheckIds = [...new Set([senderIdStr, receiverIdStr, ...otherMentionedIds])];
    const memberships = await WorkspaceMembership.find({
      workspaceId,
      userId: { $in: requiredCheckIds },
    }).select("userId");

    const memberIdSet = new Set(memberships.map((m) => m.userId.toString()));
    const allBelong = requiredCheckIds.every((id) => memberIdSet.has(id));

    if (!allBelong) {
      return {
        isValid: false,
        error: "One or more mentioned users do not belong to this workspace.",
        statusCode: 400,
      };
    }
  } else {
   
    const senderMemberships = await WorkspaceMembership.find({
      userId: senderId,
    }).select("workspaceId");
    const senderWorkspaceIds = senderMemberships.map((m) => m.workspaceId.toString());

    const sharedMemberships = await WorkspaceMembership.find({
      userId: receiverId,
      workspaceId: { $in: senderWorkspaceIds },
    }).select("workspaceId");
    const sharedWorkspaceIds = sharedMemberships.map((m) => m.workspaceId);

    if (sharedWorkspaceIds.length === 0) {
      return {
        isValid: false,
        error: "Cannot mention external users outside the workspace.",
        statusCode: 400,
      };
    }

   
    const otherUserMemberships = await WorkspaceMembership.find({
      userId: { $in: otherMentionedIds },
      workspaceId: { $in: sharedWorkspaceIds },
    }).select("userId");

    const validOtherUserIds = new Set(otherUserMemberships.map((m) => m.userId.toString()));
    const allInShared = otherMentionedIds.every((id) => validOtherUserIds.has(id));

    if (!allInShared) {
      return {
        isValid: false,
        error: "One or more mentioned users do not belong to this workspace.",
        statusCode: 400,
      };
    }
  }

  return {
    isValid: true,
    mentions: uniqueUserIds.map((id) => ({
      userId: new mongoose.Types.ObjectId(id),
    })),
  };
};
