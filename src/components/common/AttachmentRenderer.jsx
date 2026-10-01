import {
  getAttachmentType,
  formatFileSize,
  getFileIconConfig,
} from "../../utils/fileUtils";

export const AttachmentItem = ({
  attachment,
  isSender = false,
  isPure = false,
}) => {
  if (!attachment) return null;

  const fileType = getAttachmentType(attachment);
  const iconConfig = getFileIconConfig(fileType);
  const originalName = attachment.originalName || "Attachment";
  const sizeStr = formatFileSize(attachment.size);
  const ext = (
    attachment.extension ||
    attachment.format ||
    originalName.split(".").pop() ||
    ""
  ).toUpperCase();

  let fileUrl = attachment.url || attachment.previewUrl;
  const fileId = attachment.fileId || attachment.id || attachment._id;

  // For PDFs, route through the authenticated backend view endpoint to bypass Cloudinary's 401 CDN block
  if (fileType === "pdf") {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = typeof window !== "undefined" ? localStorage.getItem("worknestToken") : null;
    if (fileId) {
      fileUrl = `${API_URL}/uploads/file/${fileId}/view${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    } else if (attachment.url) {
      fileUrl = `${API_URL}/uploads/view?url=${encodeURIComponent(attachment.url)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
    }
  }
//clean image view
 
  if (fileType === "image") {
    const imageUrl = attachment.previewUrl || attachment.url;
    return (
      <div className="relative inline-block my-0.5 overflow-hidden rounded-xl">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl hover:opacity-95 transition-opacity"
        >
          <img
            src={imageUrl}
            alt={originalName}
            loading="lazy"
            decoding="async"
            className="rounded-xl object-contain block"
            style={{ maxWidth: "300px", maxHeight: "240px", width: "auto", height: "auto" }}
          />
        </a>
      </div>
    );
  }
//pdf view
  if (fileType === "pdf") {
    const hasThumbnail = Boolean(attachment.previewUrl);
    if (hasThumbnail) {
      return (
        <div className="relative inline-block my-0.5 overflow-hidden rounded-xl">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-xl hover:opacity-95 transition-opacity"
          >
            <div className="relative">
              <img
                src={attachment.previewUrl}
                alt={originalName}
                loading="lazy"
                decoding="async"
                className="rounded-xl object-contain block"
                style={{ maxWidth: "300px", maxHeight: "240px", width: "auto", height: "auto" }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs truncate text-[#52656A] dark:text-[#A5C9CA] px-0.5">
              <i className="fa-solid fa-file-pdf text-red-500 text-xs shrink-0" />
              <span className="font-medium truncate max-w-[240px] text-[#2C3333] dark:text-[#E7F6F2]">{originalName}</span>
              {sizeStr && <span className="text-[10px] opacity-70 shrink-0">({sizeStr})</span>}
            </div>
          </a>
        </div>
      );
    }

    return (
      <div className="my-0.5">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors border ${
            isPure
              ? "bg-transparent border-[#D0DCDB] dark:border-[#395B64]/50 hover:bg-black/5 dark:hover:bg-white/5 text-[#2C3333] dark:text-[#E7F6F2]"
              : isSender
              ? "bg-[#395B64]/10 dark:bg-white/10 hover:bg-[#395B64]/20 dark:hover:bg-white/20 text-[#2C3333] dark:text-[#E7F6F2] border-[#A5C9CA]/40 dark:border-[#395B64]/40"
              : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#2C3333] dark:text-[#E7F6F2] border-[#E0E7E6] dark:border-[#2C3535]"
          }`}
        >
          <i className="fa-solid fa-file-pdf text-red-500 text-sm shrink-0" />
          <span className="font-medium truncate max-w-[200px] sm:max-w-[260px]">
            {originalName}
          </span>
          {sizeStr && <span className="text-[10px] opacity-70 shrink-0">({sizeStr})</span>}
        </a>
      </div>
    );
  }

 //for other files other than image and pdfs
  return (
    <div className="my-0.5">
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors border ${
          isPure
            ? "bg-transparent border-[#D0DCDB] dark:border-[#395B64]/50 hover:bg-black/5 dark:hover:bg-white/5 text-[#2C3333] dark:text-[#E7F6F2]"
            : isSender
            ? "bg-[#395B64]/10 dark:bg-white/10 hover:bg-[#395B64]/20 dark:hover:bg-white/20 text-[#2C3333] dark:text-[#E7F6F2] border-[#A5C9CA]/40 dark:border-[#395B64]/40"
            : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#2C3333] dark:text-[#E7F6F2] border-[#E0E7E6] dark:border-[#2C3535]"
        }`}
      >
        <i className={`${iconConfig.icon} ${iconConfig.color} text-sm shrink-0`} />
        <span className="font-medium truncate max-w-[200px] sm:max-w-[260px]">
          {originalName}
        </span>
        <span className="text-[10px] opacity-70 shrink-0">
          {ext} {sizeStr ? `• ${sizeStr}` : ""}
        </span>
      </a>
    </div>
  );
};

const AttachmentRenderer = ({
  attachments = [],
  isSender = false,
  isPure = false,
}) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 my-0.5">
      {attachments.map((att, idx) => (
        <AttachmentItem
          key={att.id || att._id || att.fileId || `att-${idx}`}
          attachment={att}
          isSender={isSender}
          isPure={isPure}
        />
      ))}
    </div>
  );
};

export default AttachmentRenderer;
