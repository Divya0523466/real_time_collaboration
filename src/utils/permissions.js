const ROLE_PERMISSIONS = {
  OWNER: {
    canManageWorkspace: true,
    canManageMembers: true,
    canManageRoles: true,
    canInviteAdmins: true,
    canInviteMembers: true,
    canCreateChannels: true,
    canManageChannels: true,
    canManageChannelMembers: true,
    canDeleteChannels: true,
    canEditChannels: true,
    canAccessAllChannels: true,
  },
  ADMIN: {
    canManageWorkspace: false,
    canManageMembers: false,
    canManageRoles: false,
    canInviteAdmins: false,
    canInviteMembers: false,
    canCreateChannels: true,
    canManageChannels: true,
    canManageChannelMembers: true,
    canDeleteChannels: false,
    canEditChannels: true,
    canAccessAllChannels: true,
  },
  MEMBER: {
    canManageWorkspace: false,
    canManageMembers: false,
    canManageRoles: false,
    canInviteAdmins: false,
    canInviteMembers: false,
    canCreateChannels: false,
    canManageChannels: false,
    canManageChannelMembers: false,
    canDeleteChannels: false,
    canEditChannels: false,
    canAccessAllChannels: false,
  },
}

/**
 * Get permissions for a given role
 * @param {string} role - User's role in workspace (OWNER, ADMIN, MEMBER)
 * @returns {object} Permissions object
 */
export const getPermissions = (role) => {
  if (!role || !ROLE_PERMISSIONS[role]) {
    return ROLE_PERMISSIONS.MEMBER
  }
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if user has a specific permission
 * @param {string} role - User's role in workspace
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (role, permission) => {
  const permissions = getPermissions(role)
  return permissions[permission] === true
}

/**
 * Get role display name
 * @param {string} role - Role constant (OWNER, ADMIN, MEMBER)
 * @returns {string}
 */
export const getRoleDisplayName = (role) => {
  const names = {
    OWNER: "Owner",
    ADMIN: "Admin",
    MEMBER: "Member",
  }
  return names[role] || role
}

/**
 * Check if role is higher or equal to another role
 * Used for role management UI
 * @param {string} userRole - User's role
 * @param {string} targetRole - Role to compare
 * @returns {boolean}
 */
export const canManageRole = (userRole, targetRole) => {
  const roleHierarchy = { OWNER: 3, ADMIN: 2, MEMBER: 1 }
  return (roleHierarchy[userRole] || 0) > (roleHierarchy[targetRole] || 0)
}
