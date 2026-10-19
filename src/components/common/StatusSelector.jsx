import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import StatusBadge from "./StatusBadge";

const StatusSelector = ({ className = "", align = "left", size = "sm" }) => {
  const { user, updateUserPresenceStatus } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const currentStatus = user?.presenceStatus || "active";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (status) => {
    updateUserPresenceStatus(status);
    setIsOpen(false);
  };

  const getStatusDisplay = (st) => {
    switch (st) {
      case "away":
        return "Away";
      case "offline":
        return "Offline";
      case "active":
      default:
        return "Active";
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#D0DCDB] dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] text-[11px] font-semibold text-[#2C3333] dark:text-[#E7F6F2] transition shadow-xs cursor-pointer select-none"
        title="Change availability status"
        aria-label="Change availability status"
      >
        <StatusBadge status={currentStatus} size="xs" />
        <span>{getStatusDisplay(currentStatus)}</span>
        <i
          className={`fa-solid fa-chevron-down text-[8px] text-[#52656A] dark:text-[#A5C9CA] ml-0.5 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1.5 w-48 rounded-xl border border-[#D0DCDB] dark:border-[#395B64]/60 bg-white dark:bg-[#1E2525] shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none`}
        >
          <div className="px-3 py-1 text-[10px] font-bold text-[#52656A] dark:text-[#A5C9CA]/80 uppercase tracking-wider">
            Availability
          </div>
          <button
            type="button"
            onClick={() => handleSelect("active")}
            className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition cursor-pointer ${
              currentStatus === "active"
                ? "bg-[#E7F6F2] dark:bg-[#2C3333] text-[#395B64] dark:text-[#E7F6F2] font-semibold"
                : "text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F4F7F6] dark:hover:bg-[#242D2D]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ring-1 ring-emerald-600/30" />
              <span>Active</span>
            </div>
            {currentStatus === "active" && (
              <i className="fa-solid fa-check text-xs text-[#395B64] dark:text-[#A5C9CA]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelect("away")}
            className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition cursor-pointer ${
              currentStatus === "away"
                ? "bg-[#E7F6F2] dark:bg-[#2C3333] text-[#395B64] dark:text-[#E7F6F2] font-semibold"
                : "text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F4F7F6] dark:hover:bg-[#242D2D]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ring-1 ring-amber-600/30" />
              <span>Set as away</span>
            </div>
            {currentStatus === "away" && (
              <i className="fa-solid fa-check text-xs text-[#395B64] dark:text-[#A5C9CA]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelect("offline")}
            className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition cursor-pointer ${
              currentStatus === "offline"
                ? "bg-[#E7F6F2] dark:bg-[#2C3333] text-[#395B64] dark:text-[#E7F6F2] font-semibold"
                : "text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F4F7F6] dark:hover:bg-[#242D2D]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0 ring-1 ring-gray-400/40" />
              <span>Set as offline</span>
            </div>
            {currentStatus === "offline" && (
              <i className="fa-solid fa-check text-xs text-[#395B64] dark:text-[#A5C9CA]" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default StatusSelector;
