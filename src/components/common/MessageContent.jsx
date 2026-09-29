import AttachmentRenderer, { AttachmentItem } from "./AttachmentRenderer";
import {
  isUrl,
  isUploadedFileUrl,
  parseAttachmentFromUrl,
} from "../../utils/fileUtils";

const MessageContent = ({
  content = "",
  attachments = [],
  isSender = false,
  isPure = false,
  className = "",
}) => {
  const hasStructuredAttachments = Array.isArray(attachments) && attachments.length > 0;
  const hasText = Boolean(content && content.trim());

  // If structured attachments exist
  if (hasStructuredAttachments) {
    return (
      <div className={`wrap-break-word ${className}`}>
        {hasText && (
          <p className="whitespace-pre-wrap leading-relaxed select-text mb-1">{content}</p>
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

  // Mixed text with potential URLs
  const tokens = content.split(/(\s+)/);
  const elements = [];
  let currentText = "";

  tokens.forEach((token, index) => {
    const tokenTrimmed = token.trim();
    if (isUrl(tokenTrimmed)) {
      if (currentText) {
        elements.push(
          <span key={`text-${index}`} className="whitespace-pre-wrap">
            {currentText}
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
        {currentText}
      </span>
    );
  }

  return <div className={`wrap-break-word ${className}`}>{elements}</div>;
};

export default MessageContent;
