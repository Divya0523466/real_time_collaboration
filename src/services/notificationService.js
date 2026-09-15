const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const fetchNotifications = async ({ unreadOnly = false } = {}) => {
  const token = localStorage.getItem("worknestToken");
  if (!token) return { notifications: [], totalCount: 0, unreadCount: 0 };

  const queryParams = new URLSearchParams({
    ...(unreadOnly ? { unreadOnly: "true" } : {}),
  });

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const response = await fetch(`${API_URL}/notifications${queryString}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch notifications");
  }

  return data;
};

export const fetchUnreadCount = async () => {
  const token = localStorage.getItem("worknestToken");
  if (!token) return 0;

  const response = await fetch(`${API_URL}/notifications/unread-count`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch unread count");
  }

  return data.unreadCount || 0;
};

export const markNotificationAsRead = async (id) => {
  const response = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to mark notification as read");
  }

  return data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to mark all as read");
  }

  return data;
};

export const deleteNotification = async (id) => {
  const response = await fetch(`${API_URL}/notifications/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to delete notification");
  }

  return data;
};
