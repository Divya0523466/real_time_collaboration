const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem("worknestToken");
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
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

export const submitManualPaymentApi = async (formData) => {
  const res = await fetch(`${API_URL}/billing/manual-payment`, {
    method: "POST",
    headers: getAuthHeaders(true),
    credentials: "include",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to submit manual payment");
  }
  return data;
};

export const getMyManualPaymentStatusApi = async () => {
  const res = await fetch(`${API_URL}/billing/manual-payment/status`, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch manual payment status");
  }
  return data;
};

export const getAdminManualPaymentsApi = async () => {
  const res = await fetch(`${API_URL}/admin/manual-payments`, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch manual payments");
  }
  return data;
};

export const approveManualPaymentApi = async (paymentId) => {
  const res = await fetch(`${API_URL}/admin/manual-payments/${paymentId}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to approve payment");
  }
  return data;
};

export const rejectManualPaymentApi = async (paymentId, reason) => {
  const res = await fetch(`${API_URL}/admin/manual-payments/${paymentId}/reject`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ reason }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to reject payment");
  }
  return data;
};
