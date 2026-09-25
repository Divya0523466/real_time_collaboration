import User from "../models/User.js";
import WorkspaceMembership from "../models/WorkspaceMembership.js";

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

    return res.json({
      token: req.token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      workspaces,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error fetching user" });
  }
};
