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
