const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const createCheckoutSessionApi = async () => {
  const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to initiate payment session");
  }
  return data;
};

export const verifySessionApi = async (sessionId) => {
  const res = await fetch(`${API_URL}/billing/verify-session`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ sessionId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to verify payment session");
  }
  return data;
};

export const getSubscriptionStatusApi = async () => {
  const res = await fetch(`${API_URL}/billing/status`, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch subscription status");
  }
  return data;
};

export const cancelSubscriptionApi = async () => {
  const res = await fetch(`${API_URL}/billing/cancel-subscription`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to cancel subscription");
  }
  return data;
};
