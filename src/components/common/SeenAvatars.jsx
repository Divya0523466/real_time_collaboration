import React, { useState } from "react";

const AVATAR_COLORS = ["#395B64", "#4A7C88", "#52656A", "#2E6E79", "#3D7A52", "#5B6E7C"];
const getBgColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

export const SeenAvatarItem = ({ user, size = "w-4.5 h-4.5 text-[9px]" }) => {
  const [imgError, setImgError] = useState(false);
  const name = user?.username || user?.name || user?.displayName || "User";
  const avatarUrl = user?.avatar || user?.avatarUrl;

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${size} rounded-full object-cover ring-2 ring-white dark:ring-[#1E2E30] shadow-sm flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-white dark:ring-[#1E2E30] shadow-sm flex-shrink-0 select-none`}
      style={{ backgroundColor: getBgColor(name) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const SeenAvatars = ({ readBy = [], className = "" }) => {
  if (!readBy || readBy.length === 0) return null;

  const names = readBy.map((u) => u.username || u.name || u.displayName || "User").join(", ");
  const displayed = readBy.slice(0, 3);
  const remaining = readBy.length - displayed.length;

  return (
    <div
      className={`flex items-center -space-x-1 cursor-default select-none ${className}`}
      title={`Seen by ${names}`}
    >
      {displayed.map((u, i) => (
        <SeenAvatarItem key={u.userId || u.id || i} user={u} />
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold pl-1.5">
          +{remaining}
        </span>
      )}
    </div>
  );
};

export default SeenAvatars;
