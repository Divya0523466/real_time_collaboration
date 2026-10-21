import mongoose from "mongoose";
import Group from "../models/Group.js";
import ChannelMessage from "../models/ChannelMessage.js";
import User from "../models/User.js";

// formatting messages in groups
export const formatGroupMessage = (msg) => ({
  id: msg._id,
  _id: msg._id,
  groupId: msg.groupId,
  senderId: msg.senderId?._id || msg.senderId,
  sender: msg.senderId?._id
    ? {
        id: msg.senderId._id,
        _id: msg.senderId._id,
        username: msg.senderId.username,
        avatar: msg.senderId.avatar,
        displayName: msg.senderId.displayName || msg.senderId.username,
      }
    : undefined,
  content: msg.isDeleted ? null : msg.content,
  attachments: msg.attachments || [],
  reactions: msg.reactions || [],
  readBy: msg.readBy || [],
  isEdited: msg.isEdited || false,
  isDeleted: msg.isDeleted || false,
  createdAt: msg.createdAt,
});

// new group creation
export const createGroup = async (req, res) => {
  try {
    const { workspaceId, name, description, members = [] } = req.body;
    const userId = req.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required" });
    }

    //making group creator as a member and admin of the group
    const memberSet = new Set([userId.toString()]);
    if (Array.isArray(members)) {
      members.forEach((mId) => {
        if (mId && mongoose.isValidObjectId(mId)) {
          memberSet.add(mId.toString());
        }
      });
    }

    const group = await Group.create({
      workspaceId,
      name: name.trim(),
      description: description ? description.trim() : "",
      createdBy: userId,
      members: Array.from(memberSet),
      admins: [userId],
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("createdBy", "username avatar email displayName")
      .populate("members", "username avatar email displayName")
      .populate("admins", "username avatar email displayName");

    //notifications
    const io = req.app.get("io");
    if (io) {
      for (const mId of memberSet) {
        io.to(`user:${mId}`).emit("group-created", populatedGroup);
      }
    }

    return res.status(201).json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    return res
      .status(500)
      .json({ message: "Failed to create group", error: error.message });
  }
};

// get all groups in workspace for the current user
export const getWorkspaceGroups = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required" });
    }

    const groups = await Group.find({
      workspaceId,
      members: userId,
    })
      .populate("createdBy", "username avatar email displayName")
      .populate("members", "username avatar email displayName")
      .populate("admins", "username avatar email displayName")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ success: true, groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch groups", error: error.message });
  }
};

// get group details by id
export const getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!groupId || !mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId)
      .populate("createdBy", "username avatar email displayName")
      .populate("members", "username avatar email displayName")
      .populate("admins", "username avatar email displayName")
      .lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (m) => (m._id || m).toString() === userId.toString(),
    );
    if (!isMember) {
      return res
        .status(403)
        .json({
          message: "Access denied. You are not a member of this group.",
        });
    }

    return res.json({ success: true, group });
  } catch (error) {
    console.error("Error fetching group:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch group", error: error.message });
  }
};

// get messages of a group
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    if (!groupId || !mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId).select("members").lean();
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (m) => m.toString() === userId.toString(),
    );
    if (!isMember) {
      return res
        .status(403)
        .json({
          message: "Access denied. You are not a member of this group.",
        });
    }

    const messages = await ChannelMessage.find({
      groupId,
      isDeleted: { $ne: true },
    })
      .populate("senderId", "username avatar email displayName")
      .sort({ createdAt: 1 })
      .lean();

    const currentUser = await User.findById(req.userId).select("username avatar displayName");
    if (currentUser) {
      await ChannelMessage.updateMany(
        {
          groupId,
          senderId: { $ne: req.userId },
          "readBy.userId": { $ne: req.userId },
        },
        {
          $addToSet: {
            readBy: {
              userId: currentUser._id,
              username: currentUser.username || currentUser.displayName || "User",
              avatar: currentUser.avatar || "",
            },
          },
        }
      );
      const io = req.app.get("io");
      if (io) {
        io.to(`group:${groupId}`).emit("group-messages-read", {
          groupId,
          user: {
            userId: currentUser._id,
            username: currentUser.username || currentUser.displayName || "User",
            avatar: currentUser.avatar || "",
          },
        });
      }
    }

    const formatted = messages.map((m) => formatGroupMessage(m));
    return res.json({ success: true, messages: formatted });
  } catch (error) {
    console.error("Error fetching group messages:", error);
    return res
      .status(500)
      .json({
        message: "Failed to fetch group messages",
        error: error.message,
      });
  }
};

