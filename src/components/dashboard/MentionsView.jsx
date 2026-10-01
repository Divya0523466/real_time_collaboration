import { useState, useEffect, useMemo, useCallback } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import MessageContent from "../common/MessageContent"
import { parseDate } from "../../utils/dateUtils"
import {
  fetchUserMentionsApi,
  markMentionAsReadApi,
} from "../../services/messageService"
import { onNotificationReceived, offNotificationReceived } from "../../services/socket"

const AVATAR_COLORS = ["#395B64", "#4A7C88", "#52656A", "#2E6E79", "#3D7A52", "#5B6E7C"]
const avatarColor = (username) =>
  AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

const formatChatDate = (dateInput) => {
  const date = parseDate(dateInput)
  if (!date) return ""
  const now = new Date()
  const isThisYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(isThisYear ? {} : { year: "numeric" }),
  })
}

const MentionsView = ({
  workspaceId,
  onNavigateChannel,
  onNavigateDM,
  onOpenSidebar,
}) => {
  const { user, notifications, fetchNotifications, channels, markNotificationAsRead } = useWorkspace()

  const [loading, setLoading] = useState(false)
  const [dbMentions, setDbMentions] = useState([])

  const loadMentions = useCallback(async () => {
    try {
      setLoading(true)
      const list = await fetchUserMentionsApi(workspaceId)
      setDbMentions(list || [])
    } catch (err) {
      console.error("Failed to load mentions from API:", err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  // Load mentions from API on mount or workspace switch
  useEffect(() => {
    loadMentions()
    fetchNotifications().catch(() => {})

    const handleNewNotification = (notif) => {
      if (notif?.type === "CHANNEL_MENTION" || notif?.type === "DM_MENTION") {
        loadMentions()
      }
    }

    onNotificationReceived(handleNewNotification)

    return () => {
      offNotificationReceived(handleNewNotification)
    }
  }, [loadMentions, fetchNotifications])

  // Normalize and merge items
  const mentionItems = useMemo(() => {
    const items = (dbMentions || []).map((m) => {
      const isChannel = m.type === "CHANNEL" || m.type === "CHANNEL_MENTION"
      const cId = m.channelId?._id || m.channelId?.id || m.channelId
      const cName =
        m.channelName ||
        m.channelId?.name ||
        channels?.find((c) => (c.id || c._id)?.toString() === cId?.toString())?.name ||
        "channel"

      // Cross-check notification state in real-time
      const matchingNotif = (notifications || []).find(
        (n) =>
          (n.messageId && (n.messageId === m.messageId || n.messageId?._id === m.messageId)) ||
          n._id === m.notificationId
      )
      const isRead = matchingNotif ? Boolean(matchingNotif.isRead) : Boolean(m.isRead)

      return {
        id: m.id || m._id,
        messageId: m.messageId || m.id || m._id,
        isChannel,
        channelId: cId,
        channelName: cName,
        otherUserId: m.otherUserId || m.sender?.id,
        otherUserName: m.otherUserName || m.sender?.username || "Direct Message",
        senderName: m.sender?.username || m.otherUserName || "Someone",
        senderAvatar: m.sender?.avatar || null,
        content: m.content || "",
        mentions: m.mentions || [{ userId: user?.id }],
        isRead,
        notificationId: m.notificationId || matchingNotif?._id || null,
        createdAt: m.createdAt,
      }
    })

    // Also include real-time notifications if not already captured in dbMentions
    const existingMsgIds = new Set(items.map((i) => i.messageId?.toString()))
    const notifItems = (notifications || [])
      .filter((n) => n.type === "CHANNEL_MENTION" || n.type === "DM_MENTION")
      .filter((n) => {
        if (workspaceId && n.workspaceId) {
          const wsId = n.workspaceId?._id || n.workspaceId?.id || n.workspaceId
          if (wsId && wsId.toString() !== workspaceId.toString()) return false
        }
        const mId = (n.messageId || n._id)?.toString()
        return !existingMsgIds.has(mId)
      })
      .map((n) => {
        const isChannel = n.type === "CHANNEL_MENTION"
        const cId = n.channelId?._id || n.channelId?.id || n.channelId
        const cName =
          n.channelId?.name ||
          channels?.find((c) => (c.id || c._id)?.toString() === cId?.toString())?.name ||
          "channel"
        const actor = n.actorId

        return {
          id: n._id,
          messageId: n.messageId || n._id,
          isChannel,
          channelId: cId,
          channelName: cName,
          otherUserId: n.metadata?.senderId || actor?._id,
          otherUserName: actor?.username || "Direct Message",
          senderName: actor?.username || "Someone",
          senderAvatar: actor?.avatar || null,
          content: n.message || "Mentioned you in a message",
          mentions: [{ userId: user?.id }],
          isRead: Boolean(n.isRead),
          notificationId: n._id,
          createdAt: n.createdAt,
        }
      })

    return [...items, ...notifItems].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  }, [dbMentions, notifications, channels, workspaceId, user?.id])

  const handleMarkAsRead = async (item, e) => {
    if (e) e.stopPropagation()
    if (item.isRead) return

    // Optimistic local state update
    setDbMentions((prev) =>
      prev.map((m) =>
        (m.messageId === item.messageId || m.id === item.id) ? { ...m, isRead: true } : m
      )
    )

    if (item.notificationId && markNotificationAsRead) {
      markNotificationAsRead(item.notificationId).catch(() => {})
    }

    try {
      await markMentionAsReadApi(item.messageId)
    } catch (err) {
      console.error("Failed to mark mention as read:", err)
    }
  }

  const handleItemClick = (item) => {
    if (!item.isRead) {
      handleMarkAsRead(item)
    }

    if (item.isChannel) {
      if (item.channelId && onNavigateChannel) {
        onNavigateChannel(item.channelId.toString())
      }
    } else {
      const otherUserId = item.otherUserId
      if (otherUserId && onNavigateDM) {
        onNavigateDM(otherUserId.toString(), {
          id: otherUserId.toString(),
          username: item.otherUserName || item.senderName || "User",
          avatar: item.senderAvatar || null,
        })
      }
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#121717] overflow-hidden select-none transition-colors">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex h-14 items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] px-4 sm:px-6 shadow-xs select-none transition-colors flex-shrink-0">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition md:hidden"
              aria-label="Open sidebar"
            >
              <i className="fa-solid fa-bars text-sm" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <i className="fa-solid fa-at text-[#395B64] dark:text-[#A5C9CA] text-base" />
            <h1 className="truncate text-base font-bold text-[#2C3333] dark:text-white">
              Mentions
            </h1>
          </div>
        </div>
      </header>

      {/* ── Content Area: Mentions List ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto w-full">
        {loading && mentionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#52656A] dark:text-[#A5C9CA]">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-3 text-[#395B64] dark:text-[#A5C9CA]" />
            <p className="text-sm font-medium">Loading mentions…</p>
          </div>
        ) : mentionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F6F2] dark:bg-[#242D2D] text-[#395B64] dark:text-[#A5C9CA] mb-3">
              <i className="fa-solid fa-at text-xl" />
            </div>
            <h3 className="text-base font-semibold text-[#2C3333] dark:text-white mb-1">
              No mentions yet
            </h3>
            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 max-w-sm">
              When someone mentions you in a channel or direct message, it will appear here.
            </p>
          </div>
        ) : (
          <div className="w-full divide-y divide-[#E0E7E6] dark:divide-[#2C3333]">
            {mentionItems.map((item) => {
              const actorName = item.senderName || "Someone"
              const title = item.isChannel ? item.channelName : item.otherUserName
              const isUnread = !item.isRead

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group flex items-center gap-3 px-4 sm:px-6 py-3.5 cursor-pointer transition-colors w-full ${
                    isUnread
                      ? "bg-[#E7F6F2]/30 dark:bg-[#1E2E30]/35 hover:bg-[#E7F6F2]/50 dark:hover:bg-[#1E2E30]/50"
                      : "bg-transparent hover:bg-[#F8FAFB] dark:hover:bg-[#1A2121]"
                  }`}
                >
                  {/* Unread Indicator Dot */}
                  <div className="flex-shrink-0 w-2.5 flex items-center justify-center">
                    {isUnread ? (
                      <span
                        className="h-2 w-2 rounded-full bg-[#395B64] dark:bg-[#A5C9CA]"
                        title="Unread"
                      />
                    ) : (
                      <span className="h-2 w-2" />
                    )}
                  </div>

                  {/* Left: Avatar */}
                  <div className="relative flex-shrink-0">
                    {item.senderAvatar ? (
                      <img
                        src={item.senderAvatar}
                        alt={actorName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm text-white select-none shadow-xs"
                        style={{ backgroundColor: avatarColor(actorName) }}
                      >
                        {actorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Right: Channel/DM Name + Date + Message content */}
                  <div className="flex-1 min-w-0">
                    {/* Top line: Channel/DM Name and Date */}
                    <div className="flex items-center justify-between gap-4 mb-0.5">
                      <span
                        className={`text-sm truncate ${
                          isUnread
                            ? "font-bold text-[#2C3333] dark:text-white"
                            : "font-normal text-[#2C3333]/90 dark:text-white/90"
                        }`}
                      >
                        {title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs whitespace-nowrap ${
                            isUnread
                              ? "font-semibold text-[#395B64] dark:text-[#A5C9CA]"
                              : "text-[#7B8B8F] dark:text-[#A5C9CA]/70"
                          }`}
                        >
                          {formatChatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom line: SenderName: @mention message... */}
                    <div className="flex items-center text-xs sm:text-sm text-[#52656A] dark:text-[#A5C9CA] truncate leading-normal">
                      <span
                        className={`mr-1.5 flex-shrink-0 ${
                          isUnread
                            ? "font-semibold text-[#2C3333] dark:text-[#E7F6F2]"
                            : "font-medium text-[#2C3333]/80 dark:text-[#E7F6F2]/80"
                        }`}
                      >
                        {actorName}:
                      </span>
                      <div className="truncate flex-1">
                        <MessageContent
                          content={item.content || "Mentioned you in a message"}
                          mentions={item.mentions || [{ userId: user?.id }]}
                          currentUserId={user?.id}
                          currentUsername={user?.username}
                          className={`inline text-xs sm:text-sm truncate ${
                            isUnread
                              ? "font-medium text-[#2C3333] dark:text-white"
                              : "text-[#52656A] dark:text-[#A5C9CA]"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MentionsView
