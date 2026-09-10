import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import socket, { connectSocket } from "../services/socket";
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

export const WorkspaceProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredValue("worknestUser", null));
  const [workspaces, setWorkspaces] = useState(() => readStoredValue("worknestWorkspaces", []));
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceData, setWorkspaceData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchNotifications = useCallback(async (params = {}) => {
    try {
      const data = await apiFetchNotifications(params);
      setNotifications(data.notifications || []);
      setUnreadNotificationsCount(data.unreadCount || 0);
      return data;
    } catch (err) {
      console.error("Failed to load notifications:", err);
      return { notifications: [], totalCount: 0, unreadCount: 0 };
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id) => {
    try {
      const res = await apiMarkAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => (res.unreadCount !== undefined ? res.unreadCount : Math.max(0, prev - 1)));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await apiMarkAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const res = await apiDeleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (res.unreadCount !== undefined) {
        setUnreadNotificationsCount(res.unreadCount);
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      socket.disconnect();
      return undefined;
    }

    const handleConnectionSuccess = (data) => {
      console.log("Socket:", data);
    };

    const handleDirectMessage = (data) => {
      console.log("Direct message received:", data);
    };

    const handleNotification = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadNotificationsCount((prev) => prev + 1);
      toast.info(newNotif.title, {
        icon: "🔔",
      });
    };

    const handleChannelMemberRemoved = (data) => {
      if (!data?.channelId) return;
      if (data.type === "PRIVATE") {
        setChannels((prev) =>
          prev.filter((c) => (c.id || c._id)?.toString() !== data.channelId.toString())
        );
      }
    };

    const handleChannelMemberAdded = (data) => {
      if (!data?.channel) return;
      setChannels((prev) => {
        const exists = prev.some(
          (c) => (c.id || c._id)?.toString() === (data.channel.id || data.channel._id)?.toString()
        );
        if (exists) return prev;
        return [...prev, data.channel];
      });
    };

    socket.on("connection-success", handleConnectionSuccess);
    socket.on("receive-direct-message", handleDirectMessage);
    socket.on("receive-notification", handleNotification);
    socket.on("channel-member-removed", handleChannelMemberRemoved);
    socket.on("channel-member-added", handleChannelMemberAdded);
    connectSocket();

    fetchNotifications().catch(console.error);

    return () => {
      socket.off("connection-success", handleConnectionSuccess);
      socket.off("receive-direct-message", handleDirectMessage);
      socket.off("receive-notification", handleNotification);
      socket.off("channel-member-removed", handleChannelMemberRemoved);
      socket.off("channel-member-added", handleChannelMemberAdded);
      socket.disconnect();
    };
  }, [user, fetchNotifications]);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("worknestToken");
    localStorage.removeItem("worknestUser");
    localStorage.removeItem("worknestWorkspaces");
    setUser(null);
    setWorkspaces([]);
    setSelectedWorkspace(null);
    setWorkspaceData(null);
    setChannels([]);
    setInvitations([]);
    setNotifications([]);
    setUnreadNotificationsCount(0);
    setError(null);
  }, []);

  const initializeFromAuth = useCallback((userData, userWorkspaces) => {
    localStorage.setItem("worknestUser", JSON.stringify(userData));
    localStorage.setItem("worknestWorkspaces", JSON.stringify(userWorkspaces || []));
    setUser(userData);
    setWorkspaces(Array.isArray(userWorkspaces) ? userWorkspaces : []);
    setSelectedWorkspace(null);
    setWorkspaceData(null);
    setChannels([]);
    setInvitations([]);
    setError(null);
  }, []);

  const fetchPendingInvitations = useCallback(async () => {
    if (!user?.email) {
      setInvitations([]);
      return [];
    }

    try {
      const token = localStorage.getItem("worknestToken");
      const response = await fetch(`${API_URL}/workspaces/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to fetch invitations");
      }

      const data = await response.json();
      const nextInvitations = Array.isArray(data.invitations) ? data.invitations : [];
      setInvitations(nextInvitations);
      return nextInvitations;
    } catch (err) {
      setError(err.message);
      console.error("Error fetching invitations:", err);
      return [];
    }
  }, [API_URL, user?.email]);

  const fetchUserWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("worknestToken");
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(`${API_URL}/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
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
      console.error("Error fetching workspaces:", err);
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

      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Failed to load workspace");
        }

        const data = await response.json();
        const normalizedWorkspace = normalizeWorkspaceData(data, workspaceId);
        setSelectedWorkspace(workspaceId);
        setWorkspaceData(normalizedWorkspace);

        const channelsResponse = await fetch(
          `${API_URL}/workspaces/${workspaceId}/channels`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

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
        console.error("Error selecting workspace:", err);
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${workspaceIdToRefresh}/channels`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.ok) {
          const data = await response.json();
          const nextChannels = Array.isArray(data.channels) ? data.channels : [];
          setChannels(nextChannels);
          return nextChannels;
        }
        return [];
      } catch (err) {
        console.error("Error refreshing channels:", err);
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(`${API_URL}/workspaces`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
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
    async (channelId) => {
      if (!selectedWorkspace || !channelId) return null;

      const token = localStorage.getItem("worknestToken");
      const response = await fetch(
        `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/members/${memberId}/role`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/members/${memberId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}/members`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}/members/${memberId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
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
      const token = localStorage.getItem("worknestToken");
      const response = await fetch(
        `${API_URL}/workspaces/${selectedWorkspace}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
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
        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/workspaces/${selectedWorkspace}/channels/${channelId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
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

  const acceptInvitation = useCallback(async (invitationId) => {
    try {
      const token = localStorage.getItem("worknestToken");
      const response = await fetch(`${API_URL}/workspaces/invitations/${invitationId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to accept invitation");
      }

      setInvitations((prev) => prev.filter((invitation) => invitation.id !== invitationId));
      await fetchUserWorkspaces();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [API_URL, fetchUserWorkspaces]);

  const declineInvitation = useCallback(async (invitationId) => {
    try {
      const token = localStorage.getItem("worknestToken");
      const response = await fetch(`${API_URL}/workspaces/invitations/${invitationId}/decline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to decline invitation");
      }

      setInvitations((prev) => prev.filter((invitation) => invitation.id !== invitationId));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [API_URL]);

  const value = {
    user,
    setUser,
    workspaces,
    selectedWorkspace,
    workspaceData,
    channels,
    invitations,
    loading,
    error,
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
