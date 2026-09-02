import { useState } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import { toast } from "react-toastify"

const EditChannelModal = ({ channel, onClose }) => {
  const [name, setName] = useState(channel?.name || "")
  const [description, setDescription] = useState(channel?.description || "")
  const [selectedMemberIds, setSelectedMemberIds] = useState(
    Array.isArray(channel?.members) ? channel.members.map((m) => m.id || m._id || m) : [],
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { updateChannel, workspaceData, user } = useWorkspace()

  const members = workspaceData?.members?.filter((m) => m.id !== user?.id) || []

  const toggleMember = (memberId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const cleanName = name.trim().toLowerCase().replace(/\s+/g, "-")
    if (!cleanName) {
      setError("Channel name is required")
      return
    }

    setIsLoading(true)
    try {
      await updateChannel(channel.id, cleanName, description.trim(), selectedMemberIds)
      toast.success(`Channel #${cleanName} updated successfully!`)
      onClose()
    } catch (err) {
      setError(err.message || "Failed to update channel")
      toast.error(err.message || "Failed to update channel")
    } finally {
      setIsLoading(false)
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
        className="m-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(44,51,51,0.35)] sm:p-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#395B64]">Channel Settings</p>
            <h2 className="text-xl font-bold text-[#2C3333]">Edit Channel</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] transition"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-1.5">
              Channel Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-sm text-[#52656A] font-bold">
                {channel.type === "PRIVATE" ? <i className="fa-solid fa-lock text-xs" /> : "#"}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. general"
                className="w-full rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] pl-8 pr-3.5 py-2.5 text-sm text-[#2C3333] placeholder-[#7B8B8F] focus:border-[#395B64] focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-1.5">
              Description <span className="text-[11px] font-normal text-[#52656A] lowercase">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows="3"
              className="w-full rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#2C3333] placeholder-[#7B8B8F] focus:border-[#395B64] focus:bg-white focus:outline-none transition resize-none"
            />
          </div>

          {channel.type === "PRIVATE" && members.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-1.5">
                Channel Members
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] p-2">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-white transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#395B64] text-[10px] font-bold text-white">
                        {member.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <span className="truncate text-xs font-medium text-[#2C3333]">{member.username}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="rounded text-[#395B64] focus:ring-[#395B64]"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

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
              disabled={isLoading}
              className="flex-1 rounded-xl bg-[#395B64] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2C3333] disabled:opacity-60 transition"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditChannelModal
