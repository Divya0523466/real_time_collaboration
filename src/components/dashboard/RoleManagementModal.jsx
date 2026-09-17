import { useState } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import { toast } from "react-toastify"

const RoleManagementModal = ({ member, userRole, onClose, workspaceId }) => {
  const [selectedRole, setSelectedRole] = useState(member.role)
  const [isLoading, setIsLoading] = useState(false)
  const { updateMemberRole } = useWorkspace()

  const handleUpdateRole = async () => {
    if (selectedRole === member.role) {
      onClose()
      return
    }

    setIsLoading(true)
    try {
      await updateMemberRole(member.id, selectedRole)
      toast.success(`${member.username}'s role updated to ${selectedRole}`)
      onClose()
    } catch (err) {
      toast.error(err.message || "Failed to update role")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid overflow-y-auto bg-[#2C3333]/60 px-4 py-6 backdrop-blur-xs sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="m-auto w-full max-w-md rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-6 shadow-[0_24px_70px_rgba(44,51,51,0.35)] sm:p-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#395B64] dark:text-[#A5C9CA]">Member Permissions</p>
            <h2 className="text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2]">Change role for {member.username}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
              selectedRole === "ADMIN"
                ? "border-[#395B64] bg-[#E7F6F2]/60 dark:bg-[#395B64]/20 text-[#2C3333] dark:text-[#E7F6F2]"
                : "border-[#E0E0E0] dark:border-[#395B64]/30 bg-white dark:bg-[#2C3333]/50 hover:border-[#A5C9CA] dark:hover:border-[#395B64]"
            }`}
          >
            <input
              type="radio"
              value="ADMIN"
              checked={selectedRole === "ADMIN"}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="mt-0.5 text-[#395B64] focus:ring-[#395B64]"
            />
            <div>
              <p className="font-semibold text-sm text-[#2C3333] dark:text-[#E7F6F2]">Admin</p>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]">Can create and manage channels and channel members</p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
              selectedRole === "MEMBER"
                ? "border-[#395B64] bg-[#E7F6F2]/60 dark:bg-[#395B64]/20 text-[#2C3333] dark:text-[#E7F6F2]"
                : "border-[#E0E0E0] dark:border-[#395B64]/30 bg-white dark:bg-[#2C3333]/50 hover:border-[#A5C9CA] dark:hover:border-[#395B64]"
            }`}
          >
            <input
              type="radio"
              value="MEMBER"
              checked={selectedRole === "MEMBER"}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="mt-0.5 text-[#395B64] focus:ring-[#395B64]"
            />
            <div>
              <p className="font-semibold text-sm text-[#2C3333] dark:text-[#E7F6F2]">Member</p>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]">Standard chat, channels, and direct messaging access</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] py-2.5 text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpdateRole}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-[#395B64] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2C3333] dark:hover:bg-[#4E717B] disabled:opacity-60 transition"
          >
            {isLoading ? "Saving..." : "Update role"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoleManagementModal
