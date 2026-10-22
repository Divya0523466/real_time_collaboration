import React, { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const AVATAR_COLORS = [
  "#2E6E79",
  "#395B64",
  "#4A7C88",
  "#3D7A52",
  "#5B6E7C",
  "#007A5A",
];

const getAvatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

const UserProfileCardModal = ({
  user,
  currentUserId,
  onClose,
  onNavigateDM,
  onOpenEditProfile,
  getUserPresenceStatus,
}) => {
  const [profileData, setProfileData] = useState(user);
  const [loading, setLoading] = useState(false);

  const targetUserId = (user?.id || user?._id)?.toString();
  const myId = (currentUserId || "")?.toString();
  const isSelf = targetUserId && myId && targetUserId === myId;

  // Fetch full live profile (including bio & custom status) when opening
  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
    fetch(`${API_URL}/auth/users/${targetUserId}/profile`, {
      headers: getAuthHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setProfileData((prev) => ({
            ...prev,
            ...data.user,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetUserId]);

  if (!user) return null;

  const username = profileData?.username || profileData?.name || "User";
  const avatar = profileData?.avatar || profileData?.avatarUrl || null;
  const email = profileData?.email || "";
  const bio = profileData?.bio || "";
  const customStatus = profileData?.customStatus || {};
  const statusEmoji = customStatus.emoji || "";
  const statusText = customStatus.text || "";
  const hasCustomStatus = Boolean(statusEmoji || statusText);

  const presence = getUserPresenceStatus
    ? getUserPresenceStatus(targetUserId)
    : profileData?.presenceStatus || "active";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[360px] rounded-2xl bg-white dark:bg-[#181F20] border border-gray-200/80 dark:border-[#2C3636] shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover / Header Banner */}
        <div className="h-[92px] bg-gradient-to-br from-[#2D4044] via-[#222E30] to-[#171E1F] relative overflow-hidden">
          {/* Subtle ambient light for depth */}
          <div className="absolute -top-10 -left-10 h-36 w-36 rounded-full bg-[#00897B]/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-[#4A7C88]/20 blur-xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 hover:bg-black/50 text-white/80 hover:text-white transition-all backdrop-blur-md cursor-pointer border border-white/10"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>

        {/* Avatar & Header Action */}
        <div className="relative -mt-10 px-5 flex items-end justify-between mb-3.5">
          {/* Avatar with Presence Indicator */}
          <div className="relative flex-shrink-0">
            <div
              className="flex h-[76px] w-[76px] items-center justify-center rounded-full font-bold text-white text-2xl shadow-md ring-[3.5px] ring-white dark:ring-[#181F20] overflow-hidden"
              style={{ backgroundColor: getAvatarColor(username) }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={username}
                  className="h-full w-full object-cover"
                />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </div>
            <StatusBadge
              status={presence}
              size="sm"
              isDnd={Boolean(
                profileData?.dndUntil &&
                  new Date(profileData.dndUntil).getTime() > Date.now(),
              )}
              className="absolute bottom-0.5 right-0.5 ring-[2.5px] ring-white dark:ring-[#181F20]"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-0.5">
            {isSelf ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenEditProfile) onOpenEditProfile();
                }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#354141] bg-white dark:bg-[#202727] hover:bg-gray-50 dark:hover:bg-[#283232] px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-2xs transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-pen text-[10px] text-gray-400 dark:text-gray-400" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigateDM) onNavigateDM(profileData);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[#007A5A] hover:bg-[#00664B] active:bg-[#005A42] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                <i className="fa-regular fa-comment-dots text-xs" />
                <span>Message</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Content */}
        <div className="px-5 pb-5 space-y-4">
          {/* User Name & Handle */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate">
                {username}
              </h3>
              {profileData?.role === "super_admin" && (
                <span className="rounded-full bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              @{username.toLowerCase().replace(/\s+/g, "")}
            </p>
          </div>

          {/* Do Not Disturb Banner */}
          {Boolean(
            profileData?.dndUntil &&
              new Date(profileData.dndUntil).getTime() > Date.now(),
          ) && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
              <i className="fa-solid fa-moon text-xs text-rose-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold block leading-tight">
                  Do Not Disturb turned on
                </span>
                <span className="text-[11px] opacity-80 block leading-tight mt-0.5">
                  DND mode active until{" "}
                  {new Date(profileData.dndUntil).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Custom Status Card (Slack Style) */}
          {hasCustomStatus && (
            <div className="flex items-center gap-2.5 rounded-xl bg-gray-50/90 dark:bg-[#202727] px-3 py-2 text-xs text-gray-800 dark:text-gray-200 border border-gray-200/70 dark:border-[#2C3636]">
              {statusEmoji && (
                <span className="text-base select-none leading-none flex-shrink-0">
                  {statusEmoji}
                </span>
              )}
              {statusText && (
                <span className="font-normal leading-snug truncate">
                  {statusText}
                </span>
              )}
            </div>
          )}

          {/* Bio Section ("About Me") */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1.5">
              About Me
            </h4>
            {bio ? (
              <div className="rounded-xl bg-gray-50/60 dark:bg-[#202727]/60 p-3 border border-gray-200/60 dark:border-[#2C3636]/60">
                <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {bio}
                </p>
              </div>
            ) : (
              <p className="text-xs italic text-gray-400 dark:text-gray-400">
                No bio added yet.
              </p>
            )}
          </div>

          {/* Contact Details */}
          {email && (
            <div className="pt-3 border-t border-gray-100 dark:border-[#2C3636]/60 flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-300">
              <i className="fa-regular fa-envelope text-gray-400 dark:text-gray-400 text-xs w-4 text-center" />
              <span className="truncate">{email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileCardModal;
