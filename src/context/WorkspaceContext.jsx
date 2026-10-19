import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { toast } from "react-toastify";
import { showDesktopNotification } from "../utils/desktopNotification";
import { isSuperAdminUser, isDeactivatedAccount } from "../utils/adminAuth";
import socket, {
  connectSocket,
  onOnlineUsers,
  offOnlineUsers,
  onUserOnline,
  offUserOnline,
  onUserOffline,
  offUserOffline,
  requestOnlineUsers,
  emitChangeStatus,
  onUserStatusChanged,
  offUserStatusChanged,
  onOnlineStatuses,
  offOnlineStatuses,
} from "../services/socket";
import {
  fetchNotifications as apiFetchNotifications,
  fetchUnreadCount as apiFetchUnreadCount,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification,
} from "../services/notificationService";

const WorkspaceContext = createContext();

const readStoredValue = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeWorkspaceData = (payload, fallbackId = null) => {
  const workspace = payload?.workspace ?? payload ?? {};

  return {
    id: workspace.id ?? workspace._id ?? fallbackId,
    name: workspace.name ?? "",
    description: workspace.description ?? "",
    createdAt: workspace.createdAt ?? null,
    userRole: payload?.userRole ?? workspace.userRole ?? null,
    members: Array.isArray(payload?.members)
      ? payload.members
      : Array.isArray(workspace.members)
        ? workspace.members
        : [],
  };
};

const getAuthHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem("worknestToken");
  const headers = { ...extraHeaders };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const WorkspaceProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = readStoredValue("worknestUser", null);
    if (isDeactivatedAccount(stored)) {
      try {
        localStorage.removeItem("worknestUser");
        localStorage.removeItem("worknestWorkspaces");
        localStorage.removeItem("worknestWorkspaceData");
        localStorage.removeItem("worknestToken");
      } catch {}
      return null;
    }
    if (stored && isSuperAdminUser(stored)) {
      return {
        ...stored,
        platformRole: "super_admin",
        role: "admin",
        isSuperAdmin: true,
      };
    }
    return stored;
  });
  const [workspaces, setWorkspaces] = useState(() =>
    readStoredValue("worknestWorkspaces", []),
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceData, setWorkspaceData] = useState(() =>
    readStoredValue("worknestWorkspaceData", null),
  );
  const [channels, setChannels] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isMutedGlobal, setIsMutedGlobal] = useState(() => {
    return localStorage.getItem("worknest_global_mute") === "true";
  });
  const isMutedGlobalRef = useRef(isMutedGlobal);
  isMutedGlobalRef.current = isMutedGlobal;

  const toggleGlobalMute = useCallback(() => {
    const next = !isMutedGlobalRef.current;
    isMutedGlobalRef.current = next;
    setIsMutedGlobal(next);
    localStorage.setItem("worknest_global_mute", String(next));
    if (next) {
      toast.info("Notifications muted globally");
    } else {
      toast.success("Notifications unmuted");
    }
  }, []);

  const [mutedConversations, setMutedConversations] = useState(() => {
    try {
      const stored = localStorage.getItem("worknest_muted_conversations");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const mutedConversationsRef = useRef(mutedConversations);
  mutedConversationsRef.current = mutedConversations;

  const toggleMuteConversation = useCallback((type, id) => {
    if (!type || !id) return;
    const key = `${type}:${id}`;
    const next = new Set(mutedConversationsRef.current);
    const isMuted = next.has(key);
    if (isMuted) {
      next.delete(key);
      toast.info("Conversation unmuted");
    } else {
      next.add(key);
      toast.success("Conversation muted");
    }
    mutedConversationsRef.current = next;
    setMutedConversations(next);
    try {
      localStorage.setItem(
        "worknest_muted_conversations",
        JSON.stringify(Array.from(next)),
      );
    } catch (err) {}
  }, []);

  const isConversationMuted = useCallback(
    (type, id) => {
      if (!type || !id) return false;
      return mutedConversations.has(`${type}:${id}`);
    },
    [mutedConversations],
  );
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [userStatuses, setUserStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(() => {
    try {
      const urlParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      if (urlParams?.get("token")) return true;
      const token =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("worknestToken")
          : null;
      const storedUser =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("worknestUser")
          : null;
      return Boolean(
        token && token !== "null" && token !== "undefined" && !storedUser,
      );
    } catch {
      return false;
    }
  });

  // Automatically fetch the user session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get("token");
        if (urlToken) {
          localStorage.setItem("worknestToken", urlToken);
          urlParams.delete("token");
          const newSearch = urlParams.toString()
            ? `?${urlParams.toString()}`
            : "";
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + newSearch,
          );
        }

        const token = localStorage.getItem("worknestToken");
        if (!token || token === "null" || token === "undefined") {
          setUser(null);
          setWorkspaces([]);
          setWorkspaceData(null);
          localStorage.removeItem("worknestUser");
          localStorage.removeItem("worknestWorkspaces");
          localStorage.removeItem("worknestWorkspaceData");
          localStorage.removeItem("worknestToken");
          setIsInitializing(false);
          return;
        }

        const headers = getAuthHeaders();
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/me`,
          {
            credentials: "include",
            headers,
          },
        );

        if (response.ok) {
          const data = await response.json();
          let isDeact =
            data.user?.isActive === false || data.user?.status === "inactive";
          try {
            const stored = localStorage.getItem("worknest_deactivated_users");
            const deactList = stored ? JSON.parse(stored) : [];
            const deactSet = new Set(
              deactList.map((x) => String(x).toLowerCase().trim()),
            );
            const uid = String(data.user?.id || data.user?._id || "")
              .toLowerCase()
              .trim();
            const uemail = String(data.user?.email || "")
              .toLowerCase()
              .trim();
            if (deactSet.has(uid) || deactSet.has(uemail)) {
              isDeact = true;
            }
          } catch {
            // ignore
          }

          if (isDeact) {
            setUser(null);
            setWorkspaces([]);
            setWorkspaceData(null);
            localStorage.removeItem("worknestUser");
            localStorage.removeItem("worknestWorkspaces");
            localStorage.removeItem("worknestWorkspaceData");
            localStorage.removeItem("worknestToken");
            setIsInitializing(false);
            return;
          }
          const effectiveUser = isSuperAdminUser(data.user)
            ? {
                ...data.user,
                platformRole: "super_admin",
                role: "admin",
                isSuperAdmin: true,
              }
            : data.user;
          setUser(effectiveUser);
          setWorkspaces(data.workspaces || []);
          localStorage.setItem("worknestUser", JSON.stringify(effectiveUser));
          localStorage.setItem(
            "worknestWorkspaces",
            JSON.stringify(data.workspaces || []),
          );
          if (data.token) {
            localStorage.setItem("worknestToken", data.token);
          }
          if (isSuperAdminUser(effectiveUser)) {
            const curToken =
              data.token || localStorage.getItem("worknestToken");
            if (curToken)
              localStorage.setItem("worknest_admin_token", curToken);
          }
        } else if (response.status === 401 || response.status === 403) {
          setUser(null);
          setWorkspaces([]);
          setWorkspaceData(null);
          localStorage.removeItem("worknestUser");
          localStorage.removeItem("worknestWorkspaces");
          localStorage.removeItem("worknestWorkspaceData");
          localStorage.removeItem("worknestToken");
        }
      } catch (err) {
        console.error("Failed to restore session:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    fetchSession();
  }, []);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchNotifications = useCallback(async (params = {}) => {
    try {
      const data = await apiFetchNotifications(params);
      setNotifications(data.notifications || []);
      setUnreadNotificationsCount(data.unreadCount || 0);
      return data;
    } catch (err) {
      return { notifications: [], totalCount: 0, unreadCount: 0 };
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id) => {
    try {
      const res = await apiMarkAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadNotificationsCount((prev) =>
        res.unreadCount !== undefined ? res.unreadCount : Math.max(0, prev - 1),
      );
    } catch (err) {}
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await apiMarkAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
    } catch (err) {}
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const res = await apiDeleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (res.unreadCount !== undefined) {
        setUnreadNotificationsCount(res.unreadCount);
      }
    } catch (err) {}
  }, []);
  const userId = user?.id || user?._id || null;

  useEffect(() => {
    if (!userId) {
      socket.disconnect();
      return undefined;
    }

    const handleNotification = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadNotificationsCount((prev) => prev + 1);

      if (isMutedGlobalRef.current) return;

      const cId = (newNotif.channelId?._id || newNotif.channelId)?.toString();
      const sId = (newNotif.spaceId?._id || newNotif.spaceId)?.toString();
      const dmSenderId = (
        newNotif.actorId?._id ||
        newNotif.actorId ||
        newNotif.metadata?.senderId
      )?.toString();

      if (cId && mutedConversationsRef.current.has(`channel:${cId}`)) return;
      if (sId && mutedConversationsRef.current.has(`space:${sId}`)) return;
      if (
        (newNotif.type === "DM_NEW_MESSAGE" ||
          newNotif.type === "DM_MENTION") &&
        dmSenderId &&
        mutedConversationsRef.current.has(`dm:${dmSenderId}`)
      ) {
        return;
      }

      toast.info(newNotif.title, {
        icon: <i className="fa-solid fa-bell text-[#395B64]" />,
      });
      showDesktopNotification(newNotif.title, {
        body: newNotif.message,
      });
    };

    const handleChannelMemberRemoved = (data) => {
      if (!data?.channelId) return;
      if (data.type === "PRIVATE") {
        setChannels((prev) =>
          prev.filter(
            (c) => (c.id || c._id)?.toString() !== data.channelId.toString(),
          ),
        );
      }
    };

    const handleChannelMemberAdded = (data) => {
      if (!data?.channel) return;
      setChannels((prev) => {
        const exists = prev.some(
          (c) =>
            (c.id || c._id)?.toString() ===
            (data.channel.id || data.channel._id)?.toString(),
        );
        if (exists) return prev;
        return [...prev, data.channel];
      });
    };

    const handleOnlineUsers = (userIds) => {
      setOnlineUsers(
        new Set(Array.isArray(userIds) ? userIds.map(String) : []),
      );
    };

    const handleUserOnline = ({ userId }) => {
      if (!userId) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId.toString());
        return next;
      });
    };

    const handleUserOffline = ({ userId }) => {
      if (!userId) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId.toString());
        return next;
      });
      setUserStatuses((prev) => ({ ...prev, [userId.toString()]: "offline" }));
    };

    const handleOnlineStatuses = (statuses) => {
      if (statuses && typeof statuses === "object") {
        setUserStatuses((prev) => ({ ...prev, ...statuses }));
      }
    };

    const handleUserStatusChanged = ({ userId, status }) => {
      if (!userId || !status) return;
      setUserStatuses((prev) => ({ ...prev, [userId.toString()]: status }));
      if (userId.toString() === (user?._id || user?.id)?.toString()) {
        setUser((prev) => (prev ? { ...prev, presenceStatus: status } : prev));
      }
    };

    const handleSocketConnect = () => {
      requestOnlineUsers();
    };

    socket.on("receive-notification", handleNotification);
    socket.on("channel-member-removed", handleChannelMemberRemoved);
    socket.on("channel-member-added", handleChannelMemberAdded);
    socket.on("connect", handleSocketConnect);
    onOnlineUsers(handleOnlineUsers);
    onUserOnline(handleUserOnline);
    onUserOffline(handleUserOffline);
    onOnlineStatuses(handleOnlineStatuses);
    onUserStatusChanged(handleUserStatusChanged);
    connectSocket();

    fetchNotifications().catch(() => {});

    return () => {
      socket.off("receive-notification", handleNotification);
      socket.off("channel-member-removed", handleChannelMemberRemoved);
      socket.off("channel-member-added", handleChannelMemberAdded);
      socket.off("connect", handleSocketConnect);
      offOnlineUsers(handleOnlineUsers);
      offUserOnline(handleUserOnline);
      offUserOffline(handleUserOffline);
      offOnlineStatuses(handleOnlineStatuses);
      offUserStatusChanged(handleUserStatusChanged);
      socket.disconnect();
    };
  }, [userId, fetchNotifications]);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("worknestToken");
    localStorage.removeItem("worknestUser");
    localStorage.removeItem("worknestWorkspaces");
    localStorage.removeItem("worknestWorkspaceData");
    setUser(null);
    setWorkspaces([]);
    setSelectedWorkspace(null);
    setWorkspaceData(null);
    setChannels([]);
    setInvitations([]);
    setNotifications([]);
    setUnreadNotificationsCount(0);
    setOnlineUsers(new Set());
    setError(null);
  }, []);

  const initializeFromAuth = useCallback(
    (userData, userWorkspaces, token = null) => {
      if (token) {
        localStorage.setItem("worknestToken", token);
      }
      const effectiveUser = isSuperAdminUser(userData)
        ? {
            ...userData,
            platformRole: "super_admin",
            role: "admin",
            isSuperAdmin: true,
          }
        : userData;
      localStorage.setItem("worknestUser", JSON.stringify(effectiveUser));
      localStorage.setItem(
        "worknestWorkspaces",
        JSON.stringify(userWorkspaces || []),
      );
      setUser(effectiveUser);
      setWorkspaces(Array.isArray(userWorkspaces) ? userWorkspaces : []);
      setSelectedWorkspace(null);
      setWorkspaceData(null);
      setChannels([]);
      setInvitations([]);
      setError(null);
    },
    [],
  );

  const fetchPendingInvitations = useCallback(async () => {
    if (!user?.email) {
      setInvitations([]);
      return [];
    }

    try {
      const response = await fetch(`${API_URL}/workspaces/invitations`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to fetch invitations");
      }

      const data = await response.json();
      const nextInvitations = Array.isArray(data.invitations)
        ? data.invitations
        : [];
      setInvitations(nextInvitations);
      return nextInvitations;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [API_URL, user?.email]);

  const fetchUserWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/workspaces`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch workspaces");
      }

      const data = await response.json();
      const nextWorkspaces = Array.isArray(data.workspaces)
        ? data.workspaces
        : [];
      setWorkspaces(nextWorkspaces);
      return nextWorkspaces;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const selectWorkspace = useCallback(
    async (workspaceId) => {
      if (!workspaceId) {
        setSelectedWorkspace(null);
        setWorkspaceData(null);
        setChannels([]);
        return;
      }

      setError(null);
      setSelectedWorkspace(workspaceId);

      // Keep existing data if it already matches the requested workspace, otherwise reset
      setWorkspaceData((prev) => {
        if (
          prev &&
          (prev.id?.toString() === workspaceId?.toString() ||
            prev._id?.toString() === workspaceId?.toString())
        ) {
          return prev;
        }
        return null;
      });
      setChannels([]);
      setLoading(true);

      try {
        const [workspaceResponse, channelsResponse] = await Promise.all([
          fetch(`${API_URL}/workspaces/${workspaceId}`, {
            credentials: "include",
            headers: getAuthHeaders(),
          }),
          fetch(`${API_URL}/workspaces/${workspaceId}/channels`, {
            credentials: "include",
            headers: getAuthHeaders(),
          }),
        ]);

        if (!workspaceResponse.ok) {
          const payload = await workspaceResponse.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to load workspace");
        }

        const data = await workspaceResponse.json();
        const normalizedWorkspace = normalizeWorkspaceData(data, workspaceId);
        setWorkspaceData(normalizedWorkspace);
        try {
          localStorage.setItem(
            "worknestWorkspaceData",
            JSON.stringify(normalizedWorkspace),
          );
        } catch {}

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          setChannels(
            Array.isArray(channelsData.channels) ? channelsData.channels : [],
          );
        } else {
          setChannels([]);
        }
      } catch (err) {
        setSelectedWorkspace(null);
        setWorkspaceData(null);
        setChannels([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [API_URL],
  );

  const refreshChannels = useCallback(
    async (workspaceIdToRefresh = selectedWorkspace) => {
      if (!workspaceIdToRefresh) return [];
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${workspaceIdToRefresh}/channels`,
          {
            credentials: "include",
            headers: getAuthHeaders(),
          },
        );
        if (response.ok) {
          const data = await response.json();
          const nextChannels = Array.isArray(data.channels)
            ? data.channels
            : [];
          setChannels(nextChannels);
          return nextChannels;
        }
        return [];
      } catch (err) {
        return [];
      }
    },
    [API_URL, selectedWorkspace],
  );

  const createWorkspace = useCallback(
    async (name, description) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/workspaces`, {
          credentials: "include",
          method: "POST",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ name, description }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to create workspace");
        }

        const data = await response.json();
        const newWorkspace = data.workspace;
        setWorkspaces((prev) => [newWorkspace, ...prev]);
        return newWorkspace;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [API_URL],
  );

  const createChannel = useCallback(
    async (name, description, type, members = []) => {
      if (!selectedWorkspace) return;

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels`,
          {
            credentials: "include",
            method: "POST",
            headers: getAuthHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ name, description, type, members }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to create channel");
        }

        const data = await response.json();
        const newChannel = data.channel;
        setChannels((prev) => [...prev, newChannel]);
        return newChannel;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedWorkspace, API_URL],
  );

  const getChannel = useCallback(
    async (channelId, targetWorkspaceId = null) => {
      const activeWorkspace = targetWorkspaceId || selectedWorkspace;
      if (!activeWorkspace || !channelId) return null;

      const response = await fetch(
        `${API_URL}/workspaces/${activeWorkspace}/channels/${channelId}`,
        {
          credentials: "include",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to fetch channel");
      }

      const data = await response.json();
      return data.channel;
    },
    [selectedWorkspace, API_URL],
  );

  const getCurrentUserRole = useCallback(() => {
    if (!workspaceData) return null;
    return workspaceData.userRole;
  }, [workspaceData]);

  const updateMemberRole = useCallback(
    async (memberId, newRole) => {
      if (!selectedWorkspace) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/members/${memberId}/role`,
          {
            credentials: "include",
            method: "PATCH",
            headers: getAuthHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ role: newRole }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to update member role");
        }

        await selectWorkspace(selectedWorkspace);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedWorkspace, selectWorkspace, API_URL],
  );

  const removeMember = useCallback(
    async (memberId) => {
      if (!selectedWorkspace) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/members/${memberId}`,
          {
            credentials: "include",
            method: "DELETE",
            headers: getAuthHeaders(),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to remove member");
        }

        await selectWorkspace(selectedWorkspace);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedWorkspace, selectWorkspace, API_URL],
  );

  const addChannelMember = useCallback(
    async (channelId, memberId) => {
      if (!selectedWorkspace) return;
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}/members`,
          {
            credentials: "include",
            method: "POST",
            headers: getAuthHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ memberId }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to add member to channel");
        }
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [selectedWorkspace, API_URL],
  );

  const removeChannelMember = useCallback(
    async (channelId, memberId) => {
      if (!selectedWorkspace) return;
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}/members/${memberId}`,
          {
            credentials: "include",
            method: "DELETE",
            headers: getAuthHeaders(),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload.message || "Failed to remove member from channel",
          );
        }
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [selectedWorkspace, API_URL],
  );

  const updateWorkspace = useCallback(
    async (name, description) => {
      if (!selectedWorkspace) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}`,
          {
            credentials: "include",
            method: "PATCH",
            headers: getAuthHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ name, description }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to update workspace");
        }

        const data = await response.json();
        setWorkspaceData((prev) =>
          prev
            ? {
                ...prev,
                name: data.workspace.name,
                description: data.workspace.description,
              }
            : prev,
        );
        setWorkspaces((prev) =>
          prev.map((ws) =>
            ws.id === selectedWorkspace
              ? {
                  ...ws,
                  name: data.workspace.name,
                  description: data.workspace.description,
                }
              : ws,
          ),
        );
        return data.workspace;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedWorkspace, API_URL],
  );

  const deleteWorkspace = useCallback(async () => {
    if (!selectedWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/workspaces/${selectedWorkspace}`,
        {
          credentials: "include",
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to delete workspace");
      }

      setWorkspaces((prev) => prev.filter((ws) => ws.id !== selectedWorkspace));
      setSelectedWorkspace(null);
      setWorkspaceData(null);
      setChannels([]);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspace, API_URL]);

  const updateChannel = useCallback(
    async (channelId, name, description, members) => {
      if (!selectedWorkspace) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}`,
          {
            credentials: "include",
            method: "PATCH",
            headers: getAuthHeaders({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ name, description, members }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to update channel");
        }

        const data = await response.json();
        setChannels((prev) =>
          prev.map((c) =>
            c.id === channelId
              ? {
                  ...c,
                  name: data.channel.name,
                  description: data.channel.description,
                }
              : c,
          ),
        );
        return data.channel;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedWorkspace, API_URL],
  );

  const deleteChannel = useCallback(
    async (channelId) => {
      if (!selectedWorkspace) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}`,
          {
            credentials: "include",
            method: "DELETE",
            headers: getAuthHeaders(),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to delete channel");
        }

        setChannels((prev) => prev.filter((c) => c.id !== channelId));
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedWorkspace, API_URL],
  );

  const acceptInvitation = useCallback(
    async (invitationId) => {
      try {
        const response = await fetch(
          `${API_URL}/workspaces/invitations/${invitationId}/accept`,
          {
            credentials: "include",
            method: "POST",
            headers: getAuthHeaders({
              "Content-Type": "application/json",
            }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to accept invitation");
        }

        setInvitations((prev) =>
          prev.filter((invitation) => invitation.id !== invitationId),
        );
        await fetchUserWorkspaces();
        return true;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [API_URL, fetchUserWorkspaces],
  );

  const declineInvitation = useCallback(
    async (invitationId) => {
      try {
        const response = await fetch(
          `${API_URL}/workspaces/invitations/${invitationId}/decline`,
          {
            credentials: "include",
            method: "POST",
            headers: getAuthHeaders({
              "Content-Type": "application/json",
            }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to decline invitation");
        }

        setInvitations((prev) =>
          prev.filter((invitation) => invitation.id !== invitationId),
        );
        return true;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [API_URL],
  );

  const updateUserProfile = useCallback(
    async ({ username, avatar }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          credentials: "include",
          method: "PUT",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ username, avatar }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to update profile");
        }

        const updatedUser = data.user;
        setUser(updatedUser);
        localStorage.setItem("worknestUser", JSON.stringify(updatedUser));

        // Also update local workspaceData members if current workspace is loaded
        setWorkspaceData((prev) => {
          if (!prev || !Array.isArray(prev.members)) return prev;
          const nextMembers = prev.members.map((m) => {
            const mId = (m.id || m._id || m.userId)?.toString();
            if (mId === updatedUser.id?.toString()) {
              return {
                ...m,
                username: updatedUser.username,
                avatar: updatedUser.avatar,
                avatarUrl: updatedUser.avatar,
                ...(m.user
                  ? {
                      user: {
                        ...m.user,
                        username: updatedUser.username,
                        avatar: updatedUser.avatar,
                        avatarUrl: updatedUser.avatar,
                      },
                    }
                  : {}),
              };
            }
            return m;
          });
          return { ...prev, members: nextMembers };
        });

        toast.success("Profile updated successfully!");
        return updatedUser;
      } catch (err) {
        setError(err.message);
        toast.error(err.message || "Failed to update profile");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [API_URL],
  );

  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      const sId = (userId?._id || userId?.id || userId)?.toString();
      if (!sId || !onlineUsers.has(sId)) return false;
      if (sId === (user?._id || user?.id)?.toString()) {
        return user?.presenceStatus !== "offline";
      }
      return userStatuses[sId] !== "offline";
    },
    [onlineUsers, userStatuses, user],
  );

  const getUserPresenceStatus = useCallback(
    (targetUserId) => {
      if (!targetUserId) return "offline";
      const sId = (
        targetUserId?._id ||
        targetUserId?.id ||
        targetUserId
      )?.toString();
      if (!sId) return "offline";
      if (sId === (user?._id || user?.id)?.toString()) {
        return user?.presenceStatus || "active";
      }

      if (!onlineUsers.has(sId)) {
        return "offline";
      }

      return userStatuses[sId] || "active";
    },
    [onlineUsers, userStatuses, user],
  );

  const updateUserPresenceStatus = useCallback(
    async (newStatus) => {
      if (!["active", "away", "offline"].includes(newStatus)) return;

      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, presenceStatus: newStatus };
        try {
          localStorage.setItem("worknestUser", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      emitChangeStatus(newStatus);

      try {
        await fetch(`${API_URL}/auth/status`, {
          method: "PATCH",
          credentials: "include",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (err) {
        console.error("Failed to update status on server:", err);
      }
    },
    [API_URL],
  );

  const value = {
    isInitializing,
    user,
    setUser,
    updateUserProfile,
    workspaces,
    selectedWorkspace,
    workspaceData,
    channels,
    invitations,
    loading,
    error,
    onlineUsers,
    isUserOnline,
    userStatuses,
    getUserPresenceStatus,
    updateUserPresenceStatus,
    initializeFromAuth,
    clearAuth,
    fetchPendingInvitations,
    fetchUserWorkspaces,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createChannel,
    getChannel,
    updateChannel,
    deleteChannel,
    getCurrentUserRole,
    updateMemberRole,
    removeMember,
    addChannelMember,
    removeChannelMember,
    refreshChannels,
    acceptInvitation,
    declineInvitation,
    notifications,
    unreadNotificationsCount,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    isMutedGlobal,
    toggleGlobalMute,
    mutedConversations,
    toggleMuteConversation,
    isConversationMuted,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
};