// send a message in a group
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, attachments = [] } = req.body;
    const userId = req.userId;

    const trimmedContent = typeof content === "string" ? content.trim() : "";
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!groupId || !mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    if (!trimmedContent && !hasAttachments) {
      return res
        .status(400)
        .json({ message: "Message content or attachment is required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (m) => m.toString() === userId.toString(),
    );
    if (!isMember) {
      return res
        .status(403)
        .json({
          message: "Access denied. You are not a member of this group.",
        });
    }

    const savedMessage = await ChannelMessage.create({
      groupId,
      senderId: userId,
      content: trimmedContent,
      attachments: attachments || [],
    });

    const populated = await ChannelMessage.findById(savedMessage._id).populate(
      "senderId",
      "username avatar email displayName",
    );

    const formatted = formatGroupMessage(populated);

    // Broadcast in real-time
    const io = req.app.get("io");
    if (io) {
      io.to(`group:${groupId}`).emit("receive-group-message", formatted);
    }

    return res.status(201).json({ success: true, message: formatted });
  } catch (error) {
    console.error("Error sending group message:", error);
    return res
      .status(500)
      .json({ message: "Failed to send group message", error: error.message });
  }
};

// add members to a group
export const addGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds = [] } = req.body;
    const userId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only existing members/admins can add members
    const isMember = group.members.some(
      (m) => m.toString() === userId.toString(),
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "Only group members can add new members" });
    }

    const currentMemberSet = new Set(group.members.map((m) => m.toString()));
    const newlyAdded = [];

    memberIds.forEach((mId) => {
      if (
        mId &&
        mongoose.isValidObjectId(mId) &&
        !currentMemberSet.has(mId.toString())
      ) {
        currentMemberSet.add(mId.toString());
        newlyAdded.push(mId.toString());
      }
    });

    group.members = Array.from(currentMemberSet);
    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate("createdBy", "username avatar email displayName")
      .populate("members", "username avatar email displayName")
      .populate("admins", "username avatar email displayName");

    const io = req.app.get("io");
    if (io) {
      // Notify group room
      io.to(`group:${groupId}`).emit("group-updated", populatedGroup);
      // Notify newly added users
      newlyAdded.forEach((newId) => {
        io.to(`user:${newId}`).emit("group-created", populatedGroup);
      });
    }

    return res.json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error("Error adding group members:", error);
    return res
      .status(500)
      .json({ message: "Failed to add group members", error: error.message });
  }
};

// remove a member or leave
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, userId: targetUserId } = req.params;
    const currentUserId = req.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isSelfLeave = currentUserId.toString() === targetUserId.toString();
    const isAdmin = group.admins.some(
      (a) => a.toString() === currentUserId.toString(),
    );

    if (!isSelfLeave && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Only group admins can remove other members" });
    }

    group.members = group.members.filter(
      (m) => m.toString() !== targetUserId.toString(),
    );
    group.admins = group.admins.filter(
      (a) => a.toString() !== targetUserId.toString(),
    );

    // if not admins give first member to admin
    if (group.admins.length === 0 && group.members.length > 0) {
      group.admins.push(group.members[0]);
    }

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate("createdBy", "username avatar email displayName")
      .populate("members", "username avatar email displayName")
      .populate("admins", "username avatar email displayName");

    const io = req.app.get("io");
    if (io) {
      io.to(`group:${groupId}`).emit("group-updated", populatedGroup);
      io.to(`user:${targetUserId}`).emit("group-removed", { groupId });
    }

    return res.json({
      success: true,
      message: isSelfLeave ? "You left the group" : "Member removed from group",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Error removing group member:", error);
    return res
      .status(500)
      .json({ message: "Failed to remove group member", error: error.message });
  }
};
