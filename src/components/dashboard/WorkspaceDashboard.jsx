import { useParams, useNavigate } from "react-router-dom"
import { useWorkspace } from "../../context/WorkspaceContext"
import { getPermissions } from "../../utils/permissions"
import { useState, useEffect } from "react"
import ChannelList from "./ChannelList"
import MembersList from "./MembersList"
import CreateChannelModal from "./CreateChannelModal"
import InviteMemberModal from "./InviteMemberModal"

const WorkspaceDashboard = () => {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { workspaceData, selectedWorkspace, channels, selectWorkspace, user, loading, error } = useWorkspace()
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState("channels")
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)

  useEffect(() => {
    if (!selectedWorkspace || selectedWorkspace !== workspaceId) {
      selectWorkspace(workspaceId)
    }
  }, [workspaceId, selectedWorkspace, selectWorkspace])

  useEffect(() => {
    if (channels.length === 0) {
      setSelectedChannel(null)
      return
    }

    const nextChannel = channels.find((channel) => channel.id === selectedChannel?.id) || channels[0]
    setSelectedChannel(nextChannel)
  }, [channels, selectedChannel?.id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F7F9]">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <i className="fa-solid fa-spinner text-3xl text-[#395B64]" />
          </div>
          <p className="mt-4 text-[#52656A]">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error || !workspaceData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F7F9]">
        <div className="text-center max-w-md rounded-2xl border border-[#E0E0E0] bg-white p-8 shadow-sm">
          <i className="fa-solid fa-exclamation-triangle text-4xl text-red-600 mb-4 block" />
          <h2 className="text-xl font-semibold text-[#2C3333] mb-2">Workspace unavailable</h2>
          <p className="text-[#52656A] mb-6">{error || "Unable to fetch workspace data."}</p>
          <button
            onClick={() => navigate("/app/dashboard")}
            className="px-6 py-2 bg-[#395B64] text-white rounded-lg hover:bg-[#2C3333] transition"
          >
            Back to workspaces
          </button>
        </div>
      </div>
    )
  }

  const userRole = workspaceData.userRole
  const permissions = getPermissions(userRole)

  const handleBackToWorkspaces = () => {
    navigate("/app/dashboard")
  }

  return (
    <div className="flex min-h-screen bg-[#F6F7F9] text-[#2C3333]">
      <aside className="w-20 border-r border-[#2C3333]/10 bg-[#2C3333] text-white flex flex-col items-center py-4">
        <button
          type="button"
          onClick={handleBackToWorkspaces}
          className="w-10 h-10 rounded-xl bg-[#395B64] flex items-center justify-center font-bold mb-5"
          title="Back to workspaces"
        >
          <i className="fa-solid fa-house text-xs" />
        </button>

        {channels.slice(0, 5).map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() => setSelectedChannel(channel)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold transition ${
              selectedChannel?.id === channel.id ? "bg-[#395B64] text-white" : "bg-[#394B52] text-[#E7F6F2] hover:bg-[#395B64]"
            }`}
            title={channel.name}
          >
            {channel.type === "PRIVATE" ? "🔒" : "#"}
          </button>
        ))}

        {permissions.canCreateChannels && (
          <button
            type="button"
            onClick={() => setShowCreateChannelModal(true)}
            className="mt-2 w-10 h-10 rounded-xl border border-dashed border-[#5A6B70] text-[#E7F6F2] flex items-center justify-center hover:border-[#E7F6F2]"
            title="Create channel"
          >
            <i className="fa-solid fa-plus text-xs" />
          </button>
        )}
      </aside>

      <aside className="w-72 border-r border-[#E0E0E0] bg-[#F3F4F6] flex flex-col">
        <div className="p-4 border-b border-[#E0E0E0] relative">
          <button
            type="button"
            onClick={handleBackToWorkspaces}
            className="flex items-center gap-2 text-[#52656A] hover:text-[#2C3333] text-sm mb-3"
          >
            <i className="fa-solid fa-arrow-left text-xs" /> Workspace list
          </button>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#E7F6F2] text-[#395B64] font-bold flex items-center justify-center">
                {workspaceData.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#2C3333] truncate">{workspaceData.name}</div>
                <div className="text-[11px] text-[#52656A]">{userRole}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWorkspaceMenu((prev) => !prev)}
              className="text-[#52656A] hover:text-[#2C3333] text-sm"
              aria-label="Workspace menu"
            >
              <i className="fa-solid fa-ellipsis-vertical" />
            </button>
          </div>

          {showWorkspaceMenu && (
            <div className="absolute left-4 right-4 top-full mt-2 z-20 rounded-xl border border-[#E0E0E0] bg-white p-2 shadow-lg">
              <div className="px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-[#52656A]">Workspace</div>
              <div className="px-2 py-2 text-sm font-semibold text-[#2C3333]">{workspaceData.name}</div>
              <div className="px-2 pb-2 text-xs text-[#52656A]">{userRole}</div>

              {userRole === "OWNER" && (
                <>
                  <button type="button" onClick={() => { setShowInviteModal(true); setShowWorkspaceMenu(false) }} className="w-full text-left px-2 py-2 text-sm text-[#2C3333] hover:bg-[#F8F9FA] rounded-lg">Invite people</button>
                  <button type="button" onClick={() => { setActiveTab("members"); setShowWorkspaceMenu(false) }} className="w-full text-left px-2 py-2 text-sm text-[#2C3333] hover:bg-[#F8F9FA] rounded-lg">Manage members</button>
                  <button type="button" onClick={() => { setShowCreateChannelModal(true); setShowWorkspaceMenu(false) }} className="w-full text-left px-2 py-2 text-sm text-[#2C3333] hover:bg-[#F8F9FA] rounded-lg">Create channel</button>
                </>
              )}

              {userRole === "ADMIN" && (
                <>
                  <button type="button" onClick={() => { setShowCreateChannelModal(true); setShowWorkspaceMenu(false) }} className="w-full text-left px-2 py-2 text-sm text-[#2C3333] hover:bg-[#F8F9FA] rounded-lg">Create channel</button>
                  <button type="button" onClick={() => { setActiveTab("members"); setShowWorkspaceMenu(false) }} className="w-full text-left px-2 py-2 text-sm text-[#2C3333] hover:bg-[#F8F9FA] rounded-lg">View members</button>
                </>
              )}

              {userRole === "MEMBER" && (
                <button type="button" onClick={() => { setActiveTab("members"); setShowWorkspaceMenu(false) }} className="w-full text-left px-2 py-2 text-sm text-[#2C3333] hover:bg-[#F8F9FA] rounded-lg">View members</button>
              )}
            </div>
          )}
        </div>

        <div className="flex border-b border-[#E0E0E0]">
          <button
            type="button"
            onClick={() => setActiveTab("channels")}
            className={`flex-1 px-3 py-3 text-xs font-semibold ${
              activeTab === "channels" ? "text-[#395B64] bg-white border-b-2 border-[#395B64]" : "text-[#52656A]"
            }`}
          >
            Channels
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex-1 px-3 py-3 text-xs font-semibold ${
              activeTab === "members" ? "text-[#395B64] bg-white border-b-2 border-[#395B64]" : "text-[#52656A]"
            }`}
          >
            Members
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === "channels" && <ChannelList channels={channels} workspaceId={workspaceId} />}
          {activeTab === "members" && (
            <MembersList
              members={workspaceData.members || []}
              userRole={userRole}
              currentUserId={user?.id}
              workspaceId={workspaceId}
            />
          )}
        </div>

        {permissions.canCreateChannels && (
          <div className="p-3 border-t border-[#E0E0E0] bg-[#F8F9FA]">
            <button
              type="button"
              onClick={() => setShowCreateChannelModal(true)}
              className="w-full rounded-lg bg-[#395B64] text-white px-3 py-2 text-sm font-medium hover:bg-[#2C3333] transition"
            >
              <i className="fa-solid fa-plus mr-2" /> Create channel
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[#E0E0E0] bg-white px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#52656A]">Workspace</div>
            <h1 className="text-2xl font-bold text-[#2C3333]">#{selectedChannel?.name || workspaceData.name}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#2C3333] hover:bg-[#F8F9FA]"
            >
              <i className="fa-solid fa-circle-info mr-2" /> Details
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 p-6">
            <div className="h-full rounded-2xl border border-[#E0E0E0] bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-[#E0E0E0] bg-[#F8F9FA] px-5 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#395B64] font-semibold">#{selectedChannel?.name || "general"}</span>
                  <span className="text-[#52656A]">{selectedChannel?.description || "Workspace channel"}</span>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-lg text-center">
                  <div className="w-16 h-16 rounded-full bg-[#E7F6F2] text-[#395B64] text-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-comments" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#2C3333]">This is the beginning of #{selectedChannel?.name || "general"}</h2>
                  <p className="mt-3 text-[#52656A]">
                    Start a conversation with your team, share updates, and keep your workflow moving.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E0E0E0] p-4 bg-[#F8F9FA]">
                <div className="flex items-center gap-3 rounded-xl border border-[#E0E0E0] bg-white px-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#E7F6F2] text-[#395B64] flex items-center justify-center text-xs font-bold">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <input
                    type="text"
                    placeholder={`Message #${selectedChannel?.name || "general"}`}
                    className="flex-1 border-0 bg-transparent text-sm text-[#2C3333] placeholder-[#7B8B8F] outline-none"
                    readOnly
                  />
                  <button type="button" className="text-[#395B64] font-medium text-sm">Send</button>
                </div>
              </div>
            </div>
          </div>

          {showDetails && (
            <aside className="w-80 border-l border-[#E0E0E0] bg-white p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-[#2C3333]">Channel details</h3>
                <button type="button" onClick={() => setShowDetails(false)} className="text-[#52656A] hover:text-[#2C3333]">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#52656A] mb-2">Channel</div>
                  <div className="text-lg font-semibold text-[#2C3333]">#{selectedChannel?.name || "general"}</div>
                  <div className="mt-2 text-sm text-[#52656A]">{selectedChannel?.description || "Workspace channel"}</div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#52656A] mb-2">Members</div>
                  <div className="text-sm text-[#2C3333]">{workspaceData.members?.length || 0} members</div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#52656A] mb-2">Role</div>
                  <div className="inline-flex rounded-full bg-[#E7F6F2] px-2 py-1 text-xs font-semibold text-[#395B64]">{userRole}</div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {showCreateChannelModal && (
        <CreateChannelModal
          onClose={() => setShowCreateChannelModal(false)}
          workspaceId={workspaceId}
        />
      )}

      {showInviteModal && (
        <InviteMemberModal
          workspaceName={workspaceData.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

export default WorkspaceDashboard
