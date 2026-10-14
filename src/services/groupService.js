const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

export const fetchGroupsApi = async (workspaceId) => {
  const res = await fetch(`${API_URL}/groups/workspace/${workspaceId}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch groups");
  return data;
};

export const createGroupApi = async ({ workspaceId, name, description, members }) => {
  const res = await fetch(`${API_URL}/groups`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ workspaceId, name, description, members }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create group");
  return data.group;
};

export const fetchGroupApi = async (groupId) => {
  const res = await fetch(`${API_URL}/groups/${groupId}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch group details");
  return data.group;
};

export const fetchGroupMessagesApi = async (groupId) => {
  const res = await fetch(`${API_URL}/groups/${groupId}/messages`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch group messages");
  return data.messages || [];
};

export const sendGroupMessageApi = async (groupId, { content, attachments }) => {
  const res = await fetch(`${API_URL}/groups/${groupId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ content, attachments }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to send group message");
  return data.message;
};

export const addGroupMembersApi = async (groupId, memberIds) => {
  const res = await fetch(`${API_URL}/groups/${groupId}/members`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ memberIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to add members");
  return data.group;
};

export const removeGroupMemberApi = async (groupId, userId) => {
  const res = await fetch(`${API_URL}/groups/${groupId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to remove member");
  return data;
};
