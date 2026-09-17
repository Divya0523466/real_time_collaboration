import { useState } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import { toast } from "react-toastify"

const DeleteChannelModal = ({ channel, onClose, onDeleted }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { deleteChannel } = useWorkspace()

  const handleDelete = async () => {
    setIsLoading(true)
    setError("")
    try {
      await deleteChannel(channel.id)
      toast.error(`Channel #${channel.name} was deleted`)
      if (onDeleted) onDeleted()
      onClose()
    } catch (err) {
      setError(err.message || "Failed to delete channel")
      toast.error(err.message || "Failed to delete channel")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/65 px-4 py-6 backdrop-blur-xs sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="m-auto w-full max-w-md rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-6 shadow-[0_24px_70px_rgba(44,51,51,0.4)] sm:p-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/50 text-base font-bold">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">Delete Channel</p>
              <h2 className="text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2]">Delete #{channel?.name}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-3.5 mb-4 text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
          <p className="font-semibold mb-1">Are you sure you want to delete this channel?</p>
          <p>
            All messages and media posted in <strong>#{channel?.name}</strong> will be permanently removed. This action
            cannot be undone.
          </p>
        </div>

        {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-3">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] py-2.5 text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-50 transition"
          >
            {isLoading ? "Deleting..." : "Delete Channel"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteChannelModal
