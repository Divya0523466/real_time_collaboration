import { createContext, useContext, useState, useCallback } from "react";

const WorkspaceContext = createContext();

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
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceData, setWorkspaceData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const initializeFromAuth = useCallback((userData, userWorkspaces) => {
    setUser(userData);
    setWorkspaces(Array.isArray(userWorkspaces) ? userWorkspaces : []);
    setSelectedWorkspace(null);
    setWorkspaceData(null);
    setChannels([]);
    setError(null);
  }, []);

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

  const value = {
    user,
    setUser,
    workspaces,
    selectedWorkspace,
    workspaceData,
    channels,
    loading,
    error,
    initializeFromAuth,
    fetchUserWorkspaces,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createChannel,
    updateChannel,
    deleteChannel,
    getCurrentUserRole,
    updateMemberRole,
    removeMember,
    addChannelMember,
    removeChannelMember,
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
