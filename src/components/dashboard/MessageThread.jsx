import { useState, useEffect, useRef, useMemo } from "react"
import { FiSun, FiMoon } from "react-icons/fi"
import { useWorkspace } from "../../context/WorkspaceContext"
import { useTheme } from "../../context/ThemeContext"
import FileUpload from "../common/FileUpload"
import MessageContent from "../common/MessageContent"
import AttachmentRenderer from "../common/AttachmentRenderer"
import DateSeparator from "../common/DateSeparator"
import MentionSuggestions from "../common/MentionSuggestions"
import useMentionInput from "../../hooks/useMentionInput"
import { extractMentionIdsFromText } from "../../utils/mentionUtils"
import { formatMessageDate, formatMessageTime, isSameDay } from "../../utils/dateUtils"
import {
  isImageOrFileMessage,
  isPureAttachmentMessage,
  getMessageAttachments,
} from "../../utils/fileUtils"
import EmojiPickerButton from "../common/EmojiPickerButton"
import ForwardedMessageCard from "../common/ForwardedMessageCard"
import TypingIndicator from "../common/TypingIndicator"
import useTypingIndicator from "../../hooks/useTypingIndicator"
import StatusBadge from "../common/StatusBadge"
import StatusSelector from "../common/StatusSelector"
import MessageReactionPicker from "../common/MessageReactionPicker"
import MessageReactions from "../common/MessageReactions"

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

