import { useState, useMemo, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useWorkspace } from "../../context/WorkspaceContext"
import { getPermissions, getRoleDisplayName } from "../../utils/permissions"
import { toast } from "react-toastify"
import CreateChannelModal from "./CreateChannelModal"
import EditChannelModal from "./EditChannelModal"
import DeleteChannelModal from "./DeleteChannelModal"
import InviteMemberModal from "./InviteMemberModal"
import RoleManagementModal from "./RoleManagementModal"
import CreateWorkspaceModal from "./CreateWorkspaceModal"
import EditWorkspaceModal from "./EditWorkspaceModal"
import DeleteWorkspaceModal from "./DeleteWorkspaceModal"

export const getWorkspaceInitials = (name) => {
  if (!name || typeof name !== "string") return "W"
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "W"
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
}

const SlackShell = () => {
  const navigate = useNavigate()
  const { workspaceId, channelId } = useParams()
  const {
    user,
    workspaces,
    workspaceData,
    channels,
    selectedWorkspace,
    selectWorkspace,
    removeMember,
    loading,
    error,
  } = useWorkspace()

  // Workspace Modals & Popovers
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)
  const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState(false)
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Channel Modals
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)
  const [editingChannel, setEditingChannel] = useState(null)
  const [deletingChannel, setDeletingChannel] = useState(null)
  const [activeChannelMenuId, setActiveChannelMenuId] = useState(null)

  // Panels & Views
  const [showDetailsPane, setShowDetailsPane] = useState(false)
  const [showMembersPanel, setShowMembersPanel] = useState(false)
  const [showActivityPanel, setShowActivityPanel] = useState(false)
  const [selectedMemberForRole, setSelectedMemberForRole] = useState(null)

  // Sidebar Toggles & Input
  const [isChannelsCollapsed, setIsChannelsCollapsed] = useState(false)
  const [isDMsCollapsed, setIsDMsCollapsed] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [selectedDMUser, setSelectedDMUser] = useState(null)

  // Load selected workspace if ID changed
  useEffect(() => {
    if (!workspaceId) return
    if (!selectedWorkspace || selectedWorkspace !== workspaceId) {
      selectWorkspace(workspaceId)
    }
  }, [workspaceId, selectedWorkspace, selectWorkspace])

  // Auto-sync channel from URL or select first channel
  const currentChannel = useMemo(() => {
    if (!channels || channels.length === 0) return null
    if (channelId) {
      const found = channels.find((c) => c.id === channelId)
      if (found) return found
    }
    return channels[0]
  }, [channels, channelId])

  // If no channelId in URL but channels are loaded, update URL to default channel
  useEffect(() => {
    if (workspaceId && channels.length > 0 && !channelId) {
      navigate(`/app/workspace/${workspaceId}/channel/${channels[0].id}`, { replace: true })
    }
  }, [workspaceId, channels, channelId, navigate])

  const selectedRole = workspaceData?.userRole || "MEMBER"
  const permissions = useMemo(() => getPermissions(selectedRole), [selectedRole])

  const handleSelectWorkspace = async (id) => {
    if (!id || id === workspaceId) return
    await selectWorkspace(id)
    navigate(`/app/workspace/${id}`)
  }

  const handleSelectChannel = (chan) => {
    setSelectedDMUser(null)
    setActiveChannelMenuId(null)
    navigate(`/app/workspace/${workspaceId}/channel/${chan.id}`)
  }

  const handleChannelDeleted = () => {
    if (deletingChannel && currentChannel?.id === deletingChannel.id) {
      const remaining = channels.filter((c) => c.id !== deletingChannel.id)
      if (remaining.length > 0) {
        navigate(`/app/workspace/${workspaceId}/channel/${remaining[0].id}`, { replace: true })
      }
    }
    setDeletingChannel(null)
  }

  const handleLogout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("worknestToken")}`,
        },
      })
      const data = await response.json().catch(() => ({ message: "Logout successful" }))
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

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      return
    }
    try {
      await removeMember(memberId)
      toast.success(`${memberName} has been removed from the workspace`)
    } catch (err) {
      toast.error(err.message || "Failed to remove member")
    }
  }

  const filteredMembers = useMemo(() => {
    if (!workspaceData?.members) return []
    if (!memberSearchQuery.trim()) return workspaceData.members
    const q = memberSearchQuery.toLowerCase()
    return workspaceData.members.filter(
      (m) =>
        m.username?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q),
    )
  }, [workspaceData?.members, memberSearchQuery])

  if (loading && !workspaceData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2C3333] text-[#E7F6F2]">
        <div className="text-center">
          <div className="mb-4 inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-3 border-[#395B64] border-t-[#A5C9CA]">
            <i className="fa-solid fa-layer-group text-sm text-[#A5C9CA]" />
          </div>
          <p className="text-sm font-medium text-[#A5C9CA]">Loading WorkNest workspace...</p>
        </div>
      </div>
    )
  }

  if (error || !workspaceData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2C3333] px-6 text-[#E7F6F2]">
        <div className="w-full max-w-md rounded-2xl border border-[#395B64] bg-[#1E2525] p-8 text-center shadow-2xl">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-900/40 text-rose-400 text-2xl">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Workspace unavailable</h2>
          <p className="mb-6 text-sm text-[#A5C9CA]">{error || "Unable to load this workspace."}</p>
          <button
            type="button"
            onClick={() => navigate("/app/dashboard")}
            className="rounded-xl bg-[#395B64] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2C3333] border border-[#A5C9CA]/30 transition"
          >
            Back to workspaces
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFB] text-[#2C3333]">
      {/* ========================================================
          1. WORKSPACE RAIL (FAR LEFT NARROW)
      ======================================================== */}
      <aside className="flex w-17 flex-col items-center bg-[#2C3333] py-3.5 text-white shadow-[1px_0_0_rgba(0,0,0,0.15)] z-30 select-none">
        {/* WorkNest Home Icon */}
        <button
          type="button"
          onClick={() => navigate("/app/dashboard")}
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#395B64] text-base font-bold text-[#E7F6F2] shadow-md transition hover:bg-[#A5C9CA] hover:text-[#2C3333]"
          title="WorkNest Dashboard"
        >
          <i className="fa-solid fa-layer-group text-lg" />
        </button>

        <div className="w-8 h-px bg-[#395B64]/50 mb-3" />

        {/* Workspaces List with Polished Avatar Icons */}
        <div className="flex w-full flex-1 flex-col items-center gap-2.5 overflow-y-auto px-2">
          {workspaces.map((ws) => {
            const active = ws.id === workspaceId
            const initials = getWorkspaceInitials(ws.name)
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => handleSelectWorkspace(ws.id)}
                title={`${ws.name} (${ws.role || "Member"})`}
                className={`group relative flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold tracking-wider transition-all ${
                  active
                    ? "bg-[#395B64] text-white shadow-lg ring-2 ring-[#A5C9CA] ring-offset-2 ring-offset-[#2C3333]"
                    : "bg-[#374242] text-[#E7F6F2] hover:bg-[#395B64] hover:text-white"
                }`}
              >
                {initials}
                {active && (
                  <span className="absolute -left-2 h-6 w-1 rounded-r-full bg-[#A5C9CA]" />
                )}
              </button>
            )
          })}

          {/* Create Workspace Button */}
          <button
            type="button"
            onClick={() => setShowCreateWorkspaceModal(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[#52656A] text-lg text-[#A5C9CA] transition hover:border-[#E7F6F2] hover:bg-[#395B64]/40 hover:text-white"
            title="Create new workspace"
          >
            <i className="fa-solid fa-plus text-xs" />
          </button>
        </div>

        {/* User Profile Avatar at Bottom */}
        <div className="relative mt-auto w-full px-2 pt-2">
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="relative mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#52656A] bg-[#395B64] text-xs font-bold text-white shadow-sm transition hover:border-[#A5C9CA]"
            title="Your Profile"
          >
            {user?.username?.charAt(0)?.toUpperCase() || "U"}
            <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#2C3333]" />
          </button>

          {/* Profile Menu Popover */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute bottom-2 left-15 z-50 w-72 rounded-2xl border border-[#395B64] bg-[#1E2525] p-3 text-left text-[#E7F6F2] shadow-2xl">
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#2C3333] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#395B64] text-sm font-bold text-[#E7F6F2]">
                    {user?.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{user?.username || "User"}</div>
                    <div className="truncate text-xs text-[#A5C9CA]">{user?.email || ""}</div>
                  </div>
                </div>

                <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#A5C9CA]">
                  Workspace Memberships
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 mb-3 px-1">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs bg-[#2C3333]/50"
                    >
                      <span className="truncate font-medium text-[#E7F6F2]">{ws.name}</span>
                      <span className="rounded bg-[#395B64] px-1.5 py-0.5 text-[10px] font-semibold text-[#A5C9CA]">
                        {ws.role}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-[#395B64]/50 my-2" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-xs" />
                  Sign out of WorkNest
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ========================================================
          2. WORKSPACE SIDEBAR
      ======================================================== */}
      <aside className="flex w-64 flex-col bg-[#1E2525] text-[#E7F6F2] border-r border-[#2C3333]/60 select-none z-20">
        {/* Workspace Name & Role Header */}
        <div className="relative border-b border-[#2C3333] px-3.5 py-3 bg-[#1E2525]">
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl p-1.5 text-left hover:bg-[#2C3333] transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#395B64] text-xs font-bold tracking-wider text-white flex-shrink-0 shadow-xs">
                {getWorkspaceInitials(workspaceData.name)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{workspaceData.name}</div>
                <div className="text-[10px] font-semibold tracking-wider text-[#A5C9CA]">
                  {getRoleDisplayName(selectedRole)}
                </div>
              </div>
            </div>
            <i className={`fa-solid fa-chevron-down text-xs text-[#A5C9CA] transition-transform ${showWorkspaceMenu ? "rotate-180" : ""}`} />
          </button>

          {/* Workspace Dropdown Menu */}
          {showWorkspaceMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowWorkspaceMenu(false)} />
              <div className="absolute left-3 right-3 top-[calc(100%+6px)] z-40 rounded-2xl border border-[#395B64] bg-[#2C3333] p-2 shadow-2xl text-xs">
                <div className="px-3 py-2 border-b border-[#395B64]/50">
                  <div className="font-bold text-white text-sm truncate">{workspaceData.name}</div>
                  <div className="text-[11px] text-[#A5C9CA] mt-0.5 flex items-center gap-1.5">
                    <span>Role:</span>
                    <span className="font-semibold text-white">{getRoleDisplayName(selectedRole)}</span>
                  </div>
                </div>

                <div className="py-1 space-y-0.5">
                  {selectedRole === "OWNER" && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setShowInviteModal(true); setShowWorkspaceMenu(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-user-plus text-[#A5C9CA] w-4" />
                        Invite people
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowMembersPanel(true); setShowWorkspaceMenu(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-users-gear text-[#A5C9CA] w-4" />
                        Manage members
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCreateChannelModal(true); setShowWorkspaceMenu(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-plus text-[#A5C9CA] w-4" />
                        Create channel
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowEditWorkspaceModal(true); setShowWorkspaceMenu(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-pen-to-square text-[#A5C9CA] w-4" />
                        Edit workspace
                      </button>
                      <div className="h-px bg-[#395B64]/50 my-1" />
                      <button
                        type="button"
                        onClick={() => { setShowDeleteWorkspaceModal(true); setShowWorkspaceMenu(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                      >
                        <i className="fa-solid fa-trash-can w-4" />
                        Delete workspace
                      </button>
                    </>
                  )}

                  {selectedRole === "ADMIN" && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setShowCreateChannelModal(true); setShowWorkspaceMenu(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-plus text-[#A5C9CA] w-4" />
                        Create channel
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowMembersPanel(true); setShowWorkspaceMenu(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-hashtag text-[#A5C9CA] w-4" />
                        Manage channels & members
                      </button>
                    </>
                  )}

                  {selectedRole === "MEMBER" && (
                    <button
                      type="button"
                      onClick={() => { setShowMembersPanel(true); setShowWorkspaceMenu(false) }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                    >
                      <i className="fa-solid fa-users text-[#A5C9CA] w-4" />
                      View workspace members
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Global Nav Links (Activity, Threads, Drafts) */}
        <div className="border-b border-[#2C3333] px-3 py-2.5 space-y-0.5">
          <button
            type="button"
            onClick={() => setShowActivityPanel(true)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition"
          >
            <i className="fa-solid fa-bell w-4 text-center text-[#A5C9CA]" />
            <span>Activity</span>
          </button>
          <button
            type="button"
            onClick={() => toast.info("Threads feature is coming soon")}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition"
          >
            <i className="fa-solid fa-comments w-4 text-center text-[#A5C9CA]" />
            <span>Threads</span>
          </button>
          <button
            type="button"
            onClick={() => toast.info("Drafts & sent feature is coming soon")}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition"
          >
            <i className="fa-solid fa-file-lines w-4 text-center text-[#A5C9CA]" />
            <span>Drafts & sent</span>
          </button>
        </div>

        {/* Scrollable Channel & DM List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {/* ==================== COLLAPSIBLE CHANNELS SECTION ==================== */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <button
                type="button"
                onClick={() => setIsChannelsCollapsed((prev) => !prev)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#A5C9CA] hover:text-white transition"
              >
                <i className={`fa-solid fa-chevron-${isChannelsCollapsed ? "right" : "down"} text-[9px] w-3`} />
                <span>Channels</span>
              </button>
              {permissions.canCreateChannels && (
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(true)}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition"
                  title="Create channel"
                >
                  <i className="fa-solid fa-plus" />
                </button>
              )}
            </div>

            {!isChannelsCollapsed && (
              <div className="space-y-0.5 pt-1">
                {channels.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
                    No channels yet
                  </div>
                ) : (
                  channels.map((chan) => {
                    const isActive = currentChannel?.id === chan.id && !selectedDMUser
                    const isMenuOpen = activeChannelMenuId === chan.id
                    return (
                      <div key={chan.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => handleSelectChannel(chan)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                            isActive
                              ? "bg-[#395B64] text-white shadow-xs font-semibold"
                              : "text-[#A5C9CA]/90 hover:bg-[#2C3333] hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {chan.type === "PRIVATE" ? (
                              <i className="fa-solid fa-lock text-[10px] text-[#A5C9CA] w-3.5" />
                            ) : (
                              <span className="text-sm font-bold text-[#A5C9CA] w-3.5 text-center">#</span>
                            )}
                            <span className="truncate">{chan.name}</span>
                          </div>

                          {/* Channel Action Dots (Owner/Admin only) */}
                          {(selectedRole === "OWNER" || selectedRole === "ADMIN") && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveChannelMenuId(isMenuOpen ? null : chan.id)
                              }}
                              className={`h-5 w-5 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                isMenuOpen ? "flex" : "hidden group-hover:flex"
                              }`}
                              title="Channel options"
                            >
                              <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                            </button>
                          )}
                        </button>

                        {/* Channel Context Menu */}
                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveChannelMenuId(null)}
                            />
                            <div className="absolute right-2 top-[calc(100%+4px)] z-40 w-44 rounded-xl border border-[#395B64] bg-[#2C3333] p-1.5 shadow-xl text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingChannel(chan)
                                  setActiveChannelMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i className="fa-solid fa-pen-to-square text-[#A5C9CA] w-3.5" />
                                Edit channel
                              </button>
                              {channels.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingChannel(chan)
                                    setActiveChannelMenuId(null)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                                >
                                  <i className="fa-solid fa-trash-can w-3.5" />
                                  Delete channel
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* ==================== COLLAPSIBLE DIRECT MESSAGES SECTION ==================== */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <button
                type="button"
                onClick={() => setIsDMsCollapsed((prev) => !prev)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#A5C9CA] hover:text-white transition"
              >
                <i className={`fa-solid fa-chevron-${isDMsCollapsed ? "right" : "down"} text-[9px] w-3`} />
                <span>Direct Messages</span>
              </button>
              {selectedRole === "OWNER" && (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition"
                  title="Invite member"
                >
                  <i className="fa-solid fa-plus" />
                </button>
              )}
            </div>

            {!isDMsCollapsed && (
              <div className="space-y-0.5 pt-1">
                {workspaceData.members && workspaceData.members.length > 0 ? (
                  workspaceData.members.map((member) => {
                    const isSelf = member.id === user?.id
                    const isSelected = selectedDMUser?.id === member.id
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedDMUser(member)
                          setActiveChannelMenuId(null)
                        }}
                        className={`group flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-medium transition ${
                          isSelected
                            ? "bg-[#395B64] text-white font-semibold"
                            : "text-[#A5C9CA]/90 hover:bg-[#2C3333] hover:text-white"
                        }`}
                      >
                        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#395B64] text-[9px] font-bold text-white">
                          {member.username?.charAt(0)?.toUpperCase() || "U"}
                          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#1E2525]" />
                        </span>
                        <span className="truncate">
                          {member.username} {isSelf && "(you)"}
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
                    No members yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================
          3. MAIN CONVERSATION / CHANNEL AREA
      ======================================================== */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#F8FAFB]">
        {/* Main Channel Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#E0E7E6] bg-white px-6 shadow-xs select-none">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {currentChannel?.type === "PRIVATE" ? (
                <i className="fa-solid fa-lock text-sm text-[#395B64]" />
              ) : (
                <span className="text-lg font-bold text-[#395B64]">#</span>
              )}
              <h1 className="truncate text-base font-bold text-[#2C3333]">
                {selectedDMUser ? `@${selectedDMUser.username}` : currentChannel?.name || "general"}
              </h1>
            </div>

            <button
              type="button"
              className="text-[#A5C9CA] hover:text-amber-500 transition text-xs"
              title="Star channel"
            >
              <i className="fa-regular fa-star" />
            </button>

            {/* Quick edit channel for Owner/Admin */}
            {!selectedDMUser && currentChannel && (selectedRole === "OWNER" || selectedRole === "ADMIN") && (
              <button
                type="button"
                onClick={() => setEditingChannel(currentChannel)}
                className="text-[#52656A] hover:text-[#395B64] p-1 text-xs transition"
                title="Edit this channel"
              >
                <i className="fa-solid fa-pen" />
              </button>
            )}

            {currentChannel?.description && !selectedDMUser && (
              <>
                <span className="text-[#A5C9CA]">|</span>
                <span className="truncate text-xs text-[#52656A] max-w-md">
                  {currentChannel.description}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Members shortcut */}
            <button
              type="button"
              onClick={() => setShowMembersPanel(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#A5C9CA]/40 bg-[#F8FAFB] px-2.5 py-1.5 text-xs font-semibold text-[#395B64] hover:bg-[#E7F6F2] transition"
              title="View members"
            >
              <i className="fa-solid fa-users text-xs" />
              <span>{workspaceData.members?.length || 0}</span>
            </button>

            {/* Details panel toggle */}
            <button
              type="button"
              onClick={() => setShowDetailsPane((prev) => !prev)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                showDetailsPane
                  ? "border-[#395B64] bg-[#E7F6F2] text-[#395B64]"
                  : "border-[#A5C9CA]/40 text-[#52656A] hover:bg-[#F8FAFB] hover:text-[#2C3333]"
              }`}
              title="Channel details"
            >
              <i className="fa-solid fa-circle-info text-sm" />
            </button>
          </div>
        </header>

        {/* Center Messages & Details Panel Viewport */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Messages Column */}
          <div className="flex min-w-0 flex-1 flex-col bg-white">
            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {/* Channel Intro Header */}
              <div className="border-b border-[#E0E7E6] pb-6 pt-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F6F2] text-2xl text-[#395B64] mb-4">
                  {selectedDMUser ? (
                    <i className="fa-solid fa-user" />
                  ) : currentChannel?.type === "PRIVATE" ? (
                    <i className="fa-solid fa-lock" />
                  ) : (
                    <i className="fa-solid fa-hashtag" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-[#2C3333]">
                  {selectedDMUser
                    ? `This is the beginning of your direct message history with @${selectedDMUser.username}`
                    : `This is the start of the #${currentChannel?.name || "general"} channel`}
                </h2>
                <p className="mt-2 text-sm text-[#52656A] max-w-xl">
                  {selectedDMUser
                    ? `Direct messages are private to you and @${selectedDMUser.username}.`
                    : currentChannel?.description
                    ? currentChannel.description
                    : `Created on ${workspaceData.createdAt ? new Date(workspaceData.createdAt).toLocaleDateString() : "recently"}. This channel is for team communication.`}
                </p>
              </div>

              {/* Empty state for real messages */}
              <div className="flex flex-col items-center justify-center py-10 text-center text-[#52656A]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F8FAFB] text-xl text-[#A5C9CA] mb-3">
                  <i className="fa-regular fa-comment-dots" />
                </div>
                <p className="text-sm font-medium text-[#2C3333]">No messages yet</p>
                <p className="mt-1 text-xs text-[#52656A]">
                  Send a message below to start collaborating with your team!
                </p>
              </div>
            </div>

            {/* Sticky Fixed Message Composer */}
            <div className="border-t border-[#E0E7E6] bg-white p-4">
              <div className="rounded-2xl border border-[#A5C9CA] bg-[#F8FAFB] p-3 shadow-xs focus-within:border-[#395B64] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#E7F6F2] transition">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message ${selectedDMUser ? `@${selectedDMUser.username}` : `#${currentChannel?.name || "general"}`}`}
                  className="w-full bg-transparent text-sm text-[#2C3333] outline-none placeholder:text-[#52656A]/60"
                />

                {/* Composer Actions Toolbar */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E0E7E6]/60">
                  <div className="flex items-center gap-2 text-[#52656A]">
                    <button type="button" className="hover:text-[#395B64] p-1 text-xs" title="Bold"><i className="fa-solid fa-bold" /></button>
                    <button type="button" className="hover:text-[#395B64] p-1 text-xs" title="Italic"><i className="fa-solid fa-italic" /></button>
                    <button type="button" className="hover:text-[#395B64] p-1 text-xs" title="Link"><i className="fa-solid fa-link" /></button>
                    <button type="button" className="hover:text-[#395B64] p-1 text-xs" title="List"><i className="fa-solid fa-list" /></button>
                    <button type="button" className="hover:text-[#395B64] p-1 text-xs" title="Code"><i className="fa-solid fa-code" /></button>
                    <div className="h-3 w-px bg-[#E0E7E6]" />
                    <button type="button" className="hover:text-[#395B64] p-1 text-xs" title="Attach file"><i className="fa-solid fa-paperclip" /></button>
                    <button type="button" className="hover:text-[#395B64] p-1 text-xs" title="Emoji"><i className="fa-regular fa-face-smile" /></button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (messageInput.trim()) {
                        toast.info("Message sending will be enabled when real-time messaging is connected")
                        setMessageInput("")
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-[#395B64] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#2C3333] transition"
                  >
                    <span>Send</span>
                    <i className="fa-solid fa-paper-plane text-[10px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              4. RIGHT DETAILS PANEL
          ======================================================== */}
          {showDetailsPane && (
            <aside className="w-80 border-l border-[#E0E7E6] bg-white flex flex-col h-full overflow-y-auto z-10 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#E0E7E6] px-5 py-4">
                <h3 className="text-base font-bold text-[#2C3333]">Channel Details</h3>
                <button
                  type="button"
                  onClick={() => setShowDetailsPane(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] transition"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="p-5 space-y-6 text-sm text-[#2C3333]">
                {/* Channel Name Card */}
                <div className="rounded-2xl border border-[#A5C9CA]/50 bg-[#F8FAFB] p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#395B64]">Channel</div>
                    {(selectedRole === "OWNER" || selectedRole === "ADMIN") && currentChannel && (
                      <button
                        type="button"
                        onClick={() => setEditingChannel(currentChannel)}
                        className="text-xs font-semibold text-[#395B64] hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-bold text-[#2C3333]">
                    {currentChannel?.type === "PRIVATE" ? (
                      <i className="fa-solid fa-lock text-sm text-[#395B64]" />
                    ) : (
                      <span className="text-[#395B64]">#</span>
                    )}
                    <span>{currentChannel?.name || "general"}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#52656A]">{currentChannel?.description || "General team discussion"}</p>
                </div>

                {/* About Section */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#52656A] mb-2.5">About</h4>
                  <div className="space-y-3 rounded-xl border border-[#E0E7E6] p-3 text-xs">
                    <div>
                      <div className="font-semibold text-[#2C3333]">Topic</div>
                      <div className="text-[#52656A] mt-0.5">{currentChannel?.description || "General team discussion"}</div>
                    </div>
                    <div className="h-px bg-[#E0E7E6]" />
                    <div>
                      <div className="font-semibold text-[#2C3333]">Type</div>
                      <div className="text-[#52656A] mt-0.5">{currentChannel?.type || "PUBLIC"}</div>
                    </div>
                    <div className="h-px bg-[#E0E7E6]" />
                    <div>
                      <div className="font-semibold text-[#2C3333]">Workspace</div>
                      <div className="text-[#52656A] mt-0.5">{workspaceData.name}</div>
                    </div>
                  </div>
                </div>

                {/* Members in Channel */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#52656A]">
                      Members ({workspaceData.members?.length || 0})
                    </h4>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {workspaceData.members?.map((m) => (
                      <div key={m.id} className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-[#F8FAFB]">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#395B64] text-[10px] font-bold text-white">
                          {m.username?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <span className="truncate text-xs font-medium text-[#2C3333] flex-1">{m.username}</span>
                        <span className="rounded bg-[#E7F6F2] px-1.5 py-0.5 text-[9px] font-semibold text-[#395B64]">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pinned Items */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#52656A] mb-2">Pinned</h4>
                  <div className="rounded-xl border border-dashed border-[#A5C9CA] p-3 text-center text-xs text-[#52656A]">
                    No pinned items yet
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* ========================================================
          5. MODALS & SLIDEOVERS
      ======================================================== */}

      {/* Create Workspace Modal */}
      {showCreateWorkspaceModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWorkspaceModal(false)}
          onSuccess={(newWs) => {
            setShowCreateWorkspaceModal(false)
            handleSelectWorkspace(newWs.id)
          }}
        />
      )}

      {/* Edit Workspace Modal (OWNER only) */}
      {showEditWorkspaceModal && (
        <EditWorkspaceModal
          workspace={workspaceData}
          onClose={() => setShowEditWorkspaceModal(false)}
        />
      )}

      {/* Delete Workspace Modal (OWNER only) */}
      {showDeleteWorkspaceModal && (
        <DeleteWorkspaceModal
          workspace={workspaceData}
          onClose={() => setShowDeleteWorkspaceModal(false)}
        />
      )}

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <CreateChannelModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateChannelModal(false)}
          onChannelCreated={(newChan) => {
            handleSelectChannel(newChan)
          }}
        />
      )}

      {/* Edit Channel Modal (OWNER/ADMIN) */}
      {editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          onClose={() => setEditingChannel(null)}
        />
      )}

      {/* Delete Channel Modal (OWNER/ADMIN) */}
      {deletingChannel && (
        <DeleteChannelModal
          channel={deletingChannel}
          onClose={() => setDeletingChannel(null)}
          onDeleted={handleChannelDeleted}
        />
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          workspaceName={workspaceData.name}
          workspaceId={workspaceId}
          onClose={() => setShowInviteModal(false)}
          onInviteSuccess={() => selectWorkspace(workspaceId)}
        />
      )}

      {/* Manage Role Modal (OWNER only) */}
      {selectedMemberForRole && (
        <RoleManagementModal
          member={selectedMemberForRole}
          userRole={selectedRole}
          workspaceId={workspaceId}
          onClose={() => {
            setSelectedMemberForRole(null)
            selectWorkspace(workspaceId)
          }}
        />
      )}

      {/* Workspace Members Panel (Slide-Over) */}
      {showMembersPanel && (
        <div className="fixed inset-0 z-50 bg-[#2C3333]/60 backdrop-blur-xs flex justify-end">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-[fadeIn_0.15s_ease-out]">
            <div className="flex items-center justify-between border-b border-[#E0E7E6] px-6 py-4 bg-[#F8FAFB]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#395B64]">Workspace</p>
                <h3 className="text-lg font-bold text-[#2C3333]">Manage Members</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersPanel(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] transition"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Search and Invite Action */}
            <div className="border-b border-[#E0E7E6] p-4 space-y-3">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-[#52656A]" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or role..."
                  className="w-full rounded-xl border border-[#A5C9CA] bg-[#F8FAFB] pl-9 pr-3.5 py-2 text-xs text-[#2C3333] placeholder-[#7B8B8F] focus:border-[#395B64] focus:bg-white focus:outline-none transition"
                />
              </div>

              {selectedRole === "OWNER" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMembersPanel(false)
                    setShowInviteModal(true)
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#395B64] py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2C3333] transition"
                >
                  <i className="fa-solid fa-user-plus text-[11px]" />
                  Invite new member
                </button>
              )}
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs font-semibold text-[#52656A] px-1 mb-2">
                {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
              </div>

              {filteredMembers.map((member) => {
                const isSelf = member.id === user?.id
                const isOwner = member.role === "OWNER"
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-[#E0E7E6] bg-white p-3 hover:border-[#A5C9CA] transition shadow-xs"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#395B64] text-xs font-bold text-white flex-shrink-0">
                      {member.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-[#2C3333]">{member.username}</span>
                        {isSelf && <span className="text-[10px] text-[#52656A] font-medium">(you)</span>}
                      </div>
                      <div className="truncate text-xs text-[#52656A]">{member.email}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          member.role === "OWNER"
                            ? "bg-amber-100 text-amber-800"
                            : member.role === "ADMIN"
                            ? "bg-[#E7F6F2] text-[#395B64]"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {member.role}
                      </span>

                      {/* Owner controls: Change role or remove member */}
                      {selectedRole === "OWNER" && !isSelf && !isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberForRole(member)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-[#395B64] hover:bg-[#E7F6F2] transition"
                            title="Change role"
                          >
                            <i className="fa-solid fa-pen-to-square" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id, member.username)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-rose-500 hover:bg-rose-50 transition"
                            title="Remove member"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Activity Panel (Slide-Over) */}
      {showActivityPanel && (
        <div className="fixed inset-0 z-50 bg-[#2C3333]/60 backdrop-blur-xs flex justify-end">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-[fadeIn_0.15s_ease-out]">
            <div className="flex items-center justify-between border-b border-[#E0E7E6] px-6 py-4 bg-[#F8FAFB]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#395B64]">Workspace</p>
                <h3 className="text-lg font-bold text-[#2C3333]">Activity & Notifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowActivityPanel(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] transition"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E7F6F2] text-2xl text-[#395B64] mb-4">
                <i className="fa-regular fa-bell" />
              </div>
              <h4 className="text-base font-bold text-[#2C3333]">No new notifications</h4>
              <p className="mt-1 text-xs text-[#52656A] max-w-xs">
                When you're mentioned or there's activity in your channels, it will show up here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SlackShell
