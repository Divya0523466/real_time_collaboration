import { useState, useEffect } from "react"
import { FiSun, FiMoon } from "react-icons/fi"
import { useTheme } from "../../context/ThemeContext"
import { useWorkspace } from "../../context/WorkspaceContext"
import MessageContent from "../common/MessageContent"
import { fetchStarredMessagesApi, unstarMessageApi } from "../../services/messageService"
import { formatMessageDate, formatMessageTime } from "../../utils/dateUtils"
import { isImageOrFileMessage } from "../../utils/fileUtils"
import { toast } from "react-toastify"

const AVATAR_COLORS = ["#395B64", "#4A7C88", "#52656A", "#2E6E79", "#3D7A52", "#5B6E7C"]
const avatarColor = (username) =>
  AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

const StarredMessagesView = ({
  workspaceId,
  onNavigateChannel,
  onNavigateDM,
  onOpenSidebar,
}) => {
  const { toggleTheme, isDark } = useTheme()
  const { user } = useWorkspace()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch immediately whenever this view is displayed
  useEffect(() => {
    let isCancelled = false
    const loadStarred = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchStarredMessagesApi(workspaceId)
        if (!isCancelled) {
          const list = Array.isArray(data) ? data : (data?.starredMessages || [])
          // Ensure only pure text messages are displayed
          const textOnly = list.filter((m) => !isImageOrFileMessage(m))
          setMessages(textOnly)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || "Failed to load starred messages")
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadStarred()
    return () => {
      isCancelled = true
    }
  }, [workspaceId])

  const handleUnstar = async (e, msg) => {
    e.stopPropagation()
    const msgId = msg.id?.toString()
    if (!msgId) return

    // Optimistically remove from list immediately
    setMessages((prev) => prev.filter((m) => m.id?.toString() !== msgId))

    try {
      await unstarMessageApi(msgId)
      toast.success("Message unstarred")
    } catch (err) {
      console.error("Failed to unstar:", err)
      toast.error("Failed to unstar message")
      // Reload on failure
      const data = await fetchStarredMessagesApi(workspaceId)
      const list = Array.isArray(data) ? data : (data?.starredMessages || [])
      setMessages(list.filter((m) => !isImageOrFileMessage(m)))
    }
  }

  const handleCardClick = (msg) => {
    if (msg.type === "CHANNEL" && msg.channelId && onNavigateChannel) {
      onNavigateChannel(msg.channelId)
    } else if (msg.type === "DIRECT" && msg.otherUserId && onNavigateDM) {
      onNavigateDM(msg.otherUserId, {
        id: msg.otherUserId,
        username: msg.otherUserName,
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#121717] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2121] px-4 sm:px-6 py-3.5 transition-colors">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition md:hidden"
            aria-label="Open sidebar"
          >
            <i className="fa-solid fa-bars text-sm" />
          </button>

          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 shadow-xs">
              <i className="fa-solid fa-star text-base" />
            </span>
            <div>
              <h2 className="font-bold text-base text-[#2C3333] dark:text-white">
                Starred Messages
              </h2>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                All messages you've saved across channels and direct messages
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#A5C9CA]/40 dark:border-[#395B64]/50 bg-[#F8FAFB] dark:bg-[#242D2D] text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636] transition shadow-xs"
          title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <FiSun className="text-sm text-amber-400" />
          ) : (
            <FiMoon className="text-sm text-[#395B64]" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]">Loading starred messages...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-rose-500 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                setError(null)
                fetchStarredMessagesApi(workspaceId)
                  .then((d) => {
                    const list = Array.isArray(d) ? d : (d?.starredMessages || [])
                    setMessages(list.filter((m) => !isImageOrFileMessage(m)))
                  })
                  .catch((err) => setError(err.message || "Failed to load starred messages"))
                  .finally(() => setLoading(false))
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#395B64] text-white hover:bg-[#2C3333] transition"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 text-2xl mb-3">
              <i className="fa-solid fa-star" />
            </div>
            <h3 className="text-base font-bold text-[#2C3333] dark:text-white">
              No starred messages yet
            </h3>
            <p className="mt-1 text-xs text-[#52656A] dark:text-[#A5C9CA] max-w-sm">
              Hover over any message in a channel or direct message and click the star icon to save it here.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-1">
            {messages.map((msg) => {
              const senderName = msg.sender?.username || "Unknown"
              const isChannel = msg.type === "CHANNEL"
              const locationLabel = isChannel
                ? `#${msg.channelName || "channel"}`
                : `@${msg.otherUserName || "Direct Message"}`

              return (
                <div
                  key={msg.id}
                  onClick={() => handleCardClick(msg)}
                  className="group flex items-start gap-3 w-full px-3 sm:px-4 py-2.5 rounded-lg transition-colors hover:bg-[#F8FAFB] dark:hover:bg-[#1E2525]/60 cursor-pointer text-left"
                >
                  {/* Avatar */}
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0 pt-0.5 mt-0.5 shadow-xs"
                    style={{ backgroundColor: avatarColor(senderName) }}
                  >
                    {senderName.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-sm text-[#2C3333] dark:text-white leading-none">
                          {senderName}
                        </span>
                        <span className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/80 leading-none whitespace-nowrap">
                          {formatMessageTime(msg.createdAt)} · {formatMessageDate(msg.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded text-[#395B64] dark:text-[#A5C9CA] bg-[#E7F6F2] dark:bg-[#2C3333]/80">
                          <i className={isChannel ? "fa-solid fa-hashtag text-[9px]" : "fa-solid fa-user text-[9px]"} />
                          <span>{locationLabel}</span>
                        </span>
                      </div>

                      {/* Green Star Button to unstar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.currentTarget.blur()
                          handleUnstar(e, msg)
                        }}
                        title="Unstar message"
                        aria-label="Unstar message"
                        className="text-emerald-500 hover:text-emerald-600 p-1 flex-shrink-0 transition-colors"
                      >
                        <i className="fa-solid fa-star text-sm" />
                      </button>
                    </div>

                    {/* Message text with mention highlighting */}
                    <MessageContent
                      content={msg.content}
                      mentions={msg.mentions || []}
                      currentUserId={user?.id}
                      className="text-sm text-[#2C3333] dark:text-[#E7F6F2] leading-relaxed break-words"
                    />
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

export default StarredMessagesView
