const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getToken = () => {
  const token = localStorage.getItem("worknestToken");

  if (!token || token === "null" || token === "undefined") {
    throw new Error("You must be logged in.");
  }

  return token;
};

export const uploadFile = async (file) => {
  const token = getToken();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to upload file");
  }

  return data;
};