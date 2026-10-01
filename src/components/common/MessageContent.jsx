import AttachmentRenderer, { AttachmentItem } from "./AttachmentRenderer";
import {
  isUrl,
  isUploadedFileUrl,
  parseAttachmentFromUrl,
} from "../../utils/fileUtils";
import { useWorkspace } from "../../context/WorkspaceContext";

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCandidateMentions = (
  activeUser,
  activeUserId,
  workspaceMembers = [],
  mentions = []
) => {
  const map = new Map();

  // 1. @all is always recognized and treated as a mention of the current user
  map.set("all", { isSelf: true, isAll: true, name: "all" });

  const addTarget = (name, isSelf) => {
    if (!name || typeof name !== "string") return;
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      const lower = trimmed.toLowerCase();
      const existing = map.get(lower);
      if (!existing || isSelf) {
        map.set(lower, { isSelf: Boolean(isSelf), name: trimmed });
      }
    }
  };

  // 2. Active logged-in user
  if (activeUser) {
    if (activeUser.username) addTarget(activeUser.username, true);
    if (activeUser.displayName) addTarget(activeUser.displayName, true);
    if (activeUser.name) addTarget(activeUser.name, true);
  }

  // 3. Workspace members
  if (Array.isArray(workspaceMembers)) {
    workspaceMembers.forEach((m) => {
      const mId = (m?.id || m?._id)?.toString();
      const isThisSelf = Boolean(activeUserId && mId && mId === activeUserId.toString());
      if (m?.username) addTarget(m.username, isThisSelf);
      if (m?.displayName) addTarget(m.displayName, isThisSelf);
      if (m?.name) addTarget(m.name, isThisSelf);
    });
  }

  // 4. Populated mentions array if any
  if (Array.isArray(mentions)) {
    mentions.forEach((m) => {
      const u = m.userId;
      if (u && typeof u === "object") {
        const uId = (u.id || u._id)?.toString();
        const isThisSelf = Boolean(activeUserId && uId && uId === activeUserId.toString());
        if (u.username) addTarget(u.username, isThisSelf);
        if (u.displayName) addTarget(u.displayName, isThisSelf);
        if (u.name) addTarget(u.name, isThisSelf);
      }
    });
  }

  return map;
};

const renderTextWithMentions = (
  text,
  mentions = [],
  activeUserId = null,
  activeUser = null,
  workspaceMembers = []
) => {
  if (!text) return null;

  const candidateMap = getCandidateMentions(
    activeUser,
    activeUserId,
    workspaceMembers,
    mentions
  );

  const hasSelfInMentions =
    Array.isArray(mentions) &&
    mentions.some((m) => {
      const id = m?.userId?._id || m?.userId?.id || m?.userId || m;
      return id && id.toString() === activeUserId?.toString();
    });

  // Sort candidate names by length descending so longer multi-word names match first
  const sortedCandidates = Array.from(candidateMap.keys())
    .filter((k) => k !== "all")
    .sort((a, b) => b.length - a.length);

  const candidatePattern =
    sortedCandidates.length > 0
      ? `${sortedCandidates.map(escapeRegExp).join("|")}|`
      : "";

  const regex = new RegExp(
    `(^|\\s)@\\s*(${candidatePattern}all|[a-zA-Z0-9_.-]+)`,
    "gi"
  );

  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const leadingSpace = match[1] || "";
    const mentionTarget = match[2];
    const fullMatch = match[0];

    const textBefore = text.slice(lastIndex, matchIndex);
    if (textBefore) {
      elements.push(textBefore);
    }
    if (leadingSpace) {
      elements.push(leadingSpace);
    }

    const lowerTarget = mentionTarget.toLowerCase();
    const candidateInfo = candidateMap.get(lowerTarget);

    let isSelf = false;
    if (lowerTarget === "all") {
      isSelf = true;
    } else if (candidateInfo) {
      isSelf = candidateInfo.isSelf;
    } else if (activeUser) {
      const uName = (activeUser.username || "").toLowerCase();
      const dName = (activeUser.displayName || "").toLowerCase();
      const name = (activeUser.name || "").toLowerCase();
      isSelf =
        (uName && lowerTarget === uName) ||
        (dName && lowerTarget === dName) ||
        (name && lowerTarget === name);
    }

    if (!isSelf && hasSelfInMentions) {
      const isKnownOther = candidateInfo && !candidateInfo.isSelf;
      if (!isKnownOther) {
        isSelf = true;
      }
    }

    // Google Workspace style:
    // - For self: highly visible theme-accent pill (stands out vividly on grey/tinted bubbles)
    // - For other users: clean white pill (visible on grey/tinted bubbles without overpowering self mentions)
    elements.push(
      <span
        key={`mention-${matchIndex}`}
        className={
          isSelf
            ? "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold select-text bg-[#A5C9CA] text-[#072B2E] dark:bg-[#255458] dark:text-[#DCFAF6] border border-[#70A2A4]/60 dark:border-[#38767B] shadow-2xs mx-0.5 align-baseline"
            : "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium select-text bg-white dark:bg-[#1A2222] text-[#2C3333] dark:text-[#E0E7E6] border border-[#D0DCDB] dark:border-[#2C3535] shadow-2xs mx-0.5 align-baseline"
        }
      >
        <span className="font-bold opacity-80 mr-1">@</span>
        <span>{mentionTarget}</span>
      </span>
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    elements.push(remainingText);
  }

  return elements;
};

