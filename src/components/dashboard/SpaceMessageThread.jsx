import { useEffect, useRef, useState, useMemo } from "react"
import { toast } from "react-toastify"
import socket, {
  joinSpace,
  leaveSpace,
  sendSpaceMessage,
  editSpaceMessage,
  deleteSpaceMessage,
  onSpaceMessageEdited,
  offSpaceMessageEdited,
  onSpaceMessageDeleted,
  offSpaceMessageDeleted,
  sendReactionSocket,
  onReactionUpdated,
  offReactionUpdated,
} from "../../services/socket"
import MessageReactionPicker from "../common/MessageReactionPicker"
import MessageReactions from "../common/MessageReactions"
import SeenAvatars from "../common/SeenAvatars"
import {
  fetchSpaceMessagesApi,
  markSpaceAsReadApi,
} from "../../services/spaceService"
import { togglePinMessageApi } from "../../services/messageService"
import { onPinnedUpdated, offPinnedUpdated } from "../../services/socket"
import FileUpload from "../common/FileUpload"
import MessageContent from "../common/MessageContent"
import DateSeparator from "../common/DateSeparator"
import { formatMessageDate, formatMessageTime, isSameDay } from "../../utils/dateUtils"
import { isImageOrFileMessage, isPureAttachmentMessage, getMessageAttachments } from "../../utils/fileUtils"
import { starMessageApi, unstarMessageApi } from "../../services/messageService"
import MentionSuggestions from "../common/MentionSuggestions"
import { useMentionInput } from "../../hooks/useMentionInput"
import AttachmentRenderer from "../common/AttachmentRenderer"
import EmojiPickerButton from "../common/EmojiPickerButton"
import ConversationPinnedDrawer from "../common/ConversationPinnedDrawer"
import SharedFilesGallery from "../common/SharedFilesGallery"
import ForwardedMessageCard from "../common/ForwardedMessageCard"
import TypingIndicator from "../common/TypingIndicator"
import useTypingIndicator from "../../hooks/useTypingIndicator"
import useMessageDraft from "../../hooks/useMessageDraft"
import StatusSelector from "../common/StatusSelector"

const AVATAR_COLORS = [
  "#00897b",
  "#395B64",
  "#4A7C88",
  "#52656A",
  "#2E6E79",
  "#3D7A52",
]
const avatarColor = (username) =>
  AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

