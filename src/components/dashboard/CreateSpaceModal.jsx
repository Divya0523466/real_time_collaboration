import { useState } from "react"
import { toast } from "react-toastify"
import { createSpaceApi, checkSpaceMemberByEmailApi } from "../../services/spaceService"
import { useWorkspace } from "../../context/WorkspaceContext"
import { isProUser } from "../../utils/subscriptionUtils"
import { isSuperAdminUser } from "../../utils/adminAuth"
import UpgradeModal from "./UpgradeModal"

const CreateSpaceModal = ({
  isOpen = true,
  onClose,
  onSpaceCreated,
  workspaceId = null,
  availableUsers = [],
  currentUserId = null,
  spaces = [],
}) => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMembers, setSelectedMembers] = useState([])
  const [emailInput, setEmailInput] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const { user: contextUser } = useWorkspace()
  const activeUser = contextUser || {}
  const isSuper = isSuperAdminUser(activeUser) || activeUser.isSuperAdmin || activeUser.role === "SUPER_ADMIN"
  const isPro = isProUser(activeUser)

  const activeUserId = (activeUser._id || activeUser.id || currentUserId)?.toString()
  const myCreatedSpaces = (spaces || []).filter((s) => {
    const creatorId = (s.createdBy?._id || s.createdBy?.id || s.createdBy)?.toString()
    return creatorId && creatorId === activeUserId
  })
  const spaceCount = myCreatedSpaces.length > 0 ? myCreatedSpaces.length : (spaces || []).length
  const isLimitReached = !isSuper && !isPro && spaceCount >= 3

  const handleAddEmail = async (e) => {
    if (e) e.preventDefault()
    const trimmedEmail = emailInput.trim().toLowerCase()
    if (!trimmedEmail) return

    setEmailError("")

    // Check if already added
    if (selectedMembers.some((m) => (m.email || "").toLowerCase() === trimmedEmail)) {
      setEmailError("User is already added")
      return
    }

    try {
      setIsCheckingEmail(true)
      const data = await checkSpaceMemberByEmailApi(trimmedEmail, availableUsers)
      const foundUser = data.user
      setSelectedMembers((prev) => [...prev, foundUser])
      setEmailInput("")
    } catch (err) {
      setEmailError(err.message || "User with this email not found")
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleRemoveMember = (userId) => {
    setSelectedMembers((prev) => prev.filter((m) => (m._id || m.id) !== userId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isLimitReached) {
      setShowUpgradeModal(true)
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error("Space name is required")
      return
    }

    let membersToSubmit = [...selectedMembers]
    if (emailInput.trim()) {
      try {
        setIsCheckingEmail(true)
        const data = await checkSpaceMemberByEmailApi(emailInput.trim(), availableUsers)
        if (!membersToSubmit.some((m) => (m.email || "").toLowerCase() === emailInput.trim().toLowerCase())) {
          membersToSubmit.push(data.user)
        }
      } catch (err) {
        setEmailError(err.message || "User with this email not found")
        setIsCheckingEmail(false)
        return
      }
      setIsCheckingEmail(false)
    }

    try {
      setIsSubmitting(true)
      const memberIds = membersToSubmit.map((m) => m._id || m.id)
      const data = await createSpaceApi({
        name: trimmedName,
        description: description.trim(),
        members: memberIds,
        workspaceId,
      })
      toast.success(`Space "#${data.space.name}" created successfully`)
      setName("")
      setDescription("")
      setSelectedMembers([])
      setEmailInput("")
      setEmailError("")
      if (onSpaceCreated) onSpaceCreated(data.space)
      onClose()
    } catch (err) {
      toast.error(err.message || "Failed to create space")
      if (err.message && err.message.toLowerCase().includes("free plan limit")) {
        setShowUpgradeModal(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] p-4 sm:p-6 shadow-2xl text-[#2C3333] dark:text-[#E7F6F2] animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#2C3333]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#395B64]/10 dark:bg-[#395B64] text-[#395B64] dark:text-white">
                <i className="fa-solid fa-table-cells-large text-sm" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Space</h2>
                <p className="text-xs text-gray-500 dark:text-[#A5C9CA]">Dedicated collaboration area for teams</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>

          {isLimitReached ? (
            <div className="space-y-4 py-2 mt-4">
              <div className="rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/50 bg-[#E7F6F2]/60 dark:bg-[#1C2324] p-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] mx-auto mb-3">
                  <i className="fa-solid fa-table-cells-large text-lg" />
                </div>
                <h3 className="text-base font-bold text-[#2C3333] dark:text-white">
                  Space Limit Reached
                </h3>
                <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 mt-1 mb-4 leading-relaxed">
                  The Free plan allows creating up to <strong>3 spaces</strong>. To create unlimited spaces and collaborate seamlessly, upgrade to WorkNest Pro.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-[#395B64] hover:bg-[#2C3333] dark:hover:bg-[#2C3636] transition cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-crown text-[10px]" />
                  <span>Upgrade to Pro for Unlimited Spaces</span>
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
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Space Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#A5C9CA] mb-1.5">
                  Space Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Project, Product Planning"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 dark:border-[#395B64]/60 bg-white dark:bg-[#2C3333] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 outline-none focus:border-[#395B64] dark:focus:border-[#A5C9CA] transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#A5C9CA] mb-1.5">
                  Description <span className="text-xs text-gray-400 dark:text-[#A5C9CA]/60 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="What is this Space for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 dark:border-[#395B64]/60 bg-white dark:bg-[#2C3333] px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 outline-none focus:border-[#395B64] dark:focus:border-[#A5C9CA] resize-none transition"
                />
              </div>

              {/* Add Members by Email (No member list displayed) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#A5C9CA] mb-1.5">
                  Add Members <span className="text-xs text-gray-400 dark:text-[#A5C9CA]/60 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="name@shnoor.com"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value)
                      if (emailError) setEmailError("")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddEmail()
                      }
                    }}
                    className="flex-1 rounded-xl border border-gray-200 dark:border-[#395B64]/60 bg-white dark:bg-[#2C3333] px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 outline-none focus:border-[#395B64] dark:focus:border-[#A5C9CA] transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    disabled={isCheckingEmail || !emailInput.trim()}
                    className="rounded-xl bg-[#395B64] hover:bg-[#2C3333] disabled:opacity-50 text-white font-medium text-sm px-4 py-2 transition flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {isCheckingEmail ? (
                      <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    ) : (
                      "+ Add"
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  Person must have logged in with their account at least once.
                </p>

                {/* Error Message */}
                {emailError && (
                  <div className="mt-2 text-xs text-rose-500 font-medium flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                {/* Added Members Chips */}
                {selectedMembers.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Added Members ({selectedMembers.length})
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 p-1 rounded-xl border border-gray-100 dark:border-[#2C3333] bg-gray-50/50 dark:bg-[#2C3333]/30">
                      {selectedMembers.map((m) => (
                        <div
                          key={m._id || m.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-[#1E2525] border border-gray-100 dark:border-[#395B64]/30"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#395B64] text-xs font-bold text-white overflow-hidden flex-shrink-0">
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.username} className="h-full w-full object-cover" />
                              ) : (
                                m.username?.charAt(0)?.toUpperCase() || "U"
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">
                                {m.username}
                              </p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-400 truncate">
                                {m.email}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m._id || m.id)}
                            className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs p-1 transition cursor-pointer"
                            title="Remove"
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-[#2C3333]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 dark:text-[#A5C9CA] hover:bg-gray-100 dark:hover:bg-[#2C3333] transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex items-center gap-2 rounded-xl bg-[#395B64] hover:bg-[#2C3333] px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus text-xs" />
                      <span>Create Space</span>
                    </>
                  )}
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

export default CreateSpaceModal
