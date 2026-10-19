import React, { useState } from "react";

const MessageReactions = ({
  reactions = [],
  currentUserId,
  onToggleReaction,
  className = "",
}) => {
  const [activeTooltip, setActiveTooltip] = useState(null);

  if (!reactions || !Array.isArray(reactions) || reactions.length === 0) {
    return null;
  }

  const formatTooltip = (users = []) => {
    if (!users || users.length === 0) return "";

    const names = users.map((u) => {
      const uId = (u.userId?._id || u.userId)?.toString();
      const isMe = uId === currentUserId?.toString();
      return isMe ? "You" : u.username || "Someone";
    });

    if (names.length === 1) {
      return `${names[0]} reacted`;
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]} reacted`;
    }
    if (names.length === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} reacted`;
    }
    return `${names.slice(0, 2).join(", ")} and ${names.length - 2} others reacted`;
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1 mt-1 select-none ${className}`}
    >
      {reactions.map((r) => {
        if (!r.emoji || !r.users || r.users.length === 0) return null;

        const count = r.users.length;
        const showCount = count > 1;
        const hasReacted = r.users.some(
          (u) =>
            (u.userId?._id || u.userId)?.toString() ===
            currentUserId?.toString(),
        );
        const tooltipText = formatTooltip(r.users);
        const isHovered = activeTooltip === r.emoji;

        return (
          <div key={r.emoji} className="relative inline-flex items-center">
            <button
              type="button"
              onClick={() => onToggleReaction(r.emoji)}
              onMouseEnter={() => setActiveTooltip(r.emoji)}
              onMouseLeave={() => setActiveTooltip(null)}
              className={`inline-flex items-center rounded-full text-xs font-medium border shadow-xs transition-colors cursor-pointer active:scale-95 ${
                showCount ? "h-6 px-2 gap-1" : "h-6 w-6 justify-center"
              } ${
                hasReacted
                  ? "bg-[#E8F5FA] dark:bg-[#1D9BD1]/20 border-[#1D9BD1] text-[#1264A3] dark:text-[#78C5E7] font-semibold"
                  : "bg-white dark:bg-[#202727] border-gray-200 dark:border-[#395B64]/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C3333]"
              }`}
              title={tooltipText}
              aria-label={showCount ? `${r.emoji} ${count} reactions` : r.emoji}
            >
              <span className="text-[13px] leading-none">{r.emoji}</span>
              {showCount && (
                <span className="text-[11px] leading-none font-semibold">
                  {count}
                </span>
              )}
            </button>

            {/* Slack-style clean dark tooltip */}
            {isHovered && tooltipText && (
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-[#1D1C1D] text-white px-2 py-1 text-[11px] font-medium shadow-md z-30 animate-in fade-in duration-75">
                <span className="mr-1">{r.emoji}</span>
                {tooltipText}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MessageReactions;
