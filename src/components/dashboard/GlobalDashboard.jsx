import { useNavigate } from "react-router-dom"
import { useWorkspace } from "../../context/WorkspaceContext"
import { useState, useEffect } from "react"
import CreateWorkspaceModal from "./CreateWorkspaceModal"
import GlobalNav from "./GlobalNav"
import { getWorkspaceInitials } from "./SlackShell"

const GlobalDashboard = () => {
  const navigate = useNavigate()
  const {
    user,
    workspaces,
    invitations,
    selectWorkspace,
    fetchUserWorkspaces,
    fetchPendingInvitations,
    acceptInvitation,
    declineInvitation,
    clearAuth,
    loading,
    error,
  } = useWorkspace()
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("worknestToken")) {
      clearAuth()
      navigate("/", { replace: true })
      return
    }

    fetchUserWorkspaces().catch((err) => {
      console.error("Failed to fetch workspaces:", err)
    })

    if (user?.email) {
      fetchPendingInvitations().catch((err) => {
        console.error("Failed to fetch invitations:", err)
      })
    }
  }, [clearAuth, fetchUserWorkspaces, fetchPendingInvitations, navigate, user?.email])

  const handleSelectWorkspace = (workspace) => {
    selectWorkspace(workspace.id)
    navigate(`/app/workspace/${workspace.id}`)
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFB] text-[#2C3333]">
      <aside className="w-17 border-r border-[#2C3333]/30 bg-[#2C3333] text-white flex flex-col items-center py-3.5 select-none">
        <button
          type="button"
          onClick={() => navigate("/app/dashboard")}
          className="w-11 h-11 rounded-xl bg-[#395B64] flex items-center justify-center font-bold mb-4 text-[#E7F6F2] hover:bg-[#A5C9CA] hover:text-[#2C3333] transition shadow-md"
          title="WorkNest Dashboard"
        >
          <i className="fa-solid fa-layer-group text-lg" />
        </button>

        <div className="w-8 h-px bg-[#395B64]/50 mb-3" />

        <div className="flex flex-col gap-2.5 w-full items-center">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              title={workspace.name}
              onClick={() => handleSelectWorkspace(workspace)}
              className="w-11 h-11 rounded-xl bg-[#374242] hover:bg-[#395B64] hover:text-white text-[#E7F6F2] transition flex items-center justify-center font-bold text-xs"
            >
              {getWorkspaceInitials(workspace.name)}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-11 h-11 rounded-xl border border-dashed border-[#52656A] text-[#A5C9CA] hover:border-[#E7F6F2] hover:bg-[#395B64]/40 hover:text-white transition flex items-center justify-center text-xs"
            title="Create Workspace"
          >
            <i className="fa-solid fa-plus" />
          </button>
        </div>
      </aside>

      <aside className="w-64 border-r border-[#E0E7E6] bg-[#1E2525]">
        <GlobalNav user={user} />
      </aside>


      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-[#E7F6F2] text-[#395B64] px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
              <i className="fa-solid fa-house text-[10px]" /> Workspace Hub
            </div>
            <h1 className="mt-3 text-3xl font-bold text-[#2C3333]">
              Welcome back, {user?.username || "there"}
            </h1>
            <p className="mt-1.5 text-sm text-[#52656A]">
              Select a workspace below or create a new one to start collaborating with your team.
            </p>
          </div>


          {loading && (
            <div className="rounded-2xl border border-dashed border-[#A5C9CA] bg-white p-8 text-center text-sm text-[#52656A]">
              <i className="fa-solid fa-spinner animate-spin text-xl text-[#395B64] mb-2 block" />
              Loading workspaces...
            </div>
          )}

  
          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div className="flex items-center gap-2 font-bold mb-1">
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </div>
              <button
                type="button"
                onClick={() => fetchUserWorkspaces()}
                className="text-xs font-semibold underline hover:text-rose-900"
              >
                Try again
              </button>
            </div>
          )}

          {invitations.length > 0 && (
            <section className="mb-8 rounded-3xl border border-[#A5C9CA] bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#395B64]">Invitations</p>
                  <h2 className="mt-1 text-xl font-bold text-[#2C3333]">Pending Invitations</h2>
                </div>
                <span className="rounded-full bg-[#E7F6F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#395B64]">
                  {invitations.length} pending
                </span>
              </div>

              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="rounded-2xl border border-[#E0E7E6] bg-[#F8FAFB] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-bold text-[#2C3333]">
                          Workspace: <span className="text-[#395B64]">{invitation.workspaceName}</span>
                        </div>
                        <div className="mt-1 text-xs text-[#52656A]">
                          Invited by: {invitation.inviter?.username || invitation.inviter?.email || "Someone"}
                        </div>
                        <div className="mt-1 text-xs text-[#52656A]">
                          Role: <span className="font-semibold text-[#2C3333]">{invitation.role}</span>
                        </div>
                        {invitation.message && (
                          <div className="mt-2 text-xs text-[#52656A] italic">"{invitation.message}"</div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            acceptInvitation(invitation.id).then(() => {
                              fetchUserWorkspaces().catch((err) => console.error("Failed to refresh workspaces:", err))
                            }).catch((err) => {
                              console.error("Failed to accept invitation:", err)
                            })
                          }}
                          className="rounded-xl bg-[#395B64] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2C3333] transition"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            declineInvitation(invitation.id).catch((err) => {
                              console.error("Failed to decline invitation:", err)
                            })
                          }}
                          className="rounded-xl border border-[#A5C9CA] bg-white px-3 py-2 text-xs font-semibold text-[#2C3333] hover:bg-[#E7F6F2] transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && !error && workspaces.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#A5C9CA] bg-white p-12 text-center max-w-lg mx-auto shadow-xs">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E7F6F2] text-3xl text-[#395B64] mx-auto mb-4">
                <i className="fa-solid fa-layer-group" />
              </div>
              <h2 className="text-xl font-bold text-[#2C3333]">Create your first workspace</h2>
              <p className="mt-2 text-sm text-[#52656A]">
                Bring your team together in one place to chat, share channels, and collaborate in real time.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#395B64] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#2C3333] transition"
              >
                <i className="fa-solid fa-plus text-xs" /> Create workspace
              </button>
            </div>
          )}

  
          {!loading && workspaces.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => handleSelectWorkspace(workspace)}
                  className="group rounded-2xl border border-[#E0E7E6] bg-white p-5 text-left shadow-xs hover:border-[#395B64] hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-[#E7F6F2] flex items-center justify-center text-[#395B64] font-bold text-sm group-hover:bg-[#395B64] group-hover:text-white transition">
                        {getWorkspaceInitials(workspace.name)}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E7F6F2] text-[#395B64] text-[10px] font-bold uppercase tracking-wider">
                        {workspace.role}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#2C3333] group-hover:text-[#395B64] transition truncate">
                      {workspace.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#52656A] line-clamp-2">
                      {workspace.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#E0E7E6]/60 text-xs font-semibold text-[#395B64]">
                    <span>Open workspace</span>
                    <i className="fa-solid fa-arrow-right text-[11px] group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}

            
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-2xl border-2 border-dashed border-[#A5C9CA] p-5 text-center hover:border-[#395B64] hover:bg-[#E7F6F2]/30 transition flex flex-col items-center justify-center min-h-35"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F6F2] text-[#395B64] text-sm mb-2">
                  <i className="fa-solid fa-plus" />
                </div>
                <span className="text-xs font-bold text-[#395B64]">Create another workspace</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(workspace) => {
            setShowCreateModal(false)
            handleSelectWorkspace(workspace)
          }}
        />
      )}
    </div>
  )
}

export default GlobalDashboard
