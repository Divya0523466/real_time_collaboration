import PropTypes from "prop-types";

// Helper to test if a string is a valid URL
const isUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Helper to determine if a URL points to an image
const isImageUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) !== null ||
    lower.includes("/image/upload/")
  );
};

// Helper to extract a friendly file name from a URL
const getFileNameFromUrl = (url) => {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/");
    const lastPart = parts[parts.length - 1] || "Attachment";
    return decodeURIComponent(lastPart);
  } catch {
    return "Attachment";
  }
};

const MessageContent = ({ content, isSender, className = "" }) => {
  if (!content) return null;

  // Split content by whitespace / lines to find URLs
  const tokens = content.split(/(\s+)/);

  // Check if entire content is a single URL
  const trimmed = content.trim();
  const isSingleUrl = isUrl(trimmed);

  if (isSingleUrl) {
    if (isImageUrl(trimmed)) {
      return (
        <div className={`mt-1 ${className}`}>
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-sm overflow-hidden rounded-lg border border-black/10 shadow-sm hover:opacity-95 transition-opacity"
          >
            <img
              src={trimmed}
              alt="Uploaded file"
              loading="lazy"
              className="max-h-60 w-auto rounded-lg object-contain bg-black/5"
            />
          </a>
        </div>
      );
    }

    // Single document / file URL
    const fileName = getFileNameFromUrl(trimmed);
    return (
      <div className={`mt-1 ${className}`}>
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          download
          className={`flex max-w-sm items-center gap-2.5 rounded-lg border p-2 text-xs transition-all shadow-sm ${
            isSender
              ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
              : "border-[#A5C9CA] bg-white text-[#2C3333] hover:bg-[#F8FAFB] hover:border-[#395B64]"
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${
              isSender ? "bg-white/20 text-white" : "bg-[#E7F6F2] text-[#395B64]"
            }`}
          >
            <i className="fa-solid fa-file-arrow-down text-sm" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{fileName}</p>
            <p className={`text-[10px] ${isSender ? "text-white/80" : "text-[#52656A]"}`}>
              Click to view / download
            </p>
          </div>
          <i
            className={`fa-solid fa-arrow-up-right-from-square text-[10px] shrink-0 ${
              isSender ? "text-white/70" : "text-[#52656A]"
            }`}
          />
        </a>
      </div>
    );
  }

  // Mixed text with potential URLs
  const elements = [];
  let currentText = "";

  tokens.forEach((token, index) => {
    if (isUrl(token.trim())) {
      const url = token.trim();
      if (currentText) {
        elements.push(
          <span key={`text-${index}`} className="whitespace-pre-wrap">
            {currentText}
          </span>
        );
        currentText = "";
      }

      if (isImageUrl(url)) {
        elements.push(
          <div key={`img-${index}`} className="my-1.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-sm overflow-hidden rounded-lg border border-black/10 shadow-sm hover:opacity-95 transition-opacity"
            >
              <img
                src={url}
                alt="Attachment"
                loading="lazy"
                className="max-h-60 w-auto rounded-lg object-contain bg-black/5"
              />
            </a>
          </div>
        );
      } else {
        const fileName = getFileNameFromUrl(url);
        elements.push(
          <div key={`file-${index}`} className="my-1.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={`flex max-w-sm items-center gap-2.5 rounded-lg border p-2 text-xs transition-all shadow-sm ${
                isSender
                  ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                  : "border-[#A5C9CA] bg-white text-[#2C3333] hover:bg-[#F8FAFB] hover:border-[#395B64]"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${
                  isSender ? "bg-white/20 text-white" : "bg-[#E7F6F2] text-[#395B64]"
                }`}
              >
                <i className="fa-solid fa-file-arrow-down text-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{fileName}</p>
                <p className={`text-[10px] ${isSender ? "text-white/80" : "text-[#52656A]"}`}>
                  Click to view / download
                </p>
              </div>
              <i
                className={`fa-solid fa-arrow-up-right-from-square text-[10px] shrink-0 ${
                  isSender ? "text-white/70" : "text-[#52656A]"
                }`}
              />
            </a>
          </div>
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

MessageContent.propTypes = {
  content: PropTypes.string,
  isSender: PropTypes.bool,
  className: PropTypes.string,
};

MessageContent.defaultProps = {
  content: "",
  isSender: false,
  className: "",
};

export default MessageContent;