const MessageContent = ({
  content = "",
  attachments = [],
  isSender = false,
  isPure = false,
  className = "",
  mentions = [],
  currentUserId = null,
  currentUsername = null,
}) => {
  const { user, workspaceData } = useWorkspace();
  const activeUserId = currentUserId || user?.id || user?._id;
  const activeUser = user
    ? {
        ...user,
        username: currentUsername || user.username,
      }
    : currentUsername
    ? { username: currentUsername }
    : null;
  const workspaceMembers = workspaceData?.members || [];

  const hasStructuredAttachments = Array.isArray(attachments) && attachments.length > 0;
  const hasText = Boolean(content && content.trim());

  // If structured attachments exist
  if (hasStructuredAttachments) {
    return (
      <div className={`wrap-break-word ${className}`}>
        {hasText && (
          <p className="whitespace-pre-wrap leading-relaxed select-text mb-1">
            {renderTextWithMentions(content, mentions, activeUserId, activeUser, workspaceMembers)}
          </p>
        )}
        <AttachmentRenderer
          attachments={attachments}
          isSender={isSender}
          isPure={!hasText || isPure}
        />
      </div>
    );
  }

  if (!content) return null;

  const trimmed = content.trim();

  // Backward compatibility: If message is only a file URL
  if (isUrl(trimmed) && isUploadedFileUrl(trimmed)) {
    const syntheticAttachment = parseAttachmentFromUrl(trimmed);
    return (
      <div className={`wrap-break-word ${className}`}>
        <AttachmentItem
          attachment={syntheticAttachment}
          isSender={isSender}
          isPure
        />
      </div>
    );
  }

  // Mixed text with potential URLs and @mentions
  const tokens = content.split(/(\s+)/);
  const elements = [];
  let currentText = "";

  tokens.forEach((token, index) => {
    const tokenTrimmed = token.trim();
    if (isUrl(tokenTrimmed)) {
      if (currentText) {
        elements.push(
          <span key={`text-${index}`} className="whitespace-pre-wrap">
            {renderTextWithMentions(currentText, mentions, activeUserId, activeUser, workspaceMembers)}
          </span>
        );
        currentText = "";
      }

      if (isUploadedFileUrl(tokenTrimmed)) {
        const syntheticAttachment = parseAttachmentFromUrl(tokenTrimmed);
        elements.push(
          <div key={`file-${index}`} className="my-1.5">
            <AttachmentItem attachment={syntheticAttachment} isSender={isSender} />
          </div>
        );
      } else {
        // Standard external web link
        elements.push(
          <a
            key={`link-${index}`}
            href={tokenTrimmed}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 hover:underline break-all"
          >
            {tokenTrimmed}
          </a>
        );
      }
    } else {
      currentText += token;
    }
  });

  if (currentText) {
    elements.push(
      <span key="tail" className="whitespace-pre-wrap">
        {renderTextWithMentions(currentText, mentions, activeUserId, activeUser, workspaceMembers)}
      </span>
    );
  }

  return <div className={`wrap-break-word ${className}`}>{elements}</div>;
};

export default MessageContent;
