const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken")
  const headers = {
    "Content-Type": "application/json",
  }
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export const fetchSpaces = async (workspaceId = null) => {
  const url = workspaceId
    ? `${API_URL}/spaces?workspaceId=${workspaceId}`
    : `${API_URL}/spaces`
  const res = await fetch(url, {
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to fetch spaces")
  }
  return res.json()
}

export const fetchSpace = async (spaceId) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to fetch space details")
  }
  return res.json()
}

export const createSpaceApi = async ({ name, description, members, workspaceId }) => {
  const res = await fetch(`${API_URL}/spaces`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, description, members, workspaceId }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to create space")
  }
  return res.json()
}

export const updateSpaceApi = async (spaceId, { name, description }) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, description }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to update space")
  }
  return res.json()
}

export const deleteSpaceApi = async (spaceId) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to delete space")
  }
  return res.json()
}

export const addSpaceMembersApi = async (spaceId, memberIds) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}/members`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ memberIds }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to add space members")
  }
  return res.json()
}

export const addSpaceMemberByEmailApi = async (spaceId, email) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}/members`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to add space member")
  }
  return res.json()
}

export const checkSpaceMemberByEmailApi = async (email, fallbackUsers = []) => {
  const trimmed = (email || "").trim().toLowerCase()
  if (!trimmed) throw new Error("Email is required")

  if (Array.isArray(fallbackUsers) && fallbackUsers.length > 0) {
    const localMatch = fallbackUsers.find((u) => {
      const uEmail = (u.email || "").trim().toLowerCase()
      const uName = (u.username || "").trim().toLowerCase()
      return uEmail === trimmed || uName === trimmed
    })
    if (localMatch) {
      return { exists: true, user: localMatch }
    }
  }

  try {
    const res = await fetch(`${API_URL}/spaces/check-member?email=${encodeURIComponent(trimmed)}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.exists === false || !data.user) {
        throw new Error(data.message || "User with this email not found")
      }
      return data
    }

    if (res.status === 404) {
      try {
        const adminRes = await fetch(`${API_URL}/admin/users`, {
          credentials: "include",
          headers: getAuthHeaders(),
        })
        if (adminRes.ok) {
          const adminData = await adminRes.json()
          const users = adminData.users || []
          const found = users.find((u) => {
            const uEmail = (u.email || "").trim().toLowerCase()
            const uName = (u.username || "").trim().toLowerCase()
            return uEmail === trimmed || uName === trimmed
          })
          if (found) {
            return { exists: true, user: found }
          }
          throw new Error("User with this email not found")
        }
      } catch (adminErr) {
        if (adminErr.message === "User with this email not found") throw adminErr
      }
    }

    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "User with this email not found")
  } catch (err) {
    throw err
  }
}

export const removeSpaceMemberApi = async (spaceId, userId) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to remove space member")
  }
  return res.json()
}

export const fetchSpaceMembersApi = async (spaceId) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}/members`, {
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to fetch space members")
  }
  return res.json()
}

export const fetchSpaceMessagesApi = async (spaceId) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}/messages`, {
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to fetch space messages")
  }
  return res.json()
}

export const markSpaceAsReadApi = async (spaceId) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}/read`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to mark space as read")
  }
  return res.json()
}

export const markSpaceAsUnreadApi = async (spaceId) => {
  const res = await fetch(`${API_URL}/spaces/${spaceId}/unread`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to mark space as unread")
  }
  return res.json()
}

export const fetchSpaceUnreadCountsApi = async (workspaceId = null) => {
  const url = workspaceId
    ? `${API_URL}/spaces/unread-counts?workspaceId=${workspaceId}`
    : `${API_URL}/spaces/unread-counts`
  const res = await fetch(url, {
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    return { spaces: {} }
  }
  return res.json()
}
