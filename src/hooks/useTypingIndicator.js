import { useState, useEffect, useRef, useCallback } from "react";
import {
  sendTypingStart,
  sendTypingStop,
  onUserTyping,
  offUserTyping,
  onUserStopTyping,
  offUserStopTyping,
} from "../services/socket";

export const useTypingIndicator = ({ type, targetId, currentUserId }) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const expiryTimersRef = useRef(new Map());

  const targetIdStr = targetId?.toString();
  const currentUserIdStr = currentUserId?.toString();

  // Clear a user's safety expiration timer
  const clearExpiryTimer = useCallback((userId) => {
    if (expiryTimersRef.current.has(userId)) {
      clearTimeout(expiryTimersRef.current.get(userId));
      expiryTimersRef.current.delete(userId);
    }
  }, []);

  // Call when current user presses a key in the input box
  const handleKeystroke = useCallback(
    (text) => {
      if (!type || !targetIdStr) return;

      // If text is cleared, immediately stop typing
      if (!text || text.trim() === "") {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          sendTypingStop(type, targetIdStr);
        }
        return;
      }

      // emit start
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTypingStart(type, targetIdStr);
      }

      // Reset the 2.5s debounce timeout on every keystroke
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        sendTypingStop(type, targetIdStr);
      }, 2500);
    },
    [type, targetIdStr],
  );

  // Immediately stop typing
  const handleStopTypingNow = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current && type && targetIdStr) {
      isTypingRef.current = false;
      sendTypingStop(type, targetIdStr);
    }
  }, [type, targetIdStr]);

  // Stop typing
  useEffect(() => {
    return () => {
      handleStopTypingNow();
    };
  }, [handleStopTypingNow]);

  // Reset typing users list when target changes
  useEffect(() => {
    // Clear all timers
    expiryTimersRef.current.forEach((timer) => clearTimeout(timer));
    expiryTimersRef.current.clear();
    setTypingUsers([]);
  }, [type, targetIdStr]);

  // Listen for socket events from other users
  useEffect(() => {
    if (!type || !targetIdStr) return;

    const handleUserTyping = (data) => {
      if (!data || data.type !== type) return;

      const matchesConversation =
        type === "dm"
          ? data.userId?.toString() === targetIdStr ||
            data.targetId?.toString() === targetIdStr
          : data.targetId?.toString() === targetIdStr;

      if (!matchesConversation) {
        return;
      }

      // Ignore typing events from current user
      const incomingUserId = data.userId?.toString();
      if (!incomingUserId || incomingUserId === currentUserIdStr) {
        return;
      }

      // Add to typing users list if not already present
      setTypingUsers((prev) => {
        const exists = prev.some((u) => u.userId === incomingUserId);
        if (exists) return prev;
        return [
          ...prev,
          {
            userId: incomingUserId,
            username: data.username || "Someone",
            avatar: data.avatar || "",
          },
        ];
      });

      // Set a 3.5s self-destruct
      clearExpiryTimer(incomingUserId);
      const timer = setTimeout(() => {
        setTypingUsers((prev) =>
          prev.filter((u) => u.userId !== incomingUserId),
        );
        expiryTimersRef.current.delete(incomingUserId);
      }, 3500);
      expiryTimersRef.current.set(incomingUserId, timer);
    };

    const handleUserStopTyping = (data) => {
      if (!data || data.type !== type) return;

      const matchesConversation =
        type === "dm"
          ? data.userId?.toString() === targetIdStr ||
            data.targetId?.toString() === targetIdStr
          : data.targetId?.toString() === targetIdStr;

      if (!matchesConversation) {
        return;
      }

      const incomingUserId = data.userId?.toString();
      if (!incomingUserId) return;

      clearExpiryTimer(incomingUserId);
      setTypingUsers((prev) => prev.filter((u) => u.userId !== incomingUserId));
    };

    onUserTyping(handleUserTyping);
    onUserStopTyping(handleUserStopTyping);

    return () => {
      offUserTyping(handleUserTyping);
      offUserStopTyping(handleUserStopTyping);
    };
  }, [type, targetIdStr, currentUserIdStr, clearExpiryTimer]);

  // Helper text formulation
  let typingText = "";
  if (typingUsers.length === 1) {
    typingText = `${typingUsers[0].username} is typing...`;
  } else if (typingUsers.length === 2) {
    typingText = `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
  } else if (typingUsers.length > 2) {
    typingText = `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`;
  }

  return {
    typingUsers,
    typingText,
    isAnyoneTyping: typingUsers.length > 0,
    handleKeystroke,
    handleStopTypingNow,
  };
};

export default useTypingIndicator;
