import { useState, useEffect, useRef } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import FileUpload from "../common/FileUpload"
import MessageContent from "../common/MessageContent"
import DateSeparator from "../common/DateSeparator"
import { formatMessageDate, formatMessageTime, isSameDay } from "../../utils/dateUtils"

/** Detect if content is an uploaded image or file (disable editing) */
const isImageOrFileMessage = (content) => {
  if (!content) return false
  const lower = content.toLowerCase()
  return (
    lower.includes("res.cloudinary.com") ||
    lower.match(/\.(jpeg|jpg|gif|png|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt)(\?.*)?$/i) !== null
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
  currentUserId = null,
}) => {
  const { isUserOnline } = useWorkspace()
  const [inputValue, setInputValue] = useState("")
  const [attachedFile, setAttachedFile] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  // editingState: { messageId: string, draftContent: string } | null
  const [editingState, setEditingState] = useState(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendClick = () => {
    const text = inputValue.trim()
    if (!text && !attachedFile) return

    let content = text
    if (attachedFile) {
      content = text ? `${text}\n${attachedFile.url}` : attachedFile.url
    }

    onSendMessage(content)
    setInputValue("")
    setAttachedFile(null)
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendClick()
    }
  }

  const startEdit = (message) => {
    setEditingState({ messageId: message.id?.toString(), draftContent: message.content || "" })
  }

  const cancelEdit = () => setEditingState(null)

  const submitEdit = () => {
    if (!editingState?.draftContent?.trim()) return
    onEditMessage(editingState.messageId, editingState.draftContent.trim())
    setEditingState(null)
  }

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <i className="fa-solid fa-message text-4xl" />
          </div>
          <p className="text-gray-500">Select a user to start messaging</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E0E7E6] bg-[#F8FAFB] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#395B64] text-sm font-bold text-white shadow-xs">
              {selectedUser.username?.charAt(0)?.toUpperCase() || "U"}
            </span>
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white ${
                isUserOnline(selectedUser.id) ? "bg-emerald-500" : "bg-gray-300"
              }`}
              title={isUserOnline(selectedUser.id) ? "Online" : "Offline"}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[#2C3333]">
                {selectedUser.username || "User"}
              </h3>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                  isUserOnline(selectedUser.id)
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isUserOnline(selectedUser.id) ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
                {isUserOnline(selectedUser.id) ? "Online" : "Offline"}
              </span>
            </div>
            <p className="text-xs text-[#52656A]">{selectedUser.email || ""}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {error && (
          <div className="rounded border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#52656A]">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#52656A]">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isSender = message.senderId?.toString() === currentUserId?.toString()
            const isDeleted = message.isDeleted === true
            const isBeingEdited = editingState?.messageId === message.id?.toString()

            const prevMessage = index > 0 ? messages[index - 1] : null
            const showDateSeparator = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt)
            const dateLabel = showDateSeparator ? formatMessageDate(message.createdAt) : null

            return (
              <div key={message.id}>
                {showDateSeparator && dateLabel && (
                  <DateSeparator label={dateLabel} />
                )}
                <div
                  className={`group flex items-end gap-1.5 ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Hover action toolbar for sender — floats beside bubble */}
                  {isSender && !isDeleted && !isBeingEdited && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg border border-[#E0E7E6] shadow-sm px-1 py-0.5 flex-shrink-0 mb-1">
                      {!isImageOrFileMessage(message.content) && (
                        <div className="group/tip relative">
                          <button
                            type="button"
                            onClick={() => startEdit(message)}
                            aria-label="Edit message"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] hover:text-[#395B64] hover:bg-[#E7F6F2] transition-colors"
                          >
                            <i className="fa-solid fa-pen text-[10px]" />
                          </button>
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10">
                            Edit
                          </span>
                        </div>
                      )}
                      <div className="group/tip relative">
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(message.id?.toString())}
                          aria-label="Delete message"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <i className="fa-solid fa-trash text-[10px]" />
                        </button>
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#2C3333] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/tip:opacity-100 z-10">
                          Delete
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message bubble / Edit box / Deleted indicator */}
                  {isBeingEdited ? (
                    <div className="w-full sm:w-[380px] max-w-full">
                      <textarea
                        className="w-full text-sm text-[#2C3333] bg-white border border-[#A5C9CA] rounded-lg px-3 py-2 outline-none focus:border-[#395B64] focus:ring-1 focus:ring-[#E7F6F2] resize-none transition-colors leading-relaxed shadow-xs"
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
                    <div className="rounded-lg px-3 py-1.5 border border-dashed border-[#D0DCDB] bg-[#F8FAFB]">
                      <p className="text-sm italic text-[#52656A] opacity-50">This message was deleted</p>
                    </div>
                  ) : (
                    <div
                      className={`rounded-lg px-3 py-1.5 max-w-xs sm:max-w-md ${
                        isSender
                          ? "bg-[#395B64] text-white"
                          : "bg-[#F1F5F4] text-[#2C3333]"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <MessageContent content={message.content} isSender={isSender} />
                        <p
                          className={`shrink-0 text-[10px] leading-4 ${
                            isSender ? "text-[#A5C9CA]" : "text-[#52656A]"
                          }`}
                        >
                          {formatMessageTime(message.createdAt)}
                          {message.isEdited && !isDeleted && (
                            <span className="ml-1 opacity-60">(edited)</span>
                          )}
                        </p>
                      </div>
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
      <div className="border-t border-[#E0E7E6] bg-[#F8FAFB] p-4">
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

        {/* Upload error banner */}
        {uploadError && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">
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

        <div className="flex items-center gap-2">
          <FileUpload
            onUploadSuccess={(file) => {
              setAttachedFile(file);
              setUploadError(null);
            }}
            onUploadError={(err) => setUploadError(err)}
          />

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-lg border border-[#A5C9CA] px-4 py-2 focus:border-[#395B64] focus:outline-none focus:ring-2 focus:ring-[#E7F6F2]"
            rows="2"
          />

          <button
            type="button"
            onClick={handleSendClick}
            disabled={!inputValue.trim() && !attachedFile}
            className="rounded-lg bg-[#395B64] px-4 py-2 font-medium text-white transition hover:bg-[#2C3333] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default MessageThread
