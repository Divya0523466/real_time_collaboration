# Direct Messaging Feature - Testing Checklist

## Pre-Testing Setup
- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:5173
- [ ] MongoDB connected and accessible
- [ ] Two browser windows/tabs open (or two devices)
- [ ] Clear browser localStorage if needed (for clean token state)

## Test Scenario 1: Basic Message Send & Receive (CRITICAL)
**Setup**: User A and User B logged in, both online

### Step 1A: User A Sends Message
- [ ] User A opens workspace
- [ ] User A selects User B from member list (via "User B" name click)
- [ ] DirectMessaging component renders with User B's name
- [ ] User A types: "Hello B, can you see this?"
- [ ] User A clicks Send button
- [ ] **Expected**: Message input clears immediately
- [ ] **Expected**: Message appears in User A's message thread (blue bubble, right side)
- [ ] **Expected**: Browser console shows no errors

### Step 1B: User B Receives Message (Real-time)
- [ ] In User B's browser, watch the message area
- [ ] **Expected**: Message from User A appears in gray bubble (left side)
- [ ] **Expected**: Timestamp shows correct time
- [ ] **Expected**: User B's message thread shows message without refresh
- [ ] **Expected**: Message content matches exactly: "Hello B, can you see this?"

### Step 1C: Message Persistence - Database
- [ ] Connect to MongoDB database
- [ ] Query `messages` collection
- [ ] **Expected**: Document exists with:
  - `senderId`: User A's ObjectId
  - `receiverId`: User B's ObjectId  
  - `content`: "Hello B, can you see this?"
  - `createdAt`: timestamp
  - `updatedAt`: timestamp

---

## Test Scenario 2: Bidirectional Messaging
**Setup**: Both users online, previous message exists

### Step 2A: User B Replies
- [ ] User B types: "Hey A! I can see your message!"
- [ ] User B clicks Send
- [ ] **Expected**: Message input clears
- [ ] **Expected**: Message appears in User B's thread (blue bubble, right)
- [ ] **Expected**: No duplicates of previous User A message

### Step 2B: User A Receives Reply
- [ ] Watch User A's message area
- [ ] **Expected**: Reply from User B appears (gray bubble, left)
- [ ] **Expected**: Conversation thread shows both messages in chronological order:
  1. User A: "Hello B, can you see this?"
  2. User B: "Hey A! I can see your message!"

### Step 2C: Verify No Duplicates
- [ ] Count messages in User A's thread: should be exactly 2
- [ ] Count messages in User B's thread: should be exactly 2
- [ ] No message appears twice in either thread

---

## Test Scenario 3: Page Refresh - Message Persistence
**Setup**: Conversation exists with 2+ messages

