const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const fetchUnreadMessageCounts = async (workspaceId) => {
  const token = localStorage.getItem("worknestToken")
  if (!token || !workspaceId) return { channels: {}, dms: {} }

  const response = await fetch(`${API_URL}/messages/unread-counts?workspaceId=${workspaceId}`, { credentials: "include",
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch unread message counts")
  }

  return {
    channels: data.channels || {},
    dms: data.dms || {},
  }
}

export const markChannelAsRead = async (channelId) => {
  const token = localStorage.getItem("worknestToken")
  if (!token || !channelId) return null

  const response = await fetch(`${API_URL}/messages/channels/${channelId}/read`, { credentials: "include",
    method: "POST",
    headers: getAuthHeaders(),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Failed to mark channel as read")
  }

  return data
}

export const markDirectMessagesAsRead = async (userId) => {
  const token = localStorage.getItem("worknestToken")
  if (!token || !userId) return null

  const response = await fetch(`${API_URL}/messages/direct/${userId}/read`, { credentials: "include",
    method: "POST",
    headers: getAuthHeaders(),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Failed to mark direct messages as read")
  }

  return data
}

export const starMessageApi = async (messageId, messageType = "CHANNEL") => {
  const response = await fetch(`${API_URL}/messages/${messageId}/star`, {
    credentials: "include",
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageType }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Failed to star message")
  }
  return data
}

export const unstarMessageApi = async (messageId) => {
  const response = await fetch(`${API_URL}/messages/${messageId}/star`, {
    credentials: "include",
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Failed to unstar message")
  }
  return data
}

export const fetchStarredMessagesApi = async (workspaceId = null) => {
  const query = workspaceId ? `?workspaceId=${workspaceId}` : ""
  const response = await fetch(`${API_URL}/messages/starred${query}`, {
    credentials: "include",
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch starred messages")
  }
  return Array.isArray(data.starredMessages) ? data.starredMessages : (Array.isArray(data) ? data : [])
}

export const fetchUserMentionsApi = async (workspaceId = null) => {
  const query = workspaceId ? `?workspaceId=${workspaceId}` : ""
  const response = await fetch(`${API_URL}/messages/mentions${query}`, {
    credentials: "include",
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch mentions")
  }
  return Array.isArray(data.mentions) ? data.mentions : []
}
