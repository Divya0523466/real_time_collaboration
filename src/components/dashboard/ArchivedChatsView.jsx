import React, { useState, useMemo, useEffect } from "react";
import ChannelMessageThread from "./ChannelMessageThread";
import DirectMessaging from "./DirectMessaging";
import SpaceMessageThread from "./SpaceMessageThread";
import GroupMessageThread from "./GroupMessageThread";
import StatusSelector from "../common/StatusSelector";

const AVATAR_COLORS = [
  "#395B64",
  "#4A7C88",
  "#52656A",
  "#2E6E79",
  "#3D7A52",
  "#5B6E7C",
];

const avatarColor = (username) =>
  AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

const formatArchivedDate = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
};

const ArchivedChatsView = ({
  channels = [],
  directMessageMembers = [],
  spaces = [],
  groups = [],
  archivedDMIds = new Set(),
  archivedSpaceIds = new Set(),
  archivedGroupIds = new Set(),
  onToggleArchiveChannel,
  onToggleArchiveDM,
  onToggleArchiveSpace,
  onToggleArchiveGroup,
  canManageChannels = false,
  currentUserId,
  currentUser,
  isSuperAdmin = false,
  onForwardMessage = () => {},
  onNavigateSource = () => {},
  onMessagesChange = () => {},
  onViewProfile,
  onOpenSidebar,
}) => {
  const [selectedChat, setSelectedChat] = useState(null);

  // Single unified list of ALL archived chats (no separate category division)
  const allArchived = useMemo(() => {
    const list = [];

    // Channels
    (channels || [])
      .filter((c) => c.isArchived)
      .forEach((c) => {
        list.push({
          id: (c.id || c._id)?.toString(),
          type: "channel",
          name: c.name,
          subtitle: c.description || "Channel",
          isPrivate: c.type === "PRIVATE",
          raw: c,
          archivedAt: c.archivedAt || c.updatedAt,
        });
      });

    // Direct Messages
    (directMessageMembers || [])
      .filter((m) => archivedDMIds.has((m.id || m._id)?.toString()))
      .forEach((m) => {
        list.push({
          id: (m.id || m._id)?.toString(),
          type: "dm",
          name: m.username || "User",
          subtitle: m.email || "Direct conversation",
          avatar: m.avatar || m.avatarUrl,
          raw: m,
          archivedAt: m.archivedAt || null,
        });
      });

    // Spaces
    (spaces || [])
      .filter((s) => archivedSpaceIds.has((s._id || s.id)?.toString()))
      .forEach((s) => {
        list.push({
          id: (s._id || s.id)?.toString(),
          type: "space",
          name: s.name,
          subtitle: s.description || `${s.members?.length || 0} members`,
          raw: s,
          archivedAt: s.archivedAt || s.updatedAt,
        });
      });

    // Groups
    (groups || [])
      .filter((g) => archivedGroupIds.has((g._id || g.id)?.toString()))
      .forEach((g) => {
        list.push({
          id: (g._id || g.id)?.toString(),
          type: "group",
          name: g.name,
          subtitle: g.description || `${g.members?.length || 0} members`,
          raw: g,
          archivedAt: g.archivedAt || g.updatedAt,
        });
      });

    // Sort by recent archived date
    list.sort((a, b) => {
      const timeA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
      const timeB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }, [
    channels,
    directMessageMembers,
    spaces,
    groups,
    archivedDMIds,
    archivedSpaceIds,
    archivedGroupIds,
  ]);

  // Maintain selection: auto-select first item on desktop, or re-select if list changes
  useEffect(() => {
    if (selectedChat) {
      const found = allArchived.find(
        (item) => item.id === selectedChat.id && item.type === selectedChat.type
      );
      if (found) {
        setSelectedChat(found);
      } else {
        setSelectedChat(allArchived[0] || null);
      }
    } else if (allArchived.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setSelectedChat(allArchived[0]);
    }
  }, [allArchived]);

  const handleUnarchive = (item, e) => {
    e?.stopPropagation();
    if (item.type === "channel") {
      onToggleArchiveChannel?.(item.raw);
    } else if (item.type === "dm") {
      onToggleArchiveDM?.(item.raw);
    } else if (item.type === "space") {
      onToggleArchiveSpace?.(item.raw);
    } else if (item.type === "group") {
      onToggleArchiveGroup?.(item.raw);
    }
  };

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden bg-[#F8FAFB] dark:bg-[#121717] transition-colors">
      {/* ── COLUMN 2: Middle Column — Archived Chats List ──────────────── */}
      <div
        className={`${
          selectedChat ? "hidden md:flex" : "flex"
        } w-full md:w-64 lg:w-72 flex-col flex-shrink-0 border-r border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] h-full transition-colors`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition md:hidden cursor-pointer"
                aria-label="Open sidebar"
              >
                <i className="fa-solid fa-bars text-sm" />
              </button>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] shadow-xs flex-shrink-0">
              <i className="fa-solid fa-box-archive text-sm" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[#2C3333] dark:text-white leading-tight">
                Archived Chats
              </h2>
              <span className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                {allArchived.length} {allArchived.length === 1 ? "conversation" : "conversations"}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Unified List (No search bar, no division) */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E0E7E6]/60 dark:divide-[#2C3333]/70">
          {allArchived.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#395B64]/10 text-[#395B64] dark:text-[#A5C9CA] mb-3 border border-[#395B64]/30">
                <i className="fa-solid fa-box-archive text-xl" />
              </span>
              <p className="text-sm font-semibold text-[#2C3333] dark:text-white mb-1">
                No archived chats
              </p>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/70 max-w-xs">
                Conversations you archive will appear here.
              </p>
            </div>
          ) : (
            allArchived.map((item) => {
              const isSelected =
                selectedChat?.id === item.id && selectedChat?.type === item.type;
              const timeStr = formatArchivedDate(item.archivedAt);

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => setSelectedChat(item)}
                  className={`group relative flex items-center justify-between p-3 transition-colors cursor-pointer select-none ${
                    isSelected
                      ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                      : "hover:bg-[#F8FAFB] dark:hover:bg-[#242D2D]/60 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Icon / Avatar using only standard brand colors */}
                    {item.type === "channel" ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-sm font-bold">
                        {item.isPrivate ? (
                          <i className="fa-solid fa-lock text-xs" />
                        ) : (
                          <span>#</span>
                        )}
                      </div>
                    ) : item.type === "dm" ? (
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold overflow-hidden shadow-xs"
                        style={{
                          backgroundColor: !item.avatar
                            ? avatarColor(item.name)
                            : "transparent",
                        }}
                      >
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          item.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    ) : item.type === "space" ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/10 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-xs font-bold">
                        <i className="fa-solid fa-table-cells-large text-xs" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/10 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-xs font-bold">
                        <i className="fa-solid fa-user-group text-xs" />
                      </div>
                    )}

                    {/* Chat details without arbitrary badges */}
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`truncate text-xs font-bold ${
                          isSelected
                            ? "text-[#395B64] dark:text-white"
                            : "text-[#2C3333] dark:text-[#E7F6F2]"
                        }`}
                      >
                        {item.name}
                      </h4>
                      <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Actions / Timestamp */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {timeStr && (
                      <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 hidden lg:inline">
                        {timeStr}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleUnarchive(item, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#395B64]/10 dark:hover:bg-[#395B64]/30 transition cursor-pointer"
                      title="Unarchive chat"
                    >
                      <i className="fa-solid fa-arrow-rotate-left text-xs" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── COLUMN 3: Right Column — Conversation View ────────────────── */}
      <div
        className={`${
          selectedChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col h-full min-w-0 bg-[#F8FAFB] dark:bg-[#121717] transition-colors`}
      >
        {selectedChat ? (
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            {/* Mobile back navigation bar */}
            <div className="md:hidden flex h-9 items-center gap-2 px-3 bg-amber-500/10 dark:bg-amber-500/15 border-b border-[#395B64]/30 text-xs text-amber-700 dark:text-amber-300 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedChat(null)}
                className="flex h-6 w-6 items-center justify-center rounded text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#395B64]/20 mr-1 flex-shrink-0 cursor-pointer"
                title="Back to archived list"
              >
                <i className="fa-solid fa-arrow-left text-xs" />
              </button>
              <i className="fa-solid fa-box-archive text-[#395B64] dark:text-[#A5C9CA] text-xs flex-shrink-0" />
              <span className="truncate font-medium text-[11px]">Archived conversation</span>
            </div>

            {/* For Channel only: render channel header since ChannelMessageThread lacks an internal header */}
            {selectedChat.type === "channel" && (
              <div className="flex h-14 items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] px-4 sm:px-6 shadow-xs select-none transition-colors flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-base font-bold text-[#395B64] dark:text-[#A5C9CA] flex-shrink-0">
                    {selectedChat.isPrivate ? (
                      <i className="fa-solid fa-lock text-xs" />
                    ) : (
                      "#"
                    )}
                  </span>
                  <h2 className="truncate text-base font-bold text-[#2C3333] dark:text-white">
                    {selectedChat.name}
                  </h2>
                </div>
                <StatusSelector align="right" />
              </div>
            )}

            {/* Conversation Thread (Space, DM, and Group render their own full headers directly) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {selectedChat.type === "channel" ? (
                <ChannelMessageThread
                  key={`archived-chan-${selectedChat.id}`}
                  channel={selectedChat.raw}
                  currentUserId={currentUserId}
                  onForwardMessage={onForwardMessage}
                  onNavigateSource={onNavigateSource}
                  onMessagesChange={onMessagesChange}
                  onViewProfile={onViewProfile}
                />
              ) : selectedChat.type === "dm" ? (
                <DirectMessaging
                  key={`archived-dm-${selectedChat.id}`}
                  externalSelectedUser={selectedChat.raw}
                  onOpenSidebar={() => setSelectedChat(null)}
                  onForwardMessage={onForwardMessage}
                  onNavigateSource={onNavigateSource}
                  onMessagesChange={onMessagesChange}
                  onViewProfile={onViewProfile}
                />
              ) : selectedChat.type === "space" ? (
                <SpaceMessageThread
                  key={`archived-space-${selectedChat.id}`}
                  space={selectedChat.raw}
                  currentUserId={currentUserId}
                  currentUser={currentUser}
                  isSuperAdmin={isSuperAdmin}
                  onOpenSidebar={() => setSelectedChat(null)}
                  onForwardMessage={onForwardMessage}
                  onNavigateSource={onNavigateSource}
                  onMessagesChange={onMessagesChange}
                />
              ) : (
                <GroupMessageThread
                  key={`archived-grp-${selectedChat.id}`}
                  group={selectedChat.raw}
                  currentUserId={currentUserId}
                  currentUser={currentUser}
                  onOpenSidebar={() => setSelectedChat(null)}
                />
              )}
            </div>
          </div>
        ) : (
          /* Empty state for Column 3 when no chat is selected */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#395B64]/10 dark:bg-[#395B64]/20 text-[#395B64] dark:text-[#A5C9CA] mb-4 border border-[#395B64]/30">
              <i className="fa-solid fa-box-archive text-2xl" />
            </span>
            <h3 className="text-base font-bold text-[#2C3333] dark:text-white mb-1">
              Select an archived chat
            </h3>
            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 max-w-sm">
              Choose any conversation from the archived list to browse its message history and files.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedChatsView;
