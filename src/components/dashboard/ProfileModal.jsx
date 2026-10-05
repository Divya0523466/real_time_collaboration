import { useState, useRef } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import { uploadFile } from "../../services/uploadService"
import { toast } from "react-toastify"

const ProfileModal = ({ onClose }) => {
  const { user, updateUserProfile } = useWorkspace()
  const [username, setUsername] = useState(user?.username || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "")
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image (PNG, JPG, WEBP, GIF)")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be under 5MB")
      return
    }

    setError("")
    setIsUploadingAvatar(true)

    try {
      const data = await uploadFile(file)
      const uploadedUrl = data?.file?.url || data?.file?.previewUrl || data?.url || ""
      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl)
        toast.info("Photo uploaded! Click Save to apply.")
      } else {
        throw new Error("Failed to get image URL from server")
      }
    } catch (err) {
      setError(err.message || "Failed to upload image")
      toast.error(err.message || "Failed to upload image")
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setError("Username cannot be empty")
      return
    }

    if (trimmedUsername.length < 2) {
      setError("Username must be at least 2 characters")
      return
    }

    setIsSaving(true)
    try {
      await updateUserProfile({
        username: trimmedUsername,
        avatar: avatarUrl,
      })
      onClose()
    } catch (err) {
      setError(err.message || "Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/60 px-4 py-6 backdrop-blur-xs sm:px-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="m-auto w-full max-w-[410px] rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-5 shadow-[0_20px_60px_rgba(44,51,51,0.3)] transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-[#E0E7E6] dark:border-[#2C3333]">
          <div>
            <h2 className="text-base font-bold text-[#2C3333] dark:text-[#E7F6F2]">Edit Profile</h2>
            <p className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">Update your photo and display name</p>
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
              <p className="text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2]">Profile Photo</p>
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
              {isSaving && <i className="fa-solid fa-spinner fa-spin text-xs" />}
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal
