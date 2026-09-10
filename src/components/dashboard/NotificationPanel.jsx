import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";

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

const NotificationPanel = ({
  isOpen,
  onClose,
  onSelectChannel,
  onSelectDM,
}) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useWorkspace();

  const [filter, setFilter] = useState("ALL"); // "ALL" | "UNREAD"

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) =>
    filter === "UNREAD" ? !n.isRead : true
  );

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      markNotificationAsRead(notif._id);
    }

    // Context-aware navigation
    if (notif.type === "DM_NEW_MESSAGE" || notif.type === "DM_MENTION") {
      const otherUserId = notif.actorId?._id || notif.metadata?.senderId;
      if (otherUserId && onSelectDM) {
        onSelectDM(otherUserId, notif.actorId);
        onClose();
        return;
      }
    }

    if (
      notif.type === "CHANNEL_MESSAGE" ||
      notif.type === "CHANNEL_MENTION" ||
      notif.type === "CHANNEL_ADDED" ||
      notif.type === "CHANNEL_INVITED"
    ) {
      if (notif.channelId && onSelectChannel) {
        const cId = notif.channelId?._id || notif.channelId;
        onSelectChannel(cId);
        onClose();
        return;
      }
      if (notif.workspaceId && notif.channelId) {
        const wId = notif.workspaceId?._id || notif.workspaceId;
        const cId = notif.channelId?._id || notif.channelId;
        navigate(`/app/workspace/${wId}/channel/${cId}`);
        onClose();
        return;
      }
    }

    if (notif.workspaceId) {
      const wId = notif.workspaceId?._id || notif.workspaceId;
      navigate(`/app/workspace/${wId}`);
      onClose();
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2C3333]/60 backdrop-blur-xs flex justify-end">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-[fadeIn_0.15s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E0E7E6] px-6 py-4 bg-[#F8FAFB]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#2C3333]">Notifications</h3>
              {unreadNotificationsCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#395B64] text-white">
                  {unreadNotificationsCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-[#52656A] mt-0.5">Stay updated on your team's activity</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] transition"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Toolbar: Filters & Mark all as read */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-[#E0E7E6] bg-white text-xs">
          <div className="flex items-center gap-1.5 bg-[#F8FAFB] p-0.5 rounded-lg border border-[#E0E7E6]">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filter === "ALL"
                  ? "bg-white text-[#2C3333] shadow-xs"
                  : "text-[#52656A] hover:text-[#2C3333]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("UNREAD")}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filter === "UNREAD"
                  ? "bg-white text-[#2C3333] shadow-xs"
                  : "text-[#52656A] hover:text-[#2C3333]"
              }`}
            >
              Unread {unreadNotificationsCount > 0 ? `(${unreadNotificationsCount})` : ""}
            </button>
          </div>

          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="text-[#395B64] hover:text-[#2C3333] font-semibold text-xs transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-check-double text-[11px]" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E0E7E6]/70">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E7F6F2] text-2xl text-[#395B64] mb-3">
                <i className="fa-regular fa-bell" />
              </div>
              <h4 className="text-base font-bold text-[#2C3333]">
                {filter === "UNREAD" ? "No unread notifications" : "No notifications yet"}
              </h4>
              <p className="mt-1 text-xs text-[#52656A] max-w-xs">
                {filter === "UNREAD"
                  ? "You are all caught up! Great job staying on top of things."
                  : "When you receive messages, mentions, or workspace invites, they will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const iconMeta = getNotificationIcon(notif.type);
              const actor = notif.actorId;
              const avatarLetter = actor?.username?.charAt(0)?.toUpperCase() || "U";

              return (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3.5 p-4 cursor-pointer transition ${
                    notif.isRead
                      ? "bg-white hover:bg-[#F8FAFB]"
                      : "bg-[#F0F7F6] hover:bg-[#E7F6F2]/80"
                  }`}
                >
                  {/* Actor Avatar / Type Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {actor?.avatar ? (
                      <img
                        src={actor.avatar}
                        alt={actor.username}
                        className="w-9 h-9 rounded-full object-cover border border-[#E0E7E6]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#395B64] text-[#E7F6F2] font-bold text-xs flex items-center justify-center">
                        {avatarLetter}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] shadow-xs ${iconMeta.bg}`}
                    >
                      <i className={iconMeta.icon} />
                    </span>
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="text-xs font-bold text-[#2C3333] truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-[#52656A] whitespace-nowrap">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#52656A] line-clamp-2 mt-0.5 break-words">
                      {notif.message}
                    </p>
                    {notif.channelId?.name && (
                      <span className="inline-block mt-1.5 text-[10px] font-semibold text-[#395B64] bg-[#E7F6F2] px-1.5 py-0.5 rounded">
                        #{notif.channelId.name}
                      </span>
                    )}
                  </div>

                  {/* Actions & Status */}
                  <div className="shrink-0 flex items-center gap-1.5 self-center">
                    {!notif.isRead && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#395B64]"
                        title="Unread"
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif._id);
                      }}
                      title="Delete notification"
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#52656A] hover:text-rose-600 transition"
                    >
                      <i className="fa-solid fa-trash-can text-xs" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
