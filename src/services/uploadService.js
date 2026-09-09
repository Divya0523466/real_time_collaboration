const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";


export const uploadFile = async (file) => {
  const token = localStorage.getItem("worknestToken");
  if (!token) {
    throw new Error("You must be logged in to upload files.");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
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
  } catch (error) {
    console.error("Upload service error:", error);
    throw error;
  }
};


export const getUserFiles = async () => {
  const token = localStorage.getItem("worknestToken");
  if (!token) throw new Error("You must be logged in to view files.");

  const response = await fetch(`${API_URL}/uploads`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch files");
  return data.files || [];
};

export const deleteFile = async (fileId) => {
  const token = localStorage.getItem("worknestToken");
  if (!token) throw new Error("You must be logged in to delete files.");

  const response = await fetch(`${API_URL}/uploads/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to delete file");
  return data;
};

