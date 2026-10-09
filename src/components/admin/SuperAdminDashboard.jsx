import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { FiSun, FiMoon } from "react-icons/fi"
import { useWorkspace } from "../../context/WorkspaceContext"
import { useTheme } from "../../context/ThemeContext"
import { toast } from "react-toastify"
import ProfileModal from "../dashboard/ProfileModal"
import CreateWorkspaceModal from "../dashboard/CreateWorkspaceModal"
import CreateSpaceModal from "../dashboard/CreateSpaceModal"
import { getWorkspaceInitials } from "../dashboard/SlackShell"
import {
  fetchSpaces,
  deleteSpaceApi,
  addSpaceMemberByEmailApi,
  removeSpaceMemberApi,
} from "../../services/spaceService"
import {
  isSuperAdminUser,
  addSuperAdmin,
  removeSuperAdmin,
  getSuperAdminSet,
  getCachedAdminUsers,
  getCachedAdminWorkspaces,
} from "../../utils/adminAuth"

const SuperAdminDashboard = () => {
  const navigate = useNavigate()
  const { user, clearAuth, selectWorkspace } = useWorkspace()
  const { toggleTheme, isDark } = useTheme()

  const [activeTab, setActiveTab] = useState("dashboard")
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Initial user & workspace data from compiled directory cache
  const [allUsers, setAllUsers] = useState(() => getCachedAdminUsers())
  const [allWorkspaces, setAllWorkspaces] = useState(() => getCachedAdminWorkspaces())

  // Dynamic stats calculation helper
  const computeStatsFromData = (usersList, wsList) => {
    const total = usersList.length
    const inactive = usersList.filter((u) => u.isActive === false || u.status === "inactive").length
    const active = Math.max(0, total - inactive)
    return {
      usersCount: total,
      workspacesCount: wsList.length,
      activeCount: active,
      totalMessages: 0,
      totalChannels: 0,
    }
  }

  // Stats state
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem("worknest_cached_admin_stats")
      if (cached) return JSON.parse(cached)
    } catch {}
    const initialUsers = getCachedAdminUsers()
    const initialWs = getCachedAdminWorkspaces()
    return computeStatsFromData(initialUsers, initialWs)
  })

  const [recentUsers, setRecentUsers] = useState(() => {
    try {
      const cached = localStorage.getItem("worknest_cached_recent_users")
      if (cached) return JSON.parse(cached)
    } catch {}
    const initialUsers = getCachedAdminUsers()
    return initialUsers.slice(0, 5)
  })

  const [systemInfo, setSystemInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState("all")

  // Space management states
  const [spaces, setSpaces] = useState([])
  const [isSpacesLoading, setIsSpacesLoading] = useState(false)
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false)
  const [activeMembersModalSpace, setActiveMembersModalSpace] = useState(null)
  const [addMemberEmail, setAddMemberEmail] = useState("")
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [addMemberError, setAddMemberError] = useState("")
  const [removingMemberId, setRemovingMemberId] = useState(null)
  const [deleteSpaceConfirm, setDeleteSpaceConfirm] = useState(null)

  // Modal for delete user action
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

  // Automatically remember admin token when super admin is in session
  useEffect(() => {
    if (isSuperAdminUser(user)) {
      const curToken = localStorage.getItem("worknestToken")
      if (curToken) {
        localStorage.setItem("worknest_admin_token", curToken)
      }
    }
  }, [user])

  const getAuthHeaders = () => {
    const userToken = localStorage.getItem("worknestToken")
    const adminToken = localStorage.getItem("worknest_admin_token")
    const token = (isSuperAdminUser(user) || !adminToken)
      ? (userToken || adminToken)
      : (adminToken || userToken)
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }
  }

  // Fetch Dashboard Stats & Recent Users
  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    const isAdminAccount = isSuperAdminUser(user)

    if (isAdminAccount) {
      try {
        const res = await fetch(`${API_URL}/admin/stats`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats || { usersCount: 0, workspacesCount: 0, activeCount: 0 })
          let deactivatedIds = []
          try {
            const stored = localStorage.getItem("worknest_deactivated_users")
            deactivatedIds = stored ? JSON.parse(stored) : []
          } catch {
            deactivatedIds = []
          }
          const deactivatedSet = new Set(deactivatedIds.map(String))
          const superAdminSet = getSuperAdminSet()
          const mappedRecent = (data.recentUsers || []).map((u) => {
            const uid = String(u.id || u._id || "").toLowerCase().trim()
            const uemail = u.email ? String(u.email).toLowerCase().trim() : ""
            const isDeact =
              deactivatedSet.has(uid) ||
              (uemail && deactivatedSet.has(uemail)) ||
              u.isActive === false ||
              u.status === "inactive"
            const isSuper =
              uemail === "admin@gmail.com" ||
              u.platformRole === "super_admin" ||
              u.role === "admin" ||
              u.isSuperAdmin === true ||
              (uid && superAdminSet.has(uid)) ||
              (uemail && superAdminSet.has(uemail))
            return {
              ...u,
              isActive: !isDeact,
              status: isDeact ? "inactive" : "active",
              platformRole: isSuper ? "super_admin" : (u.platformRole || "user"),
              role: isSuper ? "admin" : (u.role || "member"),
            }
          })
          setRecentUsers(mappedRecent)
          setSystemInfo(data.systemInfo || null)
          try {
            if (data.stats) localStorage.setItem("worknest_cached_admin_stats", JSON.stringify(data.stats))
            if (mappedRecent) localStorage.setItem("worknest_cached_recent_users", JSON.stringify(mappedRecent))
          } catch {}
          setIsLoading(false)
          return
        }
      } catch {}
    }

    // For promoted super admins (or fallback): compute dynamically from live directory
    const currentUsers = getCachedAdminUsers()
    const currentWorkspaces = getCachedAdminWorkspaces()
    const computed = computeStatsFromData(currentUsers, currentWorkspaces)
    setStats(computed)
    setRecentUsers(currentUsers.slice(0, 5))
    setIsLoading(false)
  }, [API_URL, user?.email])

  // Fetch All Users & merge persisted deactivation and super admin status
  const fetchUsers = useCallback(async () => {
    const isAdminAccount = isSuperAdminUser(user)

    if (isAdminAccount) {
      try {
        const res = await fetch(`${API_URL}/admin/users`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          const rawUsers = data.users || []
          let deactivatedIds = []
          try {
            const stored = localStorage.getItem("worknest_deactivated_users")
            deactivatedIds = stored ? JSON.parse(stored) : []
          } catch {
            deactivatedIds = []
          }
          const deactivatedSet = new Set(deactivatedIds.map(String))
          const superAdminSet = getSuperAdminSet()
          const mergedUsers = rawUsers.map((u) => {
            const uid = String(u.id || u._id || "").toLowerCase().trim()
            const uemail = u.email ? String(u.email).toLowerCase().trim() : ""
            const isDeact =
              deactivatedSet.has(uid) ||
              (uemail && deactivatedSet.has(uemail)) ||
              u.isActive === false ||
              u.status === "inactive"
            const isSuper =
              uemail === "admin@gmail.com" ||
              u.platformRole === "super_admin" ||
              u.role === "admin" ||
              u.isSuperAdmin === true ||
              (uid && superAdminSet.has(uid)) ||
              (uemail && superAdminSet.has(uemail))
            return {
              ...u,
              isActive: !isDeact,
              status: isDeact ? "inactive" : "active",
              platformRole: isSuper ? "super_admin" : (u.platformRole || "user"),
              role: isSuper ? "admin" : (u.role || "member"),
            }
          })
          setAllUsers(mergedUsers)
          try {
            localStorage.setItem("worknest_cached_admin_users", JSON.stringify(mergedUsers))
          } catch {}
          return
        }
      } catch {}
    }

    // For promoted super admins (or fallback): load full platform directory seamlessly
    const platformUsers = getCachedAdminUsers()
    setAllUsers(platformUsers)
  }, [API_URL, user?.email])

  // Fetch All Workspaces
  const fetchWorkspaces = useCallback(async () => {
    const isAdminAccount = isSuperAdminUser(user)

    if (isAdminAccount) {
      try {
        const res = await fetch(`${API_URL}/admin/workspaces`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          setAllWorkspaces(data.workspaces || [])
          try {
            localStorage.setItem("worknest_cached_admin_workspaces", JSON.stringify(data.workspaces || []))
          } catch {}
          return
        }
      } catch {}
    }

    // Non-admin endpoint accessible by all authenticated users
    try {
      const res = await fetch(`${API_URL}/workspaces`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        const wsList = data.workspaces || []
        if (Array.isArray(wsList) && wsList.length > 0) {
          setAllWorkspaces(wsList)
          try {
            localStorage.setItem("worknest_cached_admin_workspaces", JSON.stringify(wsList))
          } catch {}
          return
        }
      }
    } catch {}

    const cached = getCachedAdminWorkspaces()
    setAllWorkspaces(cached)
  }, [API_URL, user?.email])

  const fetchAdminSpaces = useCallback(async () => {
    try {
      setIsSpacesLoading(true)
      const data = await fetchSpaces()
      setSpaces(data.spaces || [])
    } catch (err) {
      console.error("Failed to fetch admin spaces:", err)
    } finally {
      setIsSpacesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchUsers()
    fetchWorkspaces()
    fetchAdminSpaces()
  }, [fetchStats, fetchUsers, fetchWorkspaces, fetchAdminSpaces])

  useEffect(() => {
    if (activeTab === "spaces") {
      fetchAdminSpaces()
    }
  }, [activeTab, fetchAdminSpaces])

  const handleAddMemberByEmail = async (e) => {
    e.preventDefault()
    if (!activeMembersModalSpace || !addMemberEmail.trim()) return
    setAddMemberError("")
    setIsAddingMember(true)
    try {
      const data = await addSpaceMemberByEmailApi(activeMembersModalSpace._id, addMemberEmail.trim())
      toast.success("Member added to Space")
      setAddMemberEmail("")
      setActiveMembersModalSpace(data.space)
      setSpaces((prev) => prev.map((s) => (s._id === data.space._id ? data.space : s)))
    } catch (err) {
      setAddMemberError(err.message || "Failed to add member")
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMemberFromSpace = async (spaceId, memberId, username) => {
    try {
      setRemovingMemberId(memberId)
      const data = await removeSpaceMemberApi(spaceId, memberId)
      toast.success(`Removed ${username || "member"} from Space`)
      setActiveMembersModalSpace(data.space)
      setSpaces((prev) => prev.map((s) => (s._id === data.space._id ? data.space : s)))
    } catch (err) {
      toast.error(err.message || "Failed to remove member")
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleDeleteSpace = async () => {
    if (!deleteSpaceConfirm) return
    const targetSpace = deleteSpaceConfirm
    try {
      await deleteSpaceApi(targetSpace._id)
      toast.success(`Space #${targetSpace.name} deleted successfully`)
      setSpaces((prev) => prev.filter((s) => s._id !== targetSpace._id))
      setDeleteSpaceConfirm(null)
    } catch (err) {
      toast.error(err.message || "Failed to delete space")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
    } catch {
      // ignore
    }
    localStorage.removeItem("worknestToken")
    clearAuth()
    toast.success("Logged out successfully")
    navigate("/")
  }

  const handleRoleToggle = async (targetUser) => {
    const isCurrentlyAdmin =
      targetUser.platformRole === "super_admin" ||
      targetUser.role === "admin" ||
      targetUser.role === "super_admin" ||
      targetUser.isSuperAdmin === true
    const newRole = isCurrentlyAdmin ? "user" : "super_admin"
    const newRoleDisplay = newRole === "super_admin" ? "admin" : "member"

    // Persist to local super admins store
    if (newRole === "super_admin") {
      addSuperAdmin(targetUser)
    } else {
      removeSuperAdmin(targetUser)
    }

    // Also update locally cached logged-in user if modifying self
    try {
      const storedUser = localStorage.getItem("worknestUser")
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        const currentUserId = String(parsed.id || parsed._id || "").toLowerCase().trim()
        const currentUserEmail = String(parsed.email || "").toLowerCase().trim()
        const targetId = String(targetUser.id || targetUser._id || "").toLowerCase().trim()
        const targetEmail = String(targetUser.email || "").toLowerCase().trim()
        if ((targetId && targetId === currentUserId) || (targetEmail && targetEmail === currentUserEmail)) {
          parsed.platformRole = newRole
          parsed.role = newRoleDisplay
          parsed.isSuperAdmin = newRole === "super_admin"
          localStorage.setItem("worknestUser", JSON.stringify(parsed))
        }
      }
    } catch {
      // ignore
    }

    // Update state immediately for smooth UI
    setAllUsers((prev) => {
      const updated = prev.map((u) =>
        String(u.id || u._id) === String(targetUser.id || targetUser._id)
          ? { ...u, platformRole: newRole, role: newRoleDisplay, isSuperAdmin: newRole === "super_admin" }
          : u
      )
      try {
        localStorage.setItem("worknest_cached_admin_users", JSON.stringify(updated))
      } catch {}
      return updated
    })
    setRecentUsers((prev) =>
      prev.map((u) =>
        String(u.id || u._id) === String(targetUser.id || targetUser._id)
          ? { ...u, platformRole: newRole, role: newRoleDisplay, isSuperAdmin: newRole === "super_admin" }
          : u
      )
    )

    toast.success(newRole === "super_admin" ? "Made Admin successfully" : "Made Member successfully")

    try {
      const targetUserId = targetUser.id || targetUser._id
      const res = await fetch(`${API_URL}/admin/users/${targetUserId}/role`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.warn("Failed to persist user role to backend:", errData.message)
      }
    } catch (err) {
      console.warn("Network error persisting user role to backend:", err)
    }
  }

  // Toggle user activation/deactivation (does NOT delete account; disables login/access)
  const handleToggleDeactivateUser = async () => {
    if (!deleteUserConfirm) return
    const target = deleteUserConfirm
    const currentIsActive = target.isActive !== false && target.status !== "inactive"
    const newIsActive = !currentIsActive
    const newStatus = newIsActive ? "active" : "inactive"

    try {
      // Send status to admin user update endpoint to persist directly in MongoDB
      const res = await fetch(`${API_URL}/admin/users/${target.id || target._id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          isActive: newIsActive,
        }),
      });
      if (!res.ok) {
        await fetch(`${API_URL}/admin/users/${target.id || target._id}/role`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            role: target.platformRole || (target.role === "admin" ? "super_admin" : "user"),
            status: newStatus,
            isActive: newIsActive,
          }),
        });
      }
    } catch {
      // ignore network errors
    }

    toast.success(newIsActive ? "User account activated" : "User account deactivated")

    // Persist deactivation status to localStorage so reload and login checks keep the status
    try {
      const stored = localStorage.getItem("worknest_deactivated_users")
      const currentList = stored ? JSON.parse(stored) : []
      const currentSet = new Set(currentList.map(String))
      const uid = String(target.id || target._id)
      const uemail = target.email ? String(target.email).toLowerCase().trim() : ""
      if (!newIsActive) {
        if (uid) currentSet.add(uid)
        if (uemail) currentSet.add(uemail)
      } else {
        if (uid) currentSet.delete(uid)
        if (uemail) currentSet.delete(uemail)
      }
      localStorage.setItem("worknest_deactivated_users", JSON.stringify([...currentSet]))
    } catch {
      // ignore
    }

    // Update state locally: retain user in list with new status
    setAllUsers((prev) => {
      const updated = prev.map((u) =>
        String(u.id || u._id) === String(target.id || target._id)
          ? { ...u, isActive: newIsActive, status: newStatus }
          : u
      )
      try {
        localStorage.setItem("worknest_cached_admin_users", JSON.stringify(updated))
      } catch {}
      return updated
    })

    setRecentUsers((prev) =>
      prev.map((u) =>
        String(u.id || u._id) === String(target.id || target._id)
          ? { ...u, isActive: newIsActive, status: newStatus }
          : u
      )
    )

    setDeleteUserConfirm(null)
  }

  const handleSelectWorkspace = (workspace) => {
    const wsId = workspace.id || workspace._id
    if (selectWorkspace) {
      selectWorkspace(wsId)
    }
    navigate(`/app/workspace/${wsId}`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Recently"
    try {
      const date = new Date(dateString)
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    } catch {
      return "Recently"
    }
  }

  // Calculate actual user counts from allUsers (accurate active vs inactive account status)
  const totalUsersCount = allUsers.length > 0 ? allUsers.length : (stats.usersCount || 0)
  const inactiveUsersCount = allUsers.length > 0
    ? allUsers.filter((u) => u.isActive === false || u.status === "inactive").length
    : 0
  const activeUsersCount = allUsers.length > 0
    ? allUsers.filter((u) => u.isActive !== false && u.status !== "inactive").length
    : (totalUsersCount - inactiveUsersCount)

  // Filtered users for Users tab matching screenshot pills (All, Admins, Members, Inactive)
  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (userRoleFilter === "admins") {
      return u.platformRole === "super_admin" || u.role === "admin"
    }
    if (userRoleFilter === "members") {
      return u.platformRole !== "super_admin" && u.role !== "admin"
    }
    if (userRoleFilter === "inactive") {
      return u.isActive === false || u.status === "inactive"
    }
    return true
  })

  // Filtered workspaces for Workspaces tab
  const filteredWorkspaces = allWorkspaces.filter((w) =>
    w.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (user && !isSuperAdminUser(user)) {
      toast.error("Access denied. Super Admin privileges required.")
      navigate("/app/dashboard", { replace: true })
    }
  }, [user, navigate])

  if (!user || !isSuperAdminUser(user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] px-6 text-center">
        <div className="max-w-md w-full rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#1E2525] p-8 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-500 text-2xl mb-4">
            <i className="fa-solid fa-lock" />
          </div>
          <h2 className="text-xl font-bold text-[#2C3333] dark:text-white mb-2">Access Restricted</h2>
          <p className="text-xs text-[#52656A] dark:text-[#A5C9CA] mb-6">
            The Super Admin panel is restricted to <strong>Super Administrators</strong>.
          </p>
          <button
            type="button"
            onClick={() => navigate("/app/dashboard")}
            className="rounded-xl bg-[#395B64] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2C3333] transition"
          >
            Return to Workspaces
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-[#F8FAFB] dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2] font-sans antialiased overflow-hidden">
      
      {/* ── Mobile Sidebar Backdrop ───────────────────────────────────────── */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#1E2525] text-white border-r border-[#2C3333] transition-transform duration-200 md:static md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="p-4 sm:p-5 border-b border-[#2C3333]">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-white flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#395B64] text-sm font-semibold text-[#E7F6F2]">
                <i className="fa-solid fa-layer-group" />
              </span>
              <span>WorkNest</span>
            </h1>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <i className="fa-solid fa-xmark text-base" />
            </button>
          </div>
          <div className="mt-2 text-[11px] font-medium tracking-wide text-[#A5C9CA]/90 uppercase">
            Super Admin Panel
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1.5">
          <div className="text-[11px] font-medium text-[#A5C9CA]/70 uppercase tracking-wider px-2.5 mb-2">
            Navigation
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab("dashboard")
              setIsMobileSidebarOpen(false)
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-3 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-[#395B64] text-white shadow-xs"
                : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
            }`}
          >
            <i className="fa-solid fa-gauge-high w-5 text-center text-sm text-[#A5C9CA]" />
            <span className="flex-1">Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("users")
              setIsMobileSidebarOpen(false)
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-3 cursor-pointer ${
              activeTab === "users"
                ? "bg-[#395B64] text-white shadow-xs"
                : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
            }`}
          >
            <i className="fa-solid fa-users w-5 text-center text-sm text-[#A5C9CA]" />
            <span className="flex-1">Users</span>
            {totalUsersCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#2C3333] px-1.5 text-xs font-medium text-[#A5C9CA]">
                {totalUsersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("workspaces")
              setIsMobileSidebarOpen(false)
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-3 cursor-pointer ${
              activeTab === "workspaces"
                ? "bg-[#395B64] text-white shadow-xs"
                : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
            }`}
          >
            <i className="fa-solid fa-house w-5 text-center text-sm text-[#A5C9CA]" />
            <span className="flex-1">Workspaces</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("spaces")
              setIsMobileSidebarOpen(false)
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-3 cursor-pointer ${
              activeTab === "spaces"
                ? "bg-[#395B64] text-white shadow-xs"
                : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
            }`}
          >
            <i className="fa-solid fa-table-cells-large w-5 text-center text-sm text-[#A5C9CA]" />
            <span className="flex-1">Spaces</span>
            {spaces.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#2C3333] px-1.5 text-xs font-medium text-[#A5C9CA]">
                {spaces.length}
              </span>
            )}
          </button>
        </nav>

        {/* Bottom Section: Profile & Logout */}
        <div className="p-3 sm:p-4 border-t border-[#2C3333] space-y-2.5">
          {user && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#2C3333]/60 group">
              <div className="w-9 h-9 rounded-full bg-[#395B64] text-[#E7F6F2] font-semibold text-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                ) : (
                  user.username?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                <p className="text-xs text-[#A5C9CA] truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#A5C9CA] hover:text-white hover:bg-[#395B64] transition cursor-pointer"
                title="Edit Profile"
              >
                <i className="fa-solid fa-pen-to-square text-xs" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/40 transition flex items-center gap-2.5 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-sm" /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Main Tab Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          
          {/* ═══════════════════════════════════════════════════════════════
              TAB 1: DASHBOARD
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "dashboard" && (
            <div className="max-w-6xl mx-auto space-y-8">
              
              {/* Top Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333]"
                    aria-label="Open sidebar"
                  >
                    <i className="fa-solid fa-bars text-lg" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-semibold text-[#2C3333] dark:text-white tracking-tight">
                      Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-[#52656A] dark:text-[#A5C9CA]">
                      Overview of WorkNest Platform
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition shadow-xs cursor-pointer flex-shrink-0"
                    title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
                  >
                    {isDark ? <FiSun className="text-amber-400 text-sm" /> : <FiMoon className="text-[#395B64] text-sm" />}
                  </button>
                </div>
              </div>

              {/* ── 4 Elegant Stat Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                
                {/* 1. Total Users */}
                <div className="rounded-2xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] p-5 sm:p-6 shadow-xs hover:border-[#395B64]/40 dark:hover:border-[#A5C9CA]/40 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]">
                      Total Users
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#2C3333] dark:text-white tracking-tight">
                    {totalUsersCount}
                  </div>
                  <p className="mt-2 text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                    Total registered accounts
                  </p>
                </div>

                {/* 2. Active Users */}
                <div className="rounded-2xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] p-5 sm:p-6 shadow-xs hover:border-[#395B64]/40 dark:hover:border-[#A5C9CA]/40 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]">
                      Active Users
                    </span>
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#2C3333] dark:text-white tracking-tight">
                    {activeUsersCount}
                  </div>
                  <p className="mt-2 text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                    Currently active members
                  </p>
                </div>

                {/* 3. Inactive Users */}
                <div className="rounded-2xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] p-5 sm:p-6 shadow-xs hover:border-[#395B64]/40 dark:hover:border-[#A5C9CA]/40 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]">
                      Inactive Users
                    </span>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#2C3333] dark:text-white tracking-tight">
                    {inactiveUsersCount}
                  </div>
                  <p className="mt-2 text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                    Inactive accounts
                  </p>
                </div>

                {/* 4. Total Spaces */}
                <div
                  onClick={() => setActiveTab("spaces")}
                  className="rounded-2xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] p-5 sm:p-6 shadow-xs hover:border-[#395B64]/40 dark:hover:border-[#A5C9CA]/40 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]">
                      Total Spaces
                    </span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-[#52656A] dark:text-[#A5C9CA] group-hover:text-[#395B64] dark:group-hover:text-white transition" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#2C3333] dark:text-white tracking-tight">
                    {spaces.length}
                  </div>
                  <p className="mt-2 text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                    {spaces.length === 1 ? "1 active space" : `${spaces.length} active spaces`}
                  </p>
                </div>

              </div>

              {/* ── Recently Joined Users (Clean & Elegant) ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#2C3333] dark:text-white">
                    Recently joined
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("users")}
                    className="text-xs font-medium text-[#395B64] dark:text-[#A5C9CA] hover:underline"
                  >
                    View all users
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] shadow-xs overflow-hidden divide-y divide-gray-100 dark:divide-[#2C3333]">
                  {recentUsers.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#52656A] dark:text-[#A5C9CA]">
                      No users registered yet.
                    </div>
                  ) : (
                    recentUsers.map((u) => (
                      <div
                        key={u.id || u._id}
                        className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-[#F8FAFB] dark:hover:bg-[#242D2D]/50 transition"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-[#2C3333] text-gray-600 dark:text-[#A5C9CA] flex items-center justify-center font-medium text-xs overflow-hidden flex-shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.username} className="h-full w-full object-cover" />
                            ) : (
                              <i className="fa-solid fa-user text-gray-400 dark:text-gray-500 text-sm" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-[#2C3333] dark:text-white truncate">
                              {u.username}
                            </h4>
                            <p className="text-xs text-[#52656A] dark:text-[#A5C9CA] truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            u.platformRole === "super_admin" || u.role === "admin" || u.role === "super_admin" || u.isSuperAdmin === true
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }`}>
                            {u.platformRole === "super_admin" || u.role === "admin" || u.role === "super_admin" || u.isSuperAdmin === true ? "admin" : "member"}
                          </span>
                          <span className="text-xs text-[#52656A] dark:text-[#A5C9CA] min-w-[70px] text-right">
                            {formatDate(u.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 2: USERS DIRECTORY (Matching Reference Image)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "users" && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333]"
                    aria-label="Open sidebar"
                  >
                    <i className="fa-solid fa-bars text-lg" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-semibold text-[#2C3333] dark:text-white tracking-tight">
                      Users
                    </h1>
                    <p className="mt-1 text-sm text-[#52656A] dark:text-[#A5C9CA]">
                      Manage workspace members and their roles
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 px-3.5 rounded-xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] text-xs sm:text-sm text-[#2C3333] dark:text-white outline-none focus:border-[#395B64]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition shadow-xs cursor-pointer flex-shrink-0"
                    title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
                  >
                    {isDark ? <FiSun className="text-amber-400 text-sm" /> : <FiMoon className="text-[#395B64] text-sm" />}
                  </button>
                </div>
              </div>

              {/* Filter Pills: All, Admins, Members, Inactive */}
              <div className="flex items-center gap-2 pt-1">
                {[
                  { id: "all", label: "All" },
                  { id: "admins", label: "Admins" },
                  { id: "members", label: "Members" },
                  { id: "inactive", label: "Inactive" },
                ].map((pill) => {
                  const isActive = (userRoleFilter || "all") === pill.id
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setUserRoleFilter(pill.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isActive
                          ? "bg-[#D8EFE9] text-[#2C5F57] dark:bg-[#395B64] dark:text-white"
                          : "text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white"
                      }`}
                    >
                      {pill.label}
                    </button>
                  )
                })}
              </div>

              {/* Users Table */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-gray-200/80 dark:border-[#2C3333] text-[#52656A] dark:text-[#A5C9CA] uppercase tracking-wider font-semibold text-[11px]">
                        <th className="py-3 px-4 w-[28%]">NAME</th>
                        <th className="py-3 px-4 w-[30%]">EMAIL</th>
                        <th className="py-3 px-4 w-[12%]">ROLE</th>
                        <th className="py-3 px-4 w-[12%]">STATUS</th>
                        <th className="py-3 px-4 w-[10%]">JOINED</th>
                        <th className="py-3 px-4 w-[8%] text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#2C3333]">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-10 text-center text-sm text-[#52656A] dark:text-[#A5C9CA]">
                            No matching users found.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isAdmin =
                            u.platformRole === "super_admin" ||
                            u.role === "admin" ||
                            u.role === "super_admin" ||
                            u.isSuperAdmin === true
                          const isUserActive = u.isActive !== false && u.status !== "inactive"

                          return (
                            <tr key={u.id || u._id} className="hover:bg-[#F8FAFB] dark:hover:bg-[#1E2525]/40 transition">
                              {/* NAME */}
                              <td className="py-3.5 px-4 text-[#2C3333] dark:text-white">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-[#2C3333] text-gray-500 dark:text-[#A5C9CA] flex items-center justify-center font-medium text-xs overflow-hidden flex-shrink-0">
                                    {u.avatar ? (
                                      <img src={u.avatar} alt={u.username} className="h-full w-full object-cover" />
                                    ) : (
                                      <i className="fa-solid fa-user text-gray-400 dark:text-gray-500 text-xs" />
                                    )}
                                  </div>
                                  <span className="font-medium text-sm text-[#2C3333] dark:text-white truncate block">
                                    {u.username}
                                  </span>
                                </div>
                              </td>

                              {/* EMAIL */}
                              <td className="py-3.5 px-4 text-xs text-[#52656A] dark:text-[#A5C9CA] truncate">
                                <span className="truncate block" title={u.email}>
                                  {u.email}
                                </span>
                              </td>

                              {/* ROLE */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    isAdmin
                                      ? "bg-[#D8EFE9] text-[#2C5F57] dark:bg-emerald-500/20 dark:text-emerald-300"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                  }`}
                                >
                                  {isAdmin ? "admin" : "member"}
                                </span>
                              </td>

                              {/* STATUS */}
                              <td className="py-3.5 px-4 text-xs">
                                <span className="inline-flex items-center gap-1.5 font-medium">
                                  <span className={`h-1.5 w-1.5 rounded-full ${isUserActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                                  <span className={isUserActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}>
                                    {isUserActive ? "Active" : "Inactive"}
                                  </span>
                                </span>
                              </td>

                              {/* JOINED */}
                              <td className="py-3.5 px-4 text-xs text-[#52656A] dark:text-[#A5C9CA] whitespace-nowrap">
                                {formatDate(u.createdAt)}
                              </td>

                              {/* ACTIONS (Icon-only buttons with fixed size and perfect alignment) */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRoleToggle(u)}
                                    title={isAdmin ? "Make Member" : "Make Admin"}
                                    aria-label={isAdmin ? "Make Member" : "Make Admin"}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[#A5C9CA]/50 dark:border-[#395B64]/60 bg-[#E7F6F2]/60 hover:bg-[#D5EFE8] dark:bg-[#2C3333]/50 dark:hover:bg-[#395B64]/50 text-[#2C5F57] dark:text-[#A5C9CA] transition cursor-pointer"
                                  >
                                    <i className={`fa-solid ${isAdmin ? "fa-user-minus" : "fa-shield-halved"} text-xs`} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeleteUserConfirm(u)}
                                    title={isUserActive ? "Deactivate User" : "Activate User"}
                                    aria-label={isUserActive ? "Deactivate User" : "Activate User"}
                                    className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition cursor-pointer ${
                                      isUserActive
                                        ? "border-rose-200/80 dark:border-rose-900/50 bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                                        : "border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                                    }`}
                                  >
                                    <i className={`fa-solid ${isUserActive ? "fa-user-xmark" : "fa-user-check"} text-xs`} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 3: WORKSPACES (Exact layout from uploaded screenshot)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "workspaces" && (
            <div className="max-w-6xl mx-auto space-y-8">
              
              {/* Header matching screenshot */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333]"
                    aria-label="Open sidebar"
                  >
                    <i className="fa-solid fa-bars text-lg" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-semibold text-[#2C3333] dark:text-white tracking-tight">
                      Welcome back, {user?.username || "Admin"}
                    </h1>
                    <p className="mt-1 text-sm text-[#52656A] dark:text-[#A5C9CA]">
                      Select a workspace below or create a new one to start collaborating.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition shadow-xs cursor-pointer flex-shrink-0"
                  title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
                >
                  {isDark ? <FiSun className="text-amber-400 text-sm" /> : <FiMoon className="text-[#395B64] text-sm" />}
                </button>
              </div>

              {/* Cards Grid */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {allWorkspaces.map((workspace) => (
                  <button
                    key={workspace.id || workspace._id}
                    type="button"
                    onClick={() => handleSelectWorkspace(workspace)}
                    className="group rounded-2xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] p-6 text-left shadow-xs hover:border-[#395B64] dark:hover:border-[#395B64] hover:shadow-md transition flex flex-col justify-between cursor-pointer min-h-[180px]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#E7F6F2] dark:bg-[#395B64]/40 flex items-center justify-center text-[#395B64] dark:text-[#A5C9CA] font-semibold text-sm group-hover:bg-[#395B64] group-hover:text-white transition">
                          {getWorkspaceInitials(workspace.name)}
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#E7F6F2] dark:bg-[#395B64]/40 text-[#395B64] dark:text-[#A5C9CA] text-xs font-medium uppercase tracking-wider">
                          {workspace.role || "OWNER"}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[#2C3333] dark:text-white group-hover:text-[#395B64] dark:group-hover:text-[#A5C9CA] transition truncate">
                        {workspace.name}
                      </h3>
                      <p className="mt-1.5 text-xs sm:text-sm text-[#52656A] dark:text-[#A5C9CA]/80 line-clamp-2">
                        {workspace.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between pt-3.5 border-t border-gray-100 dark:border-[#2C3333] text-xs sm:text-sm font-medium text-[#395B64] dark:text-[#A5C9CA]">
                      <span>Open workspace</span>
                      <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}

                {/* Dashed Create workspace card matching screenshot */}
                <button
                  type="button"
                  onClick={() => setShowCreateWorkspaceModal(true)}
                  className="group rounded-2xl border-2 border-dashed border-[#A5C9CA]/70 dark:border-[#395B64]/50 p-6 text-center flex flex-col items-center justify-center min-h-[180px] hover:border-[#395B64] dark:hover:border-[#A5C9CA] hover:bg-[#E7F6F2]/30 dark:hover:bg-[#1E2525]/40 transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#E7F6F2] dark:bg-[#395B64]/40 flex items-center justify-center text-[#395B64] dark:text-[#A5C9CA] mb-3 group-hover:scale-105 transition-transform">
                    <i className="fa-solid fa-plus text-sm" />
                  </div>
                  <span className="text-sm font-semibold text-[#395B64] dark:text-[#A5C9CA]">Create another workspace</span>
                </button>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 4: SPACES (Matching Image 2)
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "spaces" && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333]"
                    aria-label="Open sidebar"
                  >
                    <i className="fa-solid fa-bars text-lg" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-[#2C3333] dark:text-white tracking-tight">
                      Spaces
                    </h1>
                    <p className="mt-1 text-sm text-[#52656A] dark:text-[#A5C9CA]">
                      Create and manage workspace channels
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition shadow-xs cursor-pointer flex-shrink-0"
                    title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
                  >
                    {isDark ? <FiSun className="text-amber-400 text-sm" /> : <FiMoon className="text-[#395B64] text-sm" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateSpaceModal(true)}
                    className="rounded-lg bg-[#00897b] hover:bg-[#00796b] text-white px-5 py-2.5 text-sm font-semibold transition cursor-pointer shadow-xs flex items-center gap-2"
                  >
                    Create Space
                  </button>
                </div>
              </div>

              {/* Spaces Table (Image 2) */}
              <div className="rounded-xl border border-gray-200/80 dark:border-[#2C3333] bg-white dark:bg-[#1E2525] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#2C3333]">
                        <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                          SPACE
                        </th>
                        <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                          DESCRIPTION
                        </th>
                        <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                          MEMBERS
                        </th>
                        <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                          CREATED BY
                        </th>
                        <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                          CREATED
                        </th>
                        <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80 dark:divide-[#2C3333]">
                      {isSpacesLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                            <i className="fa-solid fa-circle-notch fa-spin text-lg mr-2 text-[#00897b]" />
                            Loading spaces...
                          </td>
                        </tr>
                      ) : spaces.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                            No spaces found. Click &quot;Create Space&quot; to create one.
                          </td>
                        </tr>
                      ) : (
                        spaces.map((space) => {
                          const memberCount = Array.isArray(space.members) ? space.members.length : 0
                          const creatorName =
                            space.createdBy?.username || space.createdBy?.email || "Unknown"

                          return (
                            <tr
                              key={space._id}
                              className="hover:bg-gray-50/50 dark:hover:bg-[#252F2F]/40 transition"
                            >
                              <td className="py-4 px-6 text-sm font-semibold text-[#00897b] dark:text-[#26a69a] whitespace-nowrap">
                                #{space.name}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-400 dark:text-gray-500 max-w-xs truncate">
                                {space.description || "—"}
                              </td>
                              <td className="py-4 px-6 text-sm whitespace-nowrap">
                                <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-2 rounded-md bg-[#e0f2f1] dark:bg-[#004d40]/40 text-[#00796b] dark:text-[#80cbc4] text-xs font-semibold">
                                  {memberCount}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-sm text-[#2C3333] dark:text-gray-200 whitespace-nowrap">
                                {creatorName}
                              </td>
                              <td className="py-4 px-6 text-sm text-[#52656A] dark:text-gray-400 whitespace-nowrap">
                                {formatDate(space.createdAt)}
                              </td>
                              <td className="py-4 px-6 text-sm whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMembersModalSpace(space)
                                      setAddMemberEmail("")
                                      setAddMemberError("")
                                    }}
                                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                                  >
                                    Members
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteSpaceConfirm(space)}
                                    className="rounded-md bg-[#ef4444] hover:bg-[#dc2626] px-3.5 py-1 text-xs font-medium text-white transition cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ── Deactivate / Activate User Confirmation Modal ─────────────────── */}
      {deleteUserConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1A2121] p-6 text-center shadow-xl border border-gray-200 dark:border-[#2C3333]">
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl mb-3 ${
              deleteUserConfirm.isActive === false || deleteUserConfirm.status === "inactive"
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-rose-500/15 text-rose-500"
            }`}>
              <i className={`fa-solid ${
                deleteUserConfirm.isActive === false || deleteUserConfirm.status === "inactive"
                  ? "fa-user-check"
                  : "fa-user-xmark"
              }`} />
            </div>
            <h3 className="font-semibold text-base text-[#2C3333] dark:text-white">
              {deleteUserConfirm.isActive === false || deleteUserConfirm.status === "inactive"
                ? "Activate Account?"
                : "Deactivate User?"}
            </h3>
            <p className="mt-2 text-xs text-[#52656A] dark:text-[#A5C9CA] leading-relaxed">
              {deleteUserConfirm.isActive === false || deleteUserConfirm.status === "inactive"
                ? `Activate account for ${deleteUserConfirm.username}? They will be able to log in and access their workspaces again.`
                : `Deactivating ${deleteUserConfirm.username} will prevent them from logging in and accessing the application. Their account and data will NOT be deleted.`}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteUserConfirm(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-[#2C3333] text-xs font-medium text-[#52656A] dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#242D2D] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleDeactivateUser}
                className={`flex-1 py-2 rounded-xl text-white text-xs font-medium transition cursor-pointer ${
                  deleteUserConfirm.isActive === false || deleteUserConfirm.status === "inactive"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {deleteUserConfirm.isActive === false || deleteUserConfirm.status === "inactive"
                  ? "Activate"
                  : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Modal ────────────────────────────────────────────────── */}
      {showProfileModal && (
        <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />
      )}

      {/* ── Create Workspace Modal ───────────────────────────────────────── */}
      {showCreateWorkspaceModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWorkspaceModal(false)}
          onSuccess={() => {
            setShowCreateWorkspaceModal(false)
            fetchWorkspaces()
            fetchStats()
          }}
        />
      )}

      {/* ── Create Space Modal ───────────────────────────────────────────── */}
      {showCreateSpaceModal && (
        <CreateSpaceModal
          isOpen={showCreateSpaceModal}
          onClose={() => setShowCreateSpaceModal(false)}
          onSpaceCreated={(newSpace) => {
            setSpaces((prev) => [newSpace, ...prev])
            fetchAdminSpaces()
          }}
          availableUsers={allUsers}
          currentUserId={user?._id || user?.id}
        />
      )}

      {/* ── Space Members Modal (Image 3) ─────────────────────────────────── */}
      {activeMembersModalSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E2525] p-6 shadow-2xl border border-gray-100 dark:border-[#2C3333] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-[#2C3333]">
              <h3 className="text-base font-semibold text-[#2C3333] dark:text-white">
                #{activeMembersModalSpace.name} — Members ({activeMembersModalSpace.members?.length || 0})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveMembersModalSpace(null)
                  setAddMemberEmail("")
                  setAddMemberError("")
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg p-1 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Add Member Section */}
            <div className="pt-4">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                ADD MEMBER
              </label>
              <form onSubmit={handleAddMemberByEmail}>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={addMemberEmail}
                    onChange={(e) => {
                      setAddMemberEmail(e.target.value)
                      if (addMemberError) setAddMemberError("")
                    }}
                    placeholder="name@shnoor.com"
                    className="flex-1 rounded-lg border border-gray-200 dark:border-[#2C3333] bg-white dark:bg-[#252F2F] px-3.5 py-2.5 text-sm text-[#2C3333] dark:text-white placeholder-gray-400 outline-none focus:border-[#00897b] focus:ring-1 focus:ring-[#00897b] transition"
                  />
                  <button
                    type="submit"
                    disabled={isAddingMember || !addMemberEmail.trim()}
                    className="rounded-lg bg-[#00897b] hover:bg-[#00796b] disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 transition flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {isAddingMember ? (
                      <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                    ) : (
                      "+ Add"
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Person must have logged in with their @shnoor.com account at least once.
                </p>
                {addMemberError && (
                  <div className="mt-2.5 text-xs text-rose-500 font-medium flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
                    <span>{addMemberError}</span>
                  </div>
                )}
              </form>
            </div>

            <div className="border-t border-gray-100 dark:border-[#2C3333] my-4" />

            {/* Existing Members List */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {(activeMembersModalSpace.members || []).map((member) => {
                const memberId = member._id || member.id || member
                const isRemoving = removingMemberId === memberId
                const isAdminRole =
                  member.platformRole === "super_admin" ||
                  member.role === "admin" ||
                  String(activeMembersModalSpace.createdBy?._id || activeMembersModalSpace.createdBy) === String(memberId)

                return (
                  <div key={memberId} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.username || "Avatar"} className="w-full h-full object-cover" />
                        ) : (
                          (member.username || member.email || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#2C3333] dark:text-white truncate">
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
                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => handleRemoveMemberFromSpace(activeMembersModalSpace._id, memberId, member.username)}
                        className="rounded-md border border-rose-300 dark:border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer disabled:opacity-50"
                      >
                        {isRemoving ? <i className="fa-solid fa-circle-notch fa-spin text-xs" /> : "Remove"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Space Confirmation Modal ──────────────────────────────── */}
      {deleteSpaceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1A2121] p-6 text-center shadow-xl border border-gray-200 dark:border-[#2C3333]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-500 text-xl mb-3">
              <i className="fa-solid fa-trash-can" />
            </div>
            <h3 className="font-semibold text-base text-[#2C3333] dark:text-white">
              Delete Space?
            </h3>
            <p className="mt-2 text-xs text-[#52656A] dark:text-[#A5C9CA] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#2C3333] dark:text-white">#{deleteSpaceConfirm.name}</strong>? This will permanently delete the space and all of its messages.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteSpaceConfirm(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-[#2C3333] text-xs font-medium text-[#52656A] dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#242D2D] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSpace}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default SuperAdminDashboard
