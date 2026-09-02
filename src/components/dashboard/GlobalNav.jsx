import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

const GlobalNav = ({ user }) => {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("worknestToken")}`,
        },
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || "Unable to logout.")
        return
      }
      localStorage.removeItem("worknestToken")
      toast.success(data.message || "Logout successful")
      navigate("/")
    } catch {
      localStorage.removeItem("worknestToken")
      toast.success("Logout successful")
      navigate("/")
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1E2525] text-[#E7F6F2]">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-[#2C3333]">
        <h1 className="text-base font-bold text-white flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#395B64] text-xs font-bold text-[#E7F6F2]">
            <i className="fa-solid fa-layer-group" />
          </span>
          <span>WorkNest</span>
        </h1>
      </div>

      {/* Main Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="text-[10px] font-bold text-[#A5C9CA] uppercase tracking-widest px-2 mb-2">
          Navigation
        </div>

        <button
          type="button"
          onClick={() => navigate("/app/dashboard")}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-white bg-[#395B64] transition flex items-center gap-2.5 shadow-xs"
        >
          <i className="fa-solid fa-house w-4 text-center text-[#A5C9CA]" /> Workspaces
        </button>
        <button
          type="button"
          onClick={() => toast.info("Notifications & Activity")}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition flex items-center gap-2.5"
        >
          <i className="fa-solid fa-bell w-4 text-center text-[#A5C9CA]" /> Notifications
        </button>
        <button
          type="button"
          onClick={() => toast.info("Direct Messages")}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition flex items-center gap-2.5"
        >
          <i className="fa-solid fa-paper-plane w-4 text-center text-[#A5C9CA]" /> Direct Messages
        </button>
        <button
          type="button"
          onClick={() => toast.info("Activity")}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition flex items-center gap-2.5"
        >
          <i className="fa-solid fa-chart-line w-4 text-center text-[#A5C9CA]" /> Activity
        </button>
      </nav>

      {/* User Profile Section */}
      <div className="p-3 border-t border-[#2C3333] space-y-2">
        {user && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#2C3333]/60">
            <div className="w-8 h-8 rounded-full bg-[#395B64] text-[#E7F6F2] font-bold text-xs flex items-center justify-center flex-shrink-0">
              {user.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.username}</p>
              <p className="text-[11px] text-[#A5C9CA] truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition flex items-center gap-2"
        >
          <i className="fa-solid fa-arrow-right-from-bracket" /> Logout
        </button>
      </div>
    </div>
  )
}

export default GlobalNav
