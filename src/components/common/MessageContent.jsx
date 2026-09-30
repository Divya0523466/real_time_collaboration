import AttachmentRenderer, { AttachmentItem } from "./AttachmentRenderer";
import {
  isUrl,
  isUploadedFileUrl,
  parseAttachmentFromUrl,
} from "../../utils/fileUtils";
import { useWorkspace } from "../../context/WorkspaceContext";


const renderTextWithMentions = (text, mentions = [], currentUserId = null, currentUsername = null) => {
  if (!text) return null;

  const parts = text.split(/(^@[\w.-]+|\s+@[\w.-]+)/g);

  return parts.map((part, pIdx) => {
    const trimmedPart = part.trim();
    if (trimmedPart.startsWith("@") && trimmedPart.length > 1) {
     
      const match = trimmedPart.match(/^@([a-zA-Z0-9_.-]+)(.*)$/);
      if (match) {
        const mentionName = match[1];
        const trailing = match[2] || "";
        const leadingSpace = part.startsWith(" ") ? " " : "";

        const isAll = mentionName.toLowerCase() === "all";
        if (isAll) {
          return (
            <span key={`mention-${pIdx}`}>
              {leadingSpace}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs select-text bg-[#395B64] text-white dark:bg-[#A5C9CA] dark:text-[#121717] font-semibold">
                @all
              </span>
              {trailing}
            </span>
          );
        }

        
        const isSelf =
          (currentUsername && mentionName.toLowerCase() === currentUsername.toLowerCase()) ||
          (currentUserId &&
            Array.isArray(mentions) &&
            mentions.some(
              (m) =>
                (m.userId === currentUserId ||
                  m.userId?._id === currentUserId ||
                  m.userId?.toString() === currentUserId.toString()) &&
                mentionName.toLowerCase() === currentUsername?.toLowerCase()
            ));

        return (
          <span key={`mention-${pIdx}`}>
            {leadingSpace}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs select-text ${
                isSelf
                  ? "bg-[#395B64] text-white dark:bg-[#A5C9CA] dark:text-[#121717] font-semibold shadow-xs"
                  : "bg-[#E7F6F2] dark:bg-[#2C3333] text-[#395B64] dark:text-[#A5C9CA] font-medium border border-[#A5C9CA]/40 dark:border-[#395B64]/60"
              }`}
            >
              @{mentionName}
            </span>
            {trailing}
          </span>
        );
      }
    }

    return part;
  });
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
  const { user } = useWorkspace();
  const activeUserId = currentUserId || user?.id || user?._id;
  const activeUsername = currentUsername || user?.username;

  const hasStructuredAttachments = Array.isArray(attachments) && attachments.length > 0;
  const hasText = Boolean(content && content.trim());

  // If structured attachments exist
  if (hasStructuredAttachments) {
    return (
      <div className={`wrap-break-word ${className}`}>
        {hasText && (
          <p className="whitespace-pre-wrap leading-relaxed select-text mb-1">
            {renderTextWithMentions(content, mentions, activeUserId, activeUsername)}
          </p>
        )}
        <AttachmentRenderer attachments={attachments} isSender={isSender} isPure={!hasText || isPure} />
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
        <AttachmentItem attachment={syntheticAttachment} isSender={isSender} isPure />
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
            {renderTextWithMentions(currentText, mentions, activeUserId, activeUsername)}
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
        {renderTextWithMentions(currentText, mentions, activeUserId, activeUsername)}
      </span>
    );
  }

  return <div className={`wrap-break-word ${className}`}>{elements}</div>;
};

export default MessageContent;
