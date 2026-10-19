import React from "react"

const TypingIndicator = ({ typingText, isAnyoneTyping, className = "" }) => {
  if (!isAnyoneTyping || !typingText) {
    return null
  }

  return (
    <div
      className={`flex items-center gap-2 py-1 px-3 text-xs text-[#52656A] dark:text-[#A5C9CA] select-none transition-all duration-150 ${className}`}
      aria-live="polite"
    >
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#395B64] dark:bg-[#A5C9CA] animate-bounce"
          style={{ animationDuration: "1s", animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#395B64] dark:bg-[#A5C9CA] animate-bounce"
          style={{ animationDuration: "1s", animationDelay: "200ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#395B64] dark:bg-[#A5C9CA] animate-bounce"
          style={{ animationDuration: "1s", animationDelay: "400ms" }}
        />
      </div>
      <span className="font-medium italic truncate">{typingText}</span>
    </div>
  )
}

export default TypingIndicator
