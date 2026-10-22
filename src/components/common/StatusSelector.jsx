import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import StatusBadge from "./StatusBadge";

const StatusSelector = ({ className = "", align = "left", size = "sm" }) => {
  const { user, updateUserPresenceStatus, updateDndMode, isDndActive } =
    useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const currentStatus = user?.presenceStatus || "active";
  const isDnd = isDndActive
    ? isDndActive(user)
    : Boolean(user?.dndUntil && new Date(user.dndUntil).getTime() > Date.now());

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

  const formatDndTime = (dndDate) => {
    if (!dndDate) return "";
    const d = new Date(dndDate);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const getStatusDisplay = (st) => {
    if (isDnd) return "Do Not Disturb";
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
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition shadow-xs cursor-pointer select-none text-[11px] font-semibold ${
          isDnd
            ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100/70"
            : "border-[#D0DCDB] dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] text-[#2C3333] dark:text-[#E7F6F2]"
        }`}
        title={
          isDnd
            ? `Do Not Disturb until ${formatDndTime(user?.dndUntil)}`
            : "Change availability or turn on Do Not Disturb"
        }
        aria-label="Change availability status"
      >
        <StatusBadge status={currentStatus} isDnd={isDnd} size="xs" />
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
          } mt-1.5 w-52 rounded-xl border border-gray-200 dark:border-[#395B64]/60 bg-white dark:bg-[#1E2525] shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none`}
        >
          {/* Availability Status */}
          <div className="px-3 py-1 text-[10px] font-bold text-[#52656A] dark:text-[#A5C9CA]/80 uppercase tracking-wider">
            Availability
          </div>
          <button
            type="button"
            onClick={() => handleSelect("active")}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition cursor-pointer ${
              currentStatus === "active" && !isDnd
                ? "bg-[#E7F6F2] dark:bg-[#2C3333] text-[#395B64] dark:text-[#E7F6F2] font-semibold"
                : "text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F4F7F6] dark:hover:bg-[#242D2D]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ring-1 ring-emerald-600/30" />
              <span>Active</span>
            </div>
            {currentStatus === "active" && !isDnd && (
              <i className="fa-solid fa-check text-xs text-[#395B64] dark:text-[#A5C9CA]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelect("away")}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition cursor-pointer ${
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
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition cursor-pointer ${
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

          {/* Pause Notifications (DND) Section */}
          <div className="my-1.5 border-t border-gray-100 dark:border-[#2C3333]" />

          <div className="px-3 py-1 flex items-center justify-between text-[10px] font-bold text-[#52656A] dark:text-[#A5C9CA]/80 uppercase tracking-wider">
            <span>Do Not Disturb</span>
            <i className="fa-solid fa-moon text-rose-500 text-[10px]" />
          </div>

          {isDnd ? (
            <div className="px-3 py-2 bg-rose-50/70 dark:bg-rose-950/30 rounded-lg mx-2 my-1 border border-rose-200/60 dark:border-rose-900/40">
              <div className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                DND turned on until {formatDndTime(user?.dndUntil)}
              </div>
              <button
                type="button"
                onClick={() => {
                  updateDndMode(0);
                  setIsOpen(false);
                }}
                className="mt-1.5 w-full py-1 px-2 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-semibold transition cursor-pointer text-center"
              >
                Turn off DND
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {[
                { label: "For 30 minutes", minutes: 30 },
                { label: "For 1 hour", minutes: 60 },
                { label: "For 2 hours", minutes: 120 },
                { label: "For 8 hours", minutes: 480 },
                { label: "Until tomorrow (24h)", minutes: 1440 },
              ].map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => {
                    updateDndMode(opt.minutes);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs text-gray-700 dark:text-[#E7F6F2] hover:bg-[#F4F7F6] dark:hover:bg-[#242D2D] transition cursor-pointer"
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusSelector;
