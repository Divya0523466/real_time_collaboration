export const getSuperAdminSet = () => {
  try {
    const stored = localStorage.getItem("worknest_super_admins");
    const adminList = stored ? JSON.parse(stored) : [];
    return new Set(adminList.map((x) => String(x).toLowerCase().trim()));
  } catch {
    return new Set();
  }
};

export const isSuperAdminUser = (user) => {
  if (!user) return false;
  const email = String(user.email || "")
    .toLowerCase()
    .trim();
  if (email === "admin@gmail.com") return true;

  const role = String(user.role || "").toLowerCase().trim();
  const platformRole = String(user.platformRole || "").toLowerCase().trim();

  if (
    role === "super_admin" ||
    role === "admin" ||
    platformRole === "super_admin" ||
    platformRole === "admin" ||
    user.isSuperAdmin === true
  ) {
    return true;
  }
  const adminSet = getSuperAdminSet();
  const uid = String(user.id || user._id || "")
    .toLowerCase()
    .trim();
  return (uid && adminSet.has(uid)) || (email && adminSet.has(email));
};

export const addSuperAdmin = (targetUser) => {
  if (!targetUser) return;
  try {
    const stored = localStorage.getItem("worknest_super_admins");
    const adminList = stored ? JSON.parse(stored) : [];
    const adminSet = new Set(
      adminList.map((x) => String(x).toLowerCase().trim()),
    );
    const uid = String(targetUser.id || targetUser._id || "")
      .toLowerCase()
      .trim();
    const uemail = String(targetUser.email || "")
      .toLowerCase()
      .trim();
    if (uid) adminSet.add(uid);
    if (uemail) adminSet.add(uemail);
    localStorage.setItem(
      "worknest_super_admins",
      JSON.stringify([...adminSet]),
    );
  } catch {
    // ignore
  }
};

export const removeSuperAdmin = (targetUser) => {
  if (!targetUser) return;
  try {
    const stored = localStorage.getItem("worknest_super_admins");
    const adminList = stored ? JSON.parse(stored) : [];
    const adminSet = new Set(
      adminList.map((x) => String(x).toLowerCase().trim()),
    );
    const uid = String(targetUser.id || targetUser._id || "")
      .toLowerCase()
      .trim();
    const uemail = String(targetUser.email || "")
      .toLowerCase()
      .trim();
    if (uid) adminSet.delete(uid);
    if (uemail) adminSet.delete(uemail);
    localStorage.setItem(
      "worknest_super_admins",
      JSON.stringify([...adminSet]),
    );
  } catch {
    // ignore
  }
};

export const getDeactivatedUserSet = () => {
  try {
    const stored = localStorage.getItem("worknest_deactivated_users");
    const deactList = stored ? JSON.parse(stored) : [];
    return new Set(deactList.map((x) => String(x).toLowerCase().trim()));
  } catch {
    return new Set();
  }
};

export const isDeactivatedAccount = (user) => {
  if (!user) return false;
  if (user.isActive === false || user.status === "inactive") return true;
  const deactSet = getDeactivatedUserSet();
  const uid = String(user.id || user._id || "")
    .toLowerCase()
    .trim();
  const uemail = String(user.email || "")
    .toLowerCase()
    .trim();
  return (uid && deactSet.has(uid)) || (uemail && deactSet.has(uemail));
};

/**
 * Returns the cached admin users list. If the cache is empty,
 * it compiles an initial directory from all known platform accounts
 * (e.g. admin@gmail.com, promoted admins, members from workspaces).
 */
export const getCachedAdminUsers = () => {
  const superAdminSet = getSuperAdminSet();
  const deactSet = getDeactivatedUserSet();

  try {
    const cached = localStorage.getItem("worknest_cached_admin_users");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Re-apply latest deactivations and super admin roles
        return parsed.map((u) => {
          const uid = String(u.id || u._id || "")
            .toLowerCase()
            .trim();
          const uemail = String(u.email || "")
            .toLowerCase()
            .trim();
          const isDeact =
            deactSet.has(uid) ||
            (uemail && deactSet.has(uemail)) ||
            u.isActive === false ||
            u.status === "inactive";
          const isSuper =
            uemail === "admin@gmail.com" ||
            u.role === "super_admin" ||
            u.role === "admin" ||
            u.platformRole === "super_admin" ||
            u.platformRole === "admin" ||
            u.isSuperAdmin === true ||
            (uid && superAdminSet.has(uid)) ||
            (uemail && superAdminSet.has(uemail));
          return {
            ...u,
            isActive: !isDeact,
            status: isDeact ? "inactive" : "active",
            platformRole: isSuper ? "super_admin" : u.platformRole || "user",
            role: isSuper ? "admin" : u.role || "member",
          };
        });
      }
    }
  } catch {}

  const userMap = new Map();

  const registerUser = (u, defaultRole = "member") => {
    if (!u) return;
    const uid = String(u.id || u._id || "")
      .toLowerCase()
      .trim();
    const uemail = String(u.email || "")
      .toLowerCase()
      .trim();
    const key = uemail || uid;
    if (!key) return;

    const isDeact =
      deactSet.has(uid) ||
      (uemail && deactSet.has(uemail)) ||
      u.isActive === false ||
      u.status === "inactive";

    const isSuper =
      uemail === "admin@gmail.com" ||
      u.role === "super_admin" ||
      u.role === "admin" ||
      u.platformRole === "super_admin" ||
      u.platformRole === "admin" ||
      u.isSuperAdmin === true ||
      (uid && superAdminSet.has(uid)) ||
      (uemail && superAdminSet.has(uemail));

    userMap.set(key, {
      id: u.id || u._id || uid || key,
      _id: u._id || u.id || uid || key,
      username: u.username || (uemail ? uemail.split("@")[0] : "User"),
      email: u.email || (uemail ? uemail : ""),
      avatar: u.avatar || null,
      isActive: !isDeact,
      status: isDeact ? "inactive" : "active",
      platformRole: isSuper ? "super_admin" : u.platformRole || "user",
      role: isSuper ? "admin" : u.role || defaultRole,
      createdAt: u.createdAt || new Date().toISOString(),
    });
  };

  // 1. Primary admin
  registerUser({
    id: "admin-system",
    username: "Admin",
    email: "admin@gmail.com",
    role: "admin",
    platformRole: "super_admin",
  });

  // 2. Currently stored user
  try {
    const cur = localStorage.getItem("worknestUser");
    if (cur) registerUser(JSON.parse(cur));
  } catch {}

  // 3. Super admins recorded in store
  superAdminSet.forEach((entry) => {
    if (entry.includes("@")) {
      registerUser({
        email: entry,
        username: entry.split("@")[0],
        role: "admin",
        platformRole: "super_admin",
      });
    }
  });

  // 4. Any members present in workspaces
  try {
    const wsRaw = localStorage.getItem("worknestWorkspaces");
    if (wsRaw) {
      const wsList = JSON.parse(wsRaw);
      if (Array.isArray(wsList)) {
        wsList.forEach((ws) => {
          if (Array.isArray(ws.members)) {
            ws.members.forEach((m) => {
              registerUser(m.user || m);
            });
          }
        });
      }
    }
  } catch {}

  const result = Array.from(userMap.values());
  try {
    localStorage.setItem("worknest_cached_admin_users", JSON.stringify(result));
  } catch {}
  return result;
};

export const getCachedAdminWorkspaces = () => {
  try {
    const cached = localStorage.getItem("worknest_cached_admin_workspaces");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    const stored = localStorage.getItem("worknestWorkspaces");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
};
