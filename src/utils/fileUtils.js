/**
 * Helper to determine high-level attachment type from MIME type, extension, or filename
 */
export const getAttachmentType = (attachment) => {
  if (!attachment) return "other";

  const mime = (attachment.mimeType || "").toLowerCase();
  const ext = (
    attachment.extension ||
    attachment.format ||
    attachment.originalName?.split(".").pop() ||
    ""
  ).toLowerCase();

  // Images
  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"].includes(ext)
  ) {
    return "image";
  }

  // PDFs
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }

  // Documents
  if (
    ["doc", "docx", "odt", "rtf"].includes(ext) ||
    mime.includes("wordprocessing") ||
    mime.includes("msword")
  ) {
    return "document";
  }

  // Spreadsheets
  if (
    ["xls", "xlsx", "csv", "tsv", "ods"].includes(ext) ||
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv")
  ) {
    return "spreadsheet";
  }

  // Presentations
  if (
    ["ppt", "pptx", "odp", "key"].includes(ext) ||
    mime.includes("presentation") ||
    mime.includes("powerpoint")
  ) {
    return "presentation";
  }

  // Archives
  if (
    ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext) ||
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar")
  ) {
    return "archive";
  }

  // Text
  if (
    ["txt", "md", "log", "json", "xml", "js", "ts", "html", "css", "py", "java", "c", "cpp"].includes(ext) ||
    mime.startsWith("text/")
  ) {
    return "text";
  }

  return "other";
};

/**
 * Format bytes to readable size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Return FontAwesome icon and color for attachment type
 */
export const getFileIconConfig = (fileType) => {
  switch (fileType) {
    case "pdf":
      return {
        icon: "fa-solid fa-file-pdf",
        color: "text-red-500",
        bg: "bg-red-50 dark:bg-red-950/40",
        badge: "PDF",
      };
    case "document":
      return {
        icon: "fa-solid fa-file-word",
        color: "text-blue-500",
        bg: "bg-blue-50 dark:bg-blue-950/40",
        badge: "DOC",
      };
    case "spreadsheet":
      return {
        icon: "fa-solid fa-file-excel",
        color: "text-emerald-600",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        badge: "SHEET",
      };
    case "presentation":
      return {
        icon: "fa-solid fa-file-powerpoint",
        color: "text-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/40",
        badge: "PPT",
      };
    case "archive":
      return {
        icon: "fa-solid fa-file-zipper",
        color: "text-purple-500",
        bg: "bg-purple-50 dark:bg-purple-950/40",
        badge: "ZIP",
      };
    case "text":
      return {
        icon: "fa-solid fa-file-lines",
        color: "text-slate-500",
        bg: "bg-slate-50 dark:bg-slate-900/40",
        badge: "TXT",
      };
    case "image":
      return {
        icon: "fa-solid fa-file-image",
        color: "text-teal-500",
        bg: "bg-teal-50 dark:bg-teal-950/40",
        badge: "IMG",
      };
    default:
      return {
        icon: "fa-solid fa-file",
        color: "text-[#52656A] dark:text-[#A5C9CA]",
        bg: "bg-[#E7F6F2] dark:bg-[#2C3333]",
        badge: "FILE",
      };
  }
};

/**
 * Detect if message contains uploaded file URL or attachments (to disable edit where desired)
 */
export const isImageOrFileMessage = (message) => {
  if (!message) return false;
  if (message.attachments && message.attachments.length > 0) return true;
  const content = typeof message === "string" ? message : message.content;
  if (!content) return false;
  const lower = content.toLowerCase();
  return (
    lower.includes("res.cloudinary.com") ||
    lower.match(/\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)(\?.*)?$/i) !== null
  );
};

export const isUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const isUploadedFileUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("res.cloudinary.com") ||
    lower.match(/\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv)(\?.*)?$/i) !== null
  );
};

export const getFileNameFromUrl = (url) => {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/");
    const lastPart = parts[parts.length - 1] || "Attachment";
    return decodeURIComponent(lastPart);
  } catch {
    return "Attachment";
  }
};

export const parseAttachmentFromUrl = (url) => {
  const originalName = getFileNameFromUrl(url);
  const ext = originalName.split(".").pop().toLowerCase();
  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
  const isPdf = ext === "pdf";

  return {
    url,
    originalName,
    extension: ext,
    mimeType: isImage ? `image/${ext}` : (isPdf ? "application/pdf" : ""),
    previewUrl: isImage ? url : "",
    size: 0,
  };
};

export const getMessageAttachments = (message) => {
  if (!message) return [];
  if (Array.isArray(message.attachments) && message.attachments.length > 0) {
    return message.attachments;
  }
  const content = typeof message === "string" ? message.trim() : (message.content || "").trim();
  if (isUrl(content) && isUploadedFileUrl(content)) {
    return [parseAttachmentFromUrl(content)];
  }
  return [];
};

export const isPureAttachmentMessage = (message) => {
  if (!message) return false;
  const content = typeof message === "string" ? message.trim() : (message.content || "").trim();
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];

  if (attachments.length > 0 && !content) return true;
  if (isUrl(content) && isUploadedFileUrl(content)) return true;
  return false;
};

