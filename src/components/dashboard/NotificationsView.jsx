import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useWorkspace } from "../../context/WorkspaceContext";
import StatusSelector from "../common/StatusSelector";

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

const getNotificationIcon = (type) => {
  switch (type) {
    case "CHANNEL_MENTION":
    case "DM_MENTION":
      return { icon: "fa-solid fa-at", bg: "bg-amber-100 text-amber-700" };
    case "DM_NEW_MESSAGE":
      return { icon: "fa-solid fa-comment-dots", bg: "bg-blue-100 text-blue-700" };
    case "CHANNEL_MESSAGE":
      return { icon: "fa-solid fa-hashtag", bg: "bg-teal-100 text-teal-700" };
    case "CHANNEL_INVITED":
    case "CHANNEL_ADDED":
      return { icon: "fa-solid fa-user-plus", bg: "bg-emerald-100 text-emerald-700" };
    case "CHANNEL_REMOVED":
    case "WORKSPACE_REMOVED":
      return { icon: "fa-solid fa-user-minus", bg: "bg-rose-100 text-rose-700" };
    case "WORKSPACE_ROLE_CHANGED":
      return { icon: "fa-solid fa-shield-halved", bg: "bg-indigo-100 text-indigo-700" };
    case "SPACE_MENTION":
      return { icon: "fa-solid fa-at", bg: "bg-amber-100 text-amber-700" };
    case "SPACE_MESSAGE":
      return { icon: "fa-solid fa-sparkles", bg: "bg-teal-100 text-teal-700" };
    case "SPACE_INVITED":
    case "SPACE_ADDED":
      return { icon: "fa-solid fa-user-plus", bg: "bg-emerald-100 text-emerald-700" };
    case "SPACE_REMOVED":
      return { icon: "fa-solid fa-user-minus", bg: "bg-rose-100 text-rose-700" };
    case "WORKSPACE_INVITED":
    case "WORKSPACE_ADDED":
      return { icon: "fa-solid fa-layer-group", bg: "bg-purple-100 text-purple-700" };
    case "WORKSPACE_INVITE_ACCEPTED":
      return { icon: "fa-solid fa-circle-check", bg: "bg-emerald-100 text-emerald-700" };
    case "WORKSPACE_INVITE_DECLINED":
      return { icon: "fa-solid fa-circle-xmark", bg: "bg-zinc-100 text-zinc-600" };
    default:
      return { icon: "fa-solid fa-bell", bg: "bg-[#E7F6F2] text-[#395B64]" };
  }
};

