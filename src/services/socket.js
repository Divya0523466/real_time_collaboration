import { io } from "socket.io-client"

const API_URL = import.meta.env.VITE_API_URL || ""
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "")

const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
})

socket.on("connect", () => {
})

socket.on("connect_error", (error) => {
})

socket.on("disconnect", (reason) => {
})

export const connectSocket = () => {
  socket.auth = {
    token: localStorage.getItem("worknestToken"),
  }
  if (!socket.connected) {
    socket.connect()
  }
}


export const sendDirectMessage = (receiverId, content) => {
  socket.emit("send-direct-message", { receiverId, content })
}

export const editDirectMessage = (messageId, content) => {
  socket.emit("edit-direct-message", { messageId, content })
}

export const deleteDirectMessage = (messageId) => {
  socket.emit("delete-direct-message", { messageId })
}

export const onDirectMessageReceived = (callback) => {
  socket.on("receive-direct-message", callback)
}

export const onDirectMessageSent = (callback) => {
  socket.on("direct-message-sent", callback)
}

export const onDirectMessageError = (callback) => {
  socket.on("send-direct-message-error", callback)
}

export const onDirectMessageEdited = (callback) => {
  socket.on("direct-message-edited", callback)
}

export const onDirectMessageDeleted = (callback) => {
  socket.on("direct-message-deleted", callback)
}

export const offDirectMessageReceived = (callback) => {
  socket.off("receive-direct-message", callback)
}

export const offDirectMessageSent = (callback) => {
  socket.off("direct-message-sent", callback)
}

export const offDirectMessageError = (callback) => {
  socket.off("send-direct-message-error", callback)
}

export const offDirectMessageEdited = (callback) => {
  socket.off("direct-message-edited", callback)
}

export const offDirectMessageDeleted = (callback) => {
  socket.off("direct-message-deleted", callback)
}

export const onDirectMessageEditError = (callback) => {
  socket.on("edit-direct-message-error", callback)
}

export const offDirectMessageEditError = (callback) => {
  socket.off("edit-direct-message-error", callback)
}

export const onDirectMessageDeleteError = (callback) => {
  socket.on("delete-direct-message-error", callback)
}

export const offDirectMessageDeleteError = (callback) => {
  socket.off("delete-direct-message-error", callback)
}

export const joinChannel = (channelId) => {
  socket.emit("join-channel", { channelId })
}

export const leaveChannel = (channelId) => {
  socket.emit("leave-channel", { channelId })
}

export const sendChannelMessage = (channelId, content, replyTo = null) => {
  socket.emit("send-channel-message", { channelId, content, replyTo })
}

export const editChannelMessage = (messageId, content) => {
  socket.emit("edit-channel-message", { messageId, content })
}

export const deleteChannelMessage = (messageId) => {
  socket.emit("delete-channel-message", { messageId })
}

export const onChannelMessageEdited = (callback) => {
  socket.on("channel-message-edited", callback)
}

export const onChannelMessageDeleted = (callback) => {
  socket.on("channel-message-deleted", callback)
}

export const offChannelMessageEdited = (callback) => {
  socket.off("channel-message-edited", callback)
}

export const offChannelMessageDeleted = (callback) => {
  socket.off("channel-message-deleted", callback)
}


export const onNotificationReceived = (callback) => {
  socket.on("receive-notification", callback)
}

export const offNotificationReceived = (callback) => {
  socket.off("receive-notification", callback)
}


export const onOnlineUsers = (callback) => {
  socket.on("get-online-users", callback)
}

export const offOnlineUsers = (callback) => {
  socket.off("get-online-users", callback)
}

export const onUserOnline = (callback) => {
  socket.on("user-online", callback)
}

export const offUserOnline = (callback) => {
  socket.off("user-online", callback)
}

export const onUserOffline = (callback) => {
  socket.on("user-offline", callback)
}

export const offUserOffline = (callback) => {
  socket.off("user-offline", callback)
}

export const requestOnlineUsers = () => {
  socket.emit("request-online-users")
}

export default socket

