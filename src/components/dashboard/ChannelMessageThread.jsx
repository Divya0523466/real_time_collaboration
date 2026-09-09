import { useEffect, useRef, useState, useMemo } from "react"
import PropTypes from "prop-types"
import socket, {
  joinChannel,
  sendChannelMessage,
  editChannelMessage,
  deleteChannelMessage,
  onChannelMessageEdited,
  onChannelMessageDeleted,
  offChannelMessageEdited,
  offChannelMessageDeleted,
} from "../../services/socket"
import FileUpload from "../common/FileUpload"
import MessageContent from "../common/MessageContent"

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

/** Deterministic avatar color from username initial */
const AVATAR_COLORS = ["#395B64", "#4A7C88", "#52656A", "#2E6E79", "#3D7A52", "#5B6E7C"]
const avatarColor = (username) =>
  AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

/** Detect if content is an uploaded image or file (disable editing) */
const isImageOrFileMessage = (content) => {
  if (!content) return false
  const lower = content.toLowerCase()
  return (
    lower.includes("res.cloudinary.com") ||
    lower.match(/\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt)(\?.*)?$/i) !== null
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar = ({ username, small = false }) => (
  <div
    className={`flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 select-none ${
      small ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-sm"
    }`}
    style={{ backgroundColor: avatarColor(username) }}
  >
    {(username ?? "?").charAt(0).toUpperCase()}
  </div>
)

Avatar.propTypes = {
  username: PropTypes.string,
  small: PropTypes.bool,
}
Avatar.defaultProps = { username: null, small: false }

// ─── Reply Reference (compact inline preview inside a reply) ──────────────────

const ReplyReference = ({ replyToMessage }) => {
  if (!replyToMessage) return null
  const content = replyToMessage.isDeleted
    ? "This message was deleted"
    : replyToMessage.content || "Message unavailable"
  const senderName = replyToMessage.sender?.username || "User"

  return (
    <div className="flex items-start gap-1.5 mb-2 rounded-md bg-[#F1F5F4] border-l-[3px] border-[#A5C9CA] px-2.5 py-1.5 max-w-sm">
      <i className="fa-solid fa-reply text-[10px] text-[#A5C9CA] mt-[3px] flex-shrink-0" />
      <div className="min-w-0">
        <span className="text-[11px] font-semibold text-[#395B64] mr-1.5">{senderName}</span>
        <span className={`text-[11px] truncate block ${replyToMessage.isDeleted ? "italic text-[#52656A] opacity-60" : "text-[#52656A]"}`}>
          {content.length > 80 ? `${content.slice(0, 80)}…` : content}
        </span>
      </div>
    </div>
  )
}

ReplyReference.propTypes = {
  replyToMessage: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    content: PropTypes.string,
    isDeleted: PropTypes.bool,
    sender: PropTypes.shape({ username: PropTypes.string }),
  }),
}
ReplyReference.defaultProps = { replyToMessage: null }

// ─── Inline Reply Composer ────────────────────────────────────────────────────

