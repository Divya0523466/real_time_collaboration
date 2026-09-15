import { useState, useEffect, useRef } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import {
  sendDirectMessage,
  editDirectMessage,
  deleteDirectMessage,
  onDirectMessageReceived,
  onDirectMessageSent,
  onDirectMessageError,
  onDirectMessageEdited,
  onDirectMessageDeleted,
  onDirectMessageEditError,
  onDirectMessageDeleteError,
  offDirectMessageReceived,
  offDirectMessageSent,
  offDirectMessageError,
  offDirectMessageEdited,
  offDirectMessageDeleted,
  offDirectMessageEditError,
  offDirectMessageDeleteError,
} from "../../services/socket"
import MessageThread from "./MessageThread"

const DirectMessaging = ({ externalSelectedUser = null }) => {
  const { workspaceData, user } = useWorkspace()
  const [selectedUser, setSelectedUser] = useState(externalSelectedUser)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messageIdsRef = useRef(new Set())

  const API_URL = import.meta.env.VITE_API_URL

  // Use external selected user if provided, otherwise use internal state
  const currentSelectedUser = externalSelectedUser || selectedUser

  // Load message history when user is selected
  useEffect(() => {
    if (!currentSelectedUser || !user) {
      return
    }

    const fetchHistory = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem("worknestToken")
        const response = await fetch(`${API_URL}/messages/${currentSelectedUser.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch message history")
        }

        const data = await response.json()
        setMessages(data.messages || [])

        // Reset message IDs tracker
        messageIdsRef.current = new Set(
          data.messages.map((msg) => msg.id.toString()),
        )
      } catch {
        setError("Failed to load message history")
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [currentSelectedUser, user, API_URL])

  // Handle incoming messages
  const handleDirectMessageReceived = (message) => {
    const messageId = message.id.toString()

    // Ignore if already in state
    if (messageIdsRef.current.has(messageId)) {
      return
    }

    // Only add if from current selected user or to current selected user
    if (
      !currentSelectedUser ||
      (message.senderId.toString() !== currentSelectedUser.id.toString() &&
        message.receiverId.toString() !== currentSelectedUser.id.toString())
    ) {
      return
    }

    messageIdsRef.current.add(messageId)
    setMessages((prev) => [...prev, message])
  }

  // Handle sent message confirmation
  const handleDirectMessageSent = (message) => {
    const messageId = message.id.toString()

    // Ignore if already in state
    if (messageIdsRef.current.has(messageId)) {
      return
    }

    messageIdsRef.current.add(messageId)
    setMessages((prev) => [...prev, message])
  }

  // Handle errors
  const handleDirectMessageError = (error) => {
    setError(error.message || "Failed to send message")
  }

  // Handle edit — update the message in place without touching messageIdsRef
  const handleDirectMessageEdited = (payload) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id?.toString() === payload.id?.toString()
          ? { ...m, content: payload.content, isEdited: true, updatedAt: payload.updatedAt }
          : m
      )
    )
  }

  // Handle delete — mark as deleted in place without touching messageIdsRef
  const handleDirectMessageDeleted = (payload) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id?.toString() === payload.id?.toString()
          ? { ...m, isDeleted: true, content: null }
          : m
      )
    )
  }

  // Setup socket listeners — all registered in one effect, all cleaned up together
  useEffect(() => {
    onDirectMessageReceived(handleDirectMessageReceived)
    onDirectMessageSent(handleDirectMessageSent)
    onDirectMessageError(handleDirectMessageError)
    onDirectMessageEdited(handleDirectMessageEdited)
    onDirectMessageDeleted(handleDirectMessageDeleted)
    onDirectMessageEditError(handleDirectMessageError)
    onDirectMessageDeleteError(handleDirectMessageError)

    return () => {
      offDirectMessageReceived(handleDirectMessageReceived)
      offDirectMessageSent(handleDirectMessageSent)
      offDirectMessageError(handleDirectMessageError)
      offDirectMessageEdited(handleDirectMessageEdited)
      offDirectMessageDeleted(handleDirectMessageDeleted)
      offDirectMessageEditError(handleDirectMessageError)
      offDirectMessageDeleteError(handleDirectMessageError)
    }
  }, [currentSelectedUser])

  const handleSendMessage = (content) => {
    if (!currentSelectedUser || !content.trim()) {
      return
    }

    try {
      sendDirectMessage(currentSelectedUser.id, content)
    } catch {
      setError("Failed to send message")
    }
  }

  // Emit edit to server via socket
  const handleEditMessage = (messageId, newContent) => {
    editDirectMessage(messageId, newContent)
  }

  // Emit delete to server via socket
  const handleDeleteMessage = (messageId) => {
    deleteDirectMessage(messageId)
  }

  return (
    <MessageThread
      selectedUser={currentSelectedUser}
      messages={messages}
      loading={loading}
      error={error}
      onSendMessage={handleSendMessage}
      onEditMessage={handleEditMessage}
      onDeleteMessage={handleDeleteMessage}
      currentUserId={user?.id}
    />
  )
}

export default DirectMessaging
