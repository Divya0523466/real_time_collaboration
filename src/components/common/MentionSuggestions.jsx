import { useEffect, useRef } from "react";

const AVATAR_COLORS = ["#395B64", "#4A7C88", "#52656A", "#2E6E79", "#3D7A52", "#5B6E7C"];
const getAvatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

const MentionSuggestions = ({
  isOpen = false,
  users = [],
  selectedIndex = 0,
  activeIndex,
  onSelect = () => {},
  onHoverIndex = () => {},
  className = "",
  positionClass = "",
}) => {
  const listRef = useRef(null);
  const currentIndex = activeIndex !== undefined ? activeIndex : selectedIndex;

  
  useEffect(() => {
    if (listRef.current && listRef.current.children[currentIndex]) {
      listRef.current.children[currentIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }, [currentIndex]);

  if (!isOpen) return null;

  return (
    <div
      className={`absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[#A5C9CA] dark:border-[#395B64] bg-white dark:bg-[#1E2525] shadow-xl overflow-hidden z-50 transition-all ${positionClass} ${className}`}
    >
      {/* Header title */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#F8FAFB] dark:bg-[#161B1B] border-b border-[#E0E7E6] dark:border-[#2C3333]">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#52656A] dark:text-[#A5C9CA]">
          <i className="fa-solid fa-at text-[10px]" />
          <span>Members</span>
        </div>
        <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60">
          ↑↓ Navigate · ↵ Select
        </span>
      </div>

      {/* Users list */}
      <div ref={listRef} className="max-h-48 overflow-y-auto py-1 space-y-0.5">
        {users.length === 0 ? (
          <div className="px-4 py-3 text-xs text-center text-[#52656A] dark:text-[#A5C9CA]/70">
            No users found
          </div>
        ) : (
          users.map((user, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <button
                key={user.id}
                type="button"
                onMouseDown={(e) => {
                  // Prevent input from losing focus
                  e.preventDefault();
                  onSelect(user);
                }}
                onMouseEnter={() => onHoverIndex(idx)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-[#E7F6F2] dark:bg-[#2C3333] text-[#2C3333] dark:text-white"
                    : "text-[#52656A] dark:text-[#E7F6F2] hover:bg-[#F8FAFB] dark:hover:bg-[#242D2D]"
                }`}
              >
                {/* Avatar */}
                {user.isAll ? (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0 select-none shadow-xs bg-[#395B64]"
                  >
                    @
                  </div>
                ) : user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0 select-none shadow-xs"
                    style={{ backgroundColor: getAvatarColor(user.username) }}
                  >
                    {user.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}

                {/* Names */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-xs text-[#2C3333] dark:text-white truncate">
                      @{user.username}
                    </span>
                    {user.displayName && user.displayName !== user.username && (
                      <span className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70 truncate">
                        {user.displayName}
                      </span>
                    )}
                  </div>
                  {user.email && (
                    <div className="text-[10px] text-[#52656A]/70 dark:text-[#A5C9CA]/50 truncate">
                      {user.email}
                    </div>
                  )}
                </div>

                {isSelected && (
                  <i className="fa-solid fa-arrow-left-long text-[10px] text-[#395B64] dark:text-[#A5C9CA] ml-auto flex-shrink-0 opacity-70" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MentionSuggestions;
