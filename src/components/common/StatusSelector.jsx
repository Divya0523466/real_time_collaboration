import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import StatusBadge from "./StatusBadge";

const StatusSelector = ({
  className = "",
  align = "left",
  size = "sm",
}) => {
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
        className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border transition-colors cursor-pointer select-none text-xs font-medium ${
          isDnd
            ? "border-[#395B64] bg-[#E7F6F2] dark:bg-[#252E2E] text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#D8EAE5] dark:hover:bg-[#2C3636]"
            : "border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] text-[#2C3333] dark:text-[#E7F6F2]"
        }`}
        title={
          isDnd
            ? `Do Not Disturb until ${formatDndTime(user?.dndUntil)}`
            : "Change availability or turn on Do Not Disturb"
        }
        aria-label="Change availability status"
      >
        <StatusBadge status={currentStatus} isDnd={isDnd} size="xs" />
        <span className="hidden sm:inline">{getStatusDisplay(currentStatus)}</span>
        <i
          className={`fa-solid fa-chevron-down text-[8px] text-[#52656A] dark:text-[#A5C9CA]/70 ml-0.5 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1.5 w-52 rounded border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#1E2525] shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in duration-100 select-none text-[#2C3333] dark:text-[#E7F6F2]`}
        >
          {/* Availability Status */}
          <div className="px-3 py-1 text-[10px] font-semibold text-[#52656A] dark:text-[#A5C9CA]/70 uppercase tracking-wider">
            Availability
          </div>
          <button
            type="button"
            onClick={() => handleSelect("active")}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
              currentStatus === "active" && !isDnd
                ? "bg-[#E0EBEB] dark:bg-[#395B64] text-[#2C3333] dark:text-white font-medium"
                : "hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Active</span>
            </div>
            {currentStatus === "active" && !isDnd && (
              <i className="fa-solid fa-check text-xs text-[#395B64] dark:text-[#A5C9CA]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelect("away")}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
              currentStatus === "away"
                ? "bg-[#E0EBEB] dark:bg-[#395B64] text-[#2C3333] dark:text-white font-medium"
                : "hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Set as away</span>
            </div>
            {currentStatus === "away" && (
              <i className="fa-solid fa-check text-xs text-[#395B64] dark:text-[#A5C9CA]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelect("offline")}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
              currentStatus === "offline"
                ? "bg-[#E0EBEB] dark:bg-[#395B64] text-[#2C3333] dark:text-white font-medium"
                : "hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
              <span>Set as offline</span>
            </div>
            {currentStatus === "offline" && (
              <i className="fa-solid fa-check text-xs text-[#395B64] dark:text-[#A5C9CA]" />
            )}
          </button>

          {/* Pause Notifications (DND) Section */}
          <div className="my-1.5 border-t border-[#D8E2E1] dark:border-[#2C3333]" />

          <div className="px-3 py-1 flex items-center justify-between text-[10px] font-semibold text-[#52656A] dark:text-[#A5C9CA]/70 uppercase tracking-wider">
            <span>Do Not Disturb</span>
            <i className="fa-solid fa-moon text-[#395B64] dark:text-[#A5C9CA] text-[10px]" />
          </div>

          {isDnd ? (
            <div className="px-3 py-2 bg-[#E7F6F2] dark:bg-[#252E2E] rounded mx-2 my-1 border border-[#395B64]/30">
              <div className="text-[11px] font-medium text-[#395B64] dark:text-[#A5C9CA]">
                DND until {formatDndTime(user?.dndUntil)}
              </div>
              <button
                type="button"
                onClick={() => {
                  updateDndMode(0);
                  setIsOpen(false);
                }}
                className="mt-1.5 w-full py-1 px-2 rounded bg-[#395B64] hover:bg-[#2C3333] text-white text-[11px] font-medium transition-colors cursor-pointer text-center"
              >
                Turn off DND
              </button>
            </div>
          ) : (
            <div className="space-y-px">
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
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition-colors cursor-pointer"
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