const Avatar = ({ username = null, avatar = null, small = false }) => {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username || "User"}
        className={`rounded-full object-cover flex-shrink-0 select-none ${
          small ? "w-6 h-6" : "w-8 h-8"
        }`}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 select-none ${
        small ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"
      }`}
      style={{ backgroundColor: avatarColor(username) }}
    >
      {(username ?? "?").charAt(0).toUpperCase()}
    </div>
  )
}

const ReplyReference = ({ replyToMessage = null, isSender = false }) => {
  if (!replyToMessage) return null
  const hasAttachment = Boolean(replyToMessage.attachments?.length)
  const attachmentName = hasAttachment
    ? replyToMessage.attachments[0]?.originalName || "Attachment"
    : null
  const content = replyToMessage.isDeleted
    ? "This message was deleted"
    : replyToMessage.content || (attachmentName ? `[Attachment: ${attachmentName}]` : "Message unavailable")
  const senderName = replyToMessage.sender?.username || "User"

  return (
    <div
      className={`flex items-start gap-1.5 mb-1.5 rounded-lg border-l-[3px] border-[#00897b] dark:border-[#A5C9CA] px-2.5 py-1 text-left ${
        isSender ? "bg-black/[0.04] dark:bg-white/[0.06]" : "bg-black/[0.03] dark:bg-white/[0.05]"
      }`}
    >
      <i className="fa-solid fa-reply text-[9px] text-[#00897b] dark:text-[#A5C9CA] mt-[3px] flex-shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] font-semibold text-[#00897b] dark:text-[#A5C9CA] mr-1.5">
          {senderName}
        </span>
        <span
          className={`text-[10px] truncate block ${
            replyToMessage.isDeleted ? "italic opacity-60" : "text-gray-600 dark:text-[#A5C9CA]/80"
          }`}
        >
          {content.length > 70 ? `${content.slice(0, 70)}…` : content}
        </span>
      </div>
    </div>
  )
}

const SpaceMessageThread = ({
  space,
  currentUser,
  currentUserId,
  isSuperAdmin = false,
  onOpenManageMembers,
  onManageMembers,
  onOpenEditSpace,
  onEditSpace,
  onOpenDeleteSpace,
  onDeleteSpace,
  onForwardMessage,
  onNavigateSource,
  onMobileMenuClick,
  onOpenSidebar,
  onViewProfile,
}) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState(null)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [editingMessage, setEditingMessage] = useState(null)
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)

  const activeUserId = (currentUserId || currentUser?._id || currentUser?.id)?.toString()

  const lastReadSenderMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const isMsgSender = (msg.senderId?._id || msg.senderId)?.toString() === activeUserId;
      if (isMsgSender && msg.readBy?.length > 0 && !msg.isDeleted) {
        return (msg.id || msg._id)?.toString();
      }
    }
    return null;
  }, [messages, activeUserId]);
  const handleManageMembers = onManageMembers || onOpenManageMembers
  const handleEditSpace = onEditSpace || onOpenEditSpace
  const handleDeleteSpace = onDeleteSpace || onOpenDeleteSpace
  const handleOpenSidebar = onOpenSidebar || onMobileMenuClick
  const spaceMembers = useMemo(() => space?.members || [], [space?.members])
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false)
  const [showFilesGallery, setShowFilesGallery] = useState(false)
  const pinnedMessages = useMemo(() => messages.filter((m) => m.isPinned && !m.isDeleted), [messages])
  const filesCount = useMemo(() => {
    return messages.reduce((acc, msg) => {
      if (msg.isDeleted) return acc;
      const atts = getMessageAttachments(msg);
      return acc + (atts?.length || 0);
    }, 0);
  }, [messages])

  const handleJumpToMessage = (messageId) => {
    const el = document.getElementById(`msg-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })




    }
  }

  // Mention input restricted strictly to Space members only
  const mention = useMentionInput({
    members: spaceMembers,
    currentUserId: activeUserId,
    includeAll: false,
    channelMembers: spaceMembers,
  })

  const sId = (space?.id || space?._id)?.toString()
  const { typingText, isAnyoneTyping, handleKeystroke, handleStopTypingNow } = useTypingIndicator({
    type: "space",
    targetId: sId,
    currentUserId: activeUserId,
  })

  const { saveDraft, clearDraft } = useMessageDraft({
    conversationType: "space",
    conversationId: sId,
    currentUserId: activeUserId,
    onDraftLoaded: (saved) => mention.setValue(saved),
  })

  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Load space messages and join socket room
  useEffect(() => {
    if (!space?._id && !space?.id) return
    const sId = (space._id || space.id).toString()

    setLoading(true)
    fetchSpaceMessagesApi(sId)
      .then((data) => {
        setMessages(data.messages || [])
        markSpaceAsReadApi(sId).catch(() => {})
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load space messages")
      })
      .finally(() => {
        setLoading(false)
      })

    joinSpace(sId)

    return () => {
      leaveSpace(sId)
    }
  }, [space?._id, space?.id])

  // Socket event listeners for real-time messages
  useEffect(() => {
    const sId = (space?._id || space?.id)?.toString()
    if (!sId) return

    const handleReceiveMessage = (msg) => {
      if (msg.spaceId?.toString() === sId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id?.toString() === msg.id?.toString())) return prev
          return [...prev, msg]
        })
        markSpaceAsReadApi(sId).catch(() => {})
        setTimeout(scrollToBottom, 50)
      }
    }

    const handleMessageSent = (msg) => {
      if (msg.spaceId?.toString() === sId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id?.toString() === msg.id?.toString())) return prev
          return [...prev, msg]
        })
        setTimeout(scrollToBottom, 50)
      }
    }

    const handleMessageEdited = (msg) => {
      if (msg.spaceId?.toString() === sId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id?.toString() === msg.id?.toString()
              ? { ...m, content: msg.content, isEdited: true, mentions: msg.mentions }
              : m
          )
        )
      }
    }

    const handleMessageDeleted = ({ id }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id?.toString() === id?.toString()
            ? { ...m, isDeleted: true, content: null, attachments: [] }
            : m
        )
      )
    }

    const handleReaction = (payload) => {
      if (
        payload?.conversationType !== "space" ||
        payload?.spaceId?.toString() !== sId
      )
        return
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id)?.toString() === payload.messageId?.toString()
            ? { ...m, reactions: payload.reactions }
            : m
        )
      )
    }

    socket.on("receive-space-message", handleReceiveMessage)
    socket.on("space-message-sent", handleMessageSent)
    onSpaceMessageEdited(handleMessageEdited)
    onSpaceMessageDeleted(handleMessageDeleted)
    onReactionUpdated(handleReaction)
    const handleSpaceMessagesRead = (payload) => {
      if (payload.spaceId?.toString() === sId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId?.toString() === payload.user?.userId?.toString()) return m;
            const alreadyRead = (m.readBy || []).some(
              (r) => r.userId?.toString() === payload.user?.userId?.toString()
            );
            if (alreadyRead) return m;
            return {
              ...m,
              readBy: [...(m.readBy || []), payload.user],
            };
          })
        );
      }
    };
    socket.on("space-messages-read", handleSpaceMessagesRead)
    const handlePinnedUpdated = (payload) => {
      if (payload.conversationType !== "space" || payload.spaceId?.toString() !== sId) return;
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id)?.toString() === payload.messageId?.toString()
            ? { ...m, isPinned: payload.isPinned, pinnedBy: payload.pinnedBy, pinnedAt: payload.pinnedAt }
            : m
        )
      );
    };
    onPinnedUpdated(handlePinnedUpdated);

    return () => {
      socket.off("receive-space-message", handleReceiveMessage)
      socket.off("space-message-sent", handleMessageSent)
      offSpaceMessageEdited(handleMessageEdited)
      offSpaceMessageDeleted(handleMessageDeleted)
      offReactionUpdated(handleReaction)
      socket.off("space-messages-read", handleSpaceMessagesRead)
      offPinnedUpdated(handlePinnedUpdated)
    }
  }, [space?._id, space?.id])

  useEffect(() => {
    if (!loading) {
      scrollToBottom()
    }
  }, [loading])

  const handleSendMessage = () => {
    const sId = (space?._id || space?.id)?.toString()
    if (!sId) return
    const content = mention.value.trim()
    if (!content && attachedFiles.length === 0) return

    handleStopTypingNow()
    const mentionIds = mention.getMentionedUserIds()

    if (editingMessage) {
      editSpaceMessage(editingMessage.id || editingMessage._id, content, mentionIds)
      setEditingMessage(null)
    } else {
      sendSpaceMessage(
        sId,
        content,
        replyingTo ? replyingTo.id || replyingTo._id : null,
        attachedFiles,
        mentionIds
      )
    }

    mention.reset()
    setAttachedFiles([])
    setReplyingTo(null)
    clearDraft()
  }

  const handleKeyDown = (e) => {
    if (mention.handleKeyDown(e)) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    if (e.key === "Escape") {
      setReplyingTo(null)
      setEditingMessage(null)
    }
  }

  const handleEmojiSelect = (emoji) => {
    const el = textareaRef.current
    if (!el) {
      const updated = (mention.value || "") + emoji
      mention.setValue(updated)
      handleKeystroke(updated)
      return
    }
    const start = el.selectionStart ?? mention.value.length
    const end = el.selectionEnd ?? mention.value.length
    const text = mention.value || ""
    const updated = text.substring(0, start) + emoji + text.substring(end)
    mention.handleChange(updated, start + emoji.length)
    handleKeystroke(updated)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  const handleTogglePin = async (message) => {
    const msgId = (message.id || message._id)?.toString();
    if (!msgId) return;

    setMessages((prev) =>
      prev.map((m) =>
        (m.id || m._id)?.toString() === msgId
          ? { ...m, isPinned: !m.isPinned }
          : m
      )
    );

    try {
      const res = await togglePinMessageApi(msgId);
      toast.success(res.isPinned ? "Message pinned" : "Message unpinned");
    } catch {
      toast.error("Failed to update pin status");
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id)?.toString() === msgId
            ? { ...m, isPinned: message.isPinned }
            : m
        )
      );
    }
  };

  const handleToggleStar = async (message) => {
    try {
      const msgId = (message.id || message._id)?.toString()
      if (!msgId) return
      const isCurrentlyStarred = Boolean(message.isStarred)
      const nextStarred = !isCurrentlyStarred

      // Optimistic UI update
      setMessages((prev) =>
        prev.map((m) =>
          ((m.id || m._id)?.toString() === msgId) ? { ...m, isStarred: nextStarred } : m
        )
      )

      if (isCurrentlyStarred) {
        await unstarMessageApi(msgId)
        toast.success("Message unstarred")
      } else {
        await starMessageApi(msgId, "CHANNEL")
        toast.success("Message starred")
      }
    } catch (err) {
      console.error("Failed to toggle star:", err)
      toast.error(err.message || "Failed to update star")
      // Revert on failure
      const msgId = (message.id || message._id)?.toString()
      if (msgId) {
        setMessages((prev) =>
          prev.map((m) =>
            ((m.id || m._id)?.toString() === msgId) ? { ...m, isStarred: Boolean(message.isStarred) } : m
          )
        )
      }
    }
  }

  const handleDeleteMessage = (message) => {
    const msgId = message.id || message._id
    deleteSpaceMessage(msgId)
  }

  const handleToggleReaction = (message, emoji) => {
    const msgId = (message.id || message._id)?.toString()
    const spaceId = (space?.id || space?._id)?.toString()
    if (!msgId || !spaceId) return

    const myId = (currentUser?.id || currentUser?._id)?.toString()
    const myName = currentUser?.username || "You"

    setMessages((prev) =>
      prev.map((m) => {
        if ((m.id || m._id)?.toString() !== msgId) return m
        const reactions = (m.reactions || []).map((r) => ({
          ...r,
          users: [...r.users],
        }))

        let previousEmoji = null
        for (const group of reactions) {
          const uIdx = group.users.findIndex(
            (u) => (u.userId?._id || u.userId)?.toString() === myId
          )
          if (uIdx !== -1) {
            previousEmoji = group.emoji
            group.users.splice(uIdx, 1)
            break
          }
        }

        if (previousEmoji !== emoji) {
          const targetGroup = reactions.find((r) => r.emoji === emoji)
          if (targetGroup) {
            targetGroup.users.push({ userId: myId, username: myName })
          } else {
            reactions.push({
              emoji,
              users: [{ userId: myId, username: myName }],
            })
          }
        }

        const filtered = reactions.filter((r) => r.users && r.users.length > 0)
        return { ...m, reactions: filtered }
      })
    )

    sendReactionSocket({
      messageId: msgId,
      conversationType: "space",
      conversationId: spaceId,
      emoji,
    })
  }

  return (
    <div className="flex min-w-0 flex-1 w-full h-full flex-col bg-white dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2] transition-colors">
      {/* ── Space Header ─────────────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-[#2C3333] px-3.5 sm:px-6 bg-white dark:bg-[#1A2121] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {handleOpenSidebar && (
            <button
              type="button"
              onClick={handleOpenSidebar}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-[#A5C9CA] hover:bg-gray-100 dark:hover:bg-[#2C3333]"
            >
              <i className="fa-solid fa-bars text-sm" />
            </button>
          )}
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00897b]/10 dark:bg-[#395B64] text-[#00897b] dark:text-white flex-shrink-0 shadow-xs">
            <i className="fa-solid fa-table-cells-large text-sm" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                #{space?.name || "Space"}
              </h1>
              <span className="rounded-md bg-teal-50 dark:bg-[#395B64]/30 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-[#A5C9CA] border border-teal-200/50 dark:border-[#395B64]/50">
                Space
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#A5C9CA]">
              <button
                type="button"
                onClick={handleManageMembers}
                className="hover:underline flex items-center gap-1 cursor-pointer"
              >
                <i className="fa-solid fa-users text-[10px]" />
                <span>{spaceMembers.length} {spaceMembers.length === 1 ? "member" : "members"}</span>
              </button>
              {space?.description && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-[200px] sm:max-w-xs">{space.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Space Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusSelector align="right" />
          <button
            type="button"
            onClick={handleManageMembers}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#242D2D] px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#395B64]/40 transition shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-users text-xs text-[#00897b] dark:text-[#A5C9CA]" />
            <span className="hidden sm:inline">Members</span>
          </button>

          {/* Pinned Messages Button */}
          <button
            type="button"
            onClick={() => setShowPinnedDrawer(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-xs cursor-pointer ${
              showPinnedDrawer
                ? "border-[#00897b] bg-teal-50 dark:bg-[#395B64]/40 text-[#00897b] dark:text-[#A5C9CA]"
                : "border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#242D2D] text-gray-700 dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#395B64]/40"
            }`}
            title="Pinned messages in this Space"
          >
            <i className="fa-solid fa-thumbtack text-xs" />
            <span className="hidden sm:inline">Pinned</span>
            {pinnedMessages.length > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gray-200 dark:bg-[#395B64]/50 text-gray-700 dark:text-[#A5C9CA] px-1 text-[10px] font-bold">
                {pinnedMessages.length}
              </span>
            )}
          </button>

          {/* Shared Files Gallery Button */}
          <button
            type="button"
            onClick={() => setShowFilesGallery((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-xs cursor-pointer ${
              showFilesGallery
                ? "border-[#00897b] bg-teal-50 dark:bg-[#395B64]/40 text-[#00897b] dark:text-[#A5C9CA]"
                : "border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#242D2D] text-gray-700 dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#395B64]/40"
            }`}
            title="Shared files in this Space"
          >
            <i className="fa-solid fa-folder-open text-xs text-[#00897b] dark:text-[#A5C9CA]" />
            <span className="hidden sm:inline">Files</span>
            {filesCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-100 dark:bg-[#395B64]/60 text-[#00897b] dark:text-teal-200 px-1 text-[10px] font-bold">
                {filesCount}
              </span>
            )}
          </button>

          {isSuperAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettingsDropdown((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#242D2D] text-gray-700 dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#395B64]/40 transition shadow-xs cursor-pointer"
                title="Space settings"
              >
                <i className="fa-solid fa-gear text-xs" />
              </button>

              {showSettingsDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowSettingsDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#1E2525] p-1.5 shadow-xl text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsDropdown(false)
                        handleEditSpace()
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#395B64]/40 transition cursor-pointer"
                    >
                      <i className="fa-solid fa-pen-to-square text-xs text-gray-500 dark:text-[#A5C9CA]" />
                      <span>Edit Space</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsDropdown(false)
                        handleManageMembers()
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#395B64]/40 transition cursor-pointer"
                    >
                      <i className="fa-solid fa-user-plus text-xs text-gray-500 dark:text-[#A5C9CA]" />
                      <span>Manage Members</span>
                    </button>
                    <div className="my-1 border-t border-gray-100 dark:border-[#2C3333]" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsDropdown(false)
                        handleDeleteSpace()
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <i className="fa-solid fa-trash-can text-xs text-rose-500" />
                      <span>Delete Space</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Message Thread Area ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-[#A5C9CA]">
            <i className="fa-solid fa-circle-notch fa-spin text-xl text-[#00897b] mb-2" />
            <span className="text-sm">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center text-gray-500 dark:text-[#A5C9CA]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00897b]/10 dark:bg-[#395B64]/20 text-2xl text-[#00897b] dark:text-[#A5C9CA] mb-3">
              <i className="fa-regular fa-comments" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              No messages yet
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-[#A5C9CA]/80">
              Be the first to say something in #{space?.name}.
            </p>
          </div>
        ) : (
          messages.map((message, idx) => {
            const prevMessage = idx > 0 ? messages[idx - 1] : null
            const showDate = !prevMessage || !isSameDay(message.createdAt, prevMessage.createdAt)
            const senderId = (message.senderId?._id || message.senderId || message.sender?.id)?.toString()
            const isSender = Boolean(senderId && activeUserId && senderId === activeUserId)
            const isDeleted = message.isDeleted === true
            const attachments = getMessageAttachments(message)
            const isImageOrFile = isImageOrFileMessage(message)
            const isPureAttachment = !isDeleted && isPureAttachmentMessage(message)

            const username = isSender
              ? currentUser?.username || "You"
              : message.sender?.username || "User"
            const avatar = isSender ? currentUser?.avatar : message.sender?.avatar

            return (
              <div key={message.id || message._id || idx}>
                {showDate && <DateSeparator date={message.createdAt} />}
                <div
                  id={`msg-${(message.id || message._id)?.toString()}`}
                  className={`group flex items-end gap-2 px-2 sm:px-4 py-1 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isSender && (
                    <div className="flex-shrink-0 mb-0.5">
                      <button type="button" onClick={() => onViewProfile && onViewProfile(message.sender || { _id: senderId, id: senderId, username, avatar })} className="hover:opacity-85 transition-opacity cursor-pointer focus:outline-none"><Avatar username={username} avatar={avatar} /></button>

                    </div>
                  )}

                  {/* Actions toolbar on hover for sender */}
                  {isSender && !isDeleted && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#242D2D] rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50 shadow-sm px-1 py-0.5 flex-shrink-0 mb-0.5 pointer-events-none group-hover:pointer-events-auto">
                      {!isImageOrFile && (
                        <div className="group/tip relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.blur()
                              handleToggleStar(message)
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
                      {/* Pin button */}
                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(message)}
                          aria-label={message.isPinned ? "Unpin message" : "Pin message"}
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                            message.isPinned
                              ? "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40"
                              : "text-[#52656A] dark:text-[#A5C9CA] hover:text-teal-600 dark:hover:text-teal-400 hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525]"
                          }`}
                        >
                          <i className="fa-solid fa-thumbtack text-[10px]" />
                        </button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
                          {message.isPinned ? "Unpin" : "Pin"}
                        </span>
                      </div>

                      <MessageReactionPicker
                        onSelectEmoji={(emoji) => handleToggleReaction(message, emoji)}
                        align="right"
                      />

                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.blur()
                            setReplyingTo(message)
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

                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.blur()
                            onForwardMessage &&
                              onForwardMessage(message, {
                                sourceType: "SPACE",
                                sourceName: space?.name || "",
                                sourceId: (space?.id || space?._id)?.toString(),
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

                      {!isImageOrFile && (
                        <>
                          <button className="w-px h-3.5 bg-[#E0E7E6] dark:bg-[#395B64]/40 mx-0.5" />
                          <div className="group/tip relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.currentTarget.blur()
                                setEditingMessage(message)
                                mention.setValue(message.content || "")
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
                            handleDeleteMessage(message)
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

                  {/* Message Bubble or Deleted message indicator */}
                  {isDeleted ? (
                    <div className="rounded-2xl px-3.5 py-2 border border-dashed border-[#D0DCDB] dark:border-[#395B64]/40 bg-[#F8FAFB] dark:bg-[#1E2525]">
                      <p className="text-sm italic text-[#52656A] dark:text-[#A5C9CA]/60 opacity-50">
                        This message was deleted
                      </p>
                    </div>
                  ) : (
                    <div className={`flex flex-col ${isSender ? "items-end" : "items-start"} max-w-[78%] sm:max-w-[65%]`}>{/*

                      <button
*/} <div
                        className={`w-fit max-w-full text-sm ${
                          isPureAttachment
                            ? "bg-transparent border-0 shadow-none px-0 py-0"
                            : `rounded-2xl px-3.5 py-2 shadow-xs ${
                                isSender
                                  ? "bg-[#E7F6F2] dark:bg-[#1E2E30] text-[#2C3333] dark:text-[#E7F6F2] border border-[#A5C9CA]/50 dark:border-[#395B64]/50 rounded-br-xs"
                                  : "bg-[#F4F7F6] dark:bg-[#202727] text-[#2C3333] dark:text-[#E7F6F2] border border-[#E0E7E6] dark:border-[#2C3535] rounded-bl-xs"
                              }`
                        }`}
                      >
                        {!isSender && username && (
                          <button type="button" onClick={() => onViewProfile && onViewProfile(message.sender || { _id: senderId, id: senderId, username, avatar })} className="text-xs font-bold text-[#00897b] dark:text-[#A5C9CA] leading-tight mb-0.5 select-none hover:underline cursor-pointer text-left focus:outline-none">
                            {username}
                          </button>


                        )}

                        {message.replyToMessage && (
                          <ReplyReference replyToMessage={message.replyToMessage} isSender={isSender} />
                        )}

                        {message.forwardedFrom && (
                          <ForwardedMessageCard
                            forwardedFrom={message.forwardedFrom}
                            isSender={isSender}
                            onNavigateSource={onNavigateSource}
                            timestamp={formatMessageTime(message.createdAt)}
                            isEdited={message.isEdited && !isDeleted}
                            isStarred={message.isStarred && !isDeleted && !isImageOrFile}
                            onToggleStar={() => handleToggleStar(message)}
                          />
                        )}

                        <MessageContent
                          content={message.content}
                          attachments={
                            message.attachments?.length
                              ? message.attachments
                              : attachments
                          }
                          mentions={message.mentions || []}
                          currentUserId={activeUserId}
                          isSender={isSender}
                          isPure={isPureAttachment}
                          className="text-sm leading-relaxed break-words"
                        />

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
                            {message.isStarred && !isDeleted && !isImageOrFile && (
                              <button
                                type="button"
                                onClick={() => handleToggleStar(message)}
                                title="Starred message (click to unstar)"
                                className="text-emerald-500 hover:text-emerald-600 transition-colors p-0.5"
                              >
                                <i className="fa-solid fa-star text-[9px]" />
                              </button>
                            )}
                            {message.isPinned && !isDeleted && (
                              <button
                                type="button"
                                onClick={() => handleTogglePin(message)}
                                title="Pinned message (click to unpin)"
                                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 transition-colors p-0.5"
                              >
                                <i className="fa-solid fa-thumbtack text-[9px]" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {!isDeleted && (
                        <MessageReactions
                          reactions={message.reactions || []}
                          currentUserId={activeUserId}
                          onToggleReaction={(emoji) => handleToggleReaction(message, emoji)}
                          className={isSender ? "justify-end -mt-2 mr-1 relative z-10" : "justify-start -mt-2 ml-1 relative z-10"}
                        />
                      )}
                      {isSender && message.readBy?.length > 0 && (
                        <SeenAvatars readBy={message.readBy} className="justify-end mt-1 mr-1" />
                      )}
                    </div>
                  )}

                  {/* Actions toolbar on hover for recipient */}
                  {!isSender && !isDeleted && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#242D2D] rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50 shadow-sm px-1 py-0.5 flex-shrink-0 mb-0.5 pointer-events-none group-hover:pointer-events-auto">
                      {!isImageOrFile && (
                        <div className="group/tip relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.blur()
                              handleToggleStar(message)
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
                      {/* Pin button */}
                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(message)}
                          aria-label={message.isPinned ? "Unpin message" : "Pin message"}
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                            message.isPinned
                              ? "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40"
                              : "text-[#52656A] dark:text-[#A5C9CA] hover:text-teal-600 dark:hover:text-teal-400 hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525]"
                          }`}
                        >
                          <i className="fa-solid fa-thumbtack text-[10px]" />
                        </button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10 hidden sm:block">
                          {message.isPinned ? "Unpin" : "Pin"}
                        </span>
                      </div>

                      <MessageReactionPicker
                        onSelectEmoji={(emoji) => handleToggleReaction(message, emoji)}
                        align="left"
                      />

                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.blur()
                            setReplyingTo(message)
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

                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget.blur()
                            onForwardMessage &&
                              onForwardMessage(message, {
                                sourceType: "SPACE",
                                sourceName: space?.name || "",
                                sourceId: (space?.id || space?._id)?.toString(),
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

                      {/* Super Admin can delete any message in the space */}
                      {/* Shared Files Gallery Button */}
          <button
            type="button"
            onClick={() => setShowFilesGallery((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-xs cursor-pointer ${
              showFilesGallery
                ? "border-[#00897b] bg-teal-50 dark:bg-[#395B64]/40 text-[#00897b] dark:text-[#A5C9CA]"
                : "border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#242D2D] text-gray-700 dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#395B64]/40"
            }`}
            title="Shared files in this Space"
          >
            <i className="fa-solid fa-folder-open text-xs text-[#00897b] dark:text-[#A5C9CA]" />
            <span className="hidden sm:inline">Files</span>
            {filesCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-100 dark:bg-[#395B64]/60 text-[#00897b] dark:text-teal-200 px-1 text-[10px] font-bold">
                {filesCount}
              </span>
            )}
          </button>

          {isSuperAdmin && (
                        <>
                          <button className="w-px h-3.5 bg-[#E0E7E6] dark:bg-[#395B64]/40 mx-0.5" />
                          <div className="group/tip relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.currentTarget.blur()
                                handleDeleteMessage(message)
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
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Reply context strip ───────────────────────────────────────── */}
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-gray-50 dark:bg-[#161B1B] border-t border-gray-200 dark:border-[#2C3333] text-xs">
          <div className="flex items-center gap-2 truncate">
            <i className="fa-solid fa-reply text-[#00897b] dark:text-[#A5C9CA]" />
            <span className="text-gray-500 dark:text-[#A5C9CA]">Replying to</span>
            <strong className="text-gray-900 dark:text-white truncate">
              {replyingTo.sender?.username || "User"}
            </strong>
            <span className="text-gray-500 dark:text-[#A5C9CA]/70 truncate max-w-xs">
              : {replyingTo.content || "Attachment"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>
      )}

      {/* ── Editing context strip ──────────────────────────────────────── */}
      {editingMessage && (
        <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-[#00897b]/10 dark:bg-[#395B64]/20 border-t border-[#00897b]/30 text-xs text-gray-800 dark:text-white">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-pen text-xs text-[#00897b] dark:text-[#A5C9CA]" />
            <span className="font-medium">Editing message</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null)
              mention.reset()
            }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-white text-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Attachment chips ─────────────────────────────────────────── */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-200 dark:border-[#2C3333] bg-gray-50 dark:bg-[#1E2525]">
          {attachedFiles.map((f, i) => (
            <div
              key={f.id || i}
              className="flex items-center gap-2 rounded-lg bg-teal-50 dark:bg-[#395B64]/30 px-2.5 py-1 text-xs text-teal-900 dark:text-[#E7F6F2] border border-teal-200 dark:border-[#395B64]"
            >
              <i className="fa-solid fa-paperclip text-[#00897b] dark:text-[#A5C9CA]" />
              <span className="truncate max-w-[150px]">{f.originalName}</span>
              <button
                type="button"
                onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-rose-500 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Message Composer ─────────────────────────────────────────── */}
      <div className="relative border-t border-gray-200 dark:border-[#2C3333] p-3 sm:p-4 bg-white dark:bg-[#1A2121]">
        <TypingIndicator typingText={typingText} isAnyoneTyping={isAnyoneTyping} className="mb-2 px-1" />

        <MentionSuggestions
          isOpen={mention.isOpen}
          users={mention.filteredUsers}
          activeIndex={mention.activeIndex}
          onSelect={(user) => mention.selectUser(user, textareaRef.current)}
          positionClass="bottom-full mb-2 left-4 right-4"
        />

        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#242D2D] px-3 py-2 focus-within:border-[#00897b] dark:focus-within:border-[#A5C9CA] focus-within:bg-white dark:focus-within:bg-[#242D2D] shadow-xs transition">
          <FileUpload
            buttonClassName="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 dark:text-[#A5C9CA] hover:bg-gray-100 dark:hover:bg-[#395B64]/50 transition cursor-pointer"
            iconClassName="text-sm"
            onUploadSuccess={(file) => setAttachedFiles((prev) => [...prev, file])}
            onUploadError={(err) => toast.error(err)}
          />

          <textarea
            ref={textareaRef}
            rows={1}
            value={mention.value}
            onChange={(e) => {
              mention.handleChange(e.target.value, e.target.selectionStart)
              handleKeystroke(e.target.value)
              saveDraft(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleStopTypingNow}
            placeholder={`Message #${space?.name || "Space"}...`}
            className="flex-1 max-h-32 resize-none bg-transparent py-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 outline-none"
          />

          <EmojiPickerButton
            buttonClassName="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 dark:text-[#A5C9CA] hover:bg-gray-100 dark:hover:bg-[#395B64]/50 transition cursor-pointer"
            onEmojiSelect={handleEmojiSelect}
          />

          {/* Pinned Messages Drawer for Space */}
          <ConversationPinnedDrawer
            isOpen={showPinnedDrawer}
            onClose={() => setShowPinnedDrawer(false)}
            pinnedMessages={pinnedMessages}
            onTogglePin={handleTogglePin}
            onJumpToMessage={handleJumpToMessage}
            conversationTitle={space?.name || "Space"}
            conversationType="space"
          />

          {/* Shared Files Gallery Drawer for Space */}
          <SharedFilesGallery
            isOpen={showFilesGallery}
            onClose={() => setShowFilesGallery(false)}
            messages={messages}
            conversationTitle={space?.name || "Space"}
            conversationType="space"
            onJumpToMessage={handleJumpToMessage}
          />

          <button
            type="button"
            disabled={!mention.value.trim() && attachedFiles.length === 0}
            onClick={handleSendMessage}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00897b] text-white hover:bg-[#00796b] disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-paper-plane text-xs" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default SpaceMessageThread
