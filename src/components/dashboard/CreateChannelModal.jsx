import { useState } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import { toast } from "react-toastify"

const CreateChannelModal = ({ onClose, workspaceId, onChannelCreated }) => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("PUBLIC")
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { createChannel, workspaceData, user } = useWorkspace()

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
      const newChannel = await createChannel(cleanName, description, type, selectedMemberIds)
      toast.success(`Channel #${cleanName} created successfully!`)
      if (onChannelCreated && newChannel) {
        onChannelCreated(newChannel)
      }
      onClose()
    } catch (err) {
      setError(err.message || "Failed to create channel")
      toast.error(err.message || "Failed to create channel")
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#395B64]">Channels</p>
            <h2 className="text-xl font-bold text-[#2C3333]">Create a channel</h2>
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
              <span className="absolute left-3 text-sm text-[#52656A] font-bold">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. announcements"
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
              rows="2"
              className="w-full rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#2C3333] placeholder-[#7B8B8F] focus:border-[#395B64] focus:bg-white focus:outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-2">
              Channel Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                  type === "PUBLIC"
                    ? "border-[#395B64] bg-[#E7F6F2]/60 text-[#2C3333]"
                    : "border-[#E0E0E0] bg-white hover:border-[#A5C9CA]"
                }`}
              >
                <input
                  type="radio"
                  name="channelType"
                  value="PUBLIC"
                  checked={type === "PUBLIC"}
                  onChange={() => setType("PUBLIC")}
                  className="mt-0.5 text-[#395B64] focus:ring-[#395B64]"
                />
                <div>
                  <div className="text-sm font-semibold text-[#2C3333]">Public</div>
                  <div className="text-xs text-[#52656A]">Anyone in workspace can join</div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                  type === "PRIVATE"
                    ? "border-[#395B64] bg-[#E7F6F2]/60 text-[#2C3333]"
                    : "border-[#E0E0E0] bg-white hover:border-[#A5C9CA]"
                }`}
              >
                <input
                  type="radio"
                  name="channelType"
                  value="PRIVATE"
                  checked={type === "PRIVATE"}
                  onChange={() => setType("PRIVATE")}
                  className="mt-0.5 text-[#395B64] focus:ring-[#395B64]"
                />
                <div>
                  <div className="text-sm font-semibold text-[#2C3333]">Private</div>
                  <div className="text-xs text-[#52656A]">Only invited members can view</div>
                </div>
              </label>
            </div>
          </div>

          {type === "PRIVATE" && members.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-1.5">
                Add workspace members
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
              {isLoading ? "Creating..." : "Create channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateChannelModal
