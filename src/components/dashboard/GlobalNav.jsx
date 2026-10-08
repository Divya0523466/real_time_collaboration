import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useWorkspace } from "../../context/WorkspaceContext"
import { toast } from "react-toastify"
import NotificationPanel from "./NotificationPanel"
import ProfileModal from "./ProfileModal"
import { isSuperAdminUser } from "../../utils/adminAuth"

const GlobalNav = ({ user }) => {
  const navigate = useNavigate()
  const { clearAuth, unreadNotificationsCount } = useWorkspace()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const handleLogout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, { credentials: "include",
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
      clearAuth()
      toast.error(data.message || "Logout successful")
      navigate("/")
    } catch {
      localStorage.removeItem("worknestToken")
      clearAuth()
      toast.error("Logout successful")
      navigate("/")
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1E2525] text-[#E7F6F2]">
      <div className="p-4 border-b border-[#2C3333]">
        <h1 className="text-base font-bold text-white flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#395B64] text-xs font-bold text-[#E7F6F2]">
            <i className="fa-solid fa-layer-group" />
          </span>
          <span>WorkNest</span>
        </h1>
      </div>
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
          onClick={() => setShowNotifications(true)}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition flex items-center gap-2.5"
        >
          <i className="fa-solid fa-bell w-4 text-center text-[#A5C9CA]" />
          <span className="flex-1">Notifications</span>
          {unreadNotificationsCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#395B64] px-1 text-[10px] font-bold text-white">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
        {isSuperAdminUser(user) && (
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-emerald-400 hover:bg-[#2C3333] transition flex items-center gap-2.5"
          >
            <i className="fa-solid fa-shield-halved w-4 text-center text-emerald-400" />
            <span className="flex-1">Super Admin</span>
            <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase">
              Admin
            </span>
          </button>
        )}
      </nav>

   
      <div className="p-3 border-t border-[#2C3333] space-y-2">
        {user && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#2C3333]/60 group">
            <div className="w-8 h-8 rounded-full bg-[#395B64] text-[#E7F6F2] font-bold text-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
              ) : (
                user.username?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.username}</p>
              <p className="text-[11px] text-[#A5C9CA] truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#A5C9CA] hover:text-white hover:bg-[#395B64] transition cursor-pointer"
              title="Edit Profile"
            >
              <i className="fa-solid fa-pen-to-square text-xs" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition flex items-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-arrow-right-from-bracket" /> Logout
        </button>
      </div>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  )
}

export default GlobalNav
