import { useState } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { toast } from "react-toastify";

const InvitationsModal = ({ onClose, onSelectWorkspace }) => {
  const {
    invitations = [],
    acceptInvitation,
    declineInvitation,
    fetchUserWorkspaces,
    fetchPendingInvitations,
  } = useWorkspace();

  const [loadingId, setLoadingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);

  const handleAccept = async (invitation) => {
    setLoadingId(invitation.id);
    try {
      await acceptInvitation(invitation.id);
      await fetchUserWorkspaces?.().catch(() => {});
      await fetchPendingInvitations?.().catch(() => {});
      toast.success(`Joined "${invitation.workspaceName}"!`);
      if (onSelectWorkspace && invitation.workspaceId) {
        onClose();
        onSelectWorkspace(invitation.workspaceId);
      }
    } catch (err) {
      toast.error(err.message || "Failed to accept invitation");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invitation) => {
    setDecliningId(invitation.id);
    try {
      await declineInvitation(invitation.id);
      await fetchPendingInvitations?.().catch(() => {});
      toast.info(`Declined invitation to "${invitation.workspaceName}"`);
    } catch (err) {
      toast.error(err.message || "Failed to decline invitation");
    } finally {
      setDecliningId(null);
    }
  };

  const getWorkspaceInitials = (name) => {
    if (!name) return "W";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/60 px-4 py-6 backdrop-blur-xs sm:px-6 animate-[fadeIn_0.15s_ease-out]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="m-auto w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E2525] border border-[#D8E2E1] dark:border-[#395B64]/40 p-5 sm:p-6 shadow-[0_24px_70px_rgba(44,51,51,0.35)] transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D8E2E1] dark:border-[#2C3333]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]">
              <i className="fa-solid fa-envelope-open-text text-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#2C3333] dark:text-[#E7F6F2]">
                  Workspace Invitations
                </h2>
                {invitations.length > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#395B64] dark:bg-[#A5C9CA] px-1.5 text-[10px] font-bold text-white dark:text-[#1E2525]">
                    {invitations.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                Manage invitations to join collaborating workspaces
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition"
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-0.5">
          {invitations.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F4F4] dark:bg-[#2C3636] text-2xl text-[#52656A] dark:text-[#A5C9CA] mb-3">
                <i className="fa-regular fa-envelope-open" />
              </div>
              <h3 className="text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2]">
                No pending invitations
              </h3>
              <p className="mt-1 text-xs text-[#52656A] dark:text-[#A5C9CA]/70 max-w-xs leading-relaxed">
                You're all caught up! When a team invites you to collaborate on a workspace, invitations will appear here.
              </p>
            </div>
          ) : (
            invitations.map((inv) => {
              const isAccepting = loadingId === inv.id;
              const isDeclining = decliningId === inv.id;
              const isBusy = isAccepting || isDeclining;

              return (
                <div
                  key={inv.id}
                  className="rounded-xl border border-[#D8E2E1] dark:border-[#2C3636] bg-[#F8FAFB] dark:bg-[#1A2121] p-4 transition-all hover:border-[#A5C9CA] dark:hover:border-[#395B64]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#395B64] text-xs font-bold text-white shadow-sm">
                        {getWorkspaceInitials(inv.workspaceName)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-[#2C3333] dark:text-[#E7F6F2] truncate">
                            {inv.workspaceName}
                          </h4>
                          <span className="rounded-md bg-[#E7F6F2] dark:bg-[#395B64]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#395B64] dark:text-[#A5C9CA]">
                            {inv.role || "MEMBER"}
                          </span>
                        </div>
                        {inv.workspaceDescription && (
                          <p className="mt-1 text-xs text-[#52656A] dark:text-[#A5C9CA]/80 line-clamp-2">
                            {inv.workspaceDescription}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                          {inv.inviter?.username && (
                            <span className="flex items-center gap-1 truncate">
                              <i className="fa-regular fa-user text-[10px]" />
                              <span>
                                Invited by{" "}
                                <strong className="font-medium text-[#2C3333] dark:text-white">
                                  {inv.inviter.username}
                                </strong>
                              </span>
                            </span>
                          )}
                          {inv.createdAt && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <i className="fa-regular fa-clock text-[10px]" />
                              <span>{formatDate(inv.createdAt)}</span>
                            </span>
                          )}
                        </div>
                        {inv.message && (
                          <div className="mt-2 rounded-lg bg-white dark:bg-[#252E2E] p-2 text-xs italic text-[#52656A] dark:text-[#A5C9CA] border border-[#D8E2E1]/60 dark:border-[#395B64]/30">
                            "{inv.message}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3.5 pt-3 border-t border-[#D8E2E1] dark:border-[#2C3636] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDecline(inv)}
                      className="rounded-lg border border-[#D8E2E1] dark:border-[#395B64]/60 px-3 py-1.5 text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] transition disabled:opacity-50 cursor-pointer"
                    >
                      {isDeclining ? "Declining..." : "Decline"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAccept(inv)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#395B64] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#2C3333] dark:hover:bg-[#4E717B] transition disabled:opacity-50 cursor-pointer"
                    >
                      {isAccepting ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Joining...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check text-[11px]" />
                          <span>Accept & Join</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#D8E2E1] dark:border-[#2C3333] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#D8E2E1] dark:border-[#395B64] px-4 py-2 text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationsModal;
