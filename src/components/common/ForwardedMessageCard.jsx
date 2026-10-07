import { useMemo } from "react"
import { AttachmentItem } from "./AttachmentRenderer"
import { useWorkspace } from "../../context/WorkspaceContext"

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

const ForwardedMessageCard = ({
  forwardedFrom = null,
  isSender = false,
  onNavigateSource = null,
  timestamp = null,
  isEdited = false,
  isStarred = false,
  onToggleStar = null,
}) => {
  const { workspaceData } = useWorkspace()

  if (!forwardedFrom) return null

  const {
    senderName = "",
    senderAvatar = null,
    originalContent = "",
    originalAttachments = [],
    originalCreatedAt = null,
    sourceType = "",
    sourceName = "",
    sourceId = "",
  } = forwardedFrom

  const origSenderId = (
    forwardedFrom.senderId?._id ||
    forwardedFrom.senderId ||
    ""
  )?.toString()

  const resolvedMember = useMemo(() => {
    if (!origSenderId) return null
    return (workspaceData?.members || []).find(
      (m) => (m.id || m._id)?.toString() === origSenderId
    )
  }, [workspaceData?.members, origSenderId])

  const resolvedSenderName =
    (senderName && senderName !== "User" && senderName !== "Unknown")
      ? senderName
      : (resolvedMember?.username || resolvedMember?.displayName || senderName || "User")

  const resolvedSenderAvatar =
    senderAvatar ||
    resolvedMember?.avatar ||
    resolvedMember?.avatarUrl ||
    null

  const isClickable = Boolean(onNavigateSource)

  const handleCardClick = (e) => {
    // If the click is inside interactive elements (buttons, links, inputs, media inside attachments), don't trigger navigation
    if (e.target.closest("button, a, input, select, textarea, audio, video")) {
      return
    }
    if (onNavigateSource) {
      e.stopPropagation()
      onNavigateSource(forwardedFrom)
    }
  }

  const destinationLabel =
    sourceType === "CHANNEL"
      ? `#${sourceName || "channel"}`
      : (sourceName || "chat")

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-xl border border-[#D0DCDB] dark:border-[#2C3333] bg-white dark:bg-[#1A2222] px-3 py-2 text-left transition-all select-text shadow-xs ${
        isClickable
          ? "cursor-pointer hover:border-[#395B64] dark:hover:border-[#A5C9CA] hover:bg-[#F9FCFC] dark:hover:bg-[#202828]"
          : ""
      }`}
      title={isClickable ? `Go to ${destinationLabel}` : undefined}
    >
      {/* Top Header — source info */}
      {sourceName && (
        <div className="flex items-center gap-1 mb-1 text-[11px] text-[#52656A] dark:text-[#A5C9CA]/80">
          <i className="fa-solid fa-share text-[9px] text-[#395B64] dark:text-[#A5C9CA]" />
          <span>from</span>
          <span className="font-semibold text-[#2C3333] dark:text-[#E7F6F2] truncate max-w-[220px]">
            {sourceType === "CHANNEL" ? `#${sourceName}` : sourceName}
          </span>
        </div>
      )}

      {/* Original Author */}
      <div className="flex items-center gap-1.5 mb-1">
        {resolvedSenderAvatar ? (
          <img
            src={resolvedSenderAvatar}
            alt={resolvedSenderName}
            className="w-4.5 h-4.5 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: getAvatarColor(resolvedSenderName) }}
          >
            {(resolvedSenderName || "?").charAt(0).toUpperCase()}
          </div>
        )}

        <span className="text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] leading-none">
          {resolvedSenderName}
        </span>
      </div>

      {/* Original Content */}
      {originalContent && (
        <p className="text-[13px] sm:text-sm text-[#2C3333] dark:text-[#E7F6F2] whitespace-pre-wrap leading-snug break-words pl-0.5">
          {originalContent}
        </p>
      )}

      {/* Original Attachments */}
      {Array.isArray(originalAttachments) && originalAttachments.length > 0 && (
        <div className="space-y-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
          {originalAttachments.map((att, idx) => (
            <AttachmentItem
              key={att.id || att.fileId || att.url || idx}
              attachment={att}
              isSender={isSender}
            />
          ))}
        </div>
      )}

      {/* WhatsApp-style bottom-right timestamp inside the card */}
      {timestamp && (
        <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 ml-auto text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 select-none leading-none">
          <span className="whitespace-nowrap">{timestamp}</span>
          {isEdited && (
            <span className="text-[9px] opacity-70 leading-none whitespace-nowrap">
              (edited)
            </span>
          )}
          {isStarred && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar && onToggleStar();
              }}
              title="Starred message (click to unstar)"
              className="text-emerald-500 hover:text-emerald-600 transition-colors p-0.5"
            >
              <i className="fa-solid fa-star text-[9px]" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ForwardedMessageCard
