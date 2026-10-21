import React from "react";

// Format relative date for pinned timestamp
const formatRelativeTime = (dateInput) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const ConversationPinnedDrawer = ({
  isOpen,
  onClose,
  pinnedMessages = [],
  onTogglePin,
  onJumpToMessage,
  conversationTitle = "Conversation",
  conversationType = "channel",
}) => {
  if (!isOpen) return null;

  const count = pinnedMessages.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <aside className="relative z-10 flex h-full w-full max-w-sm sm:max-w-md flex-col bg-white dark:bg-[#1A2121] border-l border-[#E0E7E6] dark:border-[#2C3333] shadow-2xl transition-colors">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] px-5 py-4 bg-[#F8FAFB] dark:bg-[#1E2525]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-thumbtack text-xs text-[#52656A] dark:text-[#A5C9CA]" />
              <h3 className="text-base font-bold text-[#2C3333] dark:text-white truncate">
                Pinned Messages
              </h3>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E0E7E6] dark:bg-[#2C3333] text-[#52656A] dark:text-[#A5C9CA] px-1.5 text-xs font-bold">
                {count}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#52656A] dark:text-[#A5C9CA] truncate">
              {conversationType === "dm"
                ? `@${conversationTitle}`
                : `#${conversationTitle}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white transition cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {count === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-[#52656A] dark:text-[#A5C9CA]">
              <i className="fa-solid fa-thumbtack text-2xl mb-2 opacity-40" />
              <h4 className="text-sm font-semibold text-[#2C3333] dark:text-white">
                No pinned messages
              </h4>
              <p className="mt-1 text-xs max-w-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                Pinned messages in this conversation will appear here.
              </p>
            </div>
          ) : (
            pinnedMessages.map((msg) => {
              const msgId = msg.id || msg._id;
              const sender = msg.sender || msg.senderId || {};
              const senderName =
                sender.displayName || sender.username || "User";
              const avatar = sender.avatar || sender.avatarUrl;
              const hasAttachment =
                Array.isArray(msg.attachments) && msg.attachments.length > 0;

              return (
                <div
                  key={msgId}
                  onClick={() => {
                    if (onJumpToMessage) onJumpToMessage(msgId);
                    onClose();
                  }}
                  className="rounded-xl border border-[#E0E7E6] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#242D2D]/60 p-3 hover:bg-[#F0F4F4] dark:hover:bg-[#2A3434] transition cursor-pointer group"
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#395B64] text-[10px] font-bold text-white shrink-0 overflow-hidden">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={senderName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          senderName.charAt(0)?.toUpperCase() || "U"
                        )}
                      </div>
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#2C3333] dark:text-white truncate">
                          {senderName}
                        </span>
                        <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70">
                          {formatRelativeTime(msg.pinnedAt || msg.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Unpin Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTogglePin) onTogglePin(msg);
                      }}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Unpin message"
                    >
                      <i className="fa-solid fa-thumbtack text-[9px]" />
                      <span>Unpin</span>
                    </button>
                  </div>

                  {/* Message Body Preview */}
                  <div className="text-xs leading-relaxed text-[#2C3333] dark:text-[#E7F6F2] break-words line-clamp-3">
                    {msg.content ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : hasAttachment ? (
                      <span className="italic text-[#52656A] dark:text-[#A5C9CA]">
                        <i className="fa-solid fa-paperclip mr-1" />
                        Attachment ({msg.attachments.length})
                      </span>
                    ) : (
                      <span className="italic text-[#52656A] dark:text-[#A5C9CA]">
                        No text content
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};

export default ConversationPinnedDrawer;