### Step 3A: User A Refresh
- [ ] User A keeps conversation with User B open
- [ ] User A presses F5 (refresh page)
- [ ] **Expected**: Page reloads
- [ ] **Expected**: User A automatically re-logs in OR shows login screen
- [ ] If login needed: User A logs back in with same credentials
- [ ] **Expected**: Workspace loads with previous workspace selected
- [ ] User A selects User B again (or it's still selected)
- [ ] **Expected**: All previous messages reappear in message thread
- [ ] **Expected**: No duplicates after refresh (still exactly 2 messages)
- [ ] **Expected**: Timestamps are preserved correctly

### Step 3B: User B Refresh
- [ ] Same steps for User B
- [ ] **Expected**: Messages persist for User B also
- [ ] **Expected**: Same 2 messages visible to User B

---

## Test Scenario 4: Offline Message Handling
**Setup**: Both users in conversation

### Step 4A: Disconnect User B
- [ ] Close User B's browser tab (or use Dev Tools to disable network)
- [ ] **Expected**: User B's connection closes (backend notices)
- [ ] Watch backend logs: should show User B disconnected

### Step 4B: User A Sends While User B Offline
- [ ] User A types: "B, are you there? This is an offline message"
- [ ] User A clicks Send
- [ ] **Expected**: Message input clears immediately
- [ ] **Expected**: Message appears in User A's thread (confirmed with blue bubble)
- [ ] **Expected**: NO error toast/notification
- [ ] **Expected**: Backend logs show message saved (offline delivery logged)

### Step 4C: Message Persisted
- [ ] Check MongoDB: new message should exist
- [ ] **Expected**: Message with correct senderId, receiverId, content saved

### Step 4D: User B Reconnects
- [ ] Reconnect User B (reload browser or re-enable network)
- [ ] User B logs in
- [ ] User B navigates to workspace and selects User A
- [ ] **Expected**: Message thread now shows the offline message
- [ ] **Expected**: Message history loads: "B, are you there? This is an offline message"
- [ ] **Expected**: Message is correctly attributed to User A with correct timestamp

---

## Test Scenario 5: Self-Message Prevention
**Setup**: User A logged in

### Step 5A: Try to Send to Self
- [ ] User A selects User A from member list (own name)
- [ ] **Expected**: Either:
  - DirectMessaging doesn't render (prevented at component level), OR
  - Error message appears: "Cannot send message to yourself"
- [ ] **Expected**: Message input is disabled or send button is disabled
- [ ] Try anyway (if possible): type message and click Send
- [ ] **Expected**: Toast error appears: "Cannot send message to yourself"

### Step 5B: Database Check
- [ ] Query MongoDB for messages with senderId === receiverId
- [ ] **Expected**: No such messages exist

---

## Test Scenario 6: User Doesn't Exist
**Setup**: Frontend is manipulated (optional, advanced test)

### Step 6A: Send to Non-Existent User ID
- [ ] (Advanced) Open Dev Tools Console
- [ ] Manually emit: `socket.emit("send-direct-message", {receiverId: "invalid-id", content: "test"})`
- [ ] **Expected**: Error event received
- [ ] **Expected**: Toast error: "User not found" or similar

### Step 6B: Database Check
- [ ] Query MongoDB for messages with invalid receiverId
- [ ] **Expected**: No such messages created

---

## Test Scenario 7: Socket Connection Verification
**Setup**: Both users online

### Step 7A: Check Socket Connection
- [ ] Open Dev Tools (F12) → Console
- [ ] **Expected**: No errors about socket connection failures
- [ ] Type in console: `console.log('Socket connected:',  socket.connected)` (if socket exposed)
- [ ] **Expected**: true (or verify via network tab showing WebSocket connection)

### Step 7B: Check Authentication
- [ ] In browser storage (localStorage):
- [ ] **Expected**: "worknestToken" exists and is a valid JWT
- [ ] Decode JWT (use jwt.io or console): should contain userId

---

## Test Scenario 8: Multiple Users in Room
**Setup**: 3+ users in same workspace

### Step 8A: User A ↔ User B (DM)
- [ ] User A sends message to User B
- [ ] **Expected**: Message received by User B
- [ ] **Expected**: User C (third user) does NOT see this DM

### Step 8B: User A ↔ User C (DM)
- [ ] User A opens conversation with User C
- [ ] User A sends message to User C
- [ ] **Expected**: Message received by User C
- [ ] **Expected**: User B doesn't see this message (it's only between A and C)
- [ ] Check MongoDB: message only has C as receiverId

### Step 8C: Message Isolation
- [ ] User A's thread with User B: should show only A↔B messages
- [ ] User A's thread with User C: should show only A↔C messages
- [ ] No cross-conversation leakage

---

## Test Scenario 9: Existing Channel Functionality NOT Broken
**Setup**: Workspace with existing channels

### Step 9A: Switch to Channel View
- [ ] DON'T select a direct message user
- [ ] Select a channel from channel list
- [ ] **Expected**: Channel message area renders (not DirectMessaging)
- [ ] **Expected**: Old channel functionality works

### Step 9B: Send Channel Message
- [ ] Type message in channel
- [ ] Click Send
- [ ] **Expected**: Message appears as channel message
- [ ] **Expected**: No interference from DM code

### Step 9C: Workspace Features Still Work
- [ ] Test creating new channel: works ✓ or ✗
- [ ] Test creating new workspace: works ✓ or ✗
- [ ] Test inviting members: works ✓ or ✗
- [ ] Test role management (OWNER/ADMIN/MEMBER): works ✓ or ✗
- [ ] Test deleting channel: works ✓ or ✗

---

## Test Scenario 10: Error Handling & Edge Cases

### Step 10A: Network Disconnect Mid-Message
- [ ] User A types a message
- [ ] Disable network (Dev Tools → Network tab → Offline checkbox)
- [ ] Click Send
- [ ] **Expected**: Toast error after ~5-10 seconds: socket not connected
- [ ] Re-enable network
- [ ] Try again
- [ ] **Expected**: Message sends successfully

### Step 10B: Empty Message
- [ ] User A leaves input empty, clicks Send
- [ ] **Expected**: No request sent to backend
- [ ] **Expected**: Send button stays disabled (or validation prevents)

