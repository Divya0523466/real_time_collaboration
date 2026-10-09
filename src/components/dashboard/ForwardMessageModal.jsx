import { useState, useMemo, useEffect, useRef } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import { forwardMessageApi } from "../../services/messageService"
import { getMessageAttachments } from "../../utils/fileUtils"
import { toast } from "react-toastify"

const AVATAR_COLORS = [
  "#395B64",
  "#4A7C88",
  "#52656A",
  "#2E6E79",
  "#3D7A52",
  "#5B6E7C",
]
const getAvatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

const ForwardMessageModal = ({
  isOpen = false,
  onClose = () => {},
  message = null,
  sourceContext = null,
  channels = [],
  members = [],
  spaces = [],
  onForwardSuccess = () => {},
}) => {
  const { user, isUserOnline } = useWorkspace()
  const currentUserId = (user?.id || user?._id)?.toString()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTarget, setSelectedTarget] = useState(null) // { type: "CHANNEL" | "DIRECT", id: string, name: string, avatar?: string }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const searchInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("")
      setSelectedTarget(null)
      setError(null)
      setIsSubmitting(false)
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Direct message members excluding current user
  const directMessageMembers = useMemo(() => {
    return (members || []).filter(
      (m) => (m.id || m._id)?.toString() !== currentUserId
    )
  }, [members, currentUserId])

  // Unified list of all destinations (channels and DMs combined, no headings)
  const allDestinations = useMemo(() => {
    const list = []

    // 1. Channels
    ;(channels || []).forEach((ch) => {
      const chId = (ch.id || ch._id)?.toString()
      list.push({
        type: "CHANNEL",
        id: chId,
        name: ch.name || "channel",
        description: ch.description || "",
        isPrivate: ch.type === "PRIVATE" || ch.isPrivate === true,
      })
    })

    // 2. Direct message members
    directMessageMembers.forEach((m) => {
      const mId = (m.id || m._id)?.toString()
      list.push({
        type: "DIRECT",
        id: mId,
        name: m.username || m.name || m.displayName || "Member",
        avatar: m.avatar || m.avatarUrl || null,
        isOnline: isUserOnline ? isUserOnline(mId) : false,
      })
    })

    // 3. Spaces
    ;(spaces || []).forEach((sp) => {
      const spId = (sp.id || sp._id)?.toString()
      list.push({
        type: "SPACE",
        id: spId,
        name: sp.name || "Space",
        description: sp.description || "",
      })
    })

    return list
  }, [channels, directMessageMembers, spaces, isUserOnline])

  // Filtered by search query
  const filteredDestinations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allDestinations

    return allDestinations.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      )
    })
  }, [allDestinations, searchQuery])

  if (!isOpen || !message) return null

  const originalSenderId =
    message.sender?.id ||
    message.sender?._id ||
    message.senderId?._id ||
    message.senderId ||
    null

  const origSenderIdStr = originalSenderId?.toString()

  const foundOrigMember = useMemo(() => {
    if (!origSenderIdStr) return null
    return (members || []).find(
      (m) => (m.id || m._id)?.toString() === origSenderIdStr
    )
  }, [members, origSenderIdStr])

  const originalSenderName =
    message.sender?.username ||
    message.senderName ||
    message.senderUsername ||
    foundOrigMember?.username ||
    foundOrigMember?.displayName ||
    (origSenderIdStr === currentUserId ? user?.username : null) ||
    "User"

  const originalSenderAvatar =
    message.sender?.avatar ||
    message.sender?.avatarUrl ||
    message.senderAvatar ||
    foundOrigMember?.avatar ||
    foundOrigMember?.avatarUrl ||
    (origSenderIdStr === currentUserId ? user?.avatar : null) ||
    null

  const originalAttachments = getMessageAttachments(message)
  const originalContent = message.content || ""

  const handleSelectTarget = (target) => {
    setSelectedTarget(target)
    setError(null)
  }

  const handleForward = async (targetToForward = null) => {
    const target = targetToForward || selectedTarget
    if (!target) {
      setError("Please select a channel or direct message")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const forwardedFromPayload = {
        originalMessageId: message.id || message._id || null,
        senderId: originalSenderId,
        senderName: originalSenderName,
        senderAvatar: originalSenderAvatar,
        originalContent: originalContent,
        originalAttachments: originalAttachments,
        originalCreatedAt: message.createdAt || new Date(),
        sourceType: sourceContext?.sourceType || "",
        sourceName: sourceContext?.sourceName || "",
        sourceId: sourceContext?.sourceId || sourceContext?.channelId || sourceContext?.otherUserId || "",
      }

      const res = await forwardMessageApi({
        targetType: target.type,
        targetId: target.id,
        content: "",
        forwardedFrom: forwardedFromPayload,
      })

      const targetLabel =
        target.type === "CHANNEL" ? `#${target.name}` : target.name

      toast.success(`Message forwarded to ${targetLabel}`)
      onForwardSuccess({
        ...res,
        target,
      })
      onClose()
    } catch (err) {
      setError(err.message || "Failed to forward message")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose()
    }
    if (e.key === "Enter" && selectedTarget && !isSubmitting) {
      handleForward()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forward-modal-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#161C1C] rounded-2xl shadow-2xl border border-[#D0DCDB] dark:border-[#2C3333] flex flex-col max-h-[85vh] overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E7E6] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2222]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]">
              <i className="fa-solid fa-share text-xs" />
            </div>
            <div>
              <h3
                id="forward-modal-title"
                className="text-base font-semibold text-[#2C3333] dark:text-white"
              >
                Forward message
              </h3>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                Select where to forward this message
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E0E7E6] dark:hover:bg-[#2C3333] transition-colors"
            aria-label="Close dialog"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
              <i className="fa-solid fa-circle-exclamation shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Input */}
          <div className="relative mb-3 flex-shrink-0">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#52656A] dark:text-[#A5C9CA]/60 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels or people..."
              className="w-full pl-8 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-[#D0DCDB] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2222] text-[#2C3333] dark:text-[#E7F6F2] outline-none focus:border-[#395B64] dark:focus:border-[#A5C9CA] focus:ring-1 focus:ring-[#395B64] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </div>

          {/* Unified List of Channels and DMs — NO HEADINGS */}
          <div className="flex-1 overflow-y-auto border border-[#E0E7E6] dark:border-[#2C3333] rounded-xl divide-y divide-[#E0E7E6]/70 dark:divide-[#2C3333]/70 bg-white dark:bg-[#1A2222] max-h-72">
            {filteredDestinations.map((dest) => {
              const isSelected =
                selectedTarget?.type === dest.type && selectedTarget?.id === dest.id

              return (
                <button
                  key={`${dest.type}-${dest.id}`}
                  type="button"
                  onClick={() => handleSelectTarget(dest)}
                  onDoubleClick={() => handleForward(dest)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-[#E7F6F2] dark:bg-[#202E30] text-[#395B64] dark:text-[#A5C9CA]"
                      : "hover:bg-[#F8FAFB] dark:hover:bg-[#202727] text-[#2C3333] dark:text-[#E7F6F2]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {dest.type === "CHANNEL" ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-xs font-bold shrink-0">
                        {dest.isPrivate ? (
                          <i className="fa-solid fa-lock text-[10px]" />
                        ) : (
                          "#"
                        )}
                      </span>
                    ) : dest.type === "SPACE" ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00897b]/15 dark:bg-[#395B64]/30 text-[#00897b] dark:text-[#A5C9CA] text-xs font-bold shrink-0">
                        <i className="fa-solid fa-table-cells-large text-xs" />
                      </span>
                    ) : (
                      <div className="relative shrink-0">
                        {dest.avatar ? (
                          <img
                            src={dest.avatar}
                            alt={dest.name}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: getAvatarColor(dest.name) }}
                          >
                            {(dest.name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white dark:border-[#1A2222] ${
                            dest.isOnline ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                      </div>
                    )}

                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-semibold truncate block">
                        {dest.type === "CHANNEL" ? `#${dest.name}` : dest.name}
                      </span>
                      {dest.description ? (
                        <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 truncate block">
                          {dest.description}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#395B64] dark:bg-[#A5C9CA] text-white dark:text-[#161C1C] text-[10px]">
                      <i className="fa-solid fa-check" />
                    </span>
                  ) : (
                    <i className="fa-solid fa-chevron-right text-[10px] text-[#52656A]/40 dark:text-[#A5C9CA]/30" />
                  )}
                </button>
              )
            })}

            {filteredDestinations.length === 0 && (
              <div className="py-8 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]/70">
                No channels or people found
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#E0E7E6] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2222]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E0E7E6] dark:hover:bg-[#2C3333] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleForward()}
            disabled={!selectedTarget || isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-[#395B64] hover:bg-[#2C3333] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                <span>Forwarding...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-share text-xs" />
                <span>Forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ForwardMessageModal
