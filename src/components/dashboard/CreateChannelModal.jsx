import { useState } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import { toast } from "react-toastify"
import { isProUser } from "../../utils/subscriptionUtils"
import UpgradeModal from "./UpgradeModal"

const CreateChannelModal = ({ onClose, workspaceId, onChannelCreated }) => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("PUBLIC")
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { createChannel, workspaceData, user, channels } = useWorkspace()

  const isPro = isProUser(user)
  const isLimitReached = !isPro && (channels || []).length >= 5

  const members = workspaceData?.members?.filter((m) => m.id !== user?.id) || []

  const toggleMember = (memberId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (isLimitReached) {
      setShowUpgradeModal(true)
      return
    }

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
      if (err.message && err.message.toLowerCase().includes("free plan limit")) {
        setShowUpgradeModal(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/60 px-4 py-6 backdrop-blur-xs sm:px-6"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isLoading) onClose()
        }}
      >
        <div
          className="m-auto w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-5 sm:p-8 shadow-[0_24px_70px_rgba(44,51,51,0.35)]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex justify-between items-center mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#395B64] dark:text-[#A5C9CA]">Channels</p>
              <h2 className="text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2]">Create a channel</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {isLimitReached ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/50 bg-[#E7F6F2]/60 dark:bg-[#1C2324] p-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] mx-auto mb-3">
                  <i className="fa-solid fa-hashtag text-lg" />
                </div>
                <h3 className="text-base font-bold text-[#2C3333] dark:text-white">
                  Channel Limit Reached
                </h3>
                <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 mt-1 mb-4 leading-relaxed">
                  The Free plan allows creating up to <strong>5 channels</strong> per workspace. To create unlimited channels and collaborate seamlessly, upgrade to WorkNest Pro.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#2C3636] transition cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-crown text-[10px]" />
                  <span>Upgrade to Pro for Unlimited Channels</span>
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#52656A] hover:bg-gray-100 dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] dark:text-[#E7F6F2] mb-1.5">
                  Channel Name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm text-[#52656A] dark:text-[#A5C9CA] font-bold">#</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. announcements"
                    className="w-full rounded-xl border border-[#A5C9CA] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] pl-8 pr-3.5 py-2.5 text-sm text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#7B8B8F] dark:placeholder-[#A5C9CA]/50 focus:border-[#395B64] focus:bg-white dark:focus:bg-[#2C3333] focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] dark:text-[#E7F6F2] mb-1.5">
                  Description <span className="text-[11px] font-normal text-[#52656A] dark:text-[#A5C9CA] lowercase">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this channel about?"
                  rows="2"
                  className="w-full rounded-xl border border-[#A5C9CA] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] px-3.5 py-2.5 text-sm text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#7B8B8F] dark:placeholder-[#A5C9CA]/50 focus:border-[#395B64] focus:bg-white dark:focus:bg-[#2C3333] focus:outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] dark:text-[#E7F6F2] mb-2">
                  Channel Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                      type === "PUBLIC"
                        ? "border-[#395B64] bg-[#E7F6F2]/60 dark:bg-[#395B64]/20 text-[#2C3333] dark:text-[#E7F6F2]"
                        : "border-[#E0E0E0] dark:border-[#395B64]/30 bg-white dark:bg-[#2C3333]/50 hover:border-[#A5C9CA] dark:hover:border-[#395B64]"
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
                      <div className="text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2]">Public</div>
                      <div className="text-xs text-[#52656A] dark:text-[#A5C9CA]">Anyone in workspace can join</div>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                      type === "PRIVATE"
                        ? "border-[#395B64] bg-[#E7F6F2]/60 dark:bg-[#395B64]/20 text-[#2C3333] dark:text-[#E7F6F2]"
                        : "border-[#E0E0E0] dark:border-[#395B64]/30 bg-white dark:bg-[#2C3333]/50 hover:border-[#A5C9CA] dark:hover:border-[#395B64]"
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
                      <div className="text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2]">Private</div>
                      <div className="text-xs text-[#52656A] dark:text-[#A5C9CA]">Only invited members can view</div>
                    </div>
                  </label>
                </div>
              </div>

              {type === "PRIVATE" && members.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] dark:text-[#E7F6F2] mb-1.5">
                    Add workspace members
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#2C3333] p-2">
                    {members.map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-white dark:hover:bg-[#1E2525] transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#395B64] text-[10px] font-bold text-white">
                            {member.username?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <span className="truncate text-xs font-medium text-[#2C3333] dark:text-[#E7F6F2]">{member.username}</span>
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

              {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] py-2.5 text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-[#395B64] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2C3333] dark:hover:bg-[#4E717B] disabled:opacity-60 transition cursor-pointer"
                >
                  {isLoading ? "Creating..." : "Create channel"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  )
}

export default CreateChannelModal
