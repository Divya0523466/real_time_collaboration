/**
 * Mention utility functions for WorkNest
 */

/**
 * Special mention item representing all channel members.
 */
export const ALL_MENTION_USER = {
  id: "all",
  username: "all",
  displayName: "Notify everyone in this channel",
  email: "All channel members",
  isAll: true,
};

/**
 * Detects if the cursor is currently in an active @mention token.
 * Triggers only when '@' is at the start of text or preceded by whitespace.
 * Excludes email addresses like "user@example.com".
 *
 * @param {string} text - Current input value
 * @param {number} cursorPos - Current cursor position in input
 * @returns {{ query: string, atIndex: number, length: number } | null}
 */
export const getMentionQuery = (text, cursorPos) => {
  if (typeof text !== "string" || cursorPos === null || cursorPos === undefined) {
    return null;
  }

  const beforeCursor = text.slice(0, cursorPos);
  // Match '@' preceded by start of string or whitespace, followed by valid mention characters up to cursor
  const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
  if (!match) return null;

  const query = match[1];
  const atIndex = beforeCursor.lastIndexOf("@");
  return {
    query,
    atIndex,
    length: query.length + 1,
  };
};

/**
 * Filters a list of members based on the mention query.
 * Excludes the current logged-in user (no self-mention).
 * Optionally prepends `@all` when includeAll is enabled and query matches "all".
 *
 * @param {Array} members - List of member objects
 * @param {string} query - The search query after '@'
 * @param {Object} options - { currentUserId: string, includeAll: boolean }
 * @returns {Array} - Filtered list of members
 */
export const filterMentionUsers = (members = [], query = "", options = {}) => {
  if (!Array.isArray(members)) return [];
  const q = (query || "").trim().toLowerCase();
  const currentUserId = options?.currentUserId?.toString();
  const includeAll = Boolean(options?.includeAll);

  const normalized = members
    .map((m) => {
      if (!m) return null;
      const id = m.id || m._id || (typeof m === "string" ? m : null);
      if (!id) return null;
      const username = m.username || m.name || m.email?.split("@")[0] || "User";
      const displayName = m.displayName || m.name || m.username || "";
      const email = m.email || "";
      const avatar = m.avatar || m.avatarUrl || null;
      return { id: id.toString(), username, displayName, email, avatar };
    })
    .filter((u) => u && (!currentUserId || u.id !== currentUserId));

  let results = [];
  if (!q) {
    results = normalized.slice(0, 8);
  } else {
    results = normalized
      .filter((u) => {
        const matchUsername = u.username.toLowerCase().includes(q);
        const matchDisplay = u.displayName.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        return matchUsername || matchDisplay || matchEmail;
      })
      .slice(0, 8);
  }

  // Prepend @all suggestion if enabled for groups/channels and query matches
  if (includeAll && (!q || "all".startsWith(q))) {
    results = [ALL_MENTION_USER, ...results];
  }

  return results;
};

/**
 * Inserts the selected user's mention into the text at the cursor position,
 * replacing the active '@query' and positioning the cursor right after.
 *
 * @param {string} text - Current input text
 * @param {number} cursorPos - Cursor position when selected
 * @param {Object} user - Selected user object
 * @returns {{ newText: string, newCursorPos: number }}
 */
export const applyMentionSelection = (text, cursorPos, user) => {
  if (typeof text !== "string") return { newText: "", newCursorPos: 0 };
  const beforeCursor = text.slice(0, cursorPos);
  const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
  if (!match) return { newText: text, newCursorPos: cursorPos };

  const atIndex = beforeCursor.lastIndexOf("@");
  const beforeAt = text.slice(0, atIndex);
  const afterCursor = text.slice(cursorPos);

  const usernameToInsert = user.username || user.name || "all";
  const insertText = `@${usernameToInsert} `;
  const newText = `${beforeAt}${insertText}${afterCursor}`;
  const newCursorPos = beforeAt.length + insertText.length;

  return { newText, newCursorPos };
};

/**
 * Scans text for '@username' tokens and extracts the corresponding user IDs.
 * - If text contains '@all', all member user IDs (excluding sender/currentUserId) are included.
 * - Filters out the current user's ID so self-mentions are not registered.
 * - Deduplicates multiple mentions of the same user.
 *
 * @param {string} text - Input text
 * @param {Array} members - Available members in context
 * @param {Map|Object} extraUserMap - Optional map of previously resolved { username -> id }
 * @param {Object} options - { currentUserId: string, channelMembers: Array }
 * @returns {string[]} Array of unique user IDs
 */
export const extractMentionIdsFromText = (
  text,
  members = [],
  extraUserMap = null,
  options = {}
) => {
  if (!text || typeof text !== "string") return [];

  const currentUserId = options?.currentUserId?.toString();
  const allMembers = Array.isArray(options?.channelMembers) && options.channelMembers.length > 0
    ? options.channelMembers
    : members;

  const collectedIds = new Set();

  // 1. Check if '@all' is mentioned
  const hasAllMention = /(?:^|\s)@all(?:\b|\s|$)/i.test(text);
  if (hasAllMention && Array.isArray(allMembers)) {
    allMembers.forEach((m) => {
      const id = (m?.id || m?._id || (typeof m === "string" ? m : null))?.toString();
      if (id && (!currentUserId || id !== currentUserId)) {
        collectedIds.add(id);
      }
    });
  }

  // 2. Match all specific @username patterns
  const matches = text.match(/(?:^|\s)@([a-zA-Z0-9_.-]+)/g);
  if (matches) {
    const usernames = matches.map((m) => m.trim().slice(1).toLowerCase());

    const userMap = new Map();
    if (Array.isArray(allMembers)) {
      allMembers.forEach((m) => {
        if (m && (m.id || m._id)) {
          const id = (m.id || m._id).toString();
          const username = m.username || m.name || m.email?.split("@")[0];
          if (username) {
            userMap.set(username.toLowerCase(), id);
          }
        }
      });
    }

    if (extraUserMap) {
      const entries =
        extraUserMap instanceof Map ? extraUserMap.entries() : Object.entries(extraUserMap);
      for (const [k, v] of entries) {
        if (k && v) userMap.set(k.toLowerCase(), v.toString());
      }
    }

    usernames.forEach((name) => {
      if (name === "all") return; // Already handled above
      const id = userMap.get(name);
      if (id && (!currentUserId || id !== currentUserId)) {
        collectedIds.add(id);
      }
    });
  }

  return [...collectedIds];
};
