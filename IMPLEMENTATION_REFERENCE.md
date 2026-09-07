# Direct Messaging Feature - Implementation Reference

## Overview
This document provides a complete reference for the direct messaging (DM) feature implementation for WorkNest real-time collaboration platform.

**Feature Scope**: User-to-user direct messaging with persistence, real-time delivery, and offline support.
**Technology Stack**: React + Node.js + Express + Socket.IO + MongoDB

---

## Architecture Overview

### Data Flow Diagram
```
User A (Browser)
    ↓
[Frontend DM UI]
    ↓
[Socket.IO Client] --emit--> [Socket.IO Server]
    ↓                          ↓
[localStorage token]    [JWT Authentication]
                               ↓
                        [Message Handler]
                               ↓
                        [MongoDB Save]
                        (if User B online)
                               ↓
                        [Socket.IO Client B]
                        (broadcast receive)
                               ↓
User B (Browser) <-- [Real-time notification]

(Also: REST API GET /api/messages/:userId for history fetch)
```

---

## Backend Implementation

### 1. Message Model: `backend/models/Message.js`

```javascript
import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

const Message = mongoose.model("Message", messageSchema)
export default Message
```

**Key Design Decisions:**
- **No Conversation model**: Each message stores senderId + receiverId directly (simpler)
- **No workspaceId**: DMs are workspace-independent
- **Timestamps auto-managed**: MongoDB auto-creates createdAt and updatedAt
- **Trimmed content**: Prevents empty-string messages

---

### 2. Message Controller: `backend/controllers/messageController.js`

```javascript
import Message from "../models/Message.js"
import User from "../models/User.js"

export const getDirectMessages = async (req, res) => {
  try {
    const currentUserId = req.userId // From JWT middleware
    const { userId: otherUserId } = req.params

    // Validation 1: Verify otherUser exists
    const otherUser = await User.findById(otherUserId)
    if (!otherUser) {
      return res.status(404).json({ error: "User not found" })
    }

    // Validation 2: Prevent self-messaging
    if (currentUserId.toString() === otherUserId) {
      return res.status(400).json({ error: "Cannot message yourself" })
    }

    // Query: Get messages between currentUser and otherUser (both directions)
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    }).sort({ createdAt: 1 }) // Chronological order

    // Normalize response: map _id → id
    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      senderId: msg.senderId.toString(),
      receiverId: msg.receiverId.toString(),
      content: msg.content,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    }))

    res.json(formattedMessages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    res.status(500).json({ error: "Failed to fetch messages" })
  }
}
```

**API Endpoint:**
- **Route**: `GET /api/messages/:userId`
- **Authentication**: JWT token in Authorization header
- **Response**: Array of message objects with timestamps
- **Error Cases Handled**:
  - User not found (404)
  - Self-messaging attempt (400)
  - DB errors (500)

---

### 3. Message Routes: `backend/routes/messageRoutes.js`

```javascript
import express from "express"
import { getDirectMessages } from "../controllers/messageController.js"
import { authenticateToken } from "../middleware/authenticateToken.js"

const router = express.Router()

router.get("/:userId", authenticateToken, getDirectMessages)

export default router
```

**Middleware Applied:**
- `authenticateToken`: Validates JWT, extracts userId to req.userId

---

### 4. Socket.IO Handler: `backend/server.js` (Enhanced)

#### Imports Added
```javascript
import Message from "./models/Message.js"
import messageRoutes from "./routes/messageRoutes.js"
```

#### Route Registration
```javascript
app.use("/api/messages", messageRoutes)
```

