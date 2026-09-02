import { useState } from "react"
import { useWorkspace } from "../../context/WorkspaceContext"
import { toast } from "react-toastify"

const CreateWorkspaceModal = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { createWorkspace } = useWorkspace()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Workspace name is required")
      return
    }

    setIsLoading(true)
    try {
      const workspace = await createWorkspace(name.trim(), description.trim())
      toast.success("Workspace created successfully!")
      onSuccess(workspace)
    } catch (err) {
      setError(err.message || "Failed to create workspace")
      toast.error(err.message || "Failed to create workspace")
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#395B64]">Workspace</p>
            <h2 className="text-xl font-bold text-[#2C3333]">Create a workspace</h2>
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
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering, Product Team"
              className="w-full rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#2C3333] placeholder-[#7B8B8F] focus:border-[#395B64] focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C3333] mb-1.5">
              Description <span className="text-[11px] font-normal text-[#52656A] lowercase">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this workspace about?"
              rows="3"
              className="w-full rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] px-3.5 py-2.5 text-sm text-[#2C3333] placeholder-[#7B8B8F] focus:border-[#395B64] focus:bg-white focus:outline-none transition resize-none"
            />
          </div>

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
              {isLoading ? "Creating..." : "Create workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateWorkspaceModal
