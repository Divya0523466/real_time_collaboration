import { useState, useEffect } from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import MessageContent from "../common/MessageContent";
import { fetchPinnedMessagesApi, togglePinMessageApi } from "../../services/messageService";
import { formatMessageDate, formatMessageTime } from "../../utils/dateUtils";
import { toast } from "react-toastify";
import StatusSelector from "../common/StatusSelector";

const AVATAR_COLORS = ["#395B64", "#4A7C88", "#52656A", "#2E6E79", "#3D7A52", "#5B6E7C"];
const avatarColor = (username) =>
  AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

const PinnedMessagesView = ({
  workspaceId,
  onNavigateChannel,
  onNavigateSpace,
  onNavigateGroup,
  onNavigateDM,
  onOpenSidebar,
}) => {
  const { toggleTheme, isDark } = useTheme();
  const { user } = useWorkspace();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("ALL"); // ALL | CHANNEL | SPACE | GROUP | DIRECT

  const loadPinned = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPinnedMessagesApi({ workspaceId });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.pinnedMessages)
          ? data.pinnedMessages
          : [];
      setMessages(list);
    } catch (err) {
      setError(err.message || "Failed to load pinned messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPinned();
  }, [workspaceId]);

  const handleUnpin = async (e, msg) => {
    e.stopPropagation();
    const msgId = (msg.id || msg._id)?.toString();
    if (!msgId) return;

    // Optimistically remove from list
    setMessages((prev) => prev.filter((m) => (m.id || m._id)?.toString() !== msgId));

    try {
      await togglePinMessageApi(msgId);
      toast.success("Message unpinned");
    } catch (err) {
      console.error("Failed to unpin:", err);
      toast.error("Failed to unpin message");
      loadPinned();
    }
  };

  const handleCardClick = (msg) => {
    if (msg.sourceType === "CHANNEL" && msg.channelId && onNavigateChannel) {
      onNavigateChannel(msg.channelId);
    } else if (msg.sourceType === "SPACE" && msg.spaceId && onNavigateSpace) {
      onNavigateSpace(msg.spaceId);
    } else if (msg.sourceType === "GROUP" && msg.groupId && onNavigateGroup) {
      onNavigateGroup(msg.groupId);
    } else if (msg.sourceType === "DIRECT" && msg.otherUser && onNavigateDM) {
      onNavigateDM(msg.otherUser.id || msg.otherUser._id, msg.otherUser);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filterType === "ALL") return true;
    return m.sourceType === filterType;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#121717] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2121] px-4 sm:px-6 py-3.5 transition-colors">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition md:hidden"
            aria-label="Open sidebar"
          >
            <i className="fa-solid fa-bars text-sm" />
          </button>

          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shadow-xs">
              <i className="fa-solid fa-thumbtack text-base" />
            </span>
            <div>
              <h2 className="font-bold text-base text-[#2C3333] dark:text-white">
                Pinned Messages
              </h2>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                Important messages pinned across channels, spaces, groups, and DMs
              </p>
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <StatusSelector />
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <FiSun className="h-4 w-4 text-amber-400" /> : <FiMoon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 border-b border-[#E0E7E6] dark:border-[#2C3333] bg-[#FAFBFB] dark:bg-[#171E1E] overflow-x-auto select-none">
        {[
          { key: "ALL", label: "All" },
          { key: "CHANNEL", label: "Channels" },
          { key: "SPACE", label: "Spaces" },
          { key: "GROUP", label: "Groups" },
          { key: "DIRECT", label: "Direct Messages" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterType(tab.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === tab.key
                ? "bg-teal-600 text-white shadow-xs"
                : "text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#202727]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-[#52656A] dark:text-[#A5C9CA]">
            <i className="fa-solid fa-spinner fa-spin text-xl mr-2" />
            <span className="text-sm">Loading pinned messages...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 mb-3 shadow-inner">
              <i className="fa-solid fa-thumbtack text-2xl" />
            </span>
            <p className="font-semibold text-[#2C3333] dark:text-white text-base">
              No pinned messages yet
            </p>
            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA] max-w-sm mt-1">
              Hover over any important message and click the pin icon to pin it for quick reference.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const senderName = msg.sender?.username || msg.sender?.displayName || "User";
            const pinnerName = msg.pinnedBy?.username || msg.pinnedBy?.displayName || "Someone";
            const sourceLabel =
              msg.sourceType === "CHANNEL"
                ? `# ${msg.channelName || "channel"}`
                : msg.sourceType === "SPACE"
                ? `Space: ${msg.spaceName || "space"}`
                : msg.sourceType === "GROUP"
                ? `Group: ${msg.groupName || "group"}`
                : `DM: ${msg.otherUser?.username || "Direct"}`;

            return (
              <div
                key={msg.id || msg._id}
                onClick={() => handleCardClick(msg)}
                className="group relative p-4 rounded-xl border border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] hover:border-teal-500/50 hover:shadow-sm transition-all cursor-pointer"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40">
                      {sourceLabel}
                    </span>
                    <span className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                      Pinned by <span className="font-medium text-[#2C3333] dark:text-white">{pinnerName}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleUnpin(e, msg)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Unpin message"
                    >
                      <i className="fa-solid fa-thumbtack text-[11px]" />
                      <span className="text-[11px]">Unpin</span>
                    </button>
                    <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-0.5 font-medium ml-1">
                      Jump <i className="fa-solid fa-arrow-right text-[10px]" />
                    </span>
                  </div>
                </div>

                {/* Message author & date */}
                <div className="flex items-center gap-2 mb-1.5">
                  {msg.sender?.avatar ? (
                    <img
                      src={msg.sender.avatar}
                      alt={senderName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: avatarColor(senderName) }}
                    >
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-xs text-[#2C3333] dark:text-white">
                    {senderName}
                  </span>
                  <span className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/60">
                    {formatMessageDate(msg.createdAt)} at {formatMessageTime(msg.createdAt)}
                  </span>
                </div>

                {/* Content */}
                <div className="text-sm text-[#2C3333] dark:text-[#E7F6F2] leading-relaxed break-words pl-7">
                  <MessageContent content={msg.content} attachments={msg.attachments || []} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PinnedMessagesView;
