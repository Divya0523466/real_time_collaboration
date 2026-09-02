import Workspace from "../models/Workspace.js";
import WorkspaceMembership, { ROLES } from "../models/WorkspaceMembership.js";
import Channel from "../models/Channel.js";
import Invitation from "../models/Invitation.js";

const ensureDefaultChannel = async (workspaceId, createdBy) => {
  const existing = await Channel.findOne({ workspaceId, name: "general" });
  if (existing) return existing;

  return Channel.create({
    workspaceId,
    name: "general",
    description: "General team discussion",
    type: "PUBLIC",
    createdBy,
    members: [createdBy],
  });
};

const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      createdBy: userId,
    });

    await WorkspaceMembership.create({
      userId,
      workspaceId: workspace._id,
      role: "OWNER",
    });

    await ensureDefaultChannel(workspace._id, userId);

    return res.status(201).json({
      message: "Workspace created successfully",
      workspace: {
        id: workspace._id,
        name: workspace.name,
        description: workspace.description,
        role: "OWNER",
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.userId;

    const memberships = await WorkspaceMembership.find({ userId }).populate(
      "workspaceId",
    );

    const workspaces = memberships
      .filter((m) => m.workspaceId)
      .map((m) => ({
        id: m.workspaceId._id,
        name: m.workspaceId.name,
        description: m.workspaceId.description,
        role: m.role,
      }));

    return res.json({ workspaces });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId;

    const membership = await WorkspaceMembership.findOne({
      userId,
      workspaceId,
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const members = await WorkspaceMembership.find({ workspaceId }).populate(
      "userId",
      "username email avatar",
    );

    return res.json({
      workspace: {
        id: workspace._id,
        name: workspace.name,
        description: workspace.description,
        createdAt: workspace.createdAt,
      },
      members: members.map((m) => ({
        id: m.userId._id,
        username: m.userId.username,
        email: m.userId.email,
        avatar: m.userId.avatar,
        role: m.role,
      })),
      userRole: membership.role,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.userId;

    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const requesterMembership = await WorkspaceMembership.findOne({
      userId,
      workspaceId,
    });

    if (!requesterMembership || requesterMembership.role !== "OWNER") {
      return res
        .status(403)
        .json({ message: "Only workspace owners can assign roles" });
    }

    const targetMembership = await WorkspaceMembership.findOne({
      userId: memberId,
      workspaceId,
    });

    if (targetMembership.role === "OWNER" && role !== "OWNER") {
      return res.status(400).json({ message: "Cannot remove owner role" });
    }

    targetMembership.role = role;
    await targetMembership.save();

    return res.json({ message: "Member role updated successfully", role });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const userId = req.userId;

    if (memberId === userId || memberId === userId.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot remove yourself from the workspace" });
    }

    const requesterMembership = await WorkspaceMembership.findOne({
      userId,
      workspaceId,
    });
    if (!requesterMembership || requesterMembership.role !== "OWNER") {
      return res
        .status(403)
        .json({ message: "Only workspace owners can remove members" });
    }

    const targetMembership = await WorkspaceMembership.findOne({
      userId: memberId,
      workspaceId,
    });
    if (!targetMembership) {
      return res.status(404).json({ message: "Member not found in workspace" });
    }

    if (targetMembership.role === "OWNER") {
      return res
        .status(400)
        .json({ message: "Cannot remove an owner from the workspace" });
    }

    await WorkspaceMembership.deleteOne({ _id: targetMembership._id });

    await Channel.updateMany({ workspaceId }, { $pull: { members: memberId } });

    return res.json({ message: "Member removed successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description } = req.body;
    const userId = req.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const requesterMembership = await WorkspaceMembership.findOne({
      userId,
      workspaceId,
    });
    if (!requesterMembership || requesterMembership.role !== "OWNER") {
      return res
        .status(403)
        .json({
          message: "Only workspace owners can update workspace settings",
        });
    }

    const workspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      {
        name: name.trim(),
        description: typeof description === "string" ? description.trim() : "",
      },
      { new: true },
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    return res.json({
      message: "Workspace updated successfully",
      workspace: {
        id: workspace._id,
        name: workspace.name,
        description: workspace.description,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId;

    const requesterMembership = await WorkspaceMembership.findOne({
      userId,
      workspaceId,
    });
    if (!requesterMembership || requesterMembership.role !== "OWNER") {
      return res
        .status(403)
        .json({ message: "Only workspace owners can delete a workspace" });
    }
    await Workspace.findByIdAndDelete(workspaceId);
    await WorkspaceMembership.deleteMany({ workspaceId });
    await Channel.deleteMany({ workspaceId });
    await Invitation.deleteMany({ workspaceId });

    return res.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export {
  createWorkspace,
  getUserWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  updateMemberRole,
  removeMember,
};
