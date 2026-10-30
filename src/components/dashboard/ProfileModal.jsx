import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { uploadFile } from "../../services/uploadService";
import { toast } from "react-toastify";
import UpgradeModal from "./UpgradeModal";
import { cancelSubscriptionApi } from "../../services/billingService";
import { isProUser } from "../../utils/subscriptionUtils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const STATUS_PRESETS = [
  { icon: "fa-regular fa-calendar", text: "In a meeting", emoji: "📅" },
  { icon: "fa-solid fa-car-side", text: "Commuting", emoji: "🚗" },
  { icon: "fa-solid fa-head-side-cough", text: "Out sick", emoji: "🤒" },
  { icon: "fa-solid fa-umbrella-beach", text: "On vacation", emoji: "🌴" },
  { icon: "fa-solid fa-bullseye", text: "Focusing", emoji: "🎯" },
];

const ProfileModal = ({ onClose }) => {
  const {
    user,
    setUser,
    updateUserProfile,
    updateUserPresenceStatus,
    updateDndMode,
    isDndActive,
  } = useWorkspace();

  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [statusText, setStatusText] = useState(user?.customStatus?.text || "");
  const [statusEmoji, setStatusEmoji] = useState(
    user?.customStatus?.emoji || "",
  );
  const [presenceStatus, setPresenceStatus] = useState(
    user?.presenceStatus || "active",
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const isDnd = isDndActive
    ? isDndActive(user)
    : Boolean(user?.dndUntil && new Date(user.dndUntil).getTime() > Date.now());

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isPro = isProUser(user);
  const isCanceling = Boolean(
    user?.subscription?.cancelAtPeriodEnd ||
      user?.subscription?.status === "canceling",
  );

  const periodEndDateStr = user?.subscription?.currentPeriodEnd
    ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      )
    : "end of period";

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const res = await cancelSubscriptionApi();
      if (res.success) {
        if (setUser && res.user) {
          setUser((prev) => {
            const updated = {
              ...prev,
              ...res.user,
              subscription: res.subscription,
            };
            localStorage.setItem("worknestUser", JSON.stringify(updated));
            return updated;
          });
        }
        setShowCancelConfirm(false);
        toast.info(
          res.message ||
            "Auto-renewal cancelled. Pro access remains active until your billing expiry date.",
        );
      }
    } catch (err) {
      toast.error(err.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  const [twoFactorMode, setTwoFactorMode] = useState("idle");
  const [setupOtp, setSetupOtp] = useState("");
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [setupCooldown, setSetupCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (setupCooldown > 0) {
      timer = setInterval(() => {
        setSetupCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [setupCooldown]);

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image (PNG, JPG, WEBP, GIF)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be under 5MB");
      return;
    }

    setError("");
    setIsUploadingAvatar(true);

    try {
      const data = await uploadFile(file);
      const uploadedUrl =
        data?.file?.url || data?.file?.previewUrl || data?.url || "";
      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        toast.info("Photo uploaded! Click Save to apply.");
      } else {
        throw new Error("Failed to get image URL from server");
      }
    } catch (err) {
      setError(err.message || "Failed to upload image");
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
  };

  const handleStart2FASetup = async () => {
    setTwoFactorError("");
    setIs2FALoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/2fa/send-setup-otp`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setTwoFactorError(
          data.message || "Failed to send setup verification code",
        );
        return;
      }

      setTwoFactorMode("setup");
      setSetupOtp("");
      setSetupCooldown(60);
      toast.info(data.message || "Verification code sent to your email.");
    } catch {
      setTwoFactorError("Unable to connect to the server.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmEnable2FA = async () => {
    const cleanOtp = setupOtp.trim();
    if (cleanOtp.length !== 6) {
      setTwoFactorError("Please enter the complete 6-digit code.");
      return;
    }

    setTwoFactorError("");
    setIs2FALoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/2fa/enable`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ otp: cleanOtp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTwoFactorError(data.message || "Failed to enable 2FA.");
        return;
      }

      toast.success(
        data.message || "Two-factor authentication enabled successfully!",
      );
      setTwoFactorMode("idle");
      setSetupOtp("");

      if (setUser) {
        setUser((prev) => {
          const updated = { ...prev, twoFactorEnabled: true };
          try {
            localStorage.setItem("worknestUser", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch {
      setTwoFactorError("Unable to connect to the server.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleStart2FADisable = async () => {
    setTwoFactorError("");
    setIs2FALoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/2fa/send-disable-otp`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setTwoFactorError(
          data.message || "Failed to send disable verification code",
        );
        return;
      }

      setTwoFactorMode("disable");
      setSetupOtp("");
      setSetupCooldown(60);
      toast.info(data.message || "Verification code sent to your email.");
    } catch {
      setTwoFactorError("Unable to connect to the server.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmDisable2FA = async () => {
    const cleanOtp = setupOtp.trim();
    if (cleanOtp.length !== 6) {
      setTwoFactorError("Please enter the complete 6-digit code.");
      return;
    }

    setTwoFactorError("");
    setIs2FALoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/2fa/disable`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ otp: cleanOtp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTwoFactorError(data.message || "Failed to disable 2FA.");
        return;
      }

      toast.success(
        data.message || "Two-factor authentication disabled successfully.",
      );
      setTwoFactorMode("idle");
      setSetupOtp("");

      if (setUser) {
        setUser((prev) => {
          const updated = { ...prev, twoFactorEnabled: false };
          try {
            localStorage.setItem("worknestUser", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch {
      setTwoFactorError("Unable to connect to the server.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleToggle2FA = () => {
    if (is2FALoading) return;

    if (user?.twoFactorEnabled) {
      if (twoFactorMode === "disable") {
        setTwoFactorMode("idle");
        setSetupOtp("");
        setTwoFactorError("");
      } else {
        handleStart2FADisable();
      }
    } else {
      if (twoFactorMode === "setup") {
        setTwoFactorMode("idle");
        setSetupOtp("");
        setTwoFactorError("");
      } else {
        handleStart2FASetup();
      }
    }
  };

  const formatDndTime = (dndDate) => {
    if (!dndDate) return "";
    const d = new Date(dndDate);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Username cannot be empty");
      return;
    }

    if (trimmedUsername.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }

    setIsSaving(true);
    try {
      if (presenceStatus !== user?.presenceStatus && updateUserPresenceStatus) {
        await updateUserPresenceStatus(presenceStatus);
      }

      await updateUserProfile({
        username: trimmedUsername,
        avatar: avatarUrl,
        bio: bio.trim().slice(0, 250),
        customStatus: {
          text: statusText.trim().slice(0, 100),
          emoji: statusEmoji.trim(),
        },
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-xs sm:px-6 animate-[fadeIn_0.15s_ease-out]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="m-auto w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#181F20] border border-gray-200/80 dark:border-[#2C3636] p-4 sm:p-6 shadow-2xl transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header - No horizontal line */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Edit Profile
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#A5C9CA]/80 mt-0.5">
              Manage your personal information, status, and account settings
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-[#A5C9CA] dark:hover:bg-[#242D2D] dark:hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        {error && (
          <div className="mb-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0 text-xs" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* ── Left Column: Photo, Status & Account (5 cols) ── */}
            <div className="md:col-span-5 space-y-4">
              {/* Photo & Actions */}
              <div className="flex items-center gap-3.5">
                <div className="relative flex-shrink-0">
                  <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-gray-150 dark:ring-[#2C3636] bg-[#395B64] flex items-center justify-center shadow-xs">
                    {isUploadingAvatar ? (
                      <i className="fa-solid fa-circle-notch fa-spin text-lg text-white" />
                    ) : avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={username || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-white select-none">
                        {username?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileSelect}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#354141] bg-white dark:bg-[#202727] text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#283232] transition shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      <i className="fa-solid fa-cloud-arrow-up text-[11px]" />
                      <span>Upload</span>
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Remove photo"
                      >
                        <i className="fa-regular fa-trash-can text-[11px]" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    JPG, PNG or WEBP up to 5MB
                  </p>
                </div>
              </div>

              {/* Availability Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Availability
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200/80 dark:border-[#354141] p-1 bg-gray-50/60 dark:bg-[#1C2324]">
                  {[
                    { key: "active", label: "Active", dot: "bg-emerald-500" },
                    { key: "away", label: "Away", dot: "bg-amber-500" },
                    { key: "offline", label: "Offline", dot: "bg-gray-400" },
                  ].map((item) => {
                    const isSelected = presenceStatus === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPresenceStatus(item.key)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? "bg-white dark:bg-[#283232] text-gray-900 dark:text-white shadow-2xs"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${item.dot} shrink-0`}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Do Not Disturb (DND) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Do Not Disturb
                  </label>
                  <i className="fa-solid fa-moon text-rose-500 text-xs" />
                </div>

                {isDnd ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-bold text-rose-700 dark:text-rose-300 leading-tight">
                        DND mode turned on
                      </p>
                      <p className="text-xs font-medium text-rose-600/90 dark:text-rose-400/90 leading-tight mt-0.5">
                        Until {formatDndTime(user?.dndUntil)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateDndMode && updateDndMode(0)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      Turn off DND
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "30m", minutes: 30 },
                      { label: "1 hour", minutes: 60 },
                      { label: "2 hours", minutes: 120 },
                      { label: "8 hours", minutes: 480 },
                    ].map((opt) => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() =>
                          updateDndMode && updateDndMode(opt.minutes)
                        }
                        className="py-2 px-1 rounded-lg border border-gray-200/80 dark:border-[#354141] bg-white dark:bg-[#202727] hover:border-[#007A5A] hover:text-[#007A5A] text-xs font-semibold text-gray-700 dark:text-gray-300 transition cursor-pointer text-center"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Email (Read-Only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Email
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#1E2525] border border-gray-200/80 dark:border-[#354141] flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span className="truncate font-medium">{user?.email}</span>
                  <i
                    className="fa-solid fa-lock text-gray-400 text-xs ml-1 flex-shrink-0"
                    title="Primary email (verified)"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-7 space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your full name"
                  maxLength={50}
                  className="w-full rounded-xl border border-gray-200 dark:border-[#354141] bg-gray-50/50 dark:bg-[#1C2324] px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1E2525] focus:border-[#007A5A] dark:focus:border-teal-400 focus:ring-1 focus:ring-[#007A5A]/20 outline-none transition-all"
                />
              </div>

              {/* Custom Status */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Custom Status
                  </label>
                  {(statusEmoji || statusText) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusEmoji("");
                        setStatusText("");
                      }}
                      className="text-xs text-gray-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      Clear status
                    </button>
                  )}
                </div>

                <div className="relative flex items-center rounded-xl border border-gray-200 dark:border-[#354141] bg-gray-50/50 dark:bg-[#1C2324] focus-within:bg-white dark:focus-within:bg-[#1E2525] focus-within:border-[#007A5A] dark:focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-[#007A5A]/20 transition-all">
                  <div className="flex items-center pl-3 pr-1">
                    <input
                      type="text"
                      value={statusEmoji}
                      onChange={(e) => setStatusEmoji(e.target.value)}
                      placeholder="💬"
                      maxLength={4}
                      className="w-8 text-center bg-transparent text-base focus:outline-none cursor-pointer select-none"
                      title="Emoji"
                    />
                    <div className="h-4 w-px bg-gray-200 dark:bg-[#354141] mx-1" />
                  </div>
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="What's your status? (e.g. In a meeting)"
                    maxLength={100}
                    className="flex-1 bg-transparent py-2 pr-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                  />
                  {(statusEmoji || statusText) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusEmoji("");
                        setStatusText("");
                      }}
                      className="pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition cursor-pointer"
                      title="Clear"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {STATUS_PRESETS.map((preset) => {
                    const isSelected =
                      statusEmoji === preset.emoji &&
                      statusText === preset.text;
                    return (
                      <button
                        key={preset.text}
                        type="button"
                        onClick={() => {
                          setStatusEmoji(preset.emoji);
                          setStatusText(preset.text);
                        }}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "border border-[#007A5A] dark:border-teal-400 bg-teal-50 dark:bg-teal-950/40 text-[#007A5A] dark:text-teal-300 font-semibold"
                            : "border border-gray-200/80 dark:border-[#354141] bg-white dark:bg-[#202727] text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-[#283232]"
                        }`}
                      >
                        <i className={`${preset.icon} text-xs`} />
                        <span>{preset.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    About Me
                  </label>
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                    {bio.length}/250
                  </span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 250))}
                  placeholder="Share a short bio (role, interests)..."
                  rows={2}
                  maxLength={250}
                  className="w-full resize-none rounded-xl border border-gray-200 dark:border-[#354141] bg-gray-50/50 dark:bg-[#1C2324] px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1E2525] focus:border-[#007A5A] dark:focus:border-teal-400 focus:ring-1 focus:ring-[#007A5A]/20 outline-none transition-all leading-relaxed"
                />
              </div>

              <div className="rounded-xl border border-gray-200/80 dark:border-[#354141] bg-gray-50/50 dark:bg-[#1F2727]/50 p-3 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                        user?.twoFactorEnabled
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-gray-200 text-gray-500 dark:bg-[#2C3333] dark:text-gray-400"
                      }`}
                    >
                      <i className="fa-solid fa-shield-halved text-xs" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                        Two-Factor Authentication
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
                        {user?.twoFactorEnabled
                          ? "Active • Email OTP required on login"
                          : "Inactive • Add extra email security"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(user?.twoFactorEnabled)}
                    onClick={handleToggle2FA}
                    disabled={is2FALoading}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      user?.twoFactorEnabled
                        ? twoFactorMode === "disable"
                          ? "bg-rose-400"
                          : "bg-[#007A5A]"
                        : twoFactorMode === "setup"
                          ? "bg-[#007A5A]/50"
                          : "bg-gray-300 dark:bg-gray-600"
                    } ${is2FALoading ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <span className="sr-only">Toggle 2FA</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        user?.twoFactorEnabled
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {twoFactorError && (
                  <div className="mt-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-exclamation flex-shrink-0 text-xs" />
                    <span>{twoFactorError}</span>
                  </div>
                )}

                {(twoFactorMode === "setup" || twoFactorMode === "disable") && (
                  <div className="mt-3 pt-2.5 border-t border-gray-200/80 dark:border-[#354141] space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Enter the 6-digit code sent to{" "}
                      <strong className="text-gray-900 dark:text-white">
                        {user?.email}
                      </strong>
                      :
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={setupOtp}
                        onChange={(e) => {
                          setSetupOtp(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          );
                          setTwoFactorError("");
                        }}
                        placeholder="000000"
                        className="w-28 rounded-lg border border-gray-200 dark:border-[#354141] bg-white dark:bg-[#181F20] px-2.5 py-1.5 text-center font-mono text-sm font-bold tracking-widest text-gray-900 dark:text-white outline-none focus:border-[#007A5A]"
                        autoFocus
                      />

                      <button
                        type="button"
                        onClick={
                          twoFactorMode === "setup"
                            ? handleConfirmEnable2FA
                            : handleConfirmDisable2FA
                        }
                        disabled={is2FALoading || setupOtp.trim().length !== 6}
                        className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold text-white transition disabled:opacity-50 whitespace-nowrap ${
                          twoFactorMode === "setup"
                            ? "bg-[#007A5A] hover:bg-[#00664B]"
                            : "bg-rose-600 hover:bg-rose-700"
                        }`}
                      >
                        {is2FALoading ? "Verifying..." : "Verify"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorMode("idle");
                          setSetupOtp("");
                          setTwoFactorError("");
                        }}
                        className="cursor-pointer px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#354141] text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#242D2D] transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription & Plan Card */}
              <div className="rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/40 bg-[#F8FAFB] dark:bg-[#1C2324] p-3 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]">
                      <i
                        className={`fa-solid ${isPro ? "fa-crown" : "fa-layer-group"} text-xs`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2] truncate leading-tight">
                          {isPro ? "WorkNest Pro" : "Free Plan"}
                        </p>
                        {isPro && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#395B64] text-white dark:bg-[#A5C9CA] dark:text-[#1E2525] leading-none">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 truncate leading-tight mt-0.5">
                        {isPro
                          ? isCanceling
                            ? `Valid until ${periodEndDateStr} • Reverts to Free on expiry`
                            : "Active subscription • Unlimited workspaces & channels"
                          : "Standard plan • Upgrade for unlimited workspaces"}
                      </p>
                    </div>
                  </div>

                  {!isPro ? (
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#2C3636] transition shadow-2xs whitespace-nowrap"
                    >
                      <i className="fa-solid fa-crown text-[10px]" />
                      <span>Upgrade to Pro</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      {isCanceling ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA]">
                            <i className="fa-solid fa-clock text-[10px]" />
                            Expires {periodEndDateStr}
                          </span>
                          <p className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 leading-none">
                            Auto-renewal cancelled
                          </p>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-[#395B64] dark:text-[#A5C9CA] flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-xs" />
                            Active
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirm(true)}
                            className="cursor-pointer px-2.5 py-1 rounded text-xs font-medium text-[#52656A] hover:text-rose-600 dark:text-[#A5C9CA]/80 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Cancel recurring auto-renewal"
                          >
                            Cancel Plan
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - No horizontal line */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#202727] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingAvatar || !username.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#007A5A] hover:bg-[#00664B] active:bg-[#005A42] transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving && (
                <i className="fa-solid fa-circle-notch fa-spin text-xs" />
              )}
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}

      {/* Cancel Subscription Confirmation Dialog */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-60 grid overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-xs sm:px-6 animate-[fadeIn_0.15s_ease-out]"
          role="dialog"
          aria-modal="true"
        >
          <div className="m-auto w-full max-w-sm rounded-2xl bg-white dark:bg-[#1E2525] border border-[#D8E2E1] dark:border-[#395B64]/50 p-5 shadow-2xl text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mx-auto mb-3">
              <i className="fa-solid fa-triangle-exclamation text-lg" />
            </div>

            <h3 className="text-base font-bold text-[#2C3333] dark:text-white">
              Cancel Auto-Renewal?
            </h3>
            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 mt-1 mb-4">
              No further recurring payments will be charged. You will keep full WorkNest Pro access until <strong>{periodEndDateStr}</strong>, after which your account will switch to the Free plan.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="flex-1 py-2 px-3 rounded-lg border border-[#D8E2E1] dark:border-[#395B64]/50 text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition cursor-pointer disabled:opacity-50"
              >
                Keep Pro
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isCancelling ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Cancel Plan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileModal;
