import mongoose from "mongoose";

export const PLAN_LIMITS = {
  FREE: {
    maxWorkspaces: 1,
    maxChannelsPerWorkspace: 5,
    maxSpaces: 3,
  },
  PRO: {
    maxWorkspaces: Infinity,
    maxChannelsPerWorkspace: Infinity,
    maxSpaces: Infinity,
  },
};

export const isUserPro = (user) => {
  if (!user) return false;

  if (
    user.role === "super_admin" ||
    user.role === "admin" ||
    user.platformRole === "super_admin" ||
    user.platformRole === "admin" ||
    user.email?.toLowerCase() === "admin@gmail.com"
  ) {
    return true;
  }

  const sub = user.subscription;
  if (!sub || sub.plan !== "PRO") return false;

  if (sub.currentPeriodEnd) {
    const expired = new Date(sub.currentPeriodEnd).getTime() <= Date.now();
    if (expired) {
      sub.plan = "FREE";
      sub.status = "canceled";
      sub.cancelAtPeriodEnd = false;
      sub.stripeSubscriptionId = null;
      if (typeof user.save === "function") {
        user.save().catch(() => {});
      }
      return false;
    }
  }

  return (
    sub.status === "active" ||
    sub.status === "canceling" ||
    sub.cancelAtPeriodEnd === true
  );
};

export const isWorkspaceReadOnly = async (workspaceId) => {
  if (!workspaceId) return false;
  const Workspace = mongoose.model("Workspace");
  const WorkspaceMembership = mongoose.model("WorkspaceMembership");
  const User = mongoose.model("User");

  const ws = await Workspace.findById(workspaceId).select("createdBy").lean();
  if (!ws || !ws.createdBy) return false;

  const owner = await User.findById(ws.createdBy);
  if (!owner || isUserPro(owner)) return false;

  const owned = await WorkspaceMembership.find({ userId: ws.createdBy, role: "OWNER" })
    .populate("workspaceId", "createdAt")
    .lean();

  const sorted = owned
    .filter((m) => m.workspaceId)
    .sort((a, b) => new Date(a.workspaceId.createdAt || a.createdAt) - new Date(b.workspaceId.createdAt || b.createdAt));

  if (!sorted.length) return false;
  const primaryId = (sorted[0].workspaceId._id || sorted[0].workspaceId).toString();
  return workspaceId.toString() !== primaryId;
};

export const isSpaceReadOnly = async (spaceId) => {
  if (!spaceId) return false;
  const Space = mongoose.model("Space");
  const User = mongoose.model("User");

  const sp = await Space.findById(spaceId).select("createdBy").lean();
  if (!sp || !sp.createdBy) return false;

  const creator = await User.findById(sp.createdBy);
  if (!creator || isUserPro(creator)) return false;

  const spaces = await Space.find({ createdBy: sp.createdBy })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();

  const allowedIds = spaces.slice(0, PLAN_LIMITS.FREE.maxSpaces).map((s) => s._id.toString());
  return !allowedIds.includes(spaceId.toString());
};