#### Socket.IO Event Handler: `send-direct-message`
```javascript
socket.on("send-direct-message", async (data) => {
  try {
    const { receiverId, content } = data
    const senderId = socket.userId // From JWT in socket.handshake.auth
    
    // Validation 1: User authenticated?
    if (!senderId) {
      return socket.emit("send-direct-message-error", {
        error: "Not authenticated",
      })
    }

    // Validation 2: Receiver exists?
    const receiverExists = await User.findById(receiverId)
    if (!receiverExists) {
      return socket.emit("send-direct-message-error", {
        error: "User not found",
      })
    }

    // Validation 3: Prevent self-messaging
    if (senderId.toString() === receiverId.toString()) {
      return socket.emit("send-direct-message-error", {
        error: "Cannot message yourself",
      })
    }

    // PERSIST TO MONGODB
    const savedMessage = await Message.create({
      senderId,
      receiverId,
      content: content.trim(),
    })

    // Normalize response
    const messageData = {
      id: savedMessage._id.toString(),
      senderId: savedMessage.senderId.toString(),
      receiverId: savedMessage.receiverId.toString(),
      content: savedMessage.content,
      createdAt: savedMessage.createdAt,
      updatedAt: savedMessage.updatedAt,
    }

    // SEND TO RECEIVER (if online)
    const receiverSockets = onlineUsers.get(receiverId.toString()) || new Set()
    if (receiverSockets.size > 0) {
      receiverSockets.forEach((receiverSocketId) => {
        io.to(receiverSocketId).emit("receive-direct-message", messageData)
      })
    } else {
      console.log(`[INFO] User ${receiverId} offline; message saved to DB`)
    }

    // ALWAYS CONFIRM TO SENDER
    socket.emit("direct-message-sent", messageData)
  } catch (error) {
    console.error("Error sending direct message:", error)
    socket.emit("send-direct-message-error", {
      error: "Failed to send message",
    })
  }
})
```

**Key Behaviors:**
1. **Extracts senderId from socket.userId** (not from client data) → Security!
2. **Validates receiverId** (exists in DB, not self)
3. **Saves to MongoDB immediately** (regardless of receiver online status)
4. **Broadcasts to receiver IF online** (via onlineUsers Map)
5. **Always confirms to sender** (emit direct-message-sent)
6. **Logs offline delivery** (for debugging)
7. **Emits error event on failure** (client can show toast)

**Event Naming:**
- Client sends: `send-direct-message`
- Server broadcasts: `receive-direct-message` (to receiver)
- Server confirms: `direct-message-sent` (to sender)
- Server errors: `send-direct-message-error` (to sender)

---

## Frontend Implementation

### 1. Socket Service: `src/services/socket.js` (Enhanced)

#### Existing Code (Preserved)
```javascript
const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("worknestToken"),
  },
})

export const connectSocket = (token) => {
  if (!socket.connected) {
    socket.auth.token = token
    socket.connect()
  }
}

export const disconnectSocket = () => {
  socket.disconnect()
}

export const getSocket = () => socket
```

#### New Functions Added

**Send Message**
```javascript
export const sendDirectMessage = (receiverId, content) => {
  socket.emit("send-direct-message", { receiverId, content })
}
```

**Listen for Received Message**
```javascript
export const onDirectMessageReceived = (callback) => {
  socket.on("receive-direct-message", callback)
}

export const offDirectMessageReceived = (callback) => {
  socket.off("receive-direct-message", callback)
}
```

**Listen for Sent Confirmation**
```javascript
export const onDirectMessageSent = (callback) => {
  socket.on("direct-message-sent", callback)
}

export const offDirectMessageSent = (callback) => {
  socket.off("direct-message-sent", callback)
}
```

**Listen for Errors**
```javascript
export const onDirectMessageError = (callback) => {
  socket.on("send-direct-message-error", callback)
}

export const offDirectMessageError = (callback) => {
  socket.off("send-direct-message-error", callback)
}
```

**Get Socket Instance** (if needed by components)
```javascript
export const getSocket = () => socket
```

---

### 2. DirectMessaging Component: `src/components/dashboard/DirectMessaging.jsx`

**Purpose**: Container component managing DM state and lifecycle

**State Management:**
```javascript
const [selectedUser, setSelectedUser] = useState(externalSelectedUser)
const [messages, setMessages] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
const messageIdsRef = useRef(new Set()) // Duplicate prevention
```

**Props:**
- `externalSelectedUser`: User object with id, name (passed from parent when member clicked)

**Key Lifecycle Effects:**

