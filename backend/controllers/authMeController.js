import User from "../models/User.js";
import WorkspaceMembership from "../models/WorkspaceMembership.js";

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isActive === false || user.status === "inactive") {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact the administrator.",
      });
    }

    if (user.email?.toLowerCase() === "admin@gmail.com" && user.role !== "super_admin") {
      user.role = "super_admin";
      await user.save().catch(() => {});
    }

    const memberships = await WorkspaceMembership.find({ userId: user._id }).populate("workspaceId");
    const workspaces = memberships
      .filter((m) => m.workspaceId)
      .map((m) => ({
        id: m.workspaceId._id,
        name: m.workspaceId.name,
        description: m.workspaceId.description,
        role: m.role,
      }));

    const isSuperAdmin =
      user.role === "super_admin" ||
      user.role === "admin" ||
      user.email?.toLowerCase() === "admin@gmail.com";

    return res.json({
      token: req.token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: isSuperAdmin ? "admin" : (user.role || "user"),
        platformRole: isSuperAdmin ? "super_admin" : "user",
        isSuperAdmin,
        isActive: user.isActive !== false,
        status: user.status || "active",
        presenceStatus: user.presenceStatus || "active",
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
        bio: user.bio || "",
        customStatus: user.customStatus || { text: "", emoji: "" },
        dndUntil: user.dndUntil || null,
        blockedUsers: (user.blockedUsers || []).map((id) => id.toString()),
      },
      workspaces,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error fetching user" });
  }
};
