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

export default socket
