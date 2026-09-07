# Direct Messaging Feature - Quick Start Testing Guide

## ⚡ 5-Minute Setup

### Prerequisites
- Node.js v20+ installed
- MongoDB running locally or accessible
- Two browser windows/tabs (or two devices)

### Step 1: Install Dependencies (if not done)

```bash
# Frontend dependencies
npm install

# Backend dependencies  
cd backend
npm install
cd ..
```

### Step 2: Start Backend Server

```bash
cd backend
npm start
# Expected: "Server running on http://localhost:5000"
# Keep terminal open
```

### Step 3: Start Frontend Dev Server (new terminal)

```bash
npm run dev
# Expected: "Local: http://localhost:5173"
# Keep terminal open
```

### Step 4: Prepare Two Browser Windows

**Browser Window 1 (User A):**
- Go to http://localhost:5173
- Login with credentials (e.g., email: `usera@test.com`, password: `password123`)
- Select or create a workspace
- Keep this window ready

**Browser Window 2 (User B):**
- Go to http://localhost:5173 (same or different device)
- Login with different credentials (e.g., email: `userb@test.com`, password: `password123`)
- Join the same workspace (via invite link or create same workspace)
- Keep this window ready

---

## 🧪 Quick Test Flow (10 minutes)

### Test 1: Simple Message Send
**Duration: 2 minutes**

1. **User A**: In Window 1, select User B from member list
   - Expected: DirectMessaging component appears with "User B" at top
   - Message input box shows at bottom

2. **User A**: Type "Hello B!" and press Enter (or click Send)
   - Expected: Message input clears
   - Message appears in blue bubble (right side)

3. **User B**: In Window 2, look for notification or switch to User A's chat
   - Expected: Message from User A appears in gray bubble (left side)
   - Content is exactly: "Hello B!"

4. **Browser Console Check** (F12 → Console):
   - No red errors
   - Messages show successful delivery

✅ **PASS** if both users see the message


### Test 2: Reply Message
**Duration: 1 minute**

1. **User B**: Type "Hey A, I got it!" and send
   - Expected: Message appears in User B's blue bubble

2. **User A**: Watch for User B's message
   - Expected: Message appears in gray bubble (left)
   - Now conversation shows 2 messages

✅ **PASS** if conversation has exactly 2 messages, no duplicates


### Test 3: Refresh Persistence
**Duration: 2 minutes**

1. **User A**: Press F5 to refresh page
   - Expected: Page reloads, login may be needed

2. **User A**: If logged out, login again
   - Expected: User returns to workspace

3. **User A**: Select User B from member list again
   - Expected: **All 2 previous messages reappear**
   - No duplicates
   - Timestamps preserved

4. **User B**: Refresh (F5) and select User A
   - Expected: **Same 2 messages visible**

✅ **PASS** if messages persist after refresh


### Test 4: Offline Message
**Duration: 3 minutes**

1. **User B**: Close browser tab or disable network
   - Backend should detect disconnection

2. **User A**: Send message "B, are you there?"
   - Expected: Message input clears
   - Message appears in blue bubble (sent)
   - **No error toast**

3. **Check Backend Console**:
   - Should see log: `[INFO] User [id] offline; message saved to DB`

4. **User B**: Reconnect (reload or re-enable network)
   - Login again
   - Select User A

5. **Expected**: The offline message "B, are you there?" now appears in User B's chat

✅ **PASS** if offline message is delivered after reconnect


### Test 5: Existing Features Still Work
**Duration: 2 minutes**

1. **Select a channel** (not a direct message user)
   - Expected: Channel view renders (not DirectMessaging)

2. **Send a channel message**
   - Expected: Message appears as channel message
   - DirectMessaging component is not interfering

3. **Try to create a new channel**
   - Expected: Channel creation still works
   - No errors related to DM code

✅ **PASS** if channel functionality untouched


---

## 🔍 Verification Checklist

After running the 5 quick tests above, verify these critical points:

### Frontend Checks (Browser)

- [ ] Open DevTools (F12)
- [ ] **Console tab**: No red errors (warnings are OK)
- [ ] **Network tab**: 
  - [ ] WebSocket connection established (look for `ws://localhost:5000/socket.io/...`)
  - [ ] GET `/api/messages/[userId]` succeeded (status 200)
- [ ] **Storage tab** → **Local Storage** → http://localhost:5173:
  - [ ] `worknestToken` exists (JWT token)

### Backend Checks (Terminal)

```bash
# Look for these patterns in backend console output:

# ✅ Good signs:
"Server running on http://localhost:5000"
"[INFO] User [id] offline; message saved to DB"
"Socket.IO server initialized"

# ❌ Bad signs:
"Cannot find module"
"EADDRINUSE" (port 5000 in use)
"MongoError" or "connection refused"
"Invalid token"
```

### Database Check (MongoDB)

