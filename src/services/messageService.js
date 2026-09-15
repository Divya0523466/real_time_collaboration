const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken")
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  }
}

export const fetchUnreadMessageCounts = async (workspaceId) => {
  const token = localStorage.getItem("worknestToken")
  if (!token || !workspaceId) return { channels: {}, dms: {} }

  const response = await fetch(`${API_URL}/messages/unread-counts?workspaceId=${workspaceId}`, {
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

  const response = await fetch(`${API_URL}/messages/channels/${channelId}/read`, {
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

  const response = await fetch(`${API_URL}/messages/direct/${userId}/read`, {
    method: "POST",
    headers: getAuthHeaders(),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || "Failed to mark direct messages as read")
  }

  return data
}
