import { io } from "socket.io-client"

const API_URL = import.meta.env.VITE_API_URL || ""
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "")

const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
})

socket.on("connect", () => {
  console.log("Socket connected:", socket.id)
})

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error.message)
})

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason)
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
  socket.emit("send-direct-message", {
    receiverId,
    content,
  })
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

export const offDirectMessageReceived = (callback) => {
  socket.off("receive-direct-message", callback)
}

export const offDirectMessageSent = (callback) => {
  socket.off("direct-message-sent", callback)
}

export const offDirectMessageError = (callback) => {
  socket.off("send-direct-message-error", callback)
}

export default socket
