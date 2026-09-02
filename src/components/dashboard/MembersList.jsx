import { useState } from "react"
import { getRoleDisplayName, canManageRole } from "../../utils/permissions"
import RoleManagementModal from "./RoleManagementModal"

const MembersList = ({ members, userRole, currentUserId, workspaceId }) => {
  const [selectedMember, setSelectedMember] = useState(null)
  const [showRoleModal, setShowRoleModal] = useState(false)

  const handleRoleClick = (member) => {
    if (userRole === "OWNER" && canManageRole(userRole, member.role)) {
      setSelectedMember(member)
      setShowRoleModal(true)
    }
  }

  return (
    <div className="p-3 space-y-1">
      {members.length === 0 && (
        <div className="text-center py-8 text-[#52656A]">
          <i className="fa-solid fa-users text-2xl mb-2 block opacity-50" />
          <p className="text-xs">No members</p>
        </div>
      )}

      {members.map((member) => (
        <div
          key={member.id}
          className="p-2.5 rounded-md hover:bg-white transition border border-transparent hover:border-[#E0E0E0]"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#395B64] text-[#E7F6F2] font-bold text-xs flex items-center justify-center flex-shrink-0">
              {member.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#2C3333]">{member.username}</p>
              <p className="text-xs text-[#52656A]">{member.email}</p>
            </div>
            <div className="flex-shrink-0">
              {userRole === "OWNER" && canManageRole(userRole, member.role) && member.id !== currentUserId ? (
                <button
                  onClick={() => handleRoleClick(member)}
                  className="text-xs font-semibold px-2 py-1 rounded bg-[#E7F6F2] text-[#395B64] hover:bg-[#395B64] hover:text-white transition"
                  title="Click to change role"
                >
                  {getRoleDisplayName(member.role)}
                </button>
              ) : (
                <span className="text-xs font-semibold px-2 py-1 rounded bg-[#E0E0E0] text-[#52656A]">
                  {getRoleDisplayName(member.role)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {showRoleModal && selectedMember && (
        <RoleManagementModal
          member={selectedMember}
          userRole={userRole}
          onClose={() => {
            setShowRoleModal(false)
            setSelectedMember(null)
          }}
          workspaceId={workspaceId}
        />
      )}
    </div>
  )
}

export default MembersList