### Step 10C: Very Long Message
- [ ] User A types 5000 character message (or copy-paste large text)
- [ ] Click Send
- [ ] **Expected**: Message sends successfully
- [ ] **Expected**: Full content appears in receiver's view

### Step 10D: Special Characters
- [ ] User A sends: "Hello! 👋 How are you? <script>alert('xss')</script>"
- [ ] **Expected**: Message displays as-is
- [ ] **Expected**: No XSS execution (script tag should be escaped in display)
- [ ] **Expected**: Emojis display correctly

---

## Test Scenario 11: Duplicate Prevention
**Setup**: Message system actively sending

### Step 11A: Same Message Sent
- [ ] User A sends: "Test message 1"
- [ ] User A sends again: "Test message 1" (identical content)
- [ ] **Expected**: Two separate messages appear
- [ ] **Expected**: Both visible in thread with same content but different IDs
- [ ] Note: duplicates = same _id appearing twice, NOT same content

### Step 11B: Fast Rapid Sends
- [ ] User A types: "Message 1"
- [ ] User A clicks Send
- [ ] User A types: "Message 2"  
- [ ] User A clicks Send (before first message fully confirmed)
- [ ] User A types: "Message 3"
- [ ] User A clicks Send
- [ ] **Expected**: All 3 messages appear exactly once each
- [ ] **Expected**: In chronological order: 1, 2, 3
- [ ] **Expected**: No duplicates (e.g., Message 1 appearing twice)

### Step 11C: Check Message IDs
- [ ] Open Dev Tools → Console
- [ ] In UI, right-click on message → Inspect
- [ ] **Expected**: Each message has unique `id` attribute or internal ID
- [ ] Open browser Network tab, watch socket messages
- [ ] **Expected**: Each receive-direct-message event has unique message._id

---

## Test Scenario 12: Timestamp Accuracy
**Setup**: Messages sent across different times

### Step 12A: Chronological Order
- [ ] User A sends "First" at 2:00 PM
- [ ] Wait 2 minutes
- [ ] User A sends "Second" at 2:02 PM
- [ ] User B sends "Third" at 2:03 PM
- [ ] **Expected**: Messages appear in thread in order: First → Second → Third
- [ ] **Expected**: Timestamps show increasing times

### Step 12B: Timestamp Format
- [ ] Click on a message timestamp
- [ ] **Expected**: Shows time in readable format (e.g., "2:00:15 PM")
- [ ] **Expected**: Timestamp matches actual send time (within ±1 second)

---

## Regression Test: Core Workspace Features

| Feature | Before DM | After DM | Pass/Fail |
|---------|-----------|----------|-----------|
| Login/Register | Works | Still works | |
| Create Workspace | Works | Still works | |
| Switch Workspace | Works | Still works | |
| Create Channel | Works | Still works | |
| Send Channel Message | Works | Still works | |
| Delete Channel | Works | Still works | |
| Edit Workspace | Works | Still works | |
| Invite Member | Works | Still works | |
| Role Management | Works | Still works | |
| Logout | Works | Still works | |

---

## Summary

### Critical Tests (Must Pass)
- ✅ Message Send & Receive (Scenario 1)
- ✅ No Duplicates (Scenario 11)
- ✅ Offline Persistence (Scenario 4)
- ✅ Socket Connection (Scenario 7)
- ✅ Existing Features NOT Broken (Scenario 9)

### High Priority Tests
- ✅ Bidirectional Messages (Scenario 2)
- ✅ Page Refresh Persistence (Scenario 3)
- ✅ Self-Message Prevention (Scenario 5)

### Medium Priority Tests
- ✅ Error Handling (Scenario 10)
- ✅ Edge Cases (Scenario 10)

### Documentation Tests
- ✅ Message Isolation (Scenario 8)
- ✅ Timestamp Accuracy (Scenario 12)

---

## Notes for Tester
- Keep browser console open (F12 → Console tab) during all tests
- Watch for unexpected errors
- Check MongoDB after key operations to verify persistence
- Capture screenshots of any failures
- Note exact error messages
- Test on same machine (localhost) first, then cross-machine if needed

---

## Test Results Template
```
Test Date: _______________
Tester: ___________________
Browser(s): _______________
OS: _______________________

Scenario 1 (Basic Send/Receive): PASS / FAIL / PARTIAL
  Issues: _______________________________________________

Scenario 2 (Bidirectional): PASS / FAIL / PARTIAL
  Issues: _______________________________________________

[... continue for each scenario ...]

Overall Status: PASS / FAIL / PARTIAL
Blockers: __________________________________________________
Recommended Actions: ________________________________________
```