const NotificationsView = ({
  workspaceId,
  onNavigateChannel,
  onNavigateSpace,
  onNavigateDM,
  onOpenSidebar,
}) => {
  const navigate = useNavigate();
  const {
    notifications = [],
    unreadNotificationsCount = 0,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteAllNotifications,
    deleteSelectedNotifications,
    isMutedGlobal,
    toggleGlobalMute,
  } = useWorkspace();

  const [filter, setFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Delete Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // "ALL" | "SELECTED"
    title: "",
    message: "",
    count: 0,
  });

  const getNotifId = (n) => (n?._id || n?.id)?.toString();

  const filteredNotifications = notifications.filter((n) =>
    filter === "UNREAD" ? !n.isRead : true
  );

  const isAllSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => {
      const id = getNotifId(n);
      return id && selectedIds.has(id);
    });

  const toggleSelectOne = (id) => {
    if (!id) return;
    const strId = id.toString();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = filteredNotifications
        .map((n) => getNotifId(n))
        .filter(Boolean);
      setSelectedIds(new Set(allIds));
    }
  };

  // Open custom modal for Delete All
  const openDeleteAllModal = () => {
    if (notifications.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: "ALL",
      title: "Delete All Notifications?",
      message:
        "Are you sure you want to delete all notifications? All unread and read activity records will be permanently removed.",
      count: notifications.length,
    });
  };

  // Open custom modal for Delete Selected
  const openDeleteSelectedModal = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setConfirmModal({
      isOpen: true,
      type: "SELECTED",
      title: "Delete Selected Notifications?",
      message: `Are you sure you want to delete ${count} selected notification${
        count > 1 ? "s" : ""
      }? This action cannot be undone.`,
      count,
    });
  };

  // Handle Confirmed Deletion
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);

      if (confirmModal.type === "ALL") {
        await deleteAllNotifications();
        setSelectedIds(new Set());
        toast.success("All notifications deleted successfully");
      } else if (confirmModal.type === "SELECTED") {
        const count = selectedIds.size;
        await deleteSelectedNotifications(Array.from(selectedIds));
        setSelectedIds(new Set());
        toast.success(
          `${count} notification${count > 1 ? "s" : ""} deleted successfully`
        );
      }

      setConfirmModal({ isOpen: false, type: null, title: "", message: "", count: 0 });
    } catch (err) {
      toast.error(err.message || "Failed to delete notifications");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead && markNotificationAsRead) {
      markNotificationAsRead(notif._id);
    }

    // Direct Messages
    if (notif.type === "DM_NEW_MESSAGE" || notif.type === "DM_MENTION") {
      const otherUserId =
        notif.actorId?._id || notif.actorId?.id || notif.metadata?.senderId;
      if (otherUserId && onNavigateDM) {
        onNavigateDM(otherUserId, notif.actorId);
        return;
      }
    }

    // Channels
    if (
      notif.type === "CHANNEL_MESSAGE" ||
      notif.type === "CHANNEL_MENTION" ||
      notif.type === "CHANNEL_ADDED" ||
      notif.type === "CHANNEL_INVITED"
    ) {
      const cId = notif.channelId?._id || notif.channelId?.id || notif.channelId;
      if (cId && onNavigateChannel) {
        onNavigateChannel(cId);
        return;
      }
      if (notif.workspaceId && notif.channelId) {
        const wId =
          notif.workspaceId?._id || notif.workspaceId?.id || notif.workspaceId;
        navigate(`/app/workspace/${wId}/channel/${cId}`);
        return;
      }
    }

    // Spaces
    if (
      notif.type === "SPACE_MESSAGE" ||
      notif.type === "SPACE_MENTION" ||
      notif.type === "SPACE_ADDED" ||
      notif.type === "SPACE_INVITED"
    ) {
      const sId = notif.spaceId?._id || notif.spaceId?.id || notif.spaceId;
      if (sId && onNavigateSpace) {
        onNavigateSpace(sId);
        return;
      }
      const wId =
        notif.workspaceId?._id || notif.workspaceId?.id || notif.workspaceId;
      if (sId && wId) {
        navigate(`/app/workspace/${wId}/space/${sId}`);
        return;
      }
    }

    // General workspace navigation
    if (notif.workspaceId) {
      const wId =
        notif.workspaceId?._id || notif.workspaceId?.id || notif.workspaceId;
      navigate(`/app/workspace/${wId}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#121717] transition-colors overflow-hidden relative">
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2121] px-4 sm:px-6 shadow-xs select-none transition-colors flex-shrink-0">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
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

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] shadow-xs flex-shrink-0">
              <i className="fa-solid fa-bell text-base" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-bold text-[#2C3333] dark:text-white">
                  Notifications
                </h1>
                {unreadNotificationsCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#395B64] text-white flex-shrink-0">
                    {unreadNotificationsCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 hidden sm:block truncate">
                Stay updated on your messages, mentions, and team activity
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusSelector align="right" />
        </div>
      </header>

      {/* Toolbar: Filters & Actions */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 border-b border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] text-xs gap-2 flex-shrink-0 min-h-[46px]">
        {/* Left Side: Filter Tabs & Select All checkbox */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#F8FAFB] dark:bg-[#242D2D] p-0.5 rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filter === "ALL"
                  ? "bg-white dark:bg-[#1E2525] text-[#2C3333] dark:text-white shadow-xs"
                  : "text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("UNREAD")}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filter === "UNREAD"
                  ? "bg-white dark:bg-[#1E2525] text-[#2C3333] dark:text-white shadow-xs"
                  : "text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white"
              }`}
            >
              Unread {unreadNotificationsCount > 0 ? `(${unreadNotificationsCount})` : ""}
            </button>
          </div>

          {filteredNotifications.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white transition cursor-pointer select-none"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 ${
                  isAllSelected
                    ? "bg-[#395B64] border-2 border-[#395B64] text-white shadow-xs scale-105"
                    : "border-2 border-gray-300 dark:border-gray-500 hover:border-[#395B64] bg-white dark:bg-[#242D2D]"
                }`}
              >
                {isAllSelected && <i className="fa-solid fa-check text-[10px]" />}
              </div>
              <span className="hidden sm:inline">
                {isAllSelected ? "Deselect All" : "Select All"}
              </span>
            </button>
          )}

          {selectedIds.size > 0 && (
            <span className="text-xs font-semibold text-[#395B64] dark:text-[#A5C9CA] bg-[#E7F6F2] dark:bg-[#395B64]/30 px-2 py-0.5 rounded">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Delete Selected Button */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={openDeleteSelectedModal}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <i className="fa-solid fa-trash-can text-[11px]" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}

          {/* Delete All / Clear All Button */}
          {notifications.length > 0 && selectedIds.size === 0 && (
            <button
              type="button"
              onClick={openDeleteAllModal}
              disabled={isDeleting}
              title="Delete all notifications"
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-rose-200 dark:border-rose-900/50 cursor-pointer disabled:opacity-50"
            >
              <i className="fa-solid fa-trash-can text-[11px]" />
              <span>Clear All</span>
            </button>
          )}

          {/* Mute Alerts Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleGlobalMute && toggleGlobalMute();
            }}
            title={isMutedGlobal ? "Click to unmute notifications" : "Click to mute notifications"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              isMutedGlobal
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                : "text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white border border-[#E0E7E6] dark:border-[#395B64]/50"
            }`}
          >
            <i
              className={`fa-solid ${
                isMutedGlobal ? "fa-bell-slash text-amber-500 dark:text-amber-300" : "fa-bell"
              } text-[11px]`}
            />
            <span className="hidden sm:inline">
              {isMutedGlobal ? "Notifications Muted" : "Mute Alerts"}
            </span>
          </button>

          {/* Mark all read */}
          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="text-[#395B64] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white font-semibold text-xs transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] cursor-pointer"
            >
              <i className="fa-solid fa-check-double text-[11px]" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Mute Status Banner */}
      {isMutedGlobal && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-600 dark:text-amber-300 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <i className="fa-solid fa-bell-slash text-xs" />
            Notifications are muted globally. Popups and sound alerts are disabled.
          </span>
          <button
            type="button"
            onClick={toggleGlobalMute}
            className="underline hover:text-amber-700 dark:hover:text-amber-200 font-semibold cursor-pointer"
          >
            Unmute
          </button>
        </div>
      )}

      {/* Notifications List Content */}
      <div className="flex-1 overflow-y-auto w-full">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E7F6F2] dark:bg-[#395B64]/30 text-2xl text-[#395B64] dark:text-[#A5C9CA] mb-3">
              <i className="fa-regular fa-bell text-2xl" />
            </div>
            <h4 className="text-base font-bold text-[#2C3333] dark:text-white mb-1">
              {filter === "UNREAD" ? "No unread notifications" : "No notifications yet"}
            </h4>
            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 max-w-sm">
              {filter === "UNREAD"
                ? "You are all caught up! Great job staying on top of things."
                : "When you receive messages, mentions, or workspace invites, they will appear here on your screen."}
            </p>
          </div>
        ) : (
          <div className="w-full divide-y divide-[#E0E7E6] dark:divide-[#2C3333]">
            {filteredNotifications.map((notif) => {
              const notifId = getNotifId(notif);
              const iconMeta = getNotificationIcon(notif.type);
              const actor = notif.actorId;
              const avatarLetter = actor?.username?.charAt(0)?.toUpperCase() || "U";
              const isUnread = !notif.isRead;
              const isSelected = Boolean(notifId && selectedIds.has(notifId));

              return (
                <div
                  key={notifId || notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3 sm:gap-4 px-4 sm:px-6 py-4 cursor-pointer transition-colors w-full ${
                    isSelected
                      ? "bg-[#395B64]/10 dark:bg-[#395B64]/25 ring-1 ring-[#395B64]/30"
                      : isUnread
                      ? "bg-[#E7F6F2]/30 dark:bg-[#1E2E30]/35 hover:bg-[#E7F6F2]/55 dark:hover:bg-[#1E2E30]/55"
                      : "bg-transparent hover:bg-[#F8FAFB] dark:hover:bg-[#1A2121]"
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div
                    className="flex-shrink-0 pt-1.5 cursor-pointer select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectOne(notifId);
                    }}
                    title={isSelected ? "Deselect" : "Select"}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 ${
                        isSelected
                          ? "bg-[#395B64] border-2 border-[#395B64] text-white shadow-xs scale-105"
                          : "border-2 border-gray-300 dark:border-gray-500 hover:border-[#395B64] bg-white dark:bg-[#242D2D]"
                      }`}
                    >
                      {isSelected && <i className="fa-solid fa-check text-[10px]" />}
                    </div>
                  </div>

                  {/* Unread Indicator Bar / Dot */}
                  <div className="flex-shrink-0 w-2 flex items-center justify-center pt-2.5">
                    {isUnread && (
                      <span
                        className="h-2 w-2 rounded-full bg-[#395B64] dark:bg-[#A5C9CA] ring-2 ring-[#395B64]/20 dark:ring-[#A5C9CA]/20"
                        title="Unread"
                      />
                    )}
                  </div>

                  {/* Actor Avatar / Type Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {actor?.avatar ? (
                      <img
                        src={actor.avatar}
                        alt={actor.username}
                        className="w-10 h-10 rounded-full object-cover border border-[#E0E7E6] dark:border-[#395B64]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#395B64] text-[#E7F6F2] font-bold text-sm flex items-center justify-center">
                        {avatarLetter}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] shadow-xs ${iconMeta.bg}`}
                    >
                      <i className={iconMeta.icon} />
                    </span>
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs sm:text-sm font-bold text-[#2C3333] dark:text-white truncate">
                        {notif.title}
                      </p>
                      <span className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/80 whitespace-nowrap">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#52656A] dark:text-[#A5C9CA]/90 line-clamp-2 mt-1 break-words">
                      {notif.message}
                    </p>
                    {notif.channelId?.name && (
                      <span className="inline-block mt-2 text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA] bg-[#E7F6F2] dark:bg-[#395B64]/40 px-2 py-0.5 rounded">
                        #{notif.channelId.name}
                      </span>
                    )}
                    {notif.spaceId?.name && (
                      <span className="inline-block mt-2 text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA] bg-[#E7F6F2] dark:bg-[#395B64]/40 px-2 py-0.5 rounded">
                        <i className="fa-solid fa-shapes mr-1 text-[10px]" />
                        {notif.spaceId.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Deleting Notifications */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-rose-500/40 bg-white dark:bg-[#1E2525] p-6 shadow-2xl text-[#2C3333] dark:text-[#E7F6F2] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {confirmModal.title}
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#A5C9CA]">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Message Body */}
            <p className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-[#A5C9CA] leading-relaxed">
              {confirmModal.message}
            </p>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t border-gray-100 dark:border-[#2C3333]">
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    type: null,
                    title: "",
                    message: "",
                    count: 0,
                  })
                }
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] hover:bg-gray-100 dark:hover:bg-[#2C3333] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                ) : (
                  <i className="fa-solid fa-trash-can text-xs" />
                )}
                <span>
                  {confirmModal.type === "ALL"
                    ? "Delete All"
                    : `Delete (${confirmModal.count})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
