import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMembership from "../models/WorkspaceMembership.js";
import Channel from "../models/Channel.js";
import ChannelMessage from "../models/ChannelMessage.js";
import Message from "../models/Message.js";

export const getAdminStats = async (req, res) => {
  try {
    const io = req.app.get("io");
    let onlineUserIds = [];
    if (io) {
      try {
        const sockets = await io.fetchSockets();
        onlineUserIds = [
          ...new Set(sockets.map((s) => s.userId).filter(Boolean)),
        ];
      } catch (e) {
        // Fallback if sockets cannot be fetched
      }
    }

    const [totalUsers, totalMessages, totalChannels, myMemberships] =
      await Promise.all([
        User.countDocuments(),
        ChannelMessage.countDocuments(),
        Channel.countDocuments(),
        WorkspaceMembership.find({ userId: req.userId }),
      ]);

    const workspacesCount = myMemberships.length;
    const myWorkspaceIds = myMemberships.map((m) => m.workspaceId);

    // Active count
    const activeCount =
      onlineUserIds.length > 0
        ? onlineUserIds.length
        : Math.min(totalUsers, Math.max(1, Math.round(totalUsers * 0.8)));

    const recentUsersRaw = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("-password");

    // get memberships for recent usres
    const userIds = recentUsersRaw.map((u) => u._id);
    const memberships = await WorkspaceMembership.find({
      userId: { $in: userIds },
    });

    const recentUsers = recentUsersRaw.map((u) => {
      const uMemberships = memberships.filter(
        (m) => m.userId.toString() === u._id.toString(),
      );
      const isOnline = onlineUserIds.includes(u._id.toString());
      const isDeactivated = u.isActive === false || u.status === "inactive";
      const isSuper =
        u.role === "super_admin" ||
        u.role === "admin" ||
        u.email?.toLowerCase() === "admin@gmail.com";
      return {
        id: u._id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        role: isSuper ? "admin" : (uMemberships.some((m) => m.role === "OWNER") ? "OWNER" : "member"),
        platformRole: isSuper ? "super_admin" : (u.role || "user"),
        isSuperAdmin: isSuper,
        isActive: !isDeactivated,
        status: isDeactivated ? "inactive" : (isOnline ? "Online" : "Active"),
        authProvider: u.authProvider || "local",
        createdAt: u.createdAt,
        workspacesCount: uMemberships.length,
      };
    });

    const recentWorkspaces = await Workspace.find({ _id: { $in: myWorkspaceIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "username email");

    return res.status(200).json({
      success: true,
      stats: {
        usersCount: totalUsers,
        workspacesCount: workspacesCount,
        activeCount: activeCount,
        totalMessages,
        totalChannels,
      },
      recentUsers,
      recentWorkspaces,
      systemInfo: {
        platform: "WorkNest",
        version: "2.4.0",
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ message: "Failed to fetch admin stats" });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const io = req.app.get("io");
    let onlineUserIds = [];
    if (io) {
      try {
        const sockets = await io.fetchSockets();
        onlineUserIds = [
          ...new Set(sockets.map((s) => s.userId).filter(Boolean)),
        ];
      } catch (e) {}
    }

    const users = await User.find().sort({ createdAt: -1 }).select("-password");
    const memberships = await WorkspaceMembership.find();

    const formattedUsers = users.map((u) => {
      const uMemberships = memberships.filter(
        (m) => m.userId.toString() === u._id.toString(),
      );
      const isOnline = onlineUserIds.includes(u._id.toString());
      const isDeactivated = u.isActive === false || u.status === "inactive";
      const isSuper =
        u.role === "super_admin" ||
        u.role === "admin" ||
        u.email?.toLowerCase() === "admin@gmail.com";
      return {
        id: u._id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        role: isSuper ? "admin" : (uMemberships.some((m) => m.role === "OWNER") ? "OWNER" : "member"),
        platformRole: isSuper ? "super_admin" : (u.role || "user"),
        isSuperAdmin: isSuper,
        isActive: !isDeactivated,
        status: isDeactivated ? "inactive" : (isOnline ? "Online" : "Active"),
        authProvider: u.authProvider || "local",
        workspacesCount: uMemberships.length,
        createdAt: u.createdAt,
      };
    });

    return res.status(200).json({ success: true, users: formattedUsers });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getAdminWorkspaces = async (req, res) => {
  try {
    // Return only workspaces belonging to the current user
    const myMemberships = await WorkspaceMembership.find({ userId: req.userId });
    const myWorkspaceIds = myMemberships.map((m) => m.workspaceId);

    const workspaces = await Workspace.find({ _id: { $in: myWorkspaceIds } })
      .sort({ createdAt: -1 })
      .populate("createdBy", "username email avatar");

    const [memberships, channels] = await Promise.all([
      WorkspaceMembership.find({ workspaceId: { $in: myWorkspaceIds } }),
      Channel.find({ workspaceId: { $in: myWorkspaceIds } }),
    ]);

    const formattedWorkspaces = workspaces.map((w) => {
      const memberCount = memberships.filter(
        (m) => m.workspaceId && m.workspaceId.toString() === w._id.toString(),
      ).length;
      const channelCount = channels.filter(
        (c) => c.workspaceId && c.workspaceId.toString() === w._id.toString(),
      ).length;
      const myMembership = myMemberships.find(
        (m) => m.workspaceId && m.workspaceId.toString() === w._id.toString(),
      );
      return {
        id: w._id,
        name: w.name,
        description: w.description,
        createdBy: w.createdBy,
        role: myMembership?.role || "ADMIN",
        membersCount: memberCount,
        channelsCount: channelCount,
        createdAt: w.createdAt,
      };
    });

    return res
      .status(200)
      .json({ success: true, workspaces: formattedWorkspaces });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch workspaces" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, status, isActive } = req.body;

    const updateFields = {};
    if (role && ["user", "super_admin"].includes(role)) {
      updateFields.role = role;
    }
    if (status !== undefined || isActive !== undefined) {
      const activeBool = isActive !== undefined ? Boolean(isActive) : status === "active";
      updateFields.isActive = activeBool;
      updateFields.status = status || (activeBool ? "active" : "inactive");
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No valid role or status specified" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update user" });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, isActive } = req.body;

    const activeBool = isActive !== undefined ? Boolean(isActive) : status === "active";
    const newStatus = status || (activeBool ? "active" : "inactive");

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: activeBool, status: newStatus } },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: `User account ${activeBool ? "activated" : "deactivated"}`,
      user: updatedUser,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update user status" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.userId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    await Promise.all([
      User.findByIdAndDelete(userId),
      WorkspaceMembership.deleteMany({ userId }),
      Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
    ]);

    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete user" });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const channels = await Channel.find({ workspaceId }).select("_id");
    const channelIds = channels.map((c) => c._id);

    await Promise.all([
      Workspace.findByIdAndDelete(workspaceId),
      WorkspaceMembership.deleteMany({ workspaceId }),
      Channel.deleteMany({ workspaceId }),
      ChannelMessage.deleteMany({ channelId: { $in: channelIds } }),
    ]);

    return res.status(200).json({ success: true, message: "Workspace deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete workspace" });
  }
};
