import { useEffect, useRef, useState } from "react"
import PropTypes from "prop-types"
import socket, {
  joinChannel,
  leaveChannel,
  sendChannelMessage,
} from "../../services/socket"

const ChannelMessageThread = ({ channel, currentUserId }) => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messageIdsRef = useRef(new Set())
  const messagesEndRef = useRef(null)
  const apiUrl = import.meta.env.VITE_API_URL

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
          messageIdsRef.current = new Set(history.map((message) => message.id.toString()))
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
      setMessages((previous) => [...previous, message])
    }

    const handleSocketError = (socketError) => {
      setError(socketError.message || "Unable to access this channel")
    }

    loadHistory()
    socket.on("receive-channel-message", addMessage)
    socket.on("join-channel-error", handleSocketError)
    socket.on("send-channel-message-error", handleSocketError)
    joinChannel(channel.id)

    return () => {
      cancelled = true
      leaveChannel(channel.id)
      socket.off("receive-channel-message", addMessage)
      socket.off("join-channel-error", handleSocketError)
      socket.off("send-channel-message-error", handleSocketError)
    }
  }, [apiUrl, channel?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    const content = inputValue.trim()
    if (!content || !channel?.id) return
    if (!socket.connected) {
      setError("Socket is not connected. Please try again.")
      return
    }
    sendChannelMessage(channel.id, content)
    setInputValue("")
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  if (!channel) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center bg-white text-sm text-[#52656A]">
        Loading channel...
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto px-8 py-6">
        <div className="border-b border-[#E0E7E6] pb-6 pt-4">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F6F2] text-2xl text-[#395B64]">
            {channel.type === "PRIVATE" ? <i className="fa-solid fa-lock" /> : <i className="fa-solid fa-hashtag" />}
          </div>
          <h2 className="text-lg font-bold text-[#2C3333]">#{channel.name}</h2>
          <p className="mt-2 max-w-xl text-xs text-[#52656A]">
            {channel.description || "This channel is for team communication."}
          </p>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {loading ? (
          <p className="py-10 text-center text-sm text-[#52656A]">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[#52656A]">
            <i className="fa-regular fa-comment-dots mb-3 text-xl text-[#A5C9CA]" />
            <p className="text-sm font-medium text-[#2C3333]">No messages yet</p>
            <p className="mt-1 text-xs">Send a message to start collaborating with your team.</p>
          </div>
        ) : (
          messages.map((message) => {
            const senderId = message.senderId?.toString()
            const isSender = senderId === currentUserId?.toString()
            return (
              <div key={message.id} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs rounded-lg px-3 py-1.5 ${isSender ? "bg-[#395B64] text-white" : "bg-[#F1F5F4] text-[#2C3333]"}`}>
                  <p className="mb-0.5 text-xs font-semibold">
                    {isSender ? "You" : message.sender?.username || "User"}
                  </p>
                  <div className="flex items-end gap-2">
                    <p className="wrap-break-word">{message.content}</p>
                    <p className={`shrink-0 text-[10px] leading-4 ${isSender ? "text-[#A5C9CA]" : "text-[#52656A]"}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#E0E7E6] bg-white p-4">
        <div className="flex gap-2 rounded-2xl border border-[#A5C9CA] bg-[#F8FAFB] p-3 focus-within:border-[#395B64] focus-within:bg-white">
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
            rows="1"
            className="min-w-0 flex-1 resize-none bg-transparent text-sm text-[#2C3333] outline-none placeholder:text-[#52656A]/60"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[#395B64] px-4 text-xs font-semibold text-white transition hover:bg-[#2C3333] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send <i className="fa-solid fa-paper-plane text-[10px]" />
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
