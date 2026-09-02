import { useState } from "react"
import { toast } from "react-toastify"

const InviteMemberModal = ({ workspaceName, workspaceId, onClose, onInviteSuccess }) => {
  const [emails, setEmails] = useState("")
  const [role, setRole] = useState("MEMBER")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const cleaned = emails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean)

    if (cleaned.length === 0) {
      toast.error("Please provide at least one valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("worknestToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: cleaned,
          role,
          message: message.trim(),
        }),
      })

      const data = await response.json().catch(() => ({ message: "Unable to send invitations" }))
      if (!response.ok) {
        throw new Error(data.message || "Unable to send invitations")
      }

      toast.success(data.message || "Invitations sent successfully")
      if (onInviteSuccess) onInviteSuccess()
      onClose()
    } catch (error) {
      toast.error(error.message || "Unable to send invitations")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/60 px-4 py-6 backdrop-blur-xs sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="m-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(44,51,51,0.35)] sm:p-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#395B64]">Workspace Invitation</p>
            <h2 className="text-xl font-bold text-[#2C3333]">Invite people to {workspaceName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] transition"
            aria-label="Close invite modal"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-1.5">
              Email addresses
            </label>
            <textarea
              rows="2"
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              placeholder="person@example.com, colleague@example.com"
              className="w-full rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#2C3333] placeholder-[#7B8B8F] focus:border-[#395B64] focus:bg-white focus:outline-none transition"
            />
            <p className="mt-1 text-[11px] text-[#52656A]">Separate multiple emails with commas</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-2">
              Workspace Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                  role === "MEMBER"
                    ? "border-[#395B64] bg-[#E7F6F2]/60 text-[#2C3333]"
                    : "border-[#E0E0E0] bg-white hover:border-[#A5C9CA]"
                }`}
              >
                <input
                  type="radio"
                  name="inviteRole"
                  value="MEMBER"
                  checked={role === "MEMBER"}
                  onChange={() => setRole("MEMBER")}
                  className="mt-0.5 text-[#395B64] focus:ring-[#395B64]"
                />
                <div>
                  <div className="text-sm font-semibold text-[#2C3333]">Member</div>
                  <div className="text-xs text-[#52656A]">Normal chat & channel access</div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                  role === "ADMIN"
                    ? "border-[#395B64] bg-[#E7F6F2]/60 text-[#2C3333]"
                    : "border-[#E0E0E0] bg-white hover:border-[#A5C9CA]"
                }`}
              >
                <input
                  type="radio"
                  name="inviteRole"
                  value="ADMIN"
                  checked={role === "ADMIN"}
                  onChange={() => setRole("ADMIN")}
                  className="mt-0.5 text-[#395B64] focus:ring-[#395B64]"
                />
                <div>
                  <div className="text-sm font-semibold text-[#2C3333]">Admin</div>
                  <div className="text-xs text-[#52656A]">Can manage channels & members</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-1.5">
              Optional message
            </label>
            <textarea
              rows="2"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Join our workspace on WorkNest!"
              className="w-full rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#2C3333] placeholder-[#7B8B8F] focus:border-[#395B64] focus:bg-white focus:outline-none transition"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#A5C9CA] py-2.5 text-sm font-semibold text-[#2C3333] hover:bg-[#E7F6F2] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[#395B64] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2C3333] disabled:opacity-60 transition"
            >
              {isSubmitting ? "Sending..." : "Send invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InviteMemberModal
