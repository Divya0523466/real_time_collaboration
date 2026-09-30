import { useState, useMemo, useRef, useCallback } from "react";
import {
  getMentionQuery,
  filterMentionUsers,
  applyMentionSelection,
  extractMentionIdsFromText,
} from "../utils/mentionUtils";


export const useMentionInput = (params = {}) => {
  const isArrayConfig = Array.isArray(params);
  const members = isArrayConfig ? params : params.members || [];
  const hasControlledValue = !isArrayConfig && typeof params.setInputValue === "function";
  const currentUserId = !isArrayConfig ? (params.currentUserId || params.excludeUserId) : null;
  const includeAll = !isArrayConfig ? Boolean(params.includeAll) : false;
  const channelMembers = !isArrayConfig ? (params.channelMembers || members) : members;

  const [internalValue, setInternalValue] = useState("");
  const currentValue = hasControlledValue ? (params.inputValue ?? "") : internalValue;

  const updateValue = useCallback(
    (val) => {
      if (hasControlledValue) {
        params.setInputValue(val);
      } else {
        setInternalValue(val);
      }
    },
    [hasControlledValue, params.setInputValue]
  );

  const [cursorPos, setCursorPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const explicitMentionMapRef = useRef(new Map());

  // Detect mention query at cursor
  const mentionMatch = useMemo(() => {
    if (isDismissed) return null;
    return getMentionQuery(currentValue, cursorPos);
  }, [currentValue, cursorPos, isDismissed]);

  const isMentionOpen = Boolean(mentionMatch);

  // Filter available members
  const filteredUsers = useMemo(() => {
    if (!mentionMatch) return [];
    return filterMentionUsers(members, mentionMatch.query, {
      currentUserId,
      includeAll,
    });
  }, [members, mentionMatch, currentUserId, includeAll]);

  // Keep selectedIndex within bounds
  const safeSelectedIndex = useMemo(() => {
    if (filteredUsers.length === 0) return 0;
    return Math.min(selectedIndex, filteredUsers.length - 1);
  }, [selectedIndex, filteredUsers.length]);

  // Handle input change: supports (e) or (val, pos)
  const handleChange = useCallback(
    (valOrEvent, pos) => {
      if (valOrEvent && typeof valOrEvent === "object" && "target" in valOrEvent) {
        const e = valOrEvent;
        updateValue(e.target.value);
        setCursorPos(e.target.selectionStart ?? e.target.value.length);
      } else {
        updateValue(valOrEvent);
        if (typeof pos === "number") {
          setCursorPos(pos);
        } else {
          setCursorPos((valOrEvent || "").length);
        }
      }
      setIsDismissed(false);
      setSelectedIndex(0);
    },
    [updateValue]
  );

  // Update cursor position: supports (pos) or (e)
  const handleCursorChange = useCallback((posOrEvent) => {
    if (posOrEvent && typeof posOrEvent === "object" && "target" in posOrEvent) {
      setCursorPos(posOrEvent.target.selectionStart ?? 0);
    } else if (typeof posOrEvent === "number") {
      setCursorPos(posOrEvent);
    }
  }, []);

  const selectUser = useCallback(
    (user, customTextareaRef = null) => {
      if (!user) return;
      const { newText, newCursorPos } = applyMentionSelection(
        currentValue,
        cursorPos,
        user
      );

      // Save in explicit mention map for reliable ID extraction
      if (user.username && user.id) {
        explicitMentionMapRef.current.set(user.username.toLowerCase(), user.id);
      }

      updateValue(newText);
      setCursorPos(newCursorPos);
      setIsDismissed(true);
      setSelectedIndex(0);

      const targetEl =
        customTextareaRef ||
        (!isArrayConfig && params.textareaRef?.current ? params.textareaRef.current : null);

      setTimeout(() => {
        if (targetEl) {
          targetEl.focus();
          targetEl.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [currentValue, cursorPos, updateValue, isArrayConfig, params.textareaRef]
  );

  const reset = useCallback(() => {
    updateValue("");
    setCursorPos(0);
    setSelectedIndex(0);
    setIsDismissed(false);
    explicitMentionMapRef.current.clear();
  }, [updateValue]);

  // Keyboard navigation: returns true if event was handled (intercepted)
  const handleKeyDown = useCallback(
    (e) => {
      if (!isMentionOpen) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredUsers.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        }
        return true;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredUsers.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        }
        return true;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        if (filteredUsers.length > 0 && filteredUsers[safeSelectedIndex]) {
          e.preventDefault();
          selectUser(filteredUsers[safeSelectedIndex]);
          return true;
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setIsDismissed(true);
        return true;
      }

      return false;
    },
    [isMentionOpen, filteredUsers, safeSelectedIndex, selectUser]
  );

  // Extract all mentioned IDs from current text
  const getMentionedUserIds = useCallback(
    (text = currentValue) => {
      return extractMentionIdsFromText(text, members, explicitMentionMapRef.current, {
        currentUserId,
        channelMembers,
      });
    },
    [currentValue, members, currentUserId, channelMembers]
  );

  return {
    value: currentValue,
    setValue: updateValue,
    isMentionOpen,
    isOpen: isMentionOpen,
    filteredUsers,
    selectedIndex: safeSelectedIndex,
    activeIndex: safeSelectedIndex,
    setSelectedIndex,
    handleInputChange: handleChange,
    handleChange,
    handleInputSelect: handleCursorChange,
    handleCursorChange,
    handleKeyDown,
    selectUser,
    closeMention: () => setIsDismissed(true),
    reset,
    getMentionedUserIds,
  };
};

export default useMentionInput;