const MessageThread = ({
  selectedUser = null,
  messages = [],
  loading = false,
  error = null,
  onSendMessage,
  onEditMessage = () => {},
  onDeleteMessage = () => {},
  onToggleStar = () => {},
  onToggleReaction = () => {},
  onForwardMessage = () => {},
  onNavigateSource = () => {},
  currentUserId = null,
  onOpenSidebar = () => {},
  isBlocked = false,
  onToggleBlock,
  onClearError,
}) => {
  const { isUserOnline, workspaceData, user, getUserPresenceStatus } = useWorkspace()
  const resolvedCurrentUserId = (currentUserId?._id || currentUserId?.id || currentUserId || user?.id || user?._id)?.toString()
  const { toggleTheme, isDark } = useTheme()
  const [inputValue, setInputValue] = useState("")
  const [attachedFile, setAttachedFile] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  // editingState: { messageId: string, draftContent: string } | null
  const [editingState, setEditingState] = useState(null)
  const messagesContainerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const mainTextareaRef = useRef(null)
  const prevCountRef = useRef(0)
  const prevUserIdRef = useRef(null)

  const scrollToBottom = (behavior = "auto") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Keep selected user synchronized with latest profile in workspace
  const activeSelectedUser = useMemo(() => {
    if (!selectedUser) return null
    const sId = (selectedUser.id || selectedUser._id)?.toString()
    const live = (workspaceData?.members || []).find(
      (m) => (m.id || m._id || m.userId)?.toString() === sId
    )
    if (live) {
      return {
        ...selectedUser,
        username: live.username || selectedUser.username,
        avatar: live.avatar || live.avatarUrl || selectedUser.avatar,
        avatarUrl: live.avatar || live.avatarUrl || selectedUser.avatarUrl,
      }
    }
    return selectedUser
  }, [selectedUser, workspaceData?.members])

  // DM mentionable members: all members in current workspace
  const dmMembers = useMemo(() => {
    const list = workspaceData?.members || []
    if (selectedUser && !list.some((m) => (m.id || m._id)?.toString() === selectedUser.id?.toString())) {
      return [...list, selectedUser]
    }
    return list
  }, [workspaceData?.members, selectedUser])

  const mention = useMentionInput({
    members: dmMembers,
    inputValue,
    setInputValue,
    textareaRef: mainTextareaRef,
    currentUserId: resolvedCurrentUserId,
    includeAll: false,
  })

  const targetUserId = (activeSelectedUser?.id || activeSelectedUser?._id || selectedUser?.id || selectedUser?._id)?.toString()
  const { typingText, isAnyoneTyping, handleKeystroke, handleStopTypingNow } = useTypingIndicator({
    type: "dm",
    targetId: targetUserId,
    currentUserId: resolvedCurrentUserId,
  })

  const handleInputChange = (e) => {
    mention.handleInputChange(e)
    handleKeystroke(e.target.value)
  }

  // Auto-scroll to bottom only when new messages arrive or when switching conversation,
  // not when starring, unstarring, editing, or deleting existing messages.
  useEffect(() => {
    if (loading) return

    const isNewUser = prevUserIdRef.current !== selectedUser?.id
    const prevCount = prevCountRef.current
    const currentCount = messages.length

    if (isNewUser) {
      prevUserIdRef.current = selectedUser?.id
      prevCountRef.current = currentCount
      if (currentCount > 0) {
        scrollToBottom("auto")
        const timer = setTimeout(() => {
          scrollToBottom("auto")
        }, 50)
        return () => clearTimeout(timer)
      }
      return
    }

    if (currentCount > prevCount) {
      prevCountRef.current = currentCount
      if (prevCount === 0) {
        scrollToBottom("auto")
        const timer = setTimeout(() => {
          scrollToBottom("auto")
        }, 50)
        return () => clearTimeout(timer)
      } else {
        scrollToBottom("smooth")
      }
    } else {
      prevCountRef.current = currentCount
    }
  }, [messages, selectedUser?.id, loading])

  const handleSendClick = () => {
    const text = inputValue.trim()
    if (!text && !attachedFile) return

    handleStopTypingNow()
    const attachments = attachedFile ? [attachedFile] : []
    const mentions = mention.getMentionedUserIds(inputValue)
    onSendMessage(text, attachments, mentions)
    setInputValue("")
    setAttachedFile(null)
  }

  const handleKeyDown = (e) => {
    if (mention.handleKeyDown(e)) {
      return
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendClick()
    }
  }

  const handleEmojiSelect = (emoji) => {
    const el = mainTextareaRef.current
    if (!el) {
      const updated = (inputValue || "") + emoji
      setInputValue(updated)
      handleKeystroke(updated)
      return
    }
    const start = el.selectionStart ?? inputValue.length
    const end = el.selectionEnd ?? inputValue.length
    const text = inputValue || ""
    const updated = text.substring(0, start) + emoji + text.substring(end)
    setInputValue(updated)
    handleKeystroke(updated)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  const startEdit = (message) => {
    setEditingState({ messageId: message.id?.toString(), draftContent: message.content || "" })
  }

  const cancelEdit = () => setEditingState(null)

  const submitEdit = () => {
    if (!editingState?.draftContent?.trim()) return
    const mentions = extractMentionIdsFromText(
      editingState.draftContent.trim(),
      dmMembers,
      null,
      { currentUserId }
    )
    onEditMessage(editingState.messageId, editingState.draftContent.trim(), mentions)
    setEditingState(null)
  }

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#121717] transition-colors">
        <div className="text-center">
          <div className="text-gray-400 dark:text-[#A5C9CA]/60 mb-2">
            <i className="fa-solid fa-message text-4xl" />
          </div>
          <p className="text-gray-500 dark:text-[#A5C9CA]">Select a user to start messaging</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#121717] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2121] px-4 sm:px-6 py-3.5 transition-colors">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition md:hidden"
            aria-label="Open sidebar"
          >
            <i className="fa-solid fa-bars text-sm" />
          </button>
          
          <div className="relative flex-shrink-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#395B64] text-sm font-bold text-white shadow-xs overflow-hidden">
              {(activeSelectedUser.avatar || activeSelectedUser.avatarUrl || activeSelectedUser.profileImage) ? (
                <img
                  src={activeSelectedUser.avatar || activeSelectedUser.avatarUrl || activeSelectedUser.profileImage}
                  alt={activeSelectedUser.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                activeSelectedUser.username?.charAt(0)?.toUpperCase() || "U"
              )}
            </span>
            <StatusBadge
              status={getUserPresenceStatus(activeSelectedUser.id)}
              size="md"
              className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#1A2121]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#2C3333] dark:text-white">
                {activeSelectedUser.username || "User"}
              </h3>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                  getUserPresenceStatus(selectedUser.id) === "active"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                    : getUserPresenceStatus(selectedUser.id) === "away"
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
                    : "bg-gray-100 dark:bg-[#2C3333] text-gray-500 dark:text-[#A5C9CA] border border-gray-200 dark:border-gray-700"
                }`}
              >
                <StatusBadge
                  status={getUserPresenceStatus(selectedUser.id)}
                  size="xs"
                />
                <span className="capitalize">{getUserPresenceStatus(selectedUser.id)}</span>
              </span>
            </div>
            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80">{selectedUser.email || ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusSelector align="right" />
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
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-2.5 text-xs sm:text-sm text-amber-800 dark:text-amber-200 shadow-xs">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="text-amber-700 dark:text-amber-300 hover:opacity-75 transition p-1"
                title="Dismiss"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#52656A] dark:text-[#A5C9CA]">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#52656A] dark:text-[#A5C9CA]">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const activeUserId = (currentUserId?._id || currentUserId?.id || currentUserId || user?.id || user?._id)?.toString()
            const senderId = (message.senderId?._id || message.senderId?.id || message.senderId || message.sender?.id || message.sender?._id)?.toString()
            const isSender = Boolean(senderId && activeUserId && senderId === activeUserId)
            const isDeleted = message.isDeleted === true
            const isBeingEdited = editingState?.messageId === message.id?.toString()
            const isPureAttachment = !isDeleted && isPureAttachmentMessage(message)
            const isPureForwarded = !isDeleted && Boolean(message.forwardedFrom && !message.content?.trim())
            const attachments = getMessageAttachments(message)

            const prevMessage = index > 0 ? messages[index - 1] : null
            const showDateSeparator = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt)
            const dateLabel = showDateSeparator ? formatMessageDate(message.createdAt) : null

            return (
              <div key={message.id}>
                {showDateSeparator && dateLabel && (
                  <DateSeparator label={dateLabel} />
                )}
                <div
                  className={`group flex items-end gap-2 px-2 sm:px-4 py-1 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Receiver Avatar (left side) */}
                  {!isSender && (
                    <div className="flex-shrink-0 mb-0.5">
                      <Avatar
                        username={activeSelectedUser?.username}
                        avatar={activeSelectedUser?.avatar || activeSelectedUser?.avatarUrl || activeSelectedUser?.profileImage}
                        small
                      />
                    </div>
                  )}
            
                  {isSender && !isDeleted && !isBeingEdited && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#242D2D] rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50 shadow-sm px-1 py-0.5 flex-shrink-0 mb-0.5 pointer-events-none group-hover:pointer-events-auto">
                      {!isImageOrFileMessage(message) && (
                        <div className="group/tip relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.blur()
                              onToggleStar(message)
                            }}
                           
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
                      <MessageReactionPicker
                        onSelectEmoji={(emoji) => onToggleReaction && onToggleReaction(message, emoji)}
                        align="right"
                      />
                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.blur()
                            onForwardMessage && onForwardMessage(message, {
                              sourceType: "DIRECT",
                              sourceName: activeSelectedUser?.username || "Direct Message",
                              sourceId: (activeSelectedUser?.id || activeSelectedUser?._id || "")?.toString(),
                              otherUserId: (activeSelectedUser?.id || activeSelectedUser?._id || "")?.toString(),
                            })
                          }}
                          aria-label="Forward message"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] dark:hover:text-white hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525] transition-colors"
                        >
                          <i className="fa-solid fa-share text-[10px]" />
                        </button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
                          Forward
                        </span>
                      </div>
                      {!isImageOrFileMessage(message) && (
                        <div className="group/tip relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.blur()
                              startEdit(message)
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
                      )}
                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.blur()
                            onDeleteMessage(message.id?.toString())
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

                  {/* Message bubble / Edit box / Deleted indicator */}
                  {isBeingEdited ? (
                    <div className="w-full sm:w-[380px] max-w-full">
                      <textarea
                        className="w-full text-sm text-[#2C3333] dark:text-[#E7F6F2] bg-white dark:bg-[#1E2525] border border-[#A5C9CA] dark:border-[#395B64] rounded-lg px-3 py-2 outline-none focus:border-[#395B64] focus:ring-1 focus:ring-[#E7F6F2] dark:focus:ring-[#395B64]/30 resize-none transition-colors leading-relaxed shadow-xs"
                        value={editingState.draftContent}
                        onChange={(e) =>
                          setEditingState((s) => ({ ...s, draftContent: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            submitEdit()
                          }
                          if (e.key === "Escape") cancelEdit()
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
                            onClick={submitEdit}
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
                            onClick={cancelEdit}
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
                    <div className={`flex flex-col ${isSender ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%] md:max-w-[65%]`}>
                      <div
                        className={`w-fit max-w-full break-words text-left ${
                          isPureAttachment || isPureForwarded
                            ? "bg-transparent border-0 shadow-none px-0 py-0"
                            : `rounded-2xl px-3 py-1.5 shadow-xs ${
                                isSender
                                  ? "bg-[#E7F6F2] dark:bg-[#1E2E30] text-[#2C3333] dark:text-[#E7F6F2] border border-[#A5C9CA]/50 dark:border-[#395B64]/50"
                                  : "bg-[#F4F7F6] dark:bg-[#202727] text-[#2C3333] dark:text-[#E7F6F2] border border-[#E0E7E6] dark:border-[#2C3535]"
                              }`
                        }`}
                      >
                        <div className="flex flex-col">
                          {(Boolean(message.content?.trim()) || Boolean(message.attachments?.length) || Boolean(attachments?.length)) && (
                            <div className="min-w-0 break-words leading-relaxed">
                              <MessageContent
                                content={message.content}
                                attachments={message.attachments?.length ? message.attachments : attachments}
                                isSender={isSender}
                                mentions={message.mentions || []}
                                currentUserId={activeUserId}
                                className="text-[15px] sm:text-base leading-relaxed break-words"
                              />
                            </div>
                          )}
                          {message.forwardedFrom && (
                            <ForwardedMessageCard
                              forwardedFrom={message.forwardedFrom}
                              isSender={isSender}
                              onNavigateSource={onNavigateSource}
                              timestamp={formatMessageTime(message.createdAt)}
                              isEdited={message.isEdited && !isDeleted}
                              isStarred={message.isStarred && !isDeleted && !isImageOrFileMessage(message)}
                              onToggleStar={() => onToggleStar(message)}
                            />
                          )}
                          {!message.forwardedFrom && (
                            <div className="flex items-center justify-end gap-1 self-end ml-auto mt-0.5 text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70 select-none leading-none">
                              <span className="whitespace-nowrap">
                                {formatMessageTime(message.createdAt)}
                              </span>
                              {message.isEdited && !isDeleted && (
                                <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 opacity-60 leading-none whitespace-nowrap">
                                  (edited)
                                </span>
                              )}
                              {message.isStarred && !isDeleted && !isImageOrFileMessage(message) && (
                                <button
                                  type="button"
                                  onClick={() => onToggleStar(message)}
                                  title="Starred message (click to unstar)"
                                  className="text-emerald-500 hover:text-emerald-600 transition-colors p-0.5"
                                >
                                  <i className="fa-solid fa-star text-[9px]" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {!isDeleted && (
                        <MessageReactions
                          reactions={message.reactions || []}
                          currentUserId={resolvedCurrentUserId}
                          onToggleReaction={(emoji) => onToggleReaction && onToggleReaction(message, emoji)}
                          className={isSender ? "justify-end -mt-2 mr-1 relative z-10" : "justify-start -mt-2 ml-1 relative z-10"}
                        />
                      )}
                    </div>
                  )}

                  {/* Hover action toolbar for receiver — floats beside bubble */}
                  {!isSender && !isDeleted && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#242D2D] rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50 shadow-sm px-1 py-0.5 flex-shrink-0 mb-0.5 pointer-events-none group-hover:pointer-events-auto">
                      <MessageReactionPicker
                        onSelectEmoji={(emoji) => onToggleReaction && onToggleReaction(message, emoji)}
                        align="left"
                      />
                      {!isImageOrFileMessage(message) && (
                        <div className="group/tip relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.blur()
                              onToggleStar(message)
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
                            onForwardMessage && onForwardMessage(message, {
                              sourceType: "DIRECT",
                              sourceName: activeSelectedUser?.username || "Direct Message",
                              sourceId: (activeSelectedUser?.id || activeSelectedUser?._id || "")?.toString(),
                              otherUserId: (activeSelectedUser?.id || activeSelectedUser?._id || "")?.toString(),
                            })
                          }}
                          aria-label="Forward message"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] dark:hover:text-white hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525] transition-colors"
                        >
                          <i className="fa-solid fa-share text-[10px]" />
                        </button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
                          Forward
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sender Avatar (right side) */}
                  {isSender && (
                    <div className="flex-shrink-0 mb-0.5">
                      <Avatar
                        username={user?.username || "You"}
                        avatar={user?.avatar || user?.avatarUrl || user?.profileImage}
                        small
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[#E0E7E6] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2121] p-4 transition-colors">
        <TypingIndicator typingText={typingText} isAnyoneTyping={isAnyoneTyping} className="mb-2 px-1" />
        {isBlocked ? (
          <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-ban text-amber-500" />
              <span>You have blocked this user. Unblock them to send messages.</span>
            </div>
            {onToggleBlock && (
              <button
                type="button"
                onClick={onToggleBlock}
                className="rounded-lg bg-amber-500/20 px-3 py-1 font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition text-xs"
              >
                Unblock
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Attached file preview chip */}
            {attachedFile && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-[#F8FAFB] dark:bg-[#242D2D] px-3 py-1.5 text-xs text-[#2C3333] dark:text-[#E7F6F2] border border-[#D0DCDB] dark:border-[#395B64]/60">
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

            {/* Upload error banner */}
            {uploadError && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                <div className="flex items-center gap-1.5 truncate">
                  <i className="fa-solid fa-circle-exclamation text-rose-500 shrink-0" />
                  <span className="truncate">{uploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-rose-500 hover:text-rose-700 p-0.5"
                >
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              </div>
            )}

            <div className="relative flex items-center gap-2">
              <MentionSuggestions
                isOpen={mention.isMentionOpen}
                users={mention.filteredUsers}
                selectedIndex={mention.selectedIndex}
                onSelect={mention.selectUser}
                onHoverIndex={mention.setSelectedIndex}
              />

              <FileUpload
                buttonClassName="flex items-center justify-center h-8 w-8 rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition-colors"
                onUploadSuccess={(file) => {
                  setAttachedFile(file);
                  setUploadError(null);
                }}
                onUploadError={(err) => setUploadError(err)}
              />

              <textarea
                ref={mainTextareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onSelect={mention.handleInputSelect}
                onKeyDown={handleKeyDown}
                onBlur={handleStopTypingNow}
                placeholder="Type a message..."
                className="flex-1 resize-none rounded-lg border border-[#A5C9CA] dark:border-[#395B64] bg-white dark:bg-[#242D2D] text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#7B8B8F] dark:placeholder-[#A5C9CA]/50 px-4 py-2 text-[15px] sm:text-base focus:border-[#395B64] focus:outline-none focus:ring-2 focus:ring-[#E7F6F2] dark:focus:ring-[#395B64]/30"
                rows="2"
              />

              <EmojiPickerButton
                onEmojiSelect={handleEmojiSelect}
              />

              <button
                type="button"
                onClick={handleSendClick}
                disabled={!inputValue.trim() && !attachedFile}
                className="flex items-center gap-1.5 rounded-lg bg-[#395B64] px-3 sm:px-4 py-2 font-medium text-white transition hover:bg-[#2C3333] disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0"
              >
                <i className="fa-solid fa-paper-plane text-sm sm:text-xs" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MessageThread
