import { useState, useRef, useEffect } from "react"
import EmojiPicker, { Theme } from "emoji-picker-react"
import { useTheme } from "../../context/ThemeContext"

const EmojiPickerButton = ({
  onEmojiSelect,
  buttonClassName = "",
  positionClass = "bottom-full mb-2 right-0",
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const { isDark } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleEmojiClick = (emojiData) => {
    if (emojiData?.emoji) {
      onEmojiSelect(emojiData.emoji)
    }
  }

  return (
    <div className="relative inline-flex items-center flex-shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          buttonClassName ||
          "flex items-center justify-center h-8 w-8 rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition-colors"
        }
        title="Add emoji"
        aria-label="Add emoji"
      >
        <i className="fa-regular fa-face-smile text-lg" />
      </button>

      {isOpen && (
        <div className={`absolute ${positionClass} z-50 shadow-2xl rounded-2xl overflow-hidden border border-[#D0DCDB] dark:border-[#395B64]/60`}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={isDark ? Theme.DARK : Theme.LIGHT}
            autoFocusSearch={false}
            width={340}
            height={400}
            emojiSize={28}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </div>
  )
}

export default EmojiPickerButton
