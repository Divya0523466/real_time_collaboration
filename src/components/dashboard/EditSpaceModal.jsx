import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { updateSpaceApi } from "../../services/spaceService"

const EditSpaceModal = ({
  isOpen = true,
  onClose,
  space,
  onSpaceUpdated,
}) => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (space) {
      setName(space.name || "")
      setDescription(space.description || "")
    }
  }, [space])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!space) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error("Space name is required")
      return
    }

    try {
      setIsSubmitting(true)
      const data = await updateSpaceApi(space.id || space._id, {
        name: trimmedName,
        description: description.trim(),
      })
      toast.success("Space updated successfully")
      onSpaceUpdated(data.space)
      onClose()
    } catch (err) {
      toast.error(err.message || "Failed to update space")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !space) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] p-6 shadow-2xl text-[#2C3333] dark:text-[#E7F6F2] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#2C3333]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00897b]/10 dark:bg-[#395B64] text-[#00897b] dark:text-white">
              <i className="fa-solid fa-table-cells-large text-sm" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Space</h2>
              <p className="text-xs text-gray-500 dark:text-[#A5C9CA]">Update name or description</p>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-[#A5C9CA] mb-1.5">
              Space Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-gray-200 dark:border-[#395B64]/60 bg-white dark:bg-[#2C3333] px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 outline-none focus:border-[#00897b] dark:focus:border-[#A5C9CA] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-[#A5C9CA] mb-1.5">
              Description <span className="text-xs text-gray-400 dark:text-[#A5C9CA]/60 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-[#395B64]/60 bg-white dark:bg-[#2C3333] px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 outline-none focus:border-[#00897b] dark:focus:border-[#A5C9CA] resize-none transition"
            />
          </div>

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
              className="flex items-center gap-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check text-xs" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditSpaceModal
