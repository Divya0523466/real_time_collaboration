import { useState } from "react"
import { toast } from "react-toastify"
import { deleteSpaceApi } from "../../services/spaceService"

const DeleteSpaceModal = ({
  isOpen = true,
  onClose,
  space,
  onSpaceDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!space) return

    try {
      setIsDeleting(true)
      await deleteSpaceApi(space.id || space._id)
      toast.success(`Space "${space.name}" deleted successfully`)
      onSpaceDeleted(space.id || space._id)
      onClose()
    } catch (err) {
      toast.error(err.message || "Failed to delete space")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen || !space) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-rose-500/40 bg-white dark:bg-[#1E2525] p-6 shadow-2xl text-[#2C3333] dark:text-[#E7F6F2] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 pb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
            <i className="fa-solid fa-triangle-exclamation text-lg" />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Delete Space</h2>
            <p className="text-xs text-gray-500 dark:text-[#A5C9CA]">This action cannot be undone</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-600 dark:text-[#A5C9CA] leading-relaxed">
          Are you sure you want to delete <strong className="text-gray-900 dark:text-white font-semibold">#{space.name}</strong>?
          All messages, attachments, and conversations within this Space will be permanently deleted.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t border-gray-100 dark:border-[#2C3333]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 dark:text-[#A5C9CA] hover:bg-gray-100 dark:hover:bg-[#2C3333] transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isDeleting ? (
              <>
                <i className="fa-solid fa-spinner animate-spin text-xs" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash-can text-xs" />
                <span>Delete Space</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteSpaceModal
