const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const globalSearchApi = async ({ q, workspaceId, page = 1, limit = 20 }) => {
  const params = new URLSearchParams({ q, workspaceId, page, limit });
  const res = await fetch(`${API_URL}/search?${params}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Search failed");
  return data;
};