```javascript
// Connect to MongoDB and run:

use worknest
db.messages.find().pretty()

// Expected output:
[
  {
    "_id": ObjectId("..."),
    "senderId": ObjectId("..."),
    "receiverId": ObjectId("..."),
    "content": "Hello B!",
    "createdAt": ISODate("2024-01-15T10:30:00.000Z"),
    "updatedAt": ISODate("2024-01-15T10:30:00.000Z"),
    "__v": 0
  },
  { ... more messages ... }
]
```

---

## 🐛 Quick Debugging

### Problem: "Messages not showing up"
**Step 1**: Open DevTools Console (F12)
- Look for error messages
- Common: "Socket is not connected" or "401 Unauthorized"

**Step 2**: Refresh page and try again

**Step 3**: Check Network tab
- Open Browser DevTools → Network
- Filter by `XHR` or `Fetch`
- Try sending a message
- Look for red requests (failed status codes)

**Solution**: Most issues are solved by refreshing the page


### Problem: "Duplicate messages or duplicates appearing"
**Check Browser Console:**
```javascript
// In browser console, run:
localStorage.getItem("worknestToken")
// Should return a token string (not null)

// Check socket connection:
// If exposed in window: window.socket.connected
```

**Solution**: Clear localStorage and refresh
```javascript
// In browser console:
localStorage.clear()
// Then refresh page and login again
```


### Problem: "Backend shows error on message save"
**Check backend terminal for error messages**

Common errors:
- "Cannot find User" → Receiver user ID doesn't exist in database
- "MongoError" → Database connection issue (restart MongoDB)
- "Invalid token" → JWT expired (user needs to re-login)

---

## 📊 Test Status Template

Copy this to track your test results:

```
═══════════════════════════════════════
DIRECT MESSAGING - TEST RESULTS
═══════════════════════════════════════

Date: _______________
Tester: ______________
Browser: _____________

TEST RESULTS
───────────────────────────────────────
Test 1 (Simple Send):     ✅ PASS / ❌ FAIL
Test 2 (Reply):           ✅ PASS / ❌ FAIL
Test 3 (Refresh):         ✅ PASS / ❌ FAIL
Test 4 (Offline):         ✅ PASS / ❌ FAIL
Test 5 (Existing Feat):   ✅ PASS / ❌ FAIL

───────────────────────────────────────
OVERALL:                  ✅ PASS / ❌ FAIL
───────────────────────────────────────

Issues Found:
- _________________________________
- _________________________________

Next Steps:
_________________________________

Notes:
_________________________________
```

---

## 🎯 Success Criteria

✅ **Testing is SUCCESSFUL if:**
1. Messages send and are received in real-time
2. Messages persist after page refresh
3. Offline messages are delivered when user reconnects
4. No duplicate messages appear
5. Existing channel functionality is NOT broken
6. No red errors in browser console

❌ **Testing FAILS if:**
1. Messages don't appear on receiver's screen
2. Messages disappear after refresh
3. Duplicate messages show
4. Self-messaging is allowed
5. Channel messaging is broken
6. Socket connection errors in console

---

## 📞 Need Help?

### Message not showing up?
1. Check browser console for errors (F12)
2. Verify both users are in the same workspace
3. Refresh the page
4. Check MongoDB to verify message was saved

### Refresh removes messages?
1. Check Network tab to see if GET /api/messages request succeeds
2. Verify JWT token is valid (check localStorage)
3. Restart backend server

### Offline messages lost?
1. Check backend console for "message saved to DB" log
2. Verify receiverId is correct
3. Check MongoDB for the message document

### Existing features broken?
1. Verify selectedDMUser is null when selecting a channel
2. Check browser console for errors
3. Restart both servers and try again

---

## 🚀 After Testing

**If all tests pass:**
- Feature is ready for production
- Document any edge cases found
- Update TESTING_DM.md with results

**If tests fail:**
- Capture error screenshots
- Note exact error messages
- Check TROUBLESHOOTING.md or IMPLEMENTATION_REFERENCE.md
- Open developer tools and inspect the error

---

## Code Files Quick Reference

| Component | File | Purpose |
|-----------|------|---------|
| Backend Server | `backend/server.js` | Socket.IO handler & routes |
| Message Model | `backend/models/Message.js` | MongoDB schema |
| Message API | `backend/controllers/messageController.js` | REST endpoint |
| Socket Client | `src/services/socket.js` | Socket.IO client functions |
| DM UI | `src/components/dashboard/DirectMessaging.jsx` | Container component |
| DM View | `src/components/dashboard/MessageThread.jsx` | Message display |
| Workspace | `src/components/dashboard/SlackShell.jsx` | Conditional routing |

---

## Time Estimate

- **Setup**: 5 minutes
- **Quick Test Flow**: 10 minutes
- **Verification**: 5 minutes
- **Total**: ~20 minutes for complete validation

✨ **You should have working direct messaging in 20 minutes!**
