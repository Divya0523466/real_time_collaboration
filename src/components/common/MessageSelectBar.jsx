import React from "react";

const MessageSelectBar = ({
  selectedCount = 0,
  isAllSelected = false,
  onToggleSelectAll,
  onDeleteSelected,
  onExit,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] bg-[#E7F6F2] dark:bg-[#1E2525] px-4 sm:px-6 py-3 transition-colors shadow-xs ${className}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#D0DCDB] dark:hover:bg-[#2C3333] transition cursor-pointer"
          title="Cancel selection"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>
        <span className="font-bold text-sm sm:text-base text-[#2C3333] dark:text-white">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSelectAll}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#D0DCDB]/60 dark:hover:bg-[#2C3333] transition cursor-pointer"
        >
          {isAllSelected ? "Deselect All" : "Select All"}
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
          >
            <i className="fa-solid fa-trash-can text-xs" />
            <span>Delete ({selectedCount})</span>
          </button>
        )}

        <button
          type="button"
          onClick={onExit}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#D0DCDB]/60 dark:hover:bg-[#2C3333] transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default MessageSelectBar;
