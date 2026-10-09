import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import {
  addSpaceMemberByEmailApi,
  removeSpaceMemberApi,
} from "../../services/spaceService"

const SpaceMembersModal = ({
  isOpen = true,
  onClose,
  space,
  onSpaceUpdated,
  onMembersUpdated,
  isSuperAdmin = false,
  currentUserId,
}) => {
  const [localSpace, setLocalSpace] = useState(space)
  const [emailInput, setEmailInput] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isAddingEmail, setIsAddingEmail] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  useEffect(() => {
    setLocalSpace(space)
  }, [space])

  const effectiveSpace = localSpace || space
  const currentMembers = effectiveSpace?.members || []
  const spaceId = effectiveSpace?.id || effectiveSpace?._id

  const handleUpdateCallback = (updatedSpace) => {
    if (updatedSpace) {
      setLocalSpace(updatedSpace)
    }
    if (onSpaceUpdated) onSpaceUpdated(updatedSpace)
    if (onMembersUpdated) onMembersUpdated(updatedSpace)
  }

  const handleAddMemberByEmail = async (e) => {
    e.preventDefault()
    if (!emailInput.trim() || !spaceId) return
    setEmailError("")
    setIsAddingEmail(true)
    try {
      const data = await addSpaceMemberByEmailApi(spaceId, emailInput.trim())
      toast.success("Member added to Space")
      setEmailInput("")
      handleUpdateCallback(data.space)
    } catch (err) {
      setEmailError(err.message || "Failed to add member")
    } finally {
      setIsAddingEmail(false)
    }
  }

  const handleRemoveMember = async (member) => {
    const memberId = (member._id || member.id || member).toString()
    if (!spaceId) return

    try {
      setActionLoadingId(memberId)
      const data = await removeSpaceMemberApi(spaceId, memberId)
      toast.success(`Removed ${member.username || "member"} from Space`)
      handleUpdateCallback(data.space)
    } catch (err) {
      toast.error(err.message || "Failed to remove member")
    } finally {
      setActionLoadingId(null)
    }
  }

  if (!isOpen || !space) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E2525] p-6 shadow-2xl border border-gray-100 dark:border-[#2C3333] text-[#2C3333] dark:text-[#E7F6F2] animate-in fade-in zoom-in-95 duration-150">
        {/* Header matching Image 3: #spaceName — Members (count) */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-[#2C3333]">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            #{effectiveSpace?.name || "Space"} — Members ({currentMembers.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        {/* ADD MEMBER Section (Super Admin / Creator) */}
        {isSuperAdmin && (
          <div className="pt-4">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              ADD MEMBER
            </label>
            <form onSubmit={handleAddMemberByEmail}>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value)
                    if (emailError) setEmailError("")
                  }}
                  placeholder="name@shnoor.com"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#252F2F] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#00897b] focus:ring-1 focus:ring-[#00897b] transition"
                />
                <button
                  type="submit"
                  disabled={isAddingEmail || !emailInput.trim()}
                  className="rounded-lg bg-[#00897b] hover:bg-[#00796b] disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 transition flex items-center justify-center cursor-pointer shadow-xs"
                >
                  {isAddingEmail ? (
                    <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                  ) : (
                    "+ Add"
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Person must have logged in with their @shnoor.com account at least once.
              </p>
              {emailError && (
                <div className="mt-2.5 text-xs text-rose-500 font-medium flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}
            </form>

            <div className="border-t border-gray-100 dark:border-[#2C3333] my-4" />
          </div>
        )}

        {/* Existing Members List (matching Image 3) */}
        <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
          {currentMembers.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 dark:text-[#A5C9CA]">
              No members in this space
            </div>
          ) : (
            currentMembers.map((member) => {
              const mId = (member._id || member.id || member).toString()
              const isCreator = effectiveSpace?.createdBy?._id
                ? effectiveSpace.createdBy._id.toString() === mId
                : effectiveSpace?.createdBy?.toString() === mId

              const isAdminRole =
                isCreator ||
                member.platformRole === "super_admin" ||
                member.role === "admin"

              const isRemoving = actionLoadingId === mId

              return (
                <div
                  key={mId}
                  className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-[#2C3333]/40 last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.username || "Avatar"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (member.username || member.email || "U")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {member.username || "User"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {member.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    {isAdminRole ? (
                      <span className="rounded bg-[#e0f2f1] dark:bg-[#004d40]/40 px-2.5 py-0.5 text-xs font-medium text-[#00796b] dark:text-[#80cbc4]">
                        admin
                      </span>
                    ) : (
                      <span className="rounded bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                        member
                      </span>
                    )}

                    {isSuperAdmin && !isCreator && (
                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => handleRemoveMember(member)}
                        className="rounded-md border border-rose-300 dark:border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer disabled:opacity-50"
                      >
                        {isRemoving ? (
                          <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                        ) : (
                          "Remove"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default SpaceMembersModal
