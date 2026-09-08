import { useState, useEffect, useRef } from "react"
import PropTypes from "prop-types"

const MessageThread = ({
  selectedUser,
  messages,
  loading,
  error,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  currentUserId,
}) => {
  const [inputValue, setInputValue] = useState("")
  // editingState: { messageId: string, draftContent: string } | null
  const [editingState, setEditingState] = useState(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendClick = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue)
      setInputValue("")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendClick()
    }
  }

  const startEdit = (message) => {
    setEditingState({ messageId: message.id?.toString(), draftContent: message.content })
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
      <div className="border-b border-[#E0E7E6] bg-[#F8FAFB] p-4">
        <h3 className="font-semibold text-[#2C3333]">
          {selectedUser.username || "User"}
        </h3>
        <p className="text-xs text-[#52656A]">{selectedUser.email || ""}</p>
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
          messages.map((message) => {
            const isSender = message.senderId?.toString() === currentUserId?.toString()
            const isDeleted = message.isDeleted === true
            const isBeingEdited = editingState?.messageId === message.id?.toString()

            return (
              <div
                key={message.id}
                className={`group flex ${isSender ? "justify-end" : "justify-start"}`}
              >
                <div className="flex max-w-xs flex-col">
                  {/* Message bubble */}
                  <div
                    className={`rounded-lg px-3 py-1.5 ${
                      isSender
                        ? "bg-[#395B64] text-white"
                        : "bg-[#F1F5F4] text-[#2C3333]"
                    }`}
                  >
                    {isBeingEdited ? (
                      /* Inline edit mode */
                      <div className="flex flex-col gap-1">
                        <textarea
                          className="w-full resize-none rounded bg-white/20 p-1 text-sm outline-none"
                          value={editingState.draftContent}
                          onChange={(e) =>
                            setEditingState((s) => ({ ...s, draftContent: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit() }
                            if (e.key === "Escape") cancelEdit()
                          }}
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={submitEdit}
                            className="rounded bg-[#A5C9CA] px-2 py-0.5 text-[10px] font-semibold text-[#2C3333] hover:bg-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded px-2 py-0.5 text-[10px] opacity-70 hover:opacity-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isDeleted ? (
                      <p className="text-xs italic opacity-60">This message was deleted</p>
                    ) : (
                      <div className="flex items-end gap-2">
                        <p className="wrap-break-word">{message.content}</p>
                        <p
                          className={`shrink-0 text-[10px] leading-4 ${
                            isSender ? "text-[#A5C9CA]" : "text-[#52656A]"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {message.isEdited && (
                            <span className="ml-1 opacity-60">(edited)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Hover action row — own messages only, hidden until group-hover */}
                  {isSender && !isDeleted && !isBeingEdited && (
                    <div className="mt-0.5 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEdit(message)}
                        className="rounded px-1.5 py-0.5 text-[10px] text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#395B64]"
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen mr-0.5" />Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(message.id?.toString())}
                        className="rounded px-1.5 py-0.5 text-[10px] text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete"
                      >
                        <i className="fa-solid fa-trash mr-0.5" />Delete
                      </button>
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
        <div className="flex gap-2">
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
            disabled={!inputValue.trim()}
            className="rounded-lg bg-[#395B64] px-4 py-2 font-medium text-white transition hover:bg-[#2C3333] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

MessageThread.propTypes = {
  selectedUser: PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string,
    email: PropTypes.string,
  }),
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
      senderId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      receiverId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      content: PropTypes.string,
      createdAt: PropTypes.string,
      isEdited: PropTypes.bool,
      isDeleted: PropTypes.bool,
    }),
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onSendMessage: PropTypes.func.isRequired,
  onEditMessage: PropTypes.func,
  onDeleteMessage: PropTypes.func,
  currentUserId: PropTypes.string,
}

MessageThread.defaultProps = {
  selectedUser: null,
  messages: [],
  loading: false,
  error: null,
  onEditMessage: () => {},
  onDeleteMessage: () => {},
  currentUserId: null,
}

export default MessageThread