**Effect 1: Fetch History When User Selected**
```javascript
useEffect(() => {
  if (!currentSelectedUser?.id) return
  
  setLoading(true)
  setError(null)
  
  const token = localStorage.getItem("worknestToken")
  fetch(`http://localhost:5000/api/messages/${currentSelectedUser.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch messages")
      return res.json()
    })
    .then(data => {
      // Clear duplicates tracking on new user
      messageIdsRef.current = new Set()
      
      // Load history and track IDs
      const formattedMessages = data.map(msg => ({
        ...msg,
        id: msg.id || msg._id,
      }))
      
      formattedMessages.forEach(msg => {
        messageIdsRef.current.add(msg.id)
      })
      
      setMessages(formattedMessages)
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
}, [currentSelectedUser?.id])
```

**Effect 2: Setup Socket Listeners**
```javascript
useEffect(() => {
  if (!currentSelectedUser?.id) return
  
  const handleReceived = (message) => {
    // Only add if: (1) new ID, (2) from/to current user
    if (
      !messageIdsRef.current.has(message.id) &&
      ((message.senderId === currentUserId && message.receiverId === currentSelectedUser.id) ||
       (message.senderId === currentSelectedUser.id && message.receiverId === currentUserId))
    ) {
      messageIdsRef.current.add(message.id)
      setMessages(prev => [...prev, message])
    }
  }
  
  const handleSent = (message) => {
    // Confirmation from server (message persisted)
    if (!messageIdsRef.current.has(message.id)) {
      messageIdsRef.current.add(message.id)
      setMessages(prev => [...prev, message])
    }
  }
  
  const handleError = (data) => {
    setError(data.error || "Failed to send message")
    setTimeout(() => setError(null), 5000)
  }
  
  onDirectMessageReceived(handleReceived)
  onDirectMessageSent(handleSent)
  onDirectMessageError(handleError)
  
  return () => {
    offDirectMessageReceived(handleReceived)
    offDirectMessageSent(handleSent)
    offDirectMessageError(handleError)
  }
}, [currentSelectedUser?.id, currentUserId])
```

**Render:**
```javascript
<div className="flex flex-col h-full bg-[#F5F5F5]">
  <MessageThread
    selectedUser={currentSelectedUser}
    messages={messages}
    loading={loading}
    error={error}
    onSendMessage={handleSendMessage}
    currentUserId={currentUserId}
  />
</div>
```

**Send Handler:**
```javascript
const handleSendMessage = (content) => {
  if (!content.trim() || !currentSelectedUser) return
  
  sendDirectMessage(currentSelectedUser.id, content)
}
```

---

### 3. MessageThread Component: `src/components/dashboard/MessageThread.jsx`

**Purpose**: Display messages and input interface

**Key Features:**

**Auto-scroll to bottom:**
```javascript
const messagesEndRef = useRef(null)

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
}, [messages])
```

**Message Render:**
```javascript
{messages.map((message) => (
  <div
    key={message.id}
    className={`flex ${
      message.senderId === currentUserId ? "justify-end" : "justify-start"
    } mb-2`}
  >
    <div
      className={`max-w-xs px-3 py-2 rounded-lg ${
        message.senderId === currentUserId
          ? "bg-[#395B64] text-white"
          : "bg-gray-300 text-black"
      }`}
    >
      <p className="text-sm">{message.content}</p>
      <p className="text-xs opacity-70 mt-1">
        {new Date(message.createdAt).toLocaleTimeString()}
      </p>
    </div>
  </div>
))}
```

**Input & Send:**
```javascript
<textarea
  value={messageInput}
  onChange={(e) => setMessageInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSendMessage(messageInput)
      setMessageInput("")
    }
  }}
  placeholder="Type a message..."
  className="w-full p-2 border rounded"
/>

<button
  onClick={() => {
    onSendMessage(messageInput)
    setMessageInput("")
  }}
  disabled={!messageInput.trim()}
  className="bg-blue px-4 py-2 rounded disabled:opacity-50"
>
  Send
