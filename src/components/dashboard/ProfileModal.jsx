import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { uploadFile } from "../../services/uploadService";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("worknestToken");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const ProfileModal = ({ onClose }) => {
  const { user, setUser, updateUserProfile } = useWorkspace();
  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const [twoFactorMode, setTwoFactorMode] = useState("idle");
  const [setupOtp, setSetupOtp] = useState("");
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [setupCooldown, setSetupCooldown] = useState(0);
  // countdown for 2fa
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

  // Request 2FA setup OTP
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

  // Confirm and enable 2FA
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

      // Update user state immediately in context and localStorage
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

  // Request 2FA disable OTP
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

  // Confirm and disable 2FA with OTP
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

      toast.success(data.message || "Two-factor authentication disabled.");
      setTwoFactorMode("idle");
      setSetupOtp("");

      // Update user state immediately in context and localStorage
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

  // toggle handler: requests OTP to enable if off, or requests OTP to disable if on
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
      await updateUserProfile({
        username: trimmedUsername,
        avatar: avatarUrl,
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
      className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/60 px-4 py-6 backdrop-blur-xs sm:px-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="m-auto w-full max-w-[440px] rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-5 shadow-[0_20px_60px_rgba(44,51,51,0.3)] transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-[#E0E7E6] dark:border-[#2C3333]">
          <div>
            <h2 className="text-base font-bold text-[#2C3333] dark:text-[#E7F6F2]">
              Edit Profile
            </h2>
            <p className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
              Update your photo and account security
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition cursor-pointer"
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {error && (
          <div className="mb-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0 text-[11px]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Horizontal compact Avatar section */}
          <div className="flex items-center gap-3.5 rounded-xl border border-[#E0E7E6] dark:border-[#395B64]/50 bg-[#F8FAFB] dark:bg-[#242D2D]/60 p-2.5">
            <div className="relative flex-shrink-0">
              <div className="h-14 w-14 rounded-full overflow-hidden border border-[#395B64] dark:border-[#A5C9CA] bg-[#395B64] flex items-center justify-center shadow-xs">
                {isUploadingAvatar ? (
                  <i className="fa-solid fa-spinner fa-spin text-base text-white" />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={username || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-white select-none">
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

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2]">
                Profile Photo
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#A5C9CA] dark:border-[#395B64] bg-white dark:bg-[#1E2525] text-[11px] font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#395B64] transition disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <i className="fa-solid fa-arrow-up-from-bracket text-[10px]" />
                  <span>Upload</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-trash-can text-[10px]" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Username Field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA] mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Display name"
              maxLength={50}
              className="w-full rounded-xl border border-[#A5C9CA] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] px-3 py-2 text-xs text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#7B8B8F] dark:placeholder-[#A5C9CA]/50 focus:border-[#395B64] focus:bg-white dark:focus:bg-[#2C3333] focus:outline-none transition"
            />
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA] mb-1">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full rounded-xl border border-[#E0E7E6] dark:border-[#395B64]/40 bg-gray-100 dark:bg-[#242D2D]/60 px-3 py-2 text-xs text-[#52656A] dark:text-[#A5C9CA]/60 cursor-not-allowed select-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#52656A] dark:text-[#A5C9CA]/50">
                <i className="fa-solid fa-lock" />
              </span>
            </div>
          </div>

          {/* Two-Factor Authentication Section */}
          <div className="rounded-xl border border-[#E0E7E6] dark:border-[#395B64]/50 bg-[#F8FAFB] dark:bg-[#242D2D]/60 p-3.5 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                    user?.twoFactorEnabled
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "bg-[#E0E7E6] text-[#52656A] dark:bg-[#2C3333] dark:text-[#A5C9CA]/80"
                  }`}
                >
                  <i className="fa-solid fa-shield-halved text-xs" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#2C3333] dark:text-[#E7F6F2] truncate">
                    Two-Factor Authentication
                  </p>
                  <p className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 truncate">
                    {user?.twoFactorEnabled
                      ? "Active • 6-digit email OTP required on login"
                      : "Inactive • Add extra email security to your account"}
                  </p>
                </div>
              </div>

              {/* Toggler Switch */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {is2FALoading && (
                  <i className="fa-solid fa-spinner fa-spin text-xs text-[#395B64] dark:text-[#A5C9CA]" />
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(user?.twoFactorEnabled)}
                  onClick={handleToggle2FA}
                  disabled={is2FALoading}
                  title={
                    user?.twoFactorEnabled
                      ? "Click to disable 2FA"
                      : "Click to enable 2FA"
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#395B64] focus:ring-offset-2 ${
                    user?.twoFactorEnabled
                      ? twoFactorMode === "disable"
                        ? "bg-rose-400"
                        : "bg-emerald-600"
                      : twoFactorMode === "setup"
                        ? "bg-[#395B64]/50"
                        : "bg-gray-300 dark:bg-gray-600"
                  } ${is2FALoading ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <span className="sr-only">
                    Toggle two-factor authentication
                  </span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      user?.twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {twoFactorError && (
              <div className="mt-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-exclamation flex-shrink-0 text-[10px]" />
                <span>{twoFactorError}</span>
              </div>
            )}

            {/* Setup or Disable Mode: Enter 6-digit OTP */}
            {(twoFactorMode === "setup" || twoFactorMode === "disable") && (
              <div className="mt-3 pt-3 border-t border-[#E0E7E6] dark:border-[#395B64]/30 space-y-2.5">
                <p className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/80">
                  Enter the 6-digit verification code sent to{" "}
                  <strong className="text-[#2C3333] dark:text-[#E7F6F2]">
                    {user?.email}
                  </strong>{" "}
                  to {twoFactorMode === "setup" ? "enable" : "disable"} 2FA:
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
                    className="flex-1 sm:w-32 rounded-lg border border-[#A5C9CA] dark:border-[#395B64] bg-white dark:bg-[#1E2525] px-2.5 py-1.5 text-center font-mono text-sm font-bold tracking-widest text-[#2C3333] dark:text-white outline-none focus:border-[#395B64]"
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
                    className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-white transition disabled:opacity-50 shadow-2xs whitespace-nowrap ${
                      twoFactorMode === "setup"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {is2FALoading
                      ? "Verifying..."
                      : twoFactorMode === "setup"
                        ? "Verify & Enable"
                        : "Verify & Disable"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorMode("idle");
                      setSetupOtp("");
                      setTwoFactorError("");
                    }}
                    className="cursor-pointer px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#395B64]/50 text-[11px] font-medium text-[#52656A] dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#1E2525] transition"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 pt-0.5">
                  <span>Didn't get the code?</span>
                  <button
                    type="button"
                    onClick={
                      twoFactorMode === "setup"
                        ? handleStart2FASetup
                        : handleStart2FADisable
                    }
                    disabled={setupCooldown > 0 || is2FALoading}
                    className="cursor-pointer font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                  >
                    {setupCooldown > 0
                      ? `Resend in ${setupCooldown}s`
                      : "Resend code"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E0E7E6] dark:border-[#2C3333]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingAvatar || !username.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#4A7C88] transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving && (
                <i className="fa-solid fa-spinner fa-spin text-xs" />
              )}
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