const InlineReplyComposer = ({ parentMessage, channelId, onSend, onCancel }) => {
  const [value, setValue] = useState("")
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const senderName = parentMessage.sender?.username || "User"
  const preview = parentMessage.isDeleted
    ? "This message was deleted"
    : (parentMessage.content || "").slice(0, 72)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(channelId, trimmed, parentMessage.id?.toString())
    setValue("")
    onCancel()
  }

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
    if (e.key === "Escape") onCancel()
  }

  return (
    <div className="mt-2 rounded-xl border border-[#A5C9CA] bg-white shadow-sm overflow-hidden focus-within:border-[#395B64] focus-within:ring-1 focus-within:ring-[#E7F6F2] transition-all">
      {/* Context strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#F8FAFB] border-b border-[#E0E7E6]">
        <i className="fa-solid fa-reply text-[11px] text-[#A5C9CA]" />
        <span className="text-[11px] text-[#52656A]">Replying to</span>
        <span className="text-[11px] font-semibold text-[#395B64]">{senderName}</span>
        <span className="text-[11px] text-[#52656A] opacity-60 truncate">· {preview}{(parentMessage.content?.length ?? 0) > 72 ? "…" : ""}</span>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto text-[#52656A] hover:text-[#2C3333] rounded p-0.5 hover:bg-[#E0E7E6] transition-colors flex-shrink-0"
          title="Cancel reply"
        >
          <i className="fa-solid fa-xmark text-[11px]" />
        </button>
      </div>
      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <FileUpload
          buttonClassName="flex items-center justify-center h-7 w-7 rounded-md text-[#52656A] hover:text-[#395B64] hover:bg-[#E7F6F2] transition-colors disabled:opacity-50"
          iconClassName="text-xs"
          onUploadSuccess={(file) => setValue((prev) => (prev ? `${prev}\n${file.url}` : file.url))}
          onUploadError={(err) => alert(err)}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Reply to ${senderName}…`}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-[#2C3333] outline-none placeholder:text-[#52656A]/50 leading-5 py-0.5"
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            disabled={!value.trim()}
            onClick={submit}
            className="flex items-center gap-1.5 rounded-lg bg-[#395B64] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2C3333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send <i className="fa-solid fa-paper-plane text-[9px]" />
          </button>
        </div>
      </div>
    </div>
  )
}

InlineReplyComposer.propTypes = {
  parentMessage: PropTypes.object.isRequired,
  channelId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  onSend: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
}

// ─── Message Row ──────────────────────────────────────────────────────────────
// Used for both root messages and replies. `isReply` controls visual indentation
// and suppresses the ReplyReference (since replies inside a thread are already
// visually grouped under their parent).

const MessageRow = ({
  message,
  currentUserId,
  editingState,
  replyingToId,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onSetEditDraft,
  onStartReply,
  onDelete,
  isReply,
}) => {
  const isSender = message.senderId?.toString() === currentUserId?.toString()
  const isDeleted = message.isDeleted === true
  const isBeingEdited = editingState?.messageId === message.id?.toString()
  const isImageOrFile = isImageOrFileMessage(message.content)
  const username = message.sender?.username || "User"

  // Show orphan reference only when a reply is displayed as a root-level message
  // (i.e., its parent wasn't found in the current message list)
  const showOrphanRef = !isReply && !!message.replyToMessage

  return (
    <div className={`group flex gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#F8FAFB] ${isReply ? "py-1.5" : ""}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <Avatar username={username} small={isReply} />
      </div>

      {/* Content & Actions wrapper */}
      <div className="flex items-start gap-3 min-w-0 max-w-full">
        {/* Content column */}
        <div className="flex flex-col min-w-0">
          {/* Header row */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`font-semibold text-[#2C3333] leading-none ${isReply ? "text-[12px]" : "text-sm"}`}>
              {isSender ? "You" : username}
            </span>
            <span className="text-[11px] text-[#52656A] leading-none">
              {formatTime(message.createdAt)}
            </span>
            {message.isEdited && !isDeleted && (
              <span className="text-[10px] text-[#52656A] opacity-50 leading-none">(edited)</span>
            )}
          </div>

          {/* Orphan reply reference — only when parent not in thread */}
          {showOrphanRef && <ReplyReference replyToMessage={message.replyToMessage} />}

          {/* Content / edit mode / deleted state */}
          {isBeingEdited ? (
            <div className="w-full sm:w-[400px] max-w-full">
              <textarea
                className="w-full text-sm text-[#2C3333] bg-white border border-[#A5C9CA] rounded-lg px-3 py-2 outline-none focus:border-[#395B64] focus:ring-1 focus:ring-[#E7F6F2] resize-none transition-colors leading-relaxed"
                value={editingState.draftContent}
                onChange={(e) => onSetEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmitEdit() }
                  if (e.key === "Escape") onCancelEdit()
                }}
                rows={Math.min(Math.max(editingState.draftContent.split("\n").length, 1), 5)}
                autoFocus
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                {/* Save — icon only with tooltip */}
                <div className="group/tip relative">
                  <button
                    type="button"
                    onClick={onSubmitEdit}
                    aria-label="Save"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white bg-[#395B64] hover:bg-[#2C3333] transition-colors"
                  >
                    <i className="fa-solid fa-check text-[11px]" />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10">
                    Save
                  </span>
                </div>
                {/* Cancel — icon only with tooltip */}
                <div className="group/tip relative">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    aria-label="Cancel"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[#52656A] border border-[#E0E7E6] hover:bg-[#F1F5F4] hover:text-[#2C3333] transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-[11px]" />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10">
                    Cancel
                  </span>
                </div>
              </div>
            </div>
          ) : isDeleted ? (
            <p className="text-sm italic text-[#52656A] opacity-50">This message was deleted</p>
          ) : (
            <MessageContent content={message.content} isSender={isSender} className="text-sm text-[#2C3333] leading-relaxed" />
          )}
        </div>

        {/* Hover action buttons — positioned inline next to the content */}
        {!isBeingEdited && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg border border-[#E0E7E6] shadow-sm px-1 py-0.5 flex-shrink-0 -mt-0.5">
            {!isDeleted && (
              <div className="group/tip relative">
                <button
                  type="button"
                  onClick={() => onStartReply(message)}
                  aria-label="Reply"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] hover:text-[#395B64] hover:bg-[#E7F6F2] transition-colors"
                >
                  <i className="fa-solid fa-reply text-[10px]" />
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10">
                  Reply
                </span>
              </div>
            )}
            {isSender && !isDeleted && (
              <>
                {!isImageOrFile && (
                  <>
                    <div className="w-px h-3.5 bg-[#E0E7E6] mx-0.5" />
                    <div className="group/tip relative">
                      <button
                        type="button"
                        onClick={() => onStartEdit(message)}
                        aria-label="Edit message"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] hover:text-[#395B64] hover:bg-[#E7F6F2] transition-colors"
                      >
                        <i className="fa-solid fa-pen text-[10px]" />
                      </button>
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10">
                        Edit
                      </span>
                    </div>
                  </>
                )}
                <div className="group/tip relative">
                  <button
                    type="button"
                    onClick={() => onDelete(message)}
                    aria-label="Delete message"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <i className="fa-solid fa-trash text-[10px]" />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10">
                    Delete
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

MessageRow.propTypes = {
  message: PropTypes.object.isRequired,
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  editingState: PropTypes.shape({ messageId: PropTypes.string, draftContent: PropTypes.string }),
  replyingToId: PropTypes.string,
  onStartEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onSubmitEdit: PropTypes.func.isRequired,
  onSetEditDraft: PropTypes.func.isRequired,
  onStartReply: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isReply: PropTypes.bool,
}
MessageRow.defaultProps = {
  currentUserId: null,
  editingState: null,
  replyingToId: null,
  isReply: false,
}

// ─── Reply count badge ────────────────────────────────────────────────────────

const ReplyCountBadge = ({ count, onClick }) => {
  if (count === 0) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-11 mt-0.5 flex items-center gap-1.5 text-[11px] text-[#395B64] hover:text-[#2C3333] hover:underline transition-colors"
    >
      <i className="fa-regular fa-comment text-[10px] opacity-70" />
      <span>{count} {count === 1 ? "reply" : "replies"}</span>
    </button>
  )
}

ReplyCountBadge.propTypes = { count: PropTypes.number.isRequired, onClick: PropTypes.func.isRequired }

// ─── Main Component ───────────────────────────────────────────────────────────

const ChannelMessageThread = ({ channel, currentUserId }) => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [attachedFile, setAttachedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ID of the root message currently being replied to (controls inline composer placement)
  const [replyingToId, setReplyingToId] = useState(null)

  // Which thread sections are expanded (by root message ID) — start expanded
  const [expandedThreads, setExpandedThreads] = useState(new Set())

  const [editingState, setEditingState] = useState(null)

  const messageIdsRef = useRef(new Set())
  const messagesEndRef = useRef(null)
  const apiUrl = import.meta.env.VITE_API_URL

  // ── Thread structure: group messages into root + replies ───────────────────
  const { rootMessages, repliesMap } = useMemo(() => {
    const knownIds = new Set(messages.map((m) => m.id?.toString()))
    const roots = []
    const replies = {}

    messages.forEach((msg) => {
      const parentId = msg.replyTo?.toString()
      // A message is a root if it has no replyTo, OR if its parent is not in
      // the current message list (orphaned reply — rare edge case)
      if (!parentId || !knownIds.has(parentId)) {
        roots.push(msg)
      } else {
        replies[parentId] = replies[parentId] ? [...replies[parentId], msg] : [msg]
      }
    })

    // Stable sort by createdAt (server already sends sorted, but re-sort
    // in case real-time messages arrive out of order)
    roots.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    Object.values(replies).forEach((arr) =>
      arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    )

    return { rootMessages: roots, repliesMap: replies }
  }, [messages])

  // Auto-expand threads when a reply arrives for them
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      Object.keys(repliesMap).forEach((id) => next.add(id))
      return next
    })
  }, [repliesMap])

  // ── Socket listeners + history load ───────────────────────────────────────
  useEffect(() => {
    if (!channel?.id) return undefined

    let cancelled = false

    const loadHistory = async () => {
      setLoading(true)
      setError(null)
      messageIdsRef.current = new Set()

      try {
        const token = localStorage.getItem("worknestToken")
        const response = await fetch(`${apiUrl}/messages/channels/${channel.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.message || "Failed to load channel messages")

        if (!cancelled) {
          const history = data.messages || []
          setMessages(history)
          messageIdsRef.current = new Set(history.map((m) => m.id.toString()))
        }
      } catch (loadError) {
        if (!cancelled) {
          setMessages([])
          setError(loadError.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const addMessage = (message) => {
      if (message?.channelId?.toString() !== channel.id.toString()) return
      const messageId = message.id?.toString()
      if (!messageId || messageIdsRef.current.has(messageId)) return
      messageIdsRef.current.add(messageId)
      setMessages((prev) => [...prev, message])
    }

    const handleEdited = (payload) => {
      if (payload?.channelId?.toString() !== channel.id.toString()) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id?.toString() === payload.id?.toString()
            ? { ...m, content: payload.content, isEdited: true, updatedAt: payload.updatedAt }
            : m
        )
      )
    }

    const handleDeleted = (payload) => {
      if (payload?.channelId?.toString() !== channel.id.toString()) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id?.toString() === payload.id?.toString()
            ? { ...m, isDeleted: true, content: null }
            : m
        )
      )
    }

    const handleSocketError = (socketError) => {
      setError(socketError.message || "Unable to access this channel")
    }

    loadHistory()
    socket.on("receive-channel-message", addMessage)
    socket.on("join-channel-error", handleSocketError)
    socket.on("send-channel-message-error", handleSocketError)
    onChannelMessageEdited(handleEdited)
    onChannelMessageDeleted(handleDeleted)
    joinChannel(channel.id)

    return () => {
      cancelled = true
      socket.off("receive-channel-message", addMessage)
      socket.off("join-channel-error", handleSocketError)
      socket.off("send-channel-message-error", handleSocketError)
      offChannelMessageEdited(handleEdited)
      offChannelMessageDeleted(handleDeleted)
    }
  }, [apiUrl, channel?.id])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSendNewMessage = () => {
    const text = inputValue.trim()
    if (!text && !attachedFile) return
    if (!channel?.id) return
    if (!socket.connected) { setError("Socket is not connected. Please try again."); return }

    let content = text
    if (attachedFile) {
      content = text ? `${text}\n${attachedFile.url}` : attachedFile.url
    }

    sendChannelMessage(channel.id, content, null)
    setInputValue("")
    setAttachedFile(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendNewMessage() }
  }

  const handleSendReply = (channelId, content, parentId) => {
    sendChannelMessage(channelId, content, parentId)
    // Expand the thread of the parent we just replied to
    setExpandedThreads((prev) => new Set([...prev, parentId]))
  }

  const startReply = (message) => {
    setReplyingToId(message.id?.toString())
    setEditingState(null)
    // Expand the thread of the message being replied to so the composer is visible
    setExpandedThreads((prev) => new Set([...prev, message.id?.toString()]))
  }

  const cancelReply = () => setReplyingToId(null)

  const startEdit = (message) => {
    setEditingState({ messageId: message.id?.toString(), draftContent: message.content || "" })
    setReplyingToId(null)
  }

  const cancelEdit = () => setEditingState(null)

  const submitEdit = () => {
    if (!editingState?.draftContent?.trim()) return
    editChannelMessage(editingState.messageId, editingState.draftContent.trim())
    setEditingState(null)
  }

  const handleDelete = (message) => {
    deleteChannelMessage(message.id?.toString())
  }

  const toggleThread = (rootId) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      next.has(rootId) ? next.delete(rootId) : next.add(rootId)
      return next
    })
  }

  // Shared action props passed to every MessageRow
  const actionProps = {
    currentUserId,
    editingState,
    replyingToId,
    onStartEdit: startEdit,
    onCancelEdit: cancelEdit,
    onSubmitEdit: submitEdit,
    onSetEditDraft: (draft) => setEditingState((s) => ({ ...s, draftContent: draft })),
    onStartReply: startReply,
    onDelete: handleDelete,
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!channel) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center bg-white text-sm text-[#52656A]">
        Loading channel…
      </div>
    )
  }

  const hasMessages = rootMessages.length > 0

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">

      {/* ── Scrollable message area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Channel intro header */}
        <div className="px-6 pt-8 pb-4 border-b border-[#E0E7E6]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F6F2] text-xl text-[#395B64] mb-3">
            {channel.type === "PRIVATE"
              ? <i className="fa-solid fa-lock" />
              : <i className="fa-solid fa-hashtag" />}
          </div>
          <h2 className="text-xl font-bold text-[#2C3333]">#{channel.name}</h2>
          {channel.description && (
            <p className="mt-1 text-sm text-[#52656A] max-w-lg">{channel.description}</p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-[#52656A]">
            <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#A5C9CA] mb-2" />
            <p className="text-sm">Loading messages…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasMessages && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#52656A]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F6F2] text-2xl text-[#A5C9CA] mb-4">
              <i className="fa-regular fa-comments" />
            </div>
            <p className="text-sm font-semibold text-[#2C3333]">No messages yet</p>
            <p className="mt-1 text-xs text-[#52656A]">Be the first to say something in #{channel.name}.</p>
          </div>
        )}

        {/* ── Message list ──────────────────────────────────────────────────── */}
        {!loading && hasMessages && (
          <div className="py-4 px-2">
            {rootMessages.map((rootMsg) => {
              const rootId = rootMsg.id?.toString()
              const replies = repliesMap[rootId] || []
              const replyCount = replies.length
              const isThreadExpanded = expandedThreads.has(rootId)
              const isReplyingToThis = replyingToId === rootId

              // A thread section is shown when there are actual replies OR when
              // the user has just clicked Reply (to show the inline composer)
              const showThread = isThreadExpanded && (replyCount > 0 || isReplyingToThis)

              return (
                <div key={rootMsg.id} className="mb-1">
                  {/* ── Root message ─────────────────────────────────────── */}
                  <MessageRow
                    message={rootMsg}
                    {...actionProps}
                    isReply={false}
                  />

                  {/* ── Reply count badge (collapsed state) ───────────────── */}
                  {replyCount > 0 && !isThreadExpanded && (
                    <ReplyCountBadge count={replyCount} onClick={() => toggleThread(rootId)} />
                  )}

                  {/* ── Thread section ────────────────────────────────────── */}
                  {showThread && (
                    <div className="ml-11 mt-1 mb-2 border-l-2 border-[#E0E7E6] pl-4">
                      {/* Collapse link */}
                      {replyCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isReplyingToThis) toggleThread(rootId)
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-[#395B64] hover:text-[#2C3333] hover:underline mb-2 transition-colors"
                        >
                          <i className="fa-solid fa-chevron-up text-[9px] opacity-60" />
                          {replyCount === 1 ? "1 reply" : `${replyCount} replies`}
                        </button>
                      )}

                      {/* Actual replies */}
                      <div className="space-y-0.5">
                        {replies.map((reply) => (
                          <MessageRow
                            key={reply.id}
                            message={reply}
                            {...actionProps}
                            isReply={true}
                          />
                        ))}
                      </div>

                      {/* Inline reply composer */}
                      {isReplyingToThis && (
                        <InlineReplyComposer
                          parentMessage={rootMsg}
                          channelId={channel.id}
                          onSend={handleSendReply}
                          onCancel={cancelReply}
                        />
                      )}
                    </div>
                  )}

                  {/* Composer visible but thread not yet expanded (0 replies, just opened) */}
                  {isReplyingToThis && !showThread && (
                    <div className="ml-11 mt-1 mb-2 pl-4 border-l-2 border-[#E0E7E6]">
                      <InlineReplyComposer
                        parentMessage={rootMsg}
                        channelId={channel.id}
                        onSend={handleSendReply}
                        onCancel={cancelReply}
                      />
                    </div>
                  )}
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Main message composer ──────────────────────────────────────────── */}
      <div className="border-t border-[#E0E7E6] bg-white px-4 py-3">
        {/* Hint when a reply composer is open */}
        {replyingToId && (
          <div className="flex items-center gap-2 mb-2 text-[11px] text-[#52656A]">
            <i className="fa-solid fa-reply opacity-50" />
            <span>Reply</span>
            <button
              type="button"
              onClick={cancelReply}
              className="text-[#395B64] hover:underline font-medium"
            >
              Cancel reply
            </button>
          </div>
        )}

        {/* Attached file preview chip */}
        {attachedFile && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#E7F6F2] px-3 py-1.5 text-xs text-[#2C3333] border border-[#A5C9CA]">
            <div className="flex items-center gap-2 truncate">
              <i className="fa-solid fa-paperclip text-[#395B64]" />
              <span className="font-medium truncate">{attachedFile.originalName}</span>
              <span className="text-[10px] text-[#52656A]">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-[#52656A] hover:text-rose-500 transition-colors p-1"
              title="Remove attachment"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-[#D0DCDB] bg-[#F8FAFB] px-3 py-2 focus-within:border-[#395B64] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#E7F6F2] transition-all">
          <FileUpload
            onUploadSuccess={(file) => setAttachedFile(file)}
            onUploadError={(err) => setError(err)}
          />
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
            rows={1}
            className="min-w-0 flex-1 resize-none bg-transparent text-sm text-[#2C3333] outline-none placeholder:text-[#52656A]/50 leading-5 py-0.5"
          />
          <button
            type="button"
            onClick={handleSendNewMessage}
            disabled={!inputValue.trim() && !attachedFile}
            className="flex items-center gap-1.5 self-center rounded-lg bg-[#395B64] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2C3333] disabled:cursor-not-allowed disabled:opacity-40 transition-colors flex-shrink-0"
          >
            Send <i className="fa-solid fa-paper-plane text-[9px]" />
          </button>
        </div>
      </div>
    </div>
  )
}

ChannelMessageThread.propTypes = {
  channel: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    type: PropTypes.string,
  }),
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
}

ChannelMessageThread.defaultProps = {
  channel: null,
  currentUserId: null,
}

export default ChannelMessageThread
