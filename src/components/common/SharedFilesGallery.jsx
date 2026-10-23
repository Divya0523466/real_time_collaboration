import React, { useState, useMemo } from "react";
import {
  getMessageAttachments,
  getAttachmentType,
  formatFileSize,
  getFileIconConfig,
} from "../../utils/fileUtils";

const formatDate = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const SharedFilesGallery = ({
  isOpen,
  onClose,
  messages = [],
  conversationTitle = "Conversation",
  conversationType = "channel",
}) => {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "images" | "docs"
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // Extract all files from messages (newest first)
  const files = useMemo(() => {
    if (!Array.isArray(messages)) return [];

    const list = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (!msg || msg.isDeleted) continue;

      const attachments = getMessageAttachments(msg);
      if (!attachments || attachments.length === 0) continue;

      const sender = msg.sender || msg.senderId || {};
      const senderName = sender.displayName || sender.username || "User";
      const createdAt = msg.createdAt || msg.timestamp || new Date();

      attachments.forEach((att, idx) => {
        const url = att.url || att.previewUrl || "";
        if (!url) return;

        const fileType = getAttachmentType(att);
        list.push({
          id: att.fileId || att._id || `${msg.id || msg._id || i}-${idx}`,
          name: att.originalName || `Attachment_${idx + 1}`,
          url,
          previewUrl: att.previewUrl || url,
          size: att.size || 0,
          type: fileType,
          isImage: fileType === "image",
          senderName,
          createdAt,
        });
      });
    }
    return list;
  }, [messages]);

  // Simple filter: All, Images, Documents
  const filteredFiles = useMemo(() => {
    if (activeTab === "images") return files.filter((f) => f.isImage);
    if (activeTab === "docs") return files.filter((f) => !f.isImage);
    return files;
  }, [files, activeTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      {/* Drawer */}
      <div
        className="w-full max-w-md bg-white dark:bg-[#181F20] text-gray-900 dark:text-gray-100 h-full flex flex-col shadow-2xl transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80 dark:border-[#2C3636]">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Files
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#A5C9CA]/80">
              {conversationType === "dm" ? "@" : "#"}
              {conversationTitle} • {files.length}{" "}
              {files.length === 1 ? "file" : "files"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#252E2F] dark:hover:text-white transition cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        {/* Simple Tabs & View Toggle */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 dark:border-[#242D2D]">
          {/* Simple Category Tabs */}
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "All" },
              { id: "images", label: "Images" },
              { id: "docs", label: "Docs" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid / List switch */}
          <div className="flex items-center gap-1 text-gray-400">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === "grid"
                  ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-[#252E2F]"
                  : "hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Grid view"
            >
              <i className="fa-solid fa-border-all text-xs" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === "list"
                  ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-[#252E2F]"
                  : "hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="List view"
            >
              <i className="fa-solid fa-list text-xs" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400 dark:text-gray-500">
              <i className="fa-regular fa-folder-open text-3xl mb-2 opacity-50" />
              <p className="text-xs">No files found</p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── Clean Grid View ── */
            <div className="grid grid-cols-2 gap-3">
              {filteredFiles.map((file) => {
                const iconConfig = getFileIconConfig(file.type);
                return (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-xl border border-gray-200 dark:border-[#2C3636] bg-gray-50/50 dark:bg-[#1E2526] overflow-hidden hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                  >
                    {/* Thumbnail or Icon */}
                    <div className="h-24 w-full bg-gray-100 dark:bg-[#252E2F] flex items-center justify-center overflow-hidden">
                      {file.isImage ? (
                        <img
                          src={file.previewUrl || file.url}
                          alt={file.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <i
                          className={`${iconConfig.icon} text-2xl ${iconConfig.color}`}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      <p
                        className="text-xs font-medium truncate text-gray-800 dark:text-gray-200"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {file.size > 0 ? formatFileSize(file.size) : formatDate(file.createdAt)}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            /* ── Clean List View ── */
            <div className="space-y-1.5">
              {filteredFiles.map((file) => {
                const iconConfig = getFileIconConfig(file.type);
                return (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-[#2C3636] bg-white dark:bg-[#1E2526] hover:bg-gray-50 dark:hover:bg-[#252E2F] transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-[#252E2F] flex items-center justify-center shrink-0">
                        {file.isImage ? (
                          <img
                            src={file.previewUrl || file.url}
                            alt={file.name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <i className={`${iconConfig.icon} text-sm ${iconConfig.color}`} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                          {file.senderName} • {formatDate(file.createdAt)}
                          {file.size > 0 ? ` • ${formatFileSize(file.size)}` : ""}
                        </p>
                      </div>
                    </div>

                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white shrink-0 ml-2" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedFilesGallery;