import { useEffect, useRef, useState, useMemo } from "react"
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
import DateSeparator from "../common/DateSeparator"
import { formatMessageDate, formatMessageTime, isSameDay } from "../../utils/dateUtils"
import { isImageOrFileMessage, isPureAttachmentMessage, getMessageAttachments } from "../../utils/fileUtils"
import { starMessageApi, unstarMessageApi } from "../../services/messageService"
import { toast } from "react-toastify"
import { useWorkspace } from "../../context/WorkspaceContext"
import MentionSuggestions from "../common/MentionSuggestions"
import { useMentionInput } from "../../hooks/useMentionInput"
import { extractMentionIdsFromText } from "../../utils/mentionUtils"
import AttachmentRenderer from "../common/AttachmentRenderer"

const AVATAR_COLORS = ["#395B64", "#4A7C88", "#52656A", "#2E6E79", "#3D7A52", "#5B6E7C"]
const avatarColor = (username) =>
  AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

const Avatar = ({ username = null, avatar = null, small = false }) => {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username || "User"}
        className={`rounded-full object-cover flex-shrink-0 select-none ${
          small ? "w-5.5 h-5.5" : "w-7 h-7"
        }`}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 select-none ${
        small ? "w-5.5 h-5.5 text-[9px]" : "w-7 h-7 text-xs"
      }`}
      style={{ backgroundColor: avatarColor(username) }}
    >
      {(username ?? "?").charAt(0).toUpperCase()}
    </div>
  )
}

const ReplyReference = ({ replyToMessage = null, isSender = false }) => {
  if (!replyToMessage) return null
  const content = replyToMessage.isDeleted
    ? "This message was deleted"
    : replyToMessage.content || "Message unavailable"
  const senderName = replyToMessage.sender?.username || "User"

  return (
    <div className={`flex items-start gap-1.5 mb-1.5 rounded-lg border-l-[3px] border-[#395B64] dark:border-[#A5C9CA] px-2.5 py-1 text-left ${
      isSender 
        ? "bg-black/[0.04] dark:bg-white/[0.06]" 
        : "bg-black/[0.03] dark:bg-white/[0.05]"
    }`}>
      <i className="fa-solid fa-reply text-[9px] text-[#395B64] dark:text-[#A5C9CA] mt-[3px] flex-shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] font-semibold text-[#395B64] dark:text-[#A5C9CA] mr-1.5">{senderName}</span>
        <span className={`text-[10px] truncate block ${replyToMessage.isDeleted ? "italic opacity-60" : "text-[#52656A] dark:text-[#A5C9CA]/80"}`}>
          {content.length > 70 ? `${content.slice(0, 70)}…` : content}
        </span>
      </div>
    </div>
  )
}

const InlineReplyComposer = ({ parentMessage, channelId, onSend, onCancel, members = [], currentUserId = null }) => {
  const mention = useMentionInput({
    members,
    currentUserId,
    includeAll: true,
    channelMembers: members,
  })
  const [attachedFile, setAttachedFile] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const senderName = parentMessage.sender?.username || "User"
  const preview = parentMessage.isDeleted
    ? "This message was deleted"
    : (parentMessage.content || "").slice(0, 72)

  const submit = () => {
    const trimmed = mention.value.trim()
    if (!trimmed && !attachedFile) return
    const mentionIds = mention.getMentionedUserIds()
    onSend(channelId, trimmed, parentMessage.id?.toString(), attachedFile ? [attachedFile] : [], mentionIds)
    mention.reset()
    setAttachedFile(null)
    onCancel()
  }

  const onKeyDown = (e) => {
    if (mention.handleKeyDown(e)) return
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
    if (e.key === "Escape") onCancel()
  }

  return (
    <div className="relative mt-2 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] bg-white dark:bg-[#1E2525] shadow-sm overflow-visible focus-within:border-[#395B64] focus-within:ring-1 focus-within:ring-[#E7F6F2] dark:focus-within:ring-[#395B64]/30 transition-all">
      <MentionSuggestions
        isOpen={mention.isOpen}
        users={mention.filteredUsers}
        activeIndex={mention.activeIndex}
        onSelect={(user) => mention.selectUser(user, textareaRef.current)}
        positionClass="bottom-full mb-1 left-0 right-0"
      />
      {/* Context strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#F8FAFB] dark:bg-[#161B1B] border-b border-[#E0E7E6] dark:border-[#2C3333] rounded-t-xl">
        <i className="fa-solid fa-reply text-[11px] text-[#A5C9CA]" />
        <span className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]">Replying to</span>
        <span className="text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA]">{senderName}</span>
        <span className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70 opacity-60 truncate">· {preview}{(parentMessage.content?.length ?? 0) > 72 ? "…" : ""}</span>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white rounded p-0.5 hover:bg-[#E0E7E6] dark:hover:bg-[#2C3333] transition-colors flex-shrink-0"
          title="Cancel reply"
        >
          <i className="fa-solid fa-xmark text-[11px]" />
        </button>
      </div>

      {/* Attachment chip if file attached */}
      {attachedFile && (
        <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-lg bg-[#E7F6F2] dark:bg-[#242D2D] px-2.5 py-1 text-xs text-[#2C3333] dark:text-[#E7F6F2] border border-[#A5C9CA] dark:border-[#395B64]">
          <div className="flex items-center gap-2 truncate">
            <i className="fa-solid fa-paperclip text-[#395B64] dark:text-[#A5C9CA] text-xs" />
            <span className="font-medium truncate text-[11px]">{attachedFile.originalName}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="text-[#52656A] dark:text-[#A5C9CA] hover:text-rose-500 p-0.5"
          >
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>
      )}

      {/* Upload error banner */}
      {uploadError && (
        <div className="mx-3 mt-2 flex items-center justify-between text-[11px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)}>×</button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <FileUpload
          buttonClassName="flex items-center justify-center h-7 w-7 rounded-md text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition-colors disabled:opacity-50"
          iconClassName="text-xs"
          onUploadSuccess={(file) => {
            setAttachedFile(file)
            setUploadError(null)
          }}
          onUploadError={(err) => setUploadError(err)}
        />
        <textarea
          ref={textareaRef}
          value={mention.value}
          onChange={(e) => mention.handleChange(e.target.value, e.target.selectionStart)}
          onKeyDown={onKeyDown}
          onClick={(e) => mention.handleCursorChange(e.target.selectionStart)}
          onKeyUp={(e) => mention.handleCursorChange(e.target.selectionStart)}
          placeholder={`Reply to ${senderName}…`}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-[#2C3333] dark:text-[#E7F6F2] outline-none placeholder:text-[#52656A]/50 dark:placeholder:text-[#A5C9CA]/50 leading-5 py-0.5"
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            disabled={!mention.value.trim() && !attachedFile}
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

// ─── Message Row ──────────────────────────────────────────────────────────────
// Used for both root messages and replies. `isReply` controls visual indentation
// and suppresses the ReplyReference (since replies inside a thread are already
// visually grouped under their parent).

const MessageRow = ({
  message,
  currentUserId = null,
  editingState = null,
  replyingToId = null,
  channelMembers = [],
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onSetEditDraft,
  onStartReply,
  onDelete,
  onToggleStar,
  isReply = false,
}) => {
  const activeUserId = (currentUserId?._id || currentUserId?.id || currentUserId)?.toString()
  const senderId = (message.senderId?._id || message.senderId?.id || message.senderId || message.sender?.id || message.sender?._id)?.toString()
  const isSender = Boolean(senderId && activeUserId && senderId === activeUserId)
  const isDeleted = message.isDeleted === true
  const isBeingEdited = editingState?.messageId === message.id?.toString()
  const attachments = getMessageAttachments(message)
  const isImageOrFile = isImageOrFileMessage(message)

  const senderMember = useMemo(() => {
    if (!senderId || !Array.isArray(channelMembers)) return null
    return channelMembers.find((m) => m.id === senderId)
  }, [channelMembers, senderId])

  const username = message.sender?.username || senderMember?.username || senderMember?.displayName || "User"
  const avatar = message.sender?.avatar || message.sender?.avatarUrl || message.sender?.profileImage || senderMember?.avatarUrl || null

  const showOrphanRef = !isReply && Boolean(message.replyToMessage)

  return (
    <div
      className={`group flex items-end gap-2 px-2 sm:px-4 py-1 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${
        isReply ? "py-0.5" : ""
      } ${isSender ? "justify-end" : "justify-start"}`}
    >
      {/* Receiver Avatar (left side) */}
      {!isSender && (
        <div className="flex-shrink-0 mb-0.5">
          <Avatar username={username} avatar={avatar} small={isReply} />
        </div>
      )}

      {/* Hover action toolbar for sender (floats to the left of the bubble) */}
      {isSender && !isBeingEdited && !isDeleted && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#242D2D] rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50 shadow-sm px-1 py-0.5 flex-shrink-0 mb-0.5 pointer-events-none group-hover:pointer-events-auto">
          {!isImageOrFile && (
            <div className="group/tip relative">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur()
                  onToggleStar && onToggleStar(message)
                }}
                aria-label={message.isStarred ? "Unstar message" : "Star message"}
                className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                  message.isStarred
                    ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    : "text-[#52656A] dark:text-[#A5C9CA] hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525]"
                }`}
              >
                <i className={`${message.isStarred ? "fa-solid fa-star text-emerald-500" : "fa-regular fa-star"} text-[10px]`} />
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
                {message.isStarred ? "Unstar" : "Star"}
              </span>
            </div>
          )}

          <div className="group/tip relative">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur()
                onStartReply(message)
              }}
              aria-label="Reply"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] dark:hover:text-white hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525] transition-colors"
            >
              <i className="fa-solid fa-reply text-[10px]" />
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
              Reply
            </span>
          </div>

          {!isImageOrFile && (
            <>
              <div className="w-px h-3.5 bg-[#E0E7E6] dark:bg-[#395B64]/40 mx-0.5" />
              <div className="group/tip relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur()
                    onStartEdit(message)
                  }}
                  aria-label="Edit message"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] dark:hover:text-white hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525] transition-colors"
                >
                  <i className="fa-solid fa-pen text-[10px]" />
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
                  Edit
                </span>
              </div>
            </>
          )}

          <div className="group/tip relative">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur()
                onDelete(message)
              }}
              aria-label="Delete message"
              className="flex h-6 w-6 items-center justify-center rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <i className="fa-solid fa-trash text-[10px]" />
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
              Delete
            </span>
          </div>
        </div>
      )}

      {/* Message Bubble / Editor / Deleted / Pure attachment */}
      {isBeingEdited ? (
        <div className="w-full sm:w-[380px] max-w-full text-left">
          <textarea
            className="w-full text-sm text-[#2C3333] dark:text-[#E7F6F2] bg-white dark:bg-[#1E2525] border border-[#A5C9CA] dark:border-[#395B64] rounded-lg px-3 py-2 outline-none focus:border-[#395B64] focus:ring-1 focus:ring-[#E7F6F2] dark:focus:ring-[#395B64]/30 resize-none transition-colors leading-relaxed shadow-xs"
            value={editingState.draftContent}
            onChange={(e) => onSetEditDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSubmitEdit()
              }
              if (e.key === "Escape") onCancelEdit()
            }}
            rows={Math.min(
              Math.max((editingState.draftContent || "").split("\n").length, 1),
              5
            )}
            autoFocus
          />
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
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
            <div className="group/tip relative">
              <button
                type="button"
                onClick={onCancelEdit}
                aria-label="Cancel"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#52656A] dark:text-[#A5C9CA] border border-[#E0E7E6] dark:border-[#395B64] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white transition-colors"
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
        <div className="rounded-2xl px-3.5 py-2 border border-dashed border-[#D0DCDB] dark:border-[#395B64]/40 bg-[#F8FAFB] dark:bg-[#1E2525]">
          <p className="text-sm italic text-[#52656A] dark:text-[#A5C9CA]/60 opacity-50">This message was deleted</p>
        </div>
      ) : (
        <div
          className={`rounded-2xl px-3 py-1.5 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] break-words shadow-xs text-left ${
            isSender
              ? "bg-[#E7F6F2] dark:bg-[#1E2E30] text-[#2C3333] dark:text-[#E7F6F2] border border-[#A5C9CA]/50 dark:border-[#395B64]/50"
              : "bg-[#F4F7F6] dark:bg-[#202727] text-[#2C3333] dark:text-[#E7F6F2] border border-[#E0E7E6] dark:border-[#2C3535]"
          }`}
        >
          {/* Sender username in Channels (for other users) */}
          {!isSender && username && (
            <p className="text-[11px] font-bold text-[#395B64] dark:text-[#A5C9CA] leading-tight mb-0.5 select-none">
              {username}
            </p>
          )}

          {/* Orphan reply reference */}
          {showOrphanRef && <ReplyReference replyToMessage={message.replyToMessage} isSender={isSender} />}

          {/* Content and compact inline timestamp */}
          <div className="flex items-baseline justify-between gap-x-2.5 gap-y-0.5 flex-wrap">
            <div className="min-w-0 flex-1 leading-snug">
              <MessageContent
                content={message.content}
                attachments={message.attachments?.length ? message.attachments : attachments}
                mentions={message.mentions || []}
                currentUserId={activeUserId}
                isSender={isSender}
                className="text-sm leading-snug break-words"
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 self-end ml-auto text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 select-none pb-0.5">
              <span className="leading-none whitespace-nowrap">
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isEdited && !isDeleted && (
                <span className="text-[9px] text-[#52656A] dark:text-[#A5C9CA]/60 opacity-60 leading-none whitespace-nowrap">
                  (edited)
                </span>
              )}
              {message.isStarred && !isDeleted && !isImageOrFile && (
                <button
                  type="button"
                  onClick={() => onToggleStar && onToggleStar(message)}
                  title="Starred message (click to unstar)"
                  className="text-emerald-500 hover:text-emerald-600 transition-colors p-0.5"
                >
                  <i className="fa-solid fa-star text-[9px]" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hover action toolbar for receiver (floats to the right of the bubble) */}
      {!isSender && !isBeingEdited && !isDeleted && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#242D2D] rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50 shadow-sm px-1 py-0.5 flex-shrink-0 mb-0.5 pointer-events-none group-hover:pointer-events-auto">
          {!isImageOrFile && (
            <div className="group/tip relative">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur()
                  onToggleStar && onToggleStar(message)
                }}
                aria-label={message.isStarred ? "Unstar message" : "Star message"}
                className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                  message.isStarred
                    ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    : "text-[#52656A] dark:text-[#A5C9CA] hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525]"
                }`}
              >
                <i className={`${message.isStarred ? "fa-solid fa-star text-emerald-500" : "fa-regular fa-star"} text-[10px]`} />
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
                {message.isStarred ? "Unstar" : "Star"}
              </span>
            </div>
          )}

          <div className="group/tip relative">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur()
                onStartReply(message)
              }}
              aria-label="Reply"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] dark:hover:text-white hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525] transition-colors"
            >
              <i className="fa-solid fa-reply text-[10px]" />
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
              Reply
            </span>
          </div>
        </div>
      )}

      {/* Sender Avatar (right side) */}
      {isSender && (
        <div className="flex-shrink-0 mb-0.5">
          <Avatar username={username} avatar={avatar} small={isReply} />
        </div>
      )}
    </div>
  )
}

const ReplyCountBadge = ({ count, onClick }) => {
  if (count === 0) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-[11px] text-[#395B64] hover:text-[#2C3333] hover:underline transition-colors"
    >
      <i className="fa-regular fa-comment text-[10px] opacity-70" />
      <span>{count} {count === 1 ? "reply" : "replies"}</span>
    </button>
  )
}

const ChannelMessageThread = ({ channel = null, currentUserId = null }) => {
  const { workspaceData, user } = useWorkspace()
  const resolvedCurrentUserId = (currentUserId?._id || currentUserId?.id || currentUserId || user?.id || user?._id)?.toString()
  const [messages, setMessages] = useState([])
  const [attachedFile, setAttachedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [replyingToId, setReplyingToId] = useState(null)

  const channelMembers = useMemo(() => {
    const allWorkspaceMembers = (workspaceData?.members || []).map((m) => {
      const u = m.user || m
      return {
        id: (u.id || u._id || m.userId)?.toString(),
        username: u.username || m.username || "",
        displayName: u.displayName || u.fullName || u.username || m.displayName || "",
        email: u.email || m.email || "",
        avatarUrl: u.avatar || u.avatarUrl || u.profileImage || m.avatar || m.avatarUrl || null,
      }
    }).filter((u) => u.id && u.username)

    const isPrivate = channel?.isPrivate || channel?.type === "PRIVATE"
    if (isPrivate && Array.isArray(channel?.members) && channel.members.length > 0) {
      const allowedSet = new Set(
        channel.members.map((m) => (m.id || m._id || m)?.toString())
      )
      return allWorkspaceMembers.filter((m) => allowedSet.has(m.id))
    }

    return allWorkspaceMembers
  }, [workspaceData?.members, channel?.isPrivate, channel?.type, channel?.members])

  const mention = useMentionInput({
    members: channelMembers,
    currentUserId: resolvedCurrentUserId,
    includeAll: true,
    channelMembers,
  })
  const composerTextareaRef = useRef(null)

 
  const [expandedThreads, setExpandedThreads] = useState(new Set())

  const [editingState, setEditingState] = useState(null)

  const messageIdsRef = useRef(new Set())
  const messagesEndRef = useRef(null)
  const prevCountRef = useRef(0)
  const prevChannelIdRef = useRef(null)
  const apiUrl = import.meta.env.VITE_API_URL

  const { rootMessages, repliesMap } = useMemo(() => {
    const knownIds = new Set(messages.map((m) => m.id?.toString()))
    const roots = []
    const replies = {}

    messages.forEach((msg) => {
      const parentId = msg.replyTo?.toString()
      if (!parentId || !knownIds.has(parentId)) {
        roots.push(msg)
      } else {
        replies[parentId] = replies[parentId] ? [...replies[parentId], msg] : [msg]
      }
    })

    roots.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    Object.values(replies).forEach((arr) =>
      arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    )

    return { rootMessages: roots, repliesMap: replies }
  }, [messages])

 
  useEffect(() => {
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      Object.keys(repliesMap).forEach((id) => next.add(id))
      return next
    })
  }, [repliesMap])

  useEffect(() => {
    if (!channel?.id) return undefined

    let cancelled = false

    const loadHistory = async () => {
      setLoading(true)
      setError(null)
      messageIdsRef.current = new Set()

      try {
        const token = localStorage.getItem("worknestToken")
        const response = await fetch(`${apiUrl}/messages/channels/${channel.id}`, { credentials: "include",
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
            ? {
                ...m,
                content: payload.content,
                isEdited: true,
                updatedAt: payload.updatedAt,
                mentions: payload.mentions !== undefined ? payload.mentions : m.mentions,
              }
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

  useEffect(() => {
    const isNewChannel = prevChannelIdRef.current !== channel?.id
    const prevCount = prevCountRef.current
    const currentCount = messages.length

    if (isNewChannel) {
      prevChannelIdRef.current = channel?.id
      prevCountRef.current = currentCount
      if (currentCount > 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      }
      return
    }

    if (currentCount > prevCount) {
      prevCountRef.current = currentCount
      if (prevCount === 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }
    } else {
      prevCountRef.current = currentCount
    }
  }, [messages, channel?.id])

  
  const handleSendNewMessage = () => {
    const text = mention.value.trim()
    if (!text && !attachedFile) return
    if (!channel?.id) return
    if (!socket.connected) { setError("Socket is not connected. Please try again."); return }

    const attachments = attachedFile ? [attachedFile] : []
    const mentionIds = mention.getMentionedUserIds()

    sendChannelMessage(channel.id, text, null, attachments, mentionIds)
    mention.reset()
    setAttachedFile(null)
  }

  const handleKeyDown = (e) => {
    if (mention.handleKeyDown(e)) return
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendNewMessage() }
  }

  const handleSendReply = (channelId, content, parentId, attachments = [], mentions = []) => {
    sendChannelMessage(channelId, content, parentId, attachments, mentions)
 
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
    const mentionIds = extractMentionIdsFromText(
      editingState.draftContent,
      channelMembers,
      null,
      { currentUserId, channelMembers }
    )
    editChannelMessage(editingState.messageId, editingState.draftContent.trim(), mentionIds)
    setEditingState(null)
  }

  const handleDelete = (message) => {
    deleteChannelMessage(message.id?.toString())
  }

  const handleToggleStar = async (message) => {
    if (!message || isImageOrFileMessage(message)) return
    const msgId = (message.id || message._id)?.toString()
    if (!msgId) return

    const willStar = !message.isStarred

    setMessages((prev) =>
      prev.map((m) =>
        (m.id || m._id)?.toString() === msgId ? { ...m, isStarred: willStar } : m
      )
    )

    try {
      if (willStar) {
        await starMessageApi(msgId, "CHANNEL")
        toast.success("Message starred")
      } else {
        await unstarMessageApi(msgId)
        toast.success("Message unstarred")
      }
    } catch (err) {
      console.error("Failed to star/unstar message:", err)
      toast.error(err.message || "Failed to update star")
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id)?.toString() === msgId ? { ...m, isStarred: !willStar } : m
        )
      )
    }
  }

  const toggleThread = (rootId) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      next.has(rootId) ? next.delete(rootId) : next.add(rootId)
      return next
    })
  }

  const actionProps = {
    currentUserId: resolvedCurrentUserId,
    editingState,
    replyingToId,
    channelMembers,
    onStartEdit: startEdit,
    onCancelEdit: cancelEdit,
    onSubmitEdit: submitEdit,
    onSetEditDraft: (draft) => setEditingState((s) => ({ ...s, draftContent: draft })),
    onStartReply: startReply,
    onDelete: handleDelete,
    onToggleStar: handleToggleStar,
  }

  
  if (!channel) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center bg-white dark:bg-[#121717] text-sm text-[#52656A] dark:text-[#A5C9CA]">
        Loading channel…
      </div>
    )
  }

  const hasMessages = rootMessages.length > 0

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#121717] transition-colors">

      {/* ── Scrollable message area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Channel intro header */}
        <div className="px-4 sm:px-6 pt-5 sm:pt-8 pb-4 border-b border-[#E0E7E6] dark:border-[#2C3333]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F6F2] dark:bg-[#395B64]/30 text-xl text-[#395B64] dark:text-[#A5C9CA] mb-3">
            {channel.type === "PRIVATE"
              ? <i className="fa-solid fa-lock" />
              : <i className="fa-solid fa-hashtag" />}
          </div>
          <h2 className="text-xl font-bold text-[#2C3333] dark:text-white">#{channel.name}</h2>
          {channel.description && (
            <p className="mt-1 text-sm text-[#52656A] dark:text-[#A5C9CA]/80 max-w-lg">{channel.description}</p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900/60 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-[#52656A] dark:text-[#A5C9CA]">
            <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#A5C9CA] mb-2" />
            <p className="text-sm">Loading messages…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasMessages && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[#52656A] dark:text-[#A5C9CA]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F6F2] dark:bg-[#395B64]/30 text-2xl text-[#A5C9CA] mb-4">
              <i className="fa-regular fa-comments" />
            </div>
            <p className="text-sm font-semibold text-[#2C3333] dark:text-white">No messages yet</p>
            <p className="mt-1 text-xs text-[#52656A] dark:text-[#A5C9CA]/80">Be the first to say something in #{channel.name}.</p>
          </div>
        )}

        {/* ── Message list ──────────────────────────────────────────────────── */}
        {!loading && hasMessages && (
          <div className="py-4 px-2">
            {rootMessages.map((rootMsg, index) => {
              const rootId = rootMsg.id?.toString()
              const replies = repliesMap[rootId] || []
              const replyCount = replies.length
              const isThreadExpanded = expandedThreads.has(rootId)
              const isReplyingToThis = replyingToId === rootId

              const prevMsg = index > 0 ? rootMessages[index - 1] : null
              const showDateSeparator = !prevMsg || !isSameDay(prevMsg.createdAt, rootMsg.createdAt)
              const dateLabel = showDateSeparator ? formatMessageDate(rootMsg.createdAt) : null

              // A thread section is shown when there are actual replies OR when
              // the user has just clicked Reply (to show the inline composer)
              const showThread = isThreadExpanded && (replyCount > 0 || isReplyingToThis)

              return (
                <div key={rootMsg.id}>
                  {showDateSeparator && dateLabel && (
                    <DateSeparator label={dateLabel} />
                  )}
                  <div className="mb-1">
                    {/* ── Root message ─────────────────────────────────────── */}
                    <MessageRow
                      message={rootMsg}
                      {...actionProps}
                      isReply={false}
                    />

                  {/* ── Reply count badge (collapsed state) ───────────────── */}
                  {replyCount > 0 && !isThreadExpanded && (
                    <div className={`flex ${(rootMsg.senderId?._id || rootMsg.senderId?.id || rootMsg.senderId || rootMsg.sender?.id || rootMsg.sender?._id)?.toString() === resolvedCurrentUserId ? "justify-end pr-11" : "justify-start pl-11"} mt-0.5`}>
                      <ReplyCountBadge count={replyCount} onClick={() => toggleThread(rootId)} />
                    </div>
                  )}

                  {/* ── Thread section ────────────────────────────────────── */}
                  {showThread && (
                    <div className="ml-11 mt-1 mb-2 border-l-2 border-[#E0E7E6] dark:border-[#2C3333] pl-4">
                      {/* Collapse link */}
                      {replyCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isReplyingToThis) toggleThread(rootId)
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-[#395B64] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:underline mb-2 transition-colors"
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
                          members={channelMembers}
                          currentUserId={resolvedCurrentUserId}
                        />
                      )}
                    </div>
                  )}

                  {/* Composer visible but thread not yet expanded (0 replies, just opened) */}
                  {isReplyingToThis && !showThread && (
                    <div className="ml-11 mt-1 mb-2 pl-4 border-l-2 border-[#E0E7E6] dark:border-[#2C3333]">
                      <InlineReplyComposer
                        parentMessage={rootMsg}
                        channelId={channel.id}
                        onSend={handleSendReply}
                        onCancel={cancelReply}
                        members={channelMembers}
                        currentUserId={resolvedCurrentUserId}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Main message composer ──────────────────────────────────────────── */}
      <div className="border-t border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] px-4 py-3 transition-colors">
        {/* Hint when a reply composer is open */}
        {replyingToId && (
          <div className="flex items-center gap-2 mb-2 text-[11px] text-[#52656A] dark:text-[#A5C9CA]">
            <i className="fa-solid fa-reply opacity-50" />
            <span>Reply</span>
            <button
              type="button"
              onClick={cancelReply}
              className="text-[#395B64] dark:text-[#A5C9CA] hover:underline font-medium"
            >
              Cancel reply
            </button>
          </div>
        )}

        {/* Attached file preview chip */}
        {attachedFile && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#E7F6F2] dark:bg-[#242D2D] px-3 py-1.5 text-xs text-[#2C3333] dark:text-[#E7F6F2] border border-[#A5C9CA] dark:border-[#395B64]">
            <div className="flex items-center gap-2 truncate">
              <i className="fa-solid fa-paperclip text-[#395B64] dark:text-[#A5C9CA]" />
              <span className="font-medium truncate">{attachedFile.originalName}</span>
              <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-[#52656A] dark:text-[#A5C9CA] hover:text-rose-500 transition-colors p-1"
              title="Remove attachment"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
        )}

        <div className="relative flex items-center gap-2 rounded-xl border border-[#D0DCDB] dark:border-[#395B64]/60 bg-[#F8FAFB] dark:bg-[#242D2D] px-3 py-2 focus-within:border-[#395B64] focus-within:bg-white dark:focus-within:bg-[#242D2D] focus-within:ring-1 focus-within:ring-[#E7F6F2] dark:focus-within:ring-[#395B64]/30 transition-all">
          <MentionSuggestions
            isOpen={mention.isOpen}
            users={mention.filteredUsers}
            activeIndex={mention.activeIndex}
            onSelect={(user) => mention.selectUser(user, composerTextareaRef.current)}
            positionClass="bottom-full mb-2 left-0 right-0"
          />
          <FileUpload
            onUploadSuccess={(file) => setAttachedFile(file)}
            onUploadError={(err) => setError(err)}
          />
          <textarea
            ref={composerTextareaRef}
            value={mention.value}
            onChange={(e) => mention.handleChange(e.target.value, e.target.selectionStart)}
            onKeyDown={handleKeyDown}
            onClick={(e) => mention.handleCursorChange(e.target.selectionStart)}
            onKeyUp={(e) => mention.handleCursorChange(e.target.selectionStart)}
            placeholder={`Message #${channel.name}`}
            rows={1}
            className="min-w-0 flex-1 resize-none bg-transparent text-sm text-[#2C3333] dark:text-[#E7F6F2] outline-none placeholder:text-[#52656A]/50 dark:placeholder:text-[#A5C9CA]/50 leading-5 py-0.5"
          />
          <button
            type="button"
            onClick={handleSendNewMessage}
            disabled={!mention.value.trim() && !attachedFile}
            className="flex items-center gap-1.5 self-center rounded-lg bg-[#395B64] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2C3333] disabled:cursor-not-allowed disabled:opacity-40 transition-colors flex-shrink-0"
          >
            Send <i className="fa-solid fa-paper-plane text-[9px]" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChannelMessageThread
