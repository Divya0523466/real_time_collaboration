import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Theme } from "emoji-picker-react";
import { useTheme } from "../../context/ThemeContext";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

const MessageReactionPicker = ({
  onSelectEmoji,
  align = "right",
  variant = "icon",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setShowFullPicker(false);
      }
    };

    if (isOpen || showFullPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, showFullPicker]);

  const handleQuickEmojiClick = (emoji, e) => {
    e.stopPropagation();
    onSelectEmoji(emoji);
    setIsOpen(false);
    setShowFullPicker(false);
  };

  const handleFullPickerSelect = (emojiData) => {
    if (emojiData?.emoji) {
      onSelectEmoji(emojiData.emoji);
      setIsOpen(false);
      setShowFullPicker(false);
    }
  };

  return (
    <div
      className={`relative inline-flex items-center flex-shrink-0 ${className}`}
      ref={containerRef}
    >
      {/* Trigger Button: Pill in reaction badge row vs Icon in hover action bar */}
      {variant === "pill" ? (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setIsOpen((prev) => !prev);
            setShowFullPicker(false);
          }}
          aria-label="Add reaction"
          className="inline-flex h-6 items-center justify-center px-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-transparent hover:bg-gray-100/80 dark:hover:bg-[#222529] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
          title="Add reaction"
        >
          <i className="fa-regular fa-face-smile text-xs" />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setIsOpen((prev) => !prev);
            setShowFullPicker(false);
          }}
          aria-label="Add reaction"
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1E2525] transition-colors"
          title="React"
        >
          <i className="fa-regular fa-face-smile text-[11px]" />
        </button>
      )}

      {isOpen && !showFullPicker && (
        <div
          className={`absolute bottom-full mb-1.5 ${
            align === "left" ? "left-0" : "right-0"
          } z-50 flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D21] p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100 select-none`}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => handleQuickEmojiClick(emoji, e)}
              className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-115 active:scale-95 transition-transform duration-75 cursor-pointer"
              title={emoji}
            >
              {emoji}
            </button>
          ))}

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />

          {/* Button to open full Emoji Picker */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullPicker(true);
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
            title="Find another reaction"
          >
            <i className="fa-solid fa-plus text-[11px]" />
          </button>
        </div>
      )}

      {/* Full Emoji Picker Popover */}
      {showFullPicker && (
        <div
          className={`absolute ${
            align === "left" ? "left-0" : "right-0"
          } bottom-full mb-2 z-50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden`}
        >
          <Suspense
            fallback={
              <div className="w-[320px] h-[380px] flex items-center justify-center bg-white dark:bg-[#1E2525] text-xs text-[#52656A] dark:text-[#A5C9CA]">
                <i className="fa-solid fa-circle-notch fa-spin mr-2" /> Loading
                emojis...
              </div>
            }
          >
            <EmojiPicker
              onEmojiClick={handleFullPickerSelect}
              theme={isDark ? Theme.DARK : Theme.LIGHT}
              autoFocusSearch={false}
              width={320}
              height={380}
              emojiSize={24}
              previewConfig={{ showPreview: false }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default MessageReactionPicker;
