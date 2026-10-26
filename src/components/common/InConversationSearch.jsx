import React, { useState, useEffect, useRef } from "react";

const InConversationSearch = ({ isOpen, onClose, messages = [], onJumpToMessage }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm("");
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Find matching message IDs
  const matchedMessageIds = React.useMemo(() => {
    if (!searchTerm || searchTerm.trim().length === 0) return [];
    const term = searchTerm.toLowerCase().trim();
    return (messages || [])
      .filter((m) => !m.isDeleted && typeof m.content === "string" && m.content.toLowerCase().includes(term))
      .map((m) => (m._id || m.id)?.toString());
  }, [searchTerm, messages]);

  const totalMatches = matchedMessageIds.length;

  useEffect(() => {
    if (totalMatches > 0) {
      setCurrentIndex(1);
      onJumpToMessage?.(matchedMessageIds[0]);
    } else {
      setCurrentIndex(0);
    }
  }, [matchedMessageIds, totalMatches]);

  const handleNext = () => {
    if (totalMatches === 0) return;
    const nextIdx = currentIndex >= totalMatches ? 1 : currentIndex + 1;
    setCurrentIndex(nextIdx);
    onJumpToMessage?.(matchedMessageIds[nextIdx - 1]);
  };

  const handlePrev = () => {
    if (totalMatches === 0) return;
    const prevIdx = currentIndex <= 1 ? totalMatches : currentIndex - 1;
    setCurrentIndex(prevIdx);
    onJumpToMessage?.(matchedMessageIds[prevIdx - 1]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) handlePrev();
      else handleNext();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-16 z-30 flex items-center gap-1.5 rounded-xl border border-[#395B64]/50 bg-white dark:bg-[#1E2525] p-1.5 shadow-xl transition-all select-none">
      <i className="fa-solid fa-magnifying-glass text-xs text-[#52656A] dark:text-[#A5C9CA] ml-2" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in conversation..."
        className="w-44 sm:w-56 bg-transparent px-2 py-1 text-xs text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#A5C9CA]/50 outline-none"
      />

      <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 px-1 font-mono whitespace-nowrap">
        {searchTerm ? (totalMatches > 0 ? `${currentIndex} of ${totalMatches}` : "No matches") : ""}
      </span>

      <div className="flex items-center gap-0.5 border-l border-[#A5C9CA]/30 dark:border-[#395B64]/50 pl-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={totalMatches === 0}
          className="flex h-6 w-6 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] disabled:opacity-30 transition"
          title="Previous match (Shift+Enter)"
        >
          <i className="fa-solid fa-chevron-up text-[10px]" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={totalMatches === 0}
          className="flex h-6 w-6 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] disabled:opacity-30 transition"
          title="Next match (Enter)"
        >
          <i className="fa-solid fa-chevron-down text-[10px]" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-400 transition"
          title="Close search (Esc)"
        >
          <i className="fa-solid fa-xmark text-xs" />
        </button>
      </div>
    </div>
  );
};

export default InConversationSearch;
