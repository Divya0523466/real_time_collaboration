import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_EVENT = "worknest_drafts_updated";

/**
 * Returns a standardized localStorage key for a conversation draft
 */
export const getDraftStorageKey = (type, id) => {
  const cId = id ? id.toString() : "";
  return `worknest_draft_${type}_${cId}`;
};

/**
 * Reads a draft directly from localStorage
 */
export const getSavedDraft = (type, id) => {
  if (!type || !id) return "";
  const cId = id.toString();
  try {
    const primaryKey = `worknest_draft_${type}_${cId}`;
    const directVal = localStorage.getItem(primaryKey);
    if (directVal && directVal.trim() !== "") return directVal;

    // Fallback: search for any key ending in _{type}_{cId} (e.g. legacy worknest_draft_uid_channel_id)
    const suffix = `_${type}_${cId}`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("worknest_draft_") && k.endsWith(suffix)) {
        const val = localStorage.getItem(k);
        if (val && val.trim() !== "") return val;
      }
    }
    return "";
  } catch {
    return "";
  }
};

/**
 * Saves a draft directly to localStorage
 */
export const setSavedDraft = (type, id, text) => {
  if (!type || !id) return;
  const cId = id.toString();
  const primaryKey = `worknest_draft_${type}_${cId}`;
  try {
    if (!text || text.trim() === "") {
      localStorage.removeItem(primaryKey);
      // Clean up any legacy keys for this conversation
      const suffix = `_${type}_${cId}`;
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("worknest_draft_") && k.endsWith(suffix)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } else {
      localStorage.setItem(primaryKey, text);
    }
    window.dispatchEvent(new CustomEvent(DRAFT_EVENT, { detail: { type, id: cId } }));
  } catch {}
};

/**
 * Clears a draft directly from localStorage
 */
export const removeSavedDraft = (type, id) => {
  if (!type || !id) return;
  const cId = id.toString();
  const primaryKey = `worknest_draft_${type}_${cId}`;
  try {
    localStorage.removeItem(primaryKey);
    const suffix = `_${type}_${cId}`;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("worknest_draft_") && (k === primaryKey || k.endsWith(suffix))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent(DRAFT_EVENT, { detail: { type, id: cId } }));
  } catch {}
};

/**
 * Custom React hook for auto-saving and loading conversation drafts
 */
export const useMessageDraft = ({
  conversationType,
  conversationId,
  onDraftLoaded,
}) => {
  const cId = conversationId ? conversationId.toString() : null;
  const onDraftLoadedRef = useRef(onDraftLoaded);
  onDraftLoadedRef.current = onDraftLoaded;

  // Load draft on mount or whenever conversation changes
  useEffect(() => {
    if (!conversationType || !cId) return;
    const existingDraft = getSavedDraft(conversationType, cId);
    if (onDraftLoadedRef.current) {
      // Always notify with either the saved draft or empty string to reset the composer
      onDraftLoadedRef.current(existingDraft || "");
    }
  }, [conversationType, cId]);

  // Save draft
  const saveDraft = useCallback(
    (text) => {
      if (!conversationType || !cId) return;
      setSavedDraft(conversationType, cId, text);
    },
    [conversationType, cId]
  );

  // Clear draft
  const clearDraft = useCallback(() => {
    if (!conversationType || !cId) return;
    removeSavedDraft(conversationType, cId);
  }, [conversationType, cId]);

  return { saveDraft, clearDraft };
};

/**
 * Helper to scan all currently active draft keys in localStorage
 */
const getActiveDraftKeys = () => {
  const keys = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("worknest_draft_")) {
        const val = localStorage.getItem(k);
        if (val && val.trim() !== "") {
          const raw = k.replace("worknest_draft_", "");
          const parts = raw.split("_");
          if (parts.length === 2) {
            // "channel_123"
            keys.add(`${parts[0]}_${parts[1]}`);
          } else if (parts.length >= 3) {
            // "userId_channel_123" -> type = parts[parts.length - 2], id = parts[parts.length - 1]
            const type = parts[parts.length - 2];
            const id = parts[parts.length - 1];
            keys.add(`${type}_${id}`);
          }
        }
      }
    }
  } catch {}
  return keys;
};

/**
 * Reactive hook for sidebar to track which conversations currently have unsent drafts
 */
export const useDraftIndicators = () => {
  const [draftKeys, setDraftKeys] = useState(getActiveDraftKeys);

  const refreshDraftKeys = useCallback(() => {
    setDraftKeys(getActiveDraftKeys());
  }, []);

  useEffect(() => {
    refreshDraftKeys();
    window.addEventListener(DRAFT_EVENT, refreshDraftKeys);
    window.addEventListener("storage", refreshDraftKeys);
    return () => {
      window.removeEventListener(DRAFT_EVENT, refreshDraftKeys);
      window.removeEventListener("storage", refreshDraftKeys);
    };
  }, [refreshDraftKeys]);

  const hasDraft = useCallback(
    (type, id) => {
      if (!type || !id) return false;
      return draftKeys.has(`${type}_${id.toString()}`);
    },
    [draftKeys]
  );

  return { hasDraft, draftKeys, refreshDraftKeys };
};

export default useMessageDraft;
