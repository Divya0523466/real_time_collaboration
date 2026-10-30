export const isProUser = (user) => {
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

  // Check if currentPeriodEnd has expired
  if (sub.currentPeriodEnd) {
    const expired = new Date(sub.currentPeriodEnd).getTime() <= Date.now();
    if (expired) {
      return false;
    }
  }

  return (
    sub.status === "active" ||
    sub.status === "canceling" ||
    sub.cancelAtPeriodEnd === true
  );
};

export const getSubscriptionDisplayText = (user) => {
  if (!user) return "Free Plan";
  if (!isProUser(user)) return "Free Plan";

  const sub = user.subscription;
  if (sub?.cancelAtPeriodEnd || sub?.status === "canceling") {
    const dateStr = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "end of period";
    return `Pro Plan (Cancels on ${dateStr})`;
  }

  return "WorkNest Pro";
};