</button>
```

---

### 4. SlackShell Integration: `src/components/dashboard/SlackShell.jsx` (Modified)

**Import Added:**
```javascript
import DirectMessaging from "./DirectMessaging"
```

**Conditional Render in Main Viewport:**
```javascript
{selectedDMUser ? (
  <DirectMessaging externalSelectedUser={selectedDMUser} />
) : (
  // Original channel message view (unchanged)
  <div className="...">
    {/* Channel messaging code */}
  </div>
)}
```

**When User Clicks Member (unchanged):**
```javascript
// When user clicks on member in member list sidebar:
onClick={() => setSelectedDMUser(memberObject)}
```

---

## Security Analysis

### Authentication
- ✅ JWT token validated in Socket.IO middleware before socket.userId set
- ✅ senderId always comes from socket.userId (not client data)
- ✅ Client cannot spoof another user's identity

### Authorization
- ✅ Users can only message users in same workspace (enforced by frontend logic)
- ✅ Users can view only their own message history (GET /api/messages checks authenticated userId)

### Validation
- ✅ Receiver must exist in database (queried before save)
- ✅ Self-messaging prevented (senderId !== receiverId check)
- ✅ Content trimmed (empty strings rejected)

### Data Privacy
- ✅ Direct messages not visible to other workspace members
- ✅ Message history only accessible to participants
- ✅ No unencrypted sensitive data in messages (user choice)

---

## Database Queries Reference

### Insert a Message
```javascript
const msg = await Message.create({
  senderId: userId1,
  receiverId: userId2,
  content: "Hello"
})
```

### Get Conversation Between Two Users
```javascript
const messages = await Message.find({
  $or: [
    { senderId: userId1, receiverId: userId2 },
    { senderId: userId2, receiverId: userId1 }
  ]
}).sort({ createdAt: 1 })
```

### Delete All Messages for a User
```javascript
await Message.deleteMany({
  $or: [
    { senderId: userId },
    { receiverId: userId }
  ]
})
```

### Count Messages in Conversation
```javascript
const count = await Message.countDocuments({
  $or: [
    { senderId: userId1, receiverId: userId2 },
    { senderId: userId2, receiverId: userId1 }
  ]
})
```

---

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/worknest
JWT_SECRET=your_secret_key
```

### Frontend (Vite)
```
VITE_API_URL=http://localhost:5000
```

---

## Common Issues & Troubleshooting

### Issue: "Messages not showing up"
**Cause**: Socket not connected or event listener not registered
**Fix**: Check browser console for connection errors; verify socket.connected is true

### Issue: "Duplicate messages appearing"
**Cause**: messageIdsRef.current not tracking IDs properly
**Fix**: Verify message.id is unique and consistent between send confirmation and receive events

### Issue: "Offline messages lost"
**Cause**: Message not saved to DB before receiver disconnects
**Fix**: Ensure Message.create() is awaited before socket.emit()

### Issue: "Cannot send to specific user"
**Cause**: receiverId not correctly passed or user doesn't exist
**Fix**: Verify user exists in database; check receiverId format in frontend emit

### Issue: "Old messages don't load after refresh"
**Cause**: API not called or token invalid
**Fix**: Verify localStorage has valid JWT; check network tab for GET /api/messages/:userId request

### Issue: "Self-messaging allowed"
**Cause**: Frontend validation skipped
**Fix**: Backend validates; if frontend bug, add check before rendering DirectMessaging

---

## Testing Checklist

- [ ] Message sends and receiver gets it (real-time)
- [ ] Message persists in MongoDB
- [ ] Refresh page → messages still show
- [ ] Offline message saved and delivered when user reconnects
- [ ] No duplicate messages
- [ ] Cannot message yourself
- [ ] Cannot message non-existent user
- [ ] Existing channel messaging not broken
- [ ] Multiple conversations don't interfere
- [ ] Timestamps are accurate

---

## Files Modified/Created

| File | Type | Purpose |
|------|------|---------|
| `backend/models/Message.js` | NEW | Message schema |
| `backend/controllers/messageController.js` | NEW | GET history API |
| `backend/routes/messageRoutes.js` | NEW | Route handler |
| `backend/server.js` | MODIFIED | Added Message model, routes, Socket.IO handler |
| `src/services/socket.js` | MODIFIED | Added DM emit/listen functions |
| `src/components/dashboard/DirectMessaging.jsx` | NEW | DM container component |
| `src/components/dashboard/MessageThread.jsx` | NEW | Message display + input |
| `src/components/dashboard/DirectMessagesList.jsx` | NEW | User selection list (optional) |
| `src/components/dashboard/SlackShell.jsx` | MODIFIED | Conditional render for DMs |

---

## Performance Considerations

- **Message History Pagination**: Currently loads all messages; consider limiting to last N messages with pagination for large conversations
- **Socket Event Deduplication**: Uses messageIdsRef.current Set (O(1) lookup)
- **Database Indexing**: Recommend index on (senderId, receiverId, createdAt) for faster queries
- **Online Users Map**: O(1) lookup per message send

---

## Future Enhancements (Out of Scope)

- Typing indicators
- Message read receipts
- Message reactions/emoji
- File attachments
- Message search
- Pin important messages
- Message deletion/editing
- Conversation archival
- Redis caching for online status
- Message encryption
