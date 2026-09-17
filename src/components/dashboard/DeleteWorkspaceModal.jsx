import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useWorkspace } from "../../context/WorkspaceContext"
import { toast } from "react-toastify"

const DeleteWorkspaceModal = ({ workspace, onClose }) => {
  const navigate = useNavigate()
  const [confirmName, setConfirmName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { deleteWorkspace } = useWorkspace()

  const handleDelete = async (e) => {
    e.preventDefault()
    setError("")

    if (confirmName.trim().toLowerCase() !== workspace.name.trim().toLowerCase()) {
      setError("Please enter the exact workspace name to confirm")
      return
    }

    setIsLoading(true)
    try {
      await deleteWorkspace()
      toast.error(`Workspace "${workspace.name}" was permanently deleted`)
      onClose()
      navigate("/app/dashboard")
    } catch (err) {
      setError(err.message || "Failed to delete workspace")
      toast.error(err.message || "Failed to delete workspace")
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
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">Danger Zone</p>
              <h2 className="text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2]">Delete Workspace</h2>
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
          <p className="font-semibold mb-1">Warning: This action cannot be undone.</p>
          <p>
            Deleting <strong>{workspace?.name}</strong> will permanently remove all associated channels, messages,
            invitations, and member records.
          </p>
        </div>

        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] mb-1.5">
              To confirm, please type <span className="font-bold text-rose-600 dark:text-rose-400 select-all">{workspace?.name}</span> below:
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Type workspace name here"
              className="w-full rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#2C3333] px-3.5 py-2.5 text-sm text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#7B8B8F] dark:placeholder-[#A5C9CA]/50 focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900 transition"
            />
          </div>

          {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] py-2.5 text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || confirmName.trim().toLowerCase() !== workspace?.name.trim().toLowerCase()}
              className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-50 transition"
            >
              {isLoading ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DeleteWorkspaceModal
