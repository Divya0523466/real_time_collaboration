import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiSun, FiMoon } from "react-icons/fi";
import logo from "../../assets/worknestlogo.png";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useTheme } from "../../context/ThemeContext";
import { getPermissions, getRoleDisplayName } from "../../utils/permissions";
import { isSuperAdminUser } from "../../utils/adminAuth";
import { isProUser } from "../../utils/subscriptionUtils";
import { toast } from "react-toastify";
import socket, { joinChannel, leaveChannel } from "../../services/socket";
import CreateChannelModal from "./CreateChannelModal";
import EditChannelModal from "./EditChannelModal";
import DeleteChannelModal from "./DeleteChannelModal";
import InviteMemberModal from "./InviteMemberModal";
import RoleManagementModal from "./RoleManagementModal";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import EditWorkspaceModal from "./EditWorkspaceModal";
import DeleteWorkspaceModal from "./DeleteWorkspaceModal";
import ProfileModal from "./ProfileModal";
import InvitationsModal from "./InvitationsModal";
import UpgradeModal from "./UpgradeModal";
import DirectMessaging from "./DirectMessaging";
import ChannelMessageThread from "./ChannelMessageThread";
import NotificationPanel from "./NotificationPanel";
import StarredMessagesView from "./StarredMessagesView";
import PinnedMessagesView from "./PinnedMessagesView";
import MentionsView from "./MentionsView";
import HomeView from "./HomeView";
import ForwardMessageModal from "./ForwardMessageModal";
import CreateSpaceModal from "./CreateSpaceModal";
import EditSpaceModal from "./EditSpaceModal";
import SpaceMembersModal from "./SpaceMembersModal";
import DeleteSpaceModal from "./DeleteSpaceModal";
import SpaceMessageThread from "./SpaceMessageThread";
import CreateGroupModal from "./CreateGroupModal";
import GroupMessageThread from "./GroupMessageThread";
import StatusBadge from "../common/StatusBadge";
import StatusSelector from "../common/StatusSelector";
import ConversationPinnedDrawer from "../common/ConversationPinnedDrawer";
import InConversationSearch from "../common/InConversationSearch";
import SharedFilesGallery from "../common/SharedFilesGallery";
import { useDraftIndicators } from "../../hooks/useMessageDraft";
import { getMessageAttachments } from "../../utils/fileUtils";
import UserProfileCardModal from "../common/UserProfileCardModal";
import { fetchPinnedMessagesApi, togglePinMessageApi } from "../../services/messageService";
import { onPinnedUpdated, offPinnedUpdated } from "../../services/socket";
import { fetchGroupsApi } from "../../services/groupService";
import GlobalSearchModal from "./GlobalSearchModal";
import ArchivedChatsView from "./ArchivedChatsView";
import { playNotificationSound } from "../../utils/notificationSound";
import {
  fetchSpaces,
  fetchSpace,
  markSpaceAsReadApi,
  markSpaceAsUnreadApi,
  fetchSpaceUnreadCountsApi,
  removeSpaceMemberApi,
} from "../../services/spaceService";
import {
  fetchUnreadMessageCounts,
  markChannelAsRead,
  markChannelAsUnread,
  markDirectMessagesAsRead,
  markDirectMessagesAsUnread,
  deleteDirectConversationApi,
  toggleBlockUserApi,
} from "../../services/messageService";

export const getWorkspaceInitials = (name) => {
  if (!name || typeof name !== "string") return "W";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "W";
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
};

export const SidebarSectionHeader = ({
  title,
  isCollapsed,
  onToggle,
  icon = null,
  count = 0,
  countBadgeClass = "bg-emerald-600/90",
  actionButton = null,
}) => (
  <div className="group/section flex items-center justify-between px-2 pb-1">
    <button
      type="button"
      onClick={onToggle}
      className="group flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#52656A] dark:text-[#A5C9CA]/70 hover:text-[#2C3333] dark:hover:text-[#A5C9CA] transition-colors cursor-pointer select-none"
    >
      <i
        className={`fa-solid fa-chevron-${isCollapsed ? "right" : "down"} text-[9px] w-2.5 text-[#52656A]/60 dark:text-[#A5C9CA]/60 transition-transform`}
      />
      <span>{title}</span>
    </button>
    {actionButton && (
      <div className="opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center">
        {actionButton}
      </div>
    )}
  </div>
);

const SlackShell = () => {
  const navigate = useNavigate();
  const { workspaceId, channelId, spaceId } = useParams();
  const {
    user,
    workspaces,
    workspaceData,
    channels,
    selectedWorkspace,
    selectWorkspace,
    clearAuth,
    getChannel,
    toggleArchiveChannel,
    addChannelMember,
    removeChannelMember,
    removeMember,
    notifications,
    unreadNotificationsCount,
    isMutedGlobal,
    toggleGlobalMute,
    toggleMuteConversation,
    isConversationMuted,
    isUserOnline,
    getUserPresenceStatus,
    isDndActive,
    loading,
    error,
    fetchUserWorkspaces,
    invitations,
    fetchPendingInvitations,
    acceptInvitation,
    declineInvitation,
  } = useWorkspace();
  const { theme, toggleTheme, isDark } = useTheme();
  const { hasDraft } = useDraftIndicators();

  useEffect(() => {
    fetchUserWorkspaces?.().catch(() => {});
    if (user?.email) {
      fetchPendingInvitations?.().catch(() => {});
    }
  }, [fetchUserWorkspaces, fetchPendingInvitations, user?.email]);

  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] =
    useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState(false);
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] =
    useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [deletingChannel, setDeletingChannel] = useState(null);
  const [activeChannelMenuId, setActiveChannelMenuId] = useState(null);
  const [activeDMMenuId, setActiveDMMenuId] = useState(null);
  const [activeGroupMenuId, setActiveGroupMenuId] = useState(null);
  const [channelDetails, setChannelDetails] = useState(null);
  const [memberToAdd, setMemberToAdd] = useState("");
  const [channelMemberActionLoading, setChannelMemberActionLoading] =
    useState(false);

  // ── Space states ──────────────────────────────────────────────────
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [unreadSpaceCounts, setUnreadSpaceCounts] = useState({});
  const [isSpacesCollapsed, setIsSpacesCollapsed] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showEditSpaceModal, setShowEditSpaceModal] = useState(false);
  const [showManageSpaceMembersModal, setShowManageSpaceMembersModal] =
    useState(false);
  const [showDeleteSpaceModal, setShowDeleteSpaceModal] = useState(false);
  const [activeSpaceForAction, setActiveSpaceForAction] = useState(null);

  // ── Group states ──────────────────────────────────────────────────
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isGroupsCollapsed, setIsGroupsCollapsed] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const [showDetailsPane, setShowDetailsPane] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [isStarredView, setIsStarredView] = useState(false);
  const [isPinnedView, setIsPinnedView] = useState(false);
  const [isMentionsView, setIsMentionsView] = useState(false);
  const [isArchivedView, setIsArchivedView] = useState(false);
  const [isHomeView, setIsHomeView] = useState(!channelId && !spaceId);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState(null);
  const [showChannelPinnedDrawer, setShowChannelPinnedDrawer] = useState(false);
  const [showChannelFilesGallery, setShowChannelFilesGallery] = useState(false);
  const [showChannelSearch, setShowChannelSearch] = useState(false);
  const [channelMessages, setChannelMessages] = useState([]);
  const channelFilesCount = useMemo(() => {
    return channelMessages.reduce((acc, msg) => {
      if (msg.isDeleted) return acc;
      const atts = getMessageAttachments(msg);
      return acc + (atts?.length || 0);
    }, 0);
  }, [channelMessages]);
  const [channelPinnedMessages, setChannelPinnedMessages] = useState([]);
  const safeChannelPinned = useMemo(() => {
    return Array.isArray(channelPinnedMessages) ? channelPinnedMessages : [];
  }, [channelPinnedMessages]);
  const [viewingProfileUser, setViewingProfileUser] = useState(null);

  const [isChannelsCollapsed, setIsChannelsCollapsed] = useState(false);
  const [isDMsCollapsed, setIsDMsCollapsed] = useState(false);
  const [isShortcutsCollapsed, setIsShortcutsCollapsed] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedDMUser, setSelectedDMUser] = useState(null);
  const [unreadDMCounts, setUnreadDMCounts] = useState({});
  const [activeSecondaryPanel, setActiveSecondaryPanel] = useState(() => {
    // If a channel or space is open, default to that category, otherwise 'home'
    if (channelId) return "channels";
    if (spaceId) return "spaces";
    return "home";
  });
  const [panelSearchQuery, setPanelSearchQuery] = useState("");
  const [panelUnreadOnly, setPanelUnreadOnly] = useState(false);
  const [unreadChannelCounts, setUnreadChannelCounts] = useState({});
  const [pinnedKeys, setPinnedKeys] = useState(() => {
    try {
      const uId = user?.id || user?._id || "anon";
      const raw = localStorage.getItem(`worknest_pinned_${uId}_${workspaceId}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [hiddenDMIds, setHiddenDMIds] = useState(() => {
    try {
      const uId = user?.id || user?._id || "anon";
      const raw = localStorage.getItem(
        `worknest_hidden_dms_${uId}_${workspaceId}`,
      );
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [archivedDMIds, setArchivedDMIds] = useState(() => {
    try {
      const uId = user?.id || user?._id || "anon";
      const raw = localStorage.getItem(
        `worknest_archived_dms_${uId}_${workspaceId}`,
      );
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [archivedSpaceIds, setArchivedSpaceIds] = useState(() => {
    try {
      const uId = user?.id || user?._id || "anon";
      const raw = localStorage.getItem(
        `worknest_archived_spaces_${uId}_${workspaceId}`,
      );
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [archivedGroupIds, setArchivedGroupIds] = useState(() => {
    try {
      const uId = user?.id || user?._id || "anon";
      const raw = localStorage.getItem(
        `worknest_archived_groups_${uId}_${workspaceId}`,
      );
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [blockedUserIds, setBlockedUserIds] = useState(() => {
    const initial = user?.blockedUsers || [];
    return new Set(initial.map((id) => (id?._id || id?.id || id).toString()));
  });

  useEffect(() => {
    if (user?.blockedUsers) {
      setBlockedUserIds(
        new Set(
          user.blockedUsers.map((id) => (id?._id || id?.id || id).toString()),
        ),
      );
    }
  }, [user?.blockedUsers]);
  const [isPinnedCollapsed, setIsPinnedCollapsed] = useState(false);
  const [activePinnedMenuKey, setActivePinnedMenuKey] = useState(null);
  const [forwardModalData, setForwardModalData] = useState({
    isOpen: false,
    message: null,
    sourceContext: null,
  });
  const [dmToDelete, setDmToDelete] = useState(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState(null);
  const [isLeavingTarget, setIsLeavingTarget] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const handleOpenForwardModal = (message, sourceContext) => {
    setForwardModalData({
      isOpen: true,
      message,
      sourceContext,
    });
  };

  const handleCloseForwardModal = () => {
    setForwardModalData({
      isOpen: false,
      message: null,
      sourceContext: null,
    });
  };
  const joinedChannelIdsRef = useRef(new Set());

  const unreadMentionsCount = useMemo(() => {
    return (notifications || []).filter(
      (n) =>
        !n.isRead &&
        (n.type === "CHANNEL_MENTION" ||
          n.type === "DM_MENTION" ||
          n.type === "SPACE_MENTION") &&
        (!workspaceId ||
          !n.workspaceId ||
          (
            n.workspaceId?._id ||
            n.workspaceId?.id ||
            n.workspaceId
          )?.toString() === workspaceId.toString()),
    ).length;
  }, [notifications, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    if (!selectedWorkspace || selectedWorkspace !== workspaceId) {
      selectWorkspace(workspaceId);
    }
  }, [workspaceId, selectedWorkspace, selectWorkspace]);

  const lastActiveWorkspaceIdRef = useRef(workspaceId);
  useEffect(() => {
    if (!workspaceId) return;
    if (lastActiveWorkspaceIdRef.current && lastActiveWorkspaceIdRef.current !== workspaceId) {
      // Switched workspaces via route navigation: immediately flush previous workspace states
      setSpaces([]);
      setGroups([]);
      setSelectedSpace(null);
      setSelectedGroup(null);
      setSelectedDMUser(null);
      setChannelMessages([]);
      setChannelPinnedMessages([]);
      setChannelDetails(null);
      setIsHomeView(true);
      setIsStarredView(false);
      setIsPinnedView(false);
      setIsMentionsView(false);
      setIsArchivedView(false);
      setActiveSecondaryPanel("home");
      setUnreadSpaceCounts({});
      setUnreadChannelCounts({});
      setUnreadDMCounts({});
      setShowDetailsPane(false);
      setShowMembersPanel(false);
      setShowActivityPanel(false);
      setPanelSearchQuery("");
      setPanelUnreadOnly(false);
    }
    lastActiveWorkspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  const activeChannels = useMemo(() => {
    return (channels || []).filter((c) => !c.isArchived);
  }, [channels]);

  const activeSpaces = useMemo(() => {
    return (spaces || []).filter(
      (s) => !archivedSpaceIds.has((s._id || s.id)?.toString())
    );
  }, [spaces, archivedSpaceIds]);

  const activeGroups = useMemo(() => {
    return (groups || []).filter(
      (g) => !archivedGroupIds.has((g._id || g.id)?.toString())
    );
  }, [groups, archivedGroupIds]);

  const archivedChannelsCount = useMemo(() => {
    return (channels || []).filter((c) => c.isArchived).length;
  }, [channels]);

  const totalArchivedCount = useMemo(() => {
    return (
      archivedChannelsCount +
      archivedDMIds.size +
      archivedSpaceIds.size +
      archivedGroupIds.size
    );
  }, [
    archivedChannelsCount,
    archivedDMIds.size,
    archivedSpaceIds.size,
    archivedGroupIds.size,
  ]);

  const handleToggleArchiveChannel = async (chan) => {
    const targetChanId = (chan.id || chan._id)?.toString();
    if (!targetChanId) return;
    try {
      const updated = await toggleArchiveChannel(targetChanId, workspaceId);
      const isNowArchived = updated?.isArchived;
      toast.success(
        isNowArchived
          ? `Channel "#${chan.name}" has been archived`
          : `Channel "#${chan.name}" has been unarchived`,
        { toastId: `archive-channel-${targetChanId}` }
      );
    } catch {
      // toast shown in context
    }
  };

  const handleToggleArchiveDM = (member, e) => {
    e?.stopPropagation();
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    const mIdStr = (member?.id || member?._id)?.toString();
    if (!mIdStr) return;
    const uId = user?.id || user?._id || "anon";

    const willArchive = !archivedDMIds.has(mIdStr);
    setArchivedDMIds((prev) => {
      const next = new Set(prev);
      if (willArchive) {
        next.add(mIdStr);
      } else {
        next.delete(mIdStr);
      }
      try {
        localStorage.setItem(
          `worknest_archived_dms_${uId}_${workspaceId}`,
          JSON.stringify(Array.from(next)),
        );
      } catch (err) {
        console.warn("Failed to save archived DMs:", err);
      }
      return next;
    });

    toast.success(
      willArchive
        ? `Chat with ${member.username || "user"} archived`
        : `Chat with ${member.username || "user"} unarchived`,
      { toastId: `archive-dm-${mIdStr}` }
    );
  };

  const handleToggleArchiveSpace = (space, e) => {
    e?.stopPropagation();
    setActiveSpaceForAction(null);
    setActivePinnedMenuKey(null);
    const spIdStr = (space?._id || space?.id)?.toString();
    if (!spIdStr) return;
    const uId = user?.id || user?._id || "anon";

    const willArchive = !archivedSpaceIds.has(spIdStr);
    setArchivedSpaceIds((prev) => {
      const next = new Set(prev);
      if (willArchive) {
        next.add(spIdStr);
      } else {
        next.delete(spIdStr);
      }
      try {
        localStorage.setItem(
          `worknest_archived_spaces_${uId}_${workspaceId}`,
          JSON.stringify(Array.from(next)),
        );
      } catch (err) {
        console.warn("Failed to save archived spaces:", err);
      }
      return next;
    });

    toast.success(
      willArchive
        ? `Space "${space.name || "Space"}" archived`
        : `Space "${space.name || "Space"}" unarchived`,
      { toastId: `archive-space-${spIdStr}` }
    );
  };

  const handleToggleArchiveGroup = (group, e) => {
    e?.stopPropagation();
    setActivePinnedMenuKey(null);
    const grpIdStr = (group?._id || group?.id)?.toString();
    if (!grpIdStr) return;
    const uId = user?.id || user?._id || "anon";

    const willArchive = !archivedGroupIds.has(grpIdStr);
    setArchivedGroupIds((prev) => {
      const next = new Set(prev);
      if (willArchive) {
        next.add(grpIdStr);
      } else {
        next.delete(grpIdStr);
      }
      try {
        localStorage.setItem(
          `worknest_archived_groups_${uId}_${workspaceId}`,
          JSON.stringify(Array.from(next)),
        );
      } catch (err) {
        console.warn("Failed to save archived groups:", err);
      }
      return next;
    });

    toast.success(
      willArchive
        ? `Group "${group.name || "Group"}" archived`
        : `Group "${group.name || "Group"}" unarchived`,
      { toastId: `archive-group-${grpIdStr}` }
    );
  };

  const currentChannel = useMemo(() => {
    if (selectedSpace || spaceId) return null;
    if (isHomeView && !channelId) return null;
    if (!channels || channels.length === 0) return null;
    if (channelId) {
      const found = channels.find(
        (c) => (c.id || c._id)?.toString() === channelId.toString(),
      );
      return found || null;
    }
    if (isHomeView) return null;
    return channels.find((c) => !c.isArchived) || channels[0];
  }, [channels, channelId, isHomeView, selectedSpace, spaceId]);

  const refreshChannelDetails = async () => {
    if (!currentChannel?.id || !workspaceId) return null;
    try {
      const channel = await getChannel(currentChannel.id, workspaceId);
      setChannelDetails(channel);
      return channel;
    } catch (err) {
      setChannelDetails(null);
      toast.error(err.message || "Failed to load channel details");
      return null;
    }
  };

  useEffect(() => {
    if (!currentChannel?.id || isHomeView) {
      setChannelDetails(null);
      return undefined;
    }

    if (!workspaceId || selectedWorkspace !== workspaceId) {
      return undefined;
    }

    let cancelled = false;
    getChannel(currentChannel.id, workspaceId)
      .then((channel) => {
        if (!cancelled) setChannelDetails(channel);
      })
      .catch((err) => {
        if (!cancelled) {
          setChannelDetails(null);
          console.warn("Failed to load channel details:", err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentChannel?.id,
    isHomeView,
    selectedWorkspace,
    workspaceId,
    getChannel,
  ]);

  useEffect(() => {
    if (channelId) {
      setIsHomeView(false);
    }
  }, [channelId]);

  const activeChannel =
    (channelDetails?.id || channelDetails?._id)?.toString() ===
    (currentChannel?.id || currentChannel?._id)?.toString()
      ? channelDetails
      : currentChannel;
  useEffect(() => {
    if (
      workspaceId &&
      selectedWorkspace === workspaceId &&
      channels.length > 0 &&
      channelId
    ) {
      const hasValidChannel = channels.some(
        (c) => (c.id || c._id)?.toString() === channelId.toString(),
      );
      if (!hasValidChannel) {
        setIsHomeView(true);
        navigate(`/app/workspace/${workspaceId}`, { replace: true });
      }
    }
  }, [workspaceId, selectedWorkspace, channels, channelId, navigate]);

  useEffect(() => {
    const handleChannelMemberRemoved = (data) => {
      if (
        data?.channelId &&
        data.channelId.toString() === channelId?.toString()
      ) {
        toast.info(
          `You have been removed from #${data.channelName || "the channel"}`,
        );
        leaveChannel(data.channelId);
      }
    };

    const handleChannelUpdated = (data) => {
      if (
        data?.channelId &&
        data.channelId.toString() === currentChannel?.id?.toString()
      ) {
        refreshChannelDetails();
      }
    };

    socket.on("channel-member-removed", handleChannelMemberRemoved);
    socket.on("channel-updated", handleChannelUpdated);

    return () => {
      socket.off("channel-member-removed", handleChannelMemberRemoved);
      socket.off("channel-updated", handleChannelUpdated);
    };
  }, [channelId, currentChannel?.id]);

  const isSuperAdmin = useMemo(() => isSuperAdminUser(user), [user]);

  const selectedRole = useMemo(() => {
    if (isSuperAdmin) return "OWNER";
    if (workspaceData?.userRole) {
      return workspaceData.userRole;
    }
    const wsInList = (workspaces || []).find(
      (w) => (w.id || w._id)?.toString() === workspaceId?.toString()
    );
    if (wsInList?.role) {
      return wsInList.role;
    }
    return "MEMBER";
  }, [workspaceData?.userRole, workspaces, workspaceId, isSuperAdmin]);

  const isOwner = selectedRole === "OWNER" || isSuperAdmin;
  const isAdmin = selectedRole === "ADMIN";
  const canManageWorkspace = isOwner || isAdmin;

  const permissions = useMemo(
    () => getPermissions(selectedRole),
    [selectedRole],
  );
  const canManageChannel = useCallback(
    (chan) => {
      if (isSuperAdmin) return true;
      if (selectedRole === "OWNER" || selectedRole === "ADMIN") return true;
      if (permissions?.canManageChannels) return true;
      const currentUserId = (user?.id || user?._id)?.toString();
      const creatorId = (chan?.createdBy?._id || chan?.createdBy?.id || chan?.createdBy)?.toString();
      return Boolean(currentUserId && creatorId && currentUserId === creatorId);
    },
    [isSuperAdmin, selectedRole, permissions, user]
  );
  const workspaceMembers = workspaceData?.members || [];
  const directMessageMembers = workspaceMembers.filter(
    (member) => member.id?.toString() !== user?.id?.toString(),
  );

  useEffect(() => {
    if (!workspaceId) return;
    const uId = user?.id || user?._id || "anon";
    try {
      const rawPinned = localStorage.getItem(
        `worknest_pinned_${uId}_${workspaceId}`,
      );
      setPinnedKeys(rawPinned ? new Set(JSON.parse(rawPinned)) : new Set());
    } catch {
      setPinnedKeys(new Set());
    }

    try {
      const rawHidden = localStorage.getItem(
        `worknest_hidden_dms_${uId}_${workspaceId}`,
      );
      setHiddenDMIds(rawHidden ? new Set(JSON.parse(rawHidden)) : new Set());
    } catch {
      setHiddenDMIds(new Set());
    }

    try {
      const rawArchivedDMs = localStorage.getItem(
        `worknest_archived_dms_${uId}_${workspaceId}`,
      );
      setArchivedDMIds(rawArchivedDMs ? new Set(JSON.parse(rawArchivedDMs)) : new Set());
    } catch {
      setArchivedDMIds(new Set());
    }

    try {
      const rawArchivedSpaces = localStorage.getItem(
        `worknest_archived_spaces_${uId}_${workspaceId}`,
      );
      setArchivedSpaceIds(rawArchivedSpaces ? new Set(JSON.parse(rawArchivedSpaces)) : new Set());
    } catch {
      setArchivedSpaceIds(new Set());
    }

    try {
      const rawArchivedGroups = localStorage.getItem(
        `worknest_archived_groups_${uId}_${workspaceId}`,
      );
      setArchivedGroupIds(rawArchivedGroups ? new Set(JSON.parse(rawArchivedGroups)) : new Set());
    } catch {
      setArchivedGroupIds(new Set());
    }
  }, [workspaceId, user?.id, user?._id]);

  // Synchronize channel pinned messages in real-time
  useEffect(() => {
    const cId = (currentChannel?.id || currentChannel?._id || channelId)?.toString();
    if (!cId) {
      setChannelPinnedMessages([]);
      return;
    }

    fetchPinnedMessagesApi({ channelId: cId })
      .then((data) => {
        const list = Array.isArray(data?.pinnedMessages)
          ? data.pinnedMessages
          : Array.isArray(data)
            ? data
            : [];
        setChannelPinnedMessages(list);
      })
      .catch(() => setChannelPinnedMessages([]));

    const handlePinnedUpdated = (payload) => {
      if (payload.conversationType !== "channel" || payload.channelId?.toString() !== cId) return;
      if (payload.isPinned) {
        fetchPinnedMessagesApi({ channelId: cId })
          .then((data) => {
            const list = Array.isArray(data?.pinnedMessages)
              ? data.pinnedMessages
              : Array.isArray(data)
                ? data
                : [];
            setChannelPinnedMessages(list);
          })
          .catch(() => {});
      } else {
        setChannelPinnedMessages((prev) =>
          (Array.isArray(prev) ? prev : []).filter((m) => (m.id || m._id)?.toString() !== payload.messageId?.toString())
        );
      }
    };

    onPinnedUpdated(handlePinnedUpdated);
    return () => offPinnedUpdated(handlePinnedUpdated);
  }, [currentChannel?.id, currentChannel?._id, channelId]);

  const handleJumpToMessage = (messageId) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });


    }
  };

  // Global search Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowGlobalSearch((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleJumpToResult = (result) => {
    setShowGlobalSearch(false);
    switch (result.sourceType) {
      case "channel":
        navigate(`/app/workspace/${workspaceId}/channel/${result.sourceId}`);
        break;
      case "space":
        navigate(`/app/workspace/${workspaceId}/space/${result.sourceId}`);
        break;
      case "group": {
        const grp = groups.find((g) => (g._id || g.id)?.toString() === result.sourceId);
        if (grp) handleSelectGroup(grp);
        break;
      }
      case "dm": {
        const member = workspaceData?.members?.find(
          (m) => (m.id || m._id)?.toString() === result.sourceId
        );
        if (member) handleSelectDM(member);
        break;
      }
      default: break;
    }
  };

  const handleToggleChannelMessagePin = async (msg) => {
    const msgId = (msg.id || msg._id)?.toString();
    if (!msgId) return;
    try {
      const res = await togglePinMessageApi(msgId);
      toast.success(res.isPinned ? "Message pinned" : "Message unpinned");
      setChannelPinnedMessages((prev) =>
        res.isPinned ? [...prev, msg] : prev.filter((m) => (m.id || m._id)?.toString() !== msgId)
      );
    } catch {
      toast.error("Failed to update pin status");
    }
  };

  const visibleDirectMessageMembers = useMemo(() => {
    return directMessageMembers.filter((member) => {
      const mId = (member.id || member._id)?.toString();
      if (archivedDMIds.has(mId)) return false;
      if ((unreadDMCounts[mId] || 0) > 0) return true;
      if (
        selectedDMUser &&
        (selectedDMUser.id || selectedDMUser._id)?.toString() === mId
      )
        return true;
      if (pinnedKeys.has(`dm:${mId}`)) return true;
      return !hiddenDMIds.has(mId);
    });
  }, [
    directMessageMembers,
    unreadDMCounts,
    selectedDMUser,
    pinnedKeys,
    hiddenDMIds,
    archivedDMIds,
  ]);

  const pinnedItems = useMemo(() => {
    const items = [];
    pinnedKeys.forEach((key) => {
      const [type, id] = key.split(":");
      if (!type || !id) return;
      if (type === "channel") {
        const chan = channels.find((c) => (c.id || c._id)?.toString() === id);
        if (chan) {
          items.push({
            key,
            type: "channel",
            id: (chan.id || chan._id)?.toString(),
            name: chan.name,
            data: chan,
            isPrivate: chan.type === "PRIVATE",
            unread:
              (unreadChannelCounts[(chan.id || chan._id)?.toString()] || 0) > 0,
          });
        }
      } else if (type === "dm") {
        const member = directMessageMembers.find(
          (m) => (m.id || m._id)?.toString() === id,
        );
        if (member) {
          const mId = (member.id || member._id)?.toString();
          items.push({
            key,
            type: "dm",
            id: mId,
            name: member.username,
            data: member,
            isOnline: isUserOnline(member.id || member._id),
            unread: (unreadDMCounts[mId] || 0) > 0,
          });
        }
      } else if (type === "space") {
        const sp = spaces.find((s) => (s._id || s.id)?.toString() === id);
        if (sp) {
          const spId = (sp._id || sp.id)?.toString();
          items.push({
            key,
            type: "space",
            id: spId,
            name: sp.name,
            data: sp,
            unread: (unreadSpaceCounts[spId] || 0) > 0,
          });
        }
      }
    });
    return items;
  }, [
    pinnedKeys,
    channels,
    directMessageMembers,
    spaces,
    unreadChannelCounts,
    unreadDMCounts,
    unreadSpaceCounts,
    isUserOnline,
  ]);

  const totalUnreadChannelsCount = useMemo(() => {
    return Object.values(unreadChannelCounts).reduce(
      (acc, count) =>
        acc + (typeof count === "number" && count > 0 ? count : 0),
      0,
    );
  }, [unreadChannelCounts]);

  const totalUnreadDMsCount = useMemo(() => {
    return Object.values(unreadDMCounts).reduce(
      (acc, count) =>
        acc + (typeof count === "number" && count > 0 ? count : 0),
      0,
    );
  }, [unreadDMCounts]);

  const totalUnreadSpacesCount = useMemo(() => {
    return Object.values(unreadSpaceCounts).reduce(
      (acc, count) =>
        acc + (typeof count === "number" && count > 0 ? count : 0),
      0,
    );
  }, [unreadSpaceCounts]);

  const handleSelectGroup = (grp, keepPanel = false) => {
    if (!keepPanel) {
      setActiveSecondaryPanel("groups");
    }
    setSelectedGroup(grp);
    setSelectedSpace(null);
    setSelectedDMUser(null);
    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
    setIsArchivedView(false);
    setShowDetailsPane(false);
    setActiveChannelMenuId(null);
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    setIsMobileSidebarOpen(false);
  };

  const handleSelectSpace = (sp, keepPanel = false) => {
    if (!keepPanel) {
      setActiveSecondaryPanel("spaces");
    }
    setSelectedSpace(sp);
    setSelectedGroup(null);
    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
    setIsArchivedView(false);
    setSelectedDMUser(null);
    const spId = (sp._id || sp.id).toString();
    setUnreadSpaceCounts((prev) => {
      const next = { ...prev };
      delete next[spId];
      return next;
    });
    markSpaceAsReadApi(spId).catch(() => {});
    setIsMobileSidebarOpen(false);
    navigate(`/app/workspace/${workspaceId}/space/${spId}`);
  };

  const handleToggleSpaceRead = async (sp, e) => {
    e?.stopPropagation();
    const spId = (sp._id || sp.id).toString();
    const isCurrentlyUnread = (unreadSpaceCounts[spId] || 0) > 0;

    if (isCurrentlyUnread) {
      setUnreadSpaceCounts((prev) => {
        const next = { ...prev };
        delete next[spId];
        return next;
      });
      try {
        await markSpaceAsReadApi(spId);
      } catch (err) {
        console.error("Failed to mark space as read:", err);
      }
    } else {
      setUnreadSpaceCounts((prev) => ({
        ...prev,
        [spId]: 1,
      }));
      try {
        await markSpaceAsUnreadApi(spId);
      } catch (err) {
        console.error("Failed to mark space as unread:", err);
      }
    }
  };

  const handleSelectChannel = (chan, keepPanel = false) => {
    if (!keepPanel) {
      setActiveSecondaryPanel("channels");
    }
    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
    setIsArchivedView(false);
    setSelectedDMUser(null);
    setSelectedSpace(null);
    setSelectedGroup(null);
    const targetChanId = (chan.id || chan._id)?.toString();
    if (!targetChanId) return;
    setUnreadChannelCounts((counts) => {
      const nextCounts = { ...counts };
      delete nextCounts[targetChanId];
      return nextCounts;
    });
    markChannelAsRead(targetChanId).catch(() => {});
    setActiveChannelMenuId(null);
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    setIsMobileSidebarOpen(false);
    navigate(`/app/workspace/${workspaceId}/channel/${targetChanId}`);
  };

  const handleToggleChannelRead = async (chan, e) => {
    e?.stopPropagation();
    setActiveChannelMenuId(null);
    setActivePinnedMenuKey(null);
    const chanIdStr = chan.id.toString();
    const isCurrentlyUnread = (unreadChannelCounts[chanIdStr] || 0) > 0;

    if (isCurrentlyUnread) {
      setUnreadChannelCounts((counts) => {
        const next = { ...counts };
        delete next[chanIdStr];
        return next;
      });
      try {
        await markChannelAsRead(chan.id);
      } catch (err) {
        console.error("Failed to mark channel as read:", err);
      }
    } else {
      setUnreadChannelCounts((counts) => ({
        ...counts,
        [chanIdStr]: 1,
      }));
      try {
        await markChannelAsUnread(chan.id);
      } catch (err) {
        console.error("Failed to mark channel as unread:", err);
      }
    }
  };

  const handleUnhideDM = (memberId) => {
    const mIdStr = memberId?.toString();
    if (!mIdStr) return;
    const uId = user?.id || user?._id || "anon";

    setHiddenDMIds((prev) => {
      if (!prev.has(mIdStr)) return prev;
      const next = new Set(prev);
      next.delete(mIdStr);
      try {
        localStorage.setItem(
          `worknest_hidden_dms_${uId}_${workspaceId}`,
          JSON.stringify(Array.from(next)),
        );
      } catch (err) {
        console.warn("Failed to update hidden DMs:", err);
      }
      return next;
    });
  };

  const handleHideDM = (memberId, e) => {
    e?.stopPropagation();
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);

    const mIdStr = memberId?.toString();
    if (!mIdStr) return;
    const uId = user?.id || user?._id || "anon";

    setHiddenDMIds((prev) => {
      const next = new Set(prev);
      next.add(mIdStr);
      try {
        localStorage.setItem(
          `worknest_hidden_dms_${uId}_${workspaceId}`,
          JSON.stringify(Array.from(next)),
        );
      } catch (err) {
        console.warn("Failed to save hidden DMs:", err);
      }
      return next;
    });

    if (
      selectedDMUser &&
      (selectedDMUser.id || selectedDMUser._id)?.toString() === mIdStr
    ) {
      setSelectedDMUser(null);
      setIsHomeView(true);
      navigate(`/app/workspace/${workspaceId}`);
    }
    toast.info("Conversation hidden from sidebar");
  };

  const handleDeleteDMClick = (member, e) => {
    e?.stopPropagation();
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    setDmToDelete({
      id: (member.id || member._id)?.toString(),
      username: member.username || member.name || "this user",
    });
  };

  const handleConfirmDeleteConversation = async () => {
    if (!dmToDelete?.id) return;
    const targetUserId = dmToDelete.id;
    const targetUsername = dmToDelete.username;
    setIsDeletingConversation(true);
    try {
      await deleteDirectConversationApi(targetUserId);

      //removing pin
      const uId = user?.id || user?._id || "anon";
      const pinKey = `dm:${targetUserId}`;
      setPinnedKeys((prev) => {
        if (!prev.has(pinKey)) return prev;
        const next = new Set(prev);
        next.delete(pinKey);
        try {
          localStorage.setItem(
            `worknest_pinned_${uId}_${workspaceId}`,
            JSON.stringify(Array.from(next)),
          );
        } catch (err) {
          console.warn("Failed to update pinned items:", err);
        }
        return next;
      });

      //remove unread count
      setUnreadDMCounts((prev) => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });

      // hide dm
      setHiddenDMIds((prev) => {
        const next = new Set(prev);
        next.add(targetUserId);
        try {
          localStorage.setItem(
            `worknest_hidden_dms_${uId}_${workspaceId}`,
            JSON.stringify(Array.from(next)),
          );
        } catch (err) {
          console.warn("Failed to save hidden DMs:", err);
        }
        return next;
      });

      // if conversation is open close it
      if (
        selectedDMUser &&
        (selectedDMUser.id || selectedDMUser._id)?.toString() === targetUserId
      ) {
        setSelectedDMUser(null);
        setIsHomeView(true);
        navigate(`/app/workspace/${workspaceId}`);
      }

      toast.success(
        `Conversation with @${targetUsername} deleted on your side`,
      );
      setDmToDelete(null);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      toast.error(err.message || "Failed to delete conversation");
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const handleToggleBlockUser = async (member, e) => {
    e?.stopPropagation();
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    const targetUserId = (member?.id || member?._id)?.toString();
    if (!targetUserId) return;
    const isCurrentlyBlocked = blockedUserIds.has(targetUserId);

    if (!isCurrentlyBlocked) {
      setBlockTarget({
        id: targetUserId,
        username: member.username || member.name || "this user",
      });
      return;
    }

    try {
      const res = await toggleBlockUserApi(targetUserId);
      setBlockedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      toast.success(res.message || "User unblocked");
    } catch (err) {
      toast.error(err.message || "Failed to update block status");
    }
  };

  const handleConfirmBlockUser = async () => {
    if (!blockTarget?.id) return;
    setIsBlockingUser(true);
    try {
      const res = await toggleBlockUserApi(blockTarget.id);
      setBlockedUserIds((prev) => {
        const next = new Set(prev);
        next.add(blockTarget.id);
        return next;
      });
      toast.success(res.message || "User blocked");
      setBlockTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to block user");
    } finally {
      setIsBlockingUser(false);
    }
  };

  const handleSelectDM = (member, keepPanel = false) => {
    if (!keepPanel) {
      setActiveSecondaryPanel("dms");
    }
    const mId = (member.id || member._id)?.toString();
    if (mId) handleUnhideDM(mId);
    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
    setIsArchivedView(false);
    setSelectedDMUser(member);
    setSelectedSpace(null);
    setSelectedGroup(null);
    setShowDetailsPane(false);
    setUnreadDMCounts((counts) => {
      const nextCounts = { ...counts };
      if (mId) delete nextCounts[mId];
      return nextCounts;
    });
    if (member.id || member._id) {
      markDirectMessagesAsRead(member.id || member._id).catch(() => {});
    }
    setActiveChannelMenuId(null);
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    setIsMobileSidebarOpen(false);
  };

  const handleToggleDMRead = async (member, e) => {
    e?.stopPropagation();
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    const memberIdStr = (member.id || member._id)?.toString();
    if (!memberIdStr) return;
    const isCurrentlyUnread = (unreadDMCounts[memberIdStr] || 0) > 0;

    if (isCurrentlyUnread) {
      setUnreadDMCounts((counts) => {
        const next = { ...counts };
        delete next[memberIdStr];
        return next;
      });
      try {
        await markDirectMessagesAsRead(member.id || member._id);
      } catch (err) {
        console.error("Failed to mark DM as read:", err);
      }
    } else {
      setUnreadDMCounts((counts) => ({
        ...counts,
        [memberIdStr]: 1,
      }));
      try {
        await markDirectMessagesAsUnread(member.id || member._id);
      } catch (err) {
        console.error("Failed to mark DM as unread:", err);
      }
    }
  };

  const handleTogglePin = (type, id, e) => {
    e?.stopPropagation();
    setActiveChannelMenuId(null);
    setActiveDMMenuId(null);
    setActiveSpaceForAction(null);
    setActivePinnedMenuKey(null);

    const key = `${type}:${id}`;
    const uId = user?.id || user?._id || "anon";
    const isPinned = pinnedKeys.has(key);

    const next = new Set(pinnedKeys);
    if (isPinned) {
      next.delete(key);
      toast.info("Unpinned conversation");
    } else {
      next.add(key);
      toast.success("Pinned conversation");
    }

    setPinnedKeys(next);

    try {
      localStorage.setItem(
        `worknest_pinned_${uId}_${workspaceId}`,
        JSON.stringify(Array.from(next)),
      );
    } catch (err) {
      console.warn("Failed to save pinned items:", err);
    }
  };

  const handleComingSoon = (actionName, e) => {
    e?.stopPropagation();
    setActiveChannelMenuId(null);
    setActiveDMMenuId(null);
    setActiveSpaceForAction(null);
    setActivePinnedMenuKey(null);
    toast.info(`${actionName} is not implemented!`);
  };

  const handleCopyConversationLink = (type, id, e) => {
    e?.stopPropagation();
    setActiveChannelMenuId(null);
    setActiveDMMenuId(null);
    setActiveSpaceForAction(null);
    setActivePinnedMenuKey(null);

    let path = `/app/workspace/${workspaceId}`;
    if (type === "channel") path += `/channel/${id}`;
    else if (type === "space") path += `/space/${id}`;
    const fullUrl = `${window.location.origin}${path}`;

    navigator.clipboard.writeText(fullUrl).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.info(`Link: ${fullUrl}`),
    );
  };

  const handleLeaveChannel = (chan, e) => {
    e?.stopPropagation();
    setActiveChannelMenuId(null);
    setActivePinnedMenuKey(null);
    setLeaveTarget({ type: "channel", id: chan.id, name: chan.name });
  };

  const handleLeaveSpace = (sp, e) => {
    e?.stopPropagation();
    setActiveSpaceForAction(null);
    setActivePinnedMenuKey(null);
    setLeaveTarget({ type: "space", id: sp._id || sp.id, name: sp.name });
  };

  const handleConfirmLeave = async () => {
    if (!leaveTarget) return;
    const { type, id, name } = leaveTarget;
    setIsLeavingTarget(true);
    try {
      if (type === "channel") {
        const currentMemberId = user?.id || user?._id;
        if (currentMemberId && workspaceId) {
          await removeChannelMember(id, currentMemberId);
        }
        leaveChannel(id);
        toast.info(`Left #${name}`);
        if (workspaceId) {
          await selectWorkspace(workspaceId);
        }
        if (currentChannel?.id === id) {
          setIsHomeView(true);
          navigate(`/app/workspace/${workspaceId}`, { replace: true });
        }
      } else if (type === "space") {
        const currentMemberId = user?.id || user?._id;
        if (currentMemberId) {
          await removeSpaceMemberApi(id, currentMemberId);
        }
        const spId = id.toString();
        setSpaces((prev) =>
          prev.filter((s) => (s._id || s.id).toString() !== spId),
        );
        toast.info(`Left Space "${name}"`);
        if (
          selectedSpace &&
          (selectedSpace._id || selectedSpace.id).toString() === spId
        ) {
          setSelectedSpace(null);
          setIsHomeView(true);
          navigate(`/app/workspace/${workspaceId}`, { replace: true });
        }
      }
      setLeaveTarget(null);
    } catch (err) {
      toast.error(err.message || `Failed to leave ${type}`);
    } finally {
      setIsLeavingTarget(false);
    }
  };

  const renderPinnedSection = () => {
    if (pinnedItems.length === 0) return null;

    return (
      <div className="pb-1">
        <SidebarSectionHeader
          title="Pinned"
          isCollapsed={isPinnedCollapsed}
          onToggle={() => setIsPinnedCollapsed((prev) => !prev)}
          icon={
            <i className="fa-solid fa-thumbtack text-[11px] text-[#52656A] dark:text-[#A5C9CA] w-3 text-center shrink-0" />
          }
          count={pinnedItems.length}
          countBadgeClass="bg-[#395B64] text-white"
        />

        {!isPinnedCollapsed && (
          <div className="space-y-0.5 pt-1">
            {pinnedItems.map((item) => {
              const isActive =
                item.type === "channel"
                  ? currentChannel?.id === item.id &&
                    !selectedDMUser &&
                    !isStarredView &&
                    !isMentionsView &&
                    !isHomeView &&
                    !selectedSpace &&
                    !selectedGroup
                  : item.type === "dm"
                    ? selectedDMUser?.id === item.id &&
                      !isStarredView &&
                      !isMentionsView &&
                      !isHomeView &&
                      !selectedSpace &&
                      !selectedGroup
                    : selectedSpace &&
                      (selectedSpace._id || selectedSpace.id)?.toString() ===
                        item.id?.toString();

              const isMenuOpen = activePinnedMenuKey === item.key;
              const isUnread = item.unread;

              return (
                <div key={item.key} className="relative group">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (item.type === "channel")
                        handleSelectChannel(item.data);
                      else if (item.type === "dm") handleSelectDM(item.data);
                      else if (item.type === "space")
                        handleSelectSpace(item.data);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (item.type === "channel")
                          handleSelectChannel(item.data);
                        else if (item.type === "dm") handleSelectDM(item.data);
                        else if (item.type === "space")
                          handleSelectSpace(item.data);
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#395B64] text-white font-semibold"
                        : isUnread
                          ? "text-[#1A2525] dark:text-white font-semibold hover:bg-[#EAEFEF] dark:hover:bg-[#2C3333]"
                          : "text-[#455252] dark:text-[#A5C9CA]/90 font-medium hover:bg-[#EAEFEF] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {item.type === "channel" ? (
                        item.isPrivate ? (
                          <i className={`fa-solid fa-lock text-xs w-3.5 text-center shrink-0 ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`} />
                        ) : (
                          <span className={`text-sm font-bold w-3.5 text-center shrink-0 ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`}>
                            #
                          </span>
                        )
                      ) : item.type === "dm" ? (
                        <span className="relative flex-shrink-0">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#395B64] text-[10px] font-bold text-white overflow-hidden">
                            {item.data.avatar || item.data.avatarUrl ? (
                              <img
                                src={item.data.avatar || item.data.avatarUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              item.name?.charAt(0)?.toUpperCase() || "U"
                            )}
                          </span>
                          <span
                            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-[#1E2525] ${
                              item.isOnline ? "bg-emerald-500" : "bg-gray-500"
                            }`}
                          />
                        </span>
                      ) : (
                        <i className="fa-solid fa-table-cells-large text-xs w-3.5 text-center flex-shrink-0 text-[#52656A] dark:text-[#A5C9CA]" />
                      )}

                      <span className="min-w-0 flex-1 truncate">
                        {item.name}
                      </span>
                      <i
                        className="fa-solid fa-thumbtack text-[9px] text-[#52656A] dark:text-[#A5C9CA] shrink-0"
                        title="Pinned"
                      />
                      {isConversationMuted(item.type, item.id) && (
                        <i
                          className="fa-solid fa-bell-slash text-[9px] text-[#52656A]/60 dark:text-[#A5C9CA]/60 shrink-0"
                          title="Notifications muted"
                        />
                      )}

                      {isUnread && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                          title="Unread messages"
                        />
                      )}
                    </div>

                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleForwardSuccess = (result) => {
    handleCloseForwardModal();
    if (!result?.target) return;

    const wsId =
      workspaceId ||
      selectedWorkspace ||
      workspaceData?.id ||
      workspaceData?._id;

    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
    setShowDetailsPane(false);
    setActiveChannelMenuId(null);
    setIsMobileSidebarOpen(false);

    if (result.target.type === "CHANNEL") {
      setSelectedDMUser(null);
      setSelectedSpace(null);
      navigate(`/app/workspace/${wsId}/channel/${result.target.id}`);
    } else if (result.target.type === "SPACE") {
      setSelectedDMUser(null);
      const foundSpace = spaces.find(
        (s) => (s._id || s.id)?.toString() === result.target.id?.toString(),
      );
      setSelectedSpace(
        foundSpace || { id: result.target.id, name: result.target.name },
      );
      navigate(`/app/workspace/${wsId}/space/${result.target.id}`);
    } else if (result.target.type === "DIRECT") {
      setSelectedSpace(null);
      const found = workspaceMembers.find(
        (m) => (m.id || m._id)?.toString() === result.target.id?.toString(),
      );
      setSelectedDMUser(
        found || {
          id: result.target.id,
          username: result.target.name,
          avatar: result.target.avatar,
        },
      );
      navigate(`/app/workspace/${wsId}`);
    }
  };

  const handleNavigateSource = (forwardedFrom) => {
    if (!forwardedFrom) return;

    const wsId =
      workspaceId ||
      selectedWorkspace ||
      workspaceData?.id ||
      workspaceData?._id;

    const rawType = (forwardedFrom.sourceType || "").toUpperCase();
    const rawId = (
      forwardedFrom.sourceId ||
      forwardedFrom.channelId ||
      forwardedFrom.otherUserId ||
      forwardedFrom.senderId?._id ||
      forwardedFrom.senderId ||
      ""
    )?.toString();

    const rawName = (forwardedFrom.sourceName || forwardedFrom.senderName || "")
      .trim()
      .toLowerCase()
      .replace(/^[#@]/, "");

    // 0. Try finding in spaces if rawType is SPACE
    if (rawType === "SPACE") {
      const foundSpace = spaces.find(
        (s) =>
          (s._id || s.id)?.toString() === rawId ||
          (s.name || "").toLowerCase() === rawName,
      );
      if (foundSpace) {
        handleSelectSpace(foundSpace);
        return;
      }
    }

    // 1. Try finding in channels if rawType is CHANNEL or if not specified
    let targetChannel = null;
    if (rawType === "CHANNEL" || !rawType) {
      if (rawId) {
        targetChannel = channels.find(
          (c) => (c.id || c._id)?.toString() === rawId,
        );
      }
      if (!targetChannel && rawName) {
        targetChannel = channels.find(
          (c) => (c.name || "").toLowerCase().replace(/^[#@]/, "") === rawName,
        );
      }
    }

    if (targetChannel) {
      const targetChannelId = (
        targetChannel.id || targetChannel._id
      )?.toString();
      setIsHomeView(false);
      setIsStarredView(false);
      setIsMentionsView(false);
      setSelectedDMUser(null);
      setShowDetailsPane(false);
      setActiveChannelMenuId(null);
      setIsMobileSidebarOpen(false);
      navigate(`/app/workspace/${wsId}/channel/${targetChannelId}`);
      return;
    }

    // 2. Try finding member for direct message
    let targetMember = null;
    const currentUserId = (user?.id || user?._id)?.toString();
    let targetUserId = rawId;

    if (targetUserId && targetUserId === currentUserId) {
      const origSenderId = (
        forwardedFrom.senderId?._id || forwardedFrom.senderId
      )?.toString();
      if (origSenderId && origSenderId !== currentUserId) {
        targetUserId = origSenderId;
      }
    }

    if (targetUserId) {
      targetMember = workspaceMembers.find(
        (m) => (m.id || m._id)?.toString() === targetUserId,
      );
    }

    if (!targetMember && rawName) {
      targetMember = workspaceMembers.find(
        (m) =>
          (m.username || "").toLowerCase().replace(/^[#@]/, "") === rawName ||
          (m.displayName || "").toLowerCase().replace(/^[#@]/, "") === rawName,
      );
    }

    if (targetMember) {
      setIsHomeView(false);
      setIsStarredView(false);
      setIsMentionsView(false);
      setSelectedDMUser(targetMember);
      setShowDetailsPane(false);
      setActiveChannelMenuId(null);
      setIsMobileSidebarOpen(false);
      navigate(`/app/workspace/${wsId}`);
      return;
    }

    // 3. Fallback: if rawType is CHANNEL but not in accessible channels
    if (rawType === "CHANNEL") {
      toast.info(
        rawName
          ? `You do not have access to #${rawName}`
          : "You do not have access to this private channel",
      );
      return;
    }

    // 4. Fallback for DM: open with available user ID
    if (rawId) {
      setIsHomeView(false);
      setIsStarredView(false);
      setIsMentionsView(false);
      setSelectedDMUser({
        id: rawId,
        username:
          forwardedFrom.sourceName || forwardedFrom.senderName || "User",
        avatar: forwardedFrom.senderAvatar || null,
      });
      setShowDetailsPane(false);
      setActiveChannelMenuId(null);
      setIsMobileSidebarOpen(false);
      navigate(`/app/workspace/${wsId}`);
    }
  };

  useEffect(() => {
    const handleDirectMessage = (message) => {
      const senderId = message?.senderId?.toString();
      const currentUserId = user?.id?.toString();

      if (senderId && senderId !== currentUserId) {
        handleUnhideDM(senderId);
      }

      if (
        !senderId ||
        senderId === currentUserId ||
        selectedDMUser?.id?.toString() === senderId ||
        !directMessageMembers.some(
          (member) => member.id?.toString() === senderId,
        )
      ) {
        return;
      }

      setUnreadDMCounts((counts) => ({
        ...counts,
        [senderId]: (counts[senderId] || 0) + 1,
      }));
      playNotificationSound();
    };

    socket.on("receive-direct-message", handleDirectMessage);
    return () => socket.off("receive-direct-message", handleDirectMessage);
  }, [directMessageMembers, selectedDMUser?.id, user?.id]);

  useEffect(() => {
    const availableChannelIds = new Set(
      channels.map((channel) => channel.id.toString()),
    );

    joinedChannelIdsRef.current.forEach((channelId) => {
      if (!availableChannelIds.has(channelId)) leaveChannel(channelId);
    });

    const joinAccessibleChannels = () => {
      channels.forEach((channel) => joinChannel(channel.id));
    };

    joinAccessibleChannels();
    socket.on("connect", joinAccessibleChannels);
    joinedChannelIdsRef.current = availableChannelIds;

    return () => socket.off("connect", joinAccessibleChannels);
  }, [channels]);

  useEffect(() => {
    const handleChannelMessage = (message) => {
      const messageChannelId = message?.channelId?.toString();
      const currentUserId = user?.id?.toString();

      if (
        !messageChannelId ||
        message?.senderId?.toString() === currentUserId ||
        messageChannelId === currentChannel?.id?.toString() ||
        !channels.some((channel) => channel.id.toString() === messageChannelId)
      ) {
        return;
      }

      setUnreadChannelCounts((counts) => ({
        ...counts,
        [messageChannelId]: (counts[messageChannelId] || 0) + 1,
      }));
      playNotificationSound();
    };

    socket.on("receive-channel-message", handleChannelMessage);
    return () => socket.off("receive-channel-message", handleChannelMessage);
  }, [channels, currentChannel?.id, user?.id]);

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;
    setSelectedDMUser(null);
    setUnreadDMCounts({});
    setUnreadChannelCounts({});

    // Fetch persistent unread counts directly from database
    fetchUnreadMessageCounts(workspaceId)
      .then((serverCounts) => {
        if (!cancelled && serverCounts) {
          setUnreadDMCounts(serverCounts.dms || {});
          setUnreadChannelCounts(serverCounts.channels || {});
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Clear unread count for the active channel
  useEffect(() => {
    if (!currentChannel?.id) return;
    const chanIdStr = currentChannel.id.toString();
    setUnreadChannelCounts((counts) => {
      if (!counts[chanIdStr]) return counts;
      const nextCounts = { ...counts };
      delete nextCounts[chanIdStr];
      return nextCounts;
    });
    markChannelAsRead(currentChannel.id).catch(() => {});
  }, [currentChannel?.id]);

  // Clear unread count for the active direct message conversation
  useEffect(() => {
    if (!selectedDMUser?.id) return;
    const senderIdStr = selectedDMUser.id.toString();
    setUnreadDMCounts((counts) => {
      if (!counts[senderIdStr]) return counts;
      const nextCounts = { ...counts };
      delete nextCounts[senderIdStr];
      return nextCounts;
    });
    markDirectMessagesAsRead(selectedDMUser.id).catch(() => {});
  }, [selectedDMUser?.id]);

  // Load spaces and space unread counts
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setSpaces([]);

    fetchSpaces(workspaceId)
      .then((res) => {
        if (!cancelled) {
          setSpaces(Array.isArray(res?.spaces) ? res.spaces : []);
        }
      })
      .catch((err) => {
        if (!cancelled) setSpaces([]);
        console.warn("Failed to load spaces:", err.message);
      });

    fetchSpaceUnreadCountsApi(workspaceId)
      .then((counts) => {
        if (!cancelled && counts) {
          setUnreadSpaceCounts(counts);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Load groups for the workspace
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setGroups([]);

    fetchGroupsApi(workspaceId)
      .then((res) => {
        if (!cancelled) {
          const list = Array.isArray(res) ? res : res?.groups || [];
          setGroups(list);
        }
      })
      .catch((err) => {
        if (!cancelled) setGroups([]);
        console.warn("Failed to load groups:", err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Group real-time socket events
  useEffect(() => {
    const handleGroupCreated = (data) => {
      const grp = data?.group || data;
      if (!grp || (!grp._id && !grp.id)) return;
      const grpWsId = (grp.workspaceId?._id || grp.workspaceId)?.toString();
      if (workspaceId && (!grpWsId || grpWsId !== workspaceId.toString())) return;

      setGroups((prev) => {
        const idStr = (grp._id || grp.id).toString();
        const exists = prev.some((g) => (g._id || g.id).toString() === idStr);
        if (exists) {
          return prev.map((g) =>
            (g._id || g.id).toString() === idStr ? grp : g,
          );
        }
        return [grp, ...prev];
      });
    };

    socket.on("group-created", handleGroupCreated);
    return () => {
      socket.off("group-created", handleGroupCreated);
    };
  }, [workspaceId]);

  // URL spaceId sync
  useEffect(() => {
    if (!spaceId) {
      if (!channelId) {
        // Not in a space URL
      }
      return;
    }

    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
    setSelectedDMUser(null);

    const existing = spaces.find(
      (s) => (s._id || s.id)?.toString() === spaceId.toString(),
    );
    if (existing) {
      setSelectedSpace(existing);
    } else {
      fetchSpace(spaceId)
        .then((res) => {
          if (res?.space) setSelectedSpace(res.space);
        })
        .catch((err) => {
          console.warn("Failed to fetch space:", err);
          toast.error("Could not load Space or you do not have permission.");
          navigate(`/app/workspace/${workspaceId}`, { replace: true });
        });
    }

    setUnreadSpaceCounts((prev) => {
      const next = { ...prev };
      delete next[spaceId.toString()];
      return next;
    });
    markSpaceAsReadApi(spaceId).catch(() => {});
  }, [spaceId, spaces, workspaceId, navigate]);

  // Space real-time socket events
  useEffect(() => {
    const handleSpaceCreated = (data) => {
      const sp = data?.space || data;
      if (!sp || (!sp._id && !sp.id)) return;
      const spWsId = (sp.workspaceId?._id || sp.workspaceId)?.toString();
      if (workspaceId && spWsId && spWsId !== workspaceId.toString()) return;

      setSpaces((prev) => {
        const idStr = (sp._id || sp.id).toString();
        const exists = prev.some((s) => (s._id || s.id).toString() === idStr);
        if (exists) {
          return prev.map((s) =>
            (s._id || s.id).toString() === idStr ? sp : s,
          );
        }
        return [sp, ...prev];
      });
    };

    const handleSpaceUpdated = (data) => {
      const sp = data?.space || data;
      if (!sp || (!sp._id && !sp.id)) return;
      const idStr = (sp._id || sp.id).toString();
      setSpaces((prev) =>
        prev.map((s) => ((s._id || s.id).toString() === idStr ? sp : s)),
      );
      setSelectedSpace((prev) => {
        if (!prev) return prev;
        const prevId = (prev._id || prev.id).toString();
        return prevId === idStr ? sp : prev;
      });
    };

    const handleSpaceDeleted = (data) => {
      if (!data?.spaceId) return;
      const delId = data.spaceId.toString();
      setSpaces((prev) =>
        prev.filter((s) => (s._id || s.id).toString() !== delId),
      );
      setSelectedSpace((prev) => {
        if (!prev) return prev;
        const prevId = (prev._id || prev.id).toString();
        if (prevId === delId) {
          toast.info("This Space has been deleted");
          setIsHomeView(true);
          navigate(`/app/workspace/${workspaceId}`, { replace: true });
          return null;
        }
        return prev;
      });
    };

    const handleSpaceMemberRemoved = (data) => {
      if (!data?.spaceId) return;
      const spId = data.spaceId.toString();
      const currentUserId = (user?.id || user?._id)?.toString();
      if (data.userId?.toString() === currentUserId && !isSuperAdmin) {
        setSpaces((prev) =>
          prev.filter((s) => (s._id || s.id).toString() !== spId),
        );
        setSelectedSpace((prev) => {
          if (!prev) return prev;
          const prevId = (prev._id || prev.id).toString();
          if (prevId === spId) {
            toast.info(
              `You have been removed from Space "${data.spaceName || "Space"}"`,
            );
            setIsHomeView(true);
            navigate(`/app/workspace/${workspaceId}`, { replace: true });
            return null;
          }
          return prev;
        });
      } else {
        fetchSpace(spId)
          .then((res) => {
            if (res?.space) {
              setSpaces((prev) =>
                prev.map((s) =>
                  (s._id || s.id).toString() === spId ? res.space : s,
                ),
              );
              setSelectedSpace((prev) =>
                prev && (prev._id || prev.id).toString() === spId
                  ? res.space
                  : prev,
              );
            }
          })
          .catch(() => {});
      }
    };

    const handleReceiveSpaceMessage = (data) => {
      const msg = data?.message || data;
      const msgSpaceId = (msg?.spaceId?._id || msg?.spaceId)?.toString();
      const currentUserId = (user?.id || user?._id)?.toString();
      if (!msgSpaceId) return;
      if (msg?.senderId?.toString() === currentUserId) return;

      const activeSpaceId = selectedSpace
        ? (selectedSpace._id || selectedSpace.id)?.toString()
        : null;
      if (activeSpaceId !== msgSpaceId) {
        setUnreadSpaceCounts((prev) => ({
          ...prev,
          [msgSpaceId]: (prev[msgSpaceId] || 0) + 1,
        }));
        playNotificationSound();
      }
    };

    socket.on("space-created", handleSpaceCreated);
    socket.on("space-updated", handleSpaceUpdated);
    socket.on("space-deleted", handleSpaceDeleted);
    socket.on("space-member-removed", handleSpaceMemberRemoved);
    socket.on("receive-space-message", handleReceiveSpaceMessage);

    return () => {
      socket.off("space-created", handleSpaceCreated);
      socket.off("space-updated", handleSpaceUpdated);
      socket.off("space-deleted", handleSpaceDeleted);
      socket.off("space-member-removed", handleSpaceMemberRemoved);
      socket.off("receive-space-message", handleReceiveSpaceMessage);
    };
  }, [workspaceId, isSuperAdmin, selectedSpace, user, navigate]);

  const handleSelectWorkspace = (id) => {
    const targetId = (id?.id || id?._id || id)?.toString();
    if (!targetId) return;

    setShowWorkspaceMenu(false);
    setIsMobileSidebarOpen(false);

    if (targetId === workspaceId?.toString()) {
      return;
    }

    // Instantly reset workspace-specific states so nothing from the previous workspace lingers
    setSpaces([]);
    setGroups([]);
    setSelectedSpace(null);
    setSelectedGroup(null);
    setSelectedDMUser(null);
    setChannelMessages([]);
    setChannelPinnedMessages([]);
    setChannelDetails(null);
    setIsHomeView(true);
    setIsStarredView(false);
    setIsPinnedView(false);
    setIsMentionsView(false);
    setIsArchivedView(false);
    setActiveSecondaryPanel("home");
    setUnreadSpaceCounts({});
    setUnreadChannelCounts({});
    setUnreadDMCounts({});
    setShowDetailsPane(false);
    setShowMembersPanel(false);
    setShowActivityPanel(false);
    setPanelSearchQuery("");
    setPanelUnreadOnly(false);

    selectWorkspace(targetId);
    navigate(`/app/workspace/${targetId}`);
  };

  const handleChannelDeleted = () => {
    if (deletingChannel && currentChannel?.id === deletingChannel.id) {
      const remaining = channels.filter((c) => c.id !== deletingChannel.id);
      if (remaining.length > 0) {
        navigate(`/app/workspace/${workspaceId}/channel/${remaining[0].id}`, {
          replace: true,
        });
      } else {
        setIsHomeView(true);
        navigate(`/app/workspace/${workspaceId}`, { replace: true });
      }
    }
    setDeletingChannel(null);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/logout`,
        {
          credentials: "include",
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("worknestToken")}`,
          },
        },
      );
      const data = await response
        .json()
        .catch(() => ({ message: "Logout successful" }));
      if (!response.ok) {
        toast.error(data.message || "Unable to logout.");
        return;
      }
      localStorage.removeItem("worknestToken");
      clearAuth();
      toast.error(data.message || "Logout successful");
      navigate("/");
    } catch {
      localStorage.removeItem("worknestToken");
      clearAuth();
      toast.error("Logout successful");
      navigate("/");
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    setMemberToRemove({
      id: memberId,
      name: memberName,
      type: "workspace",
    });
  };

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return workspaceMembers;
    const q = memberSearchQuery.toLowerCase();
    return workspaceMembers.filter(
      (m) =>
        m.username?.toLowerCase().includes(q) ||
        m.email.includes(q) ||
        m.role?.toLowerCase().includes(q),
    );
  }, [workspaceMembers, memberSearchQuery]);

  const channelMemberIds = useMemo(
    () =>
      new Set(
        (activeChannel?.members || []).map(
          (member) => member.id || member._id || member,
        ),
      ),
    [activeChannel?.members],
  );

  const availableChannelMembers = useMemo(
    () => workspaceMembers.filter((member) => !channelMemberIds.has(member.id)),
    [workspaceMembers, channelMemberIds],
  );

  const handleAddChannelMember = async () => {
    if (!memberToAdd || !activeChannel?.id) return;

    setChannelMemberActionLoading(true);
    try {
      await addChannelMember(activeChannel.id, memberToAdd);
      setMemberToAdd("");
      await refreshChannelDetails();
      toast.success("Member added to channel");
    } catch (err) {
      toast.error(err.message || "Failed to add member to channel");
    } finally {
      setChannelMemberActionLoading(false);
    }
  };

  const handleRemoveChannelMember = (member) => {
    if (!activeChannel?.id) return;
    setMemberToRemove({
      id: member.id,
      name: member.username,
      type: "channel",
    });
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    try {
      if (memberToRemove.type === "workspace") {
        await removeMember(memberToRemove.id);
        toast.error(
          `${memberToRemove.name} has been removed from the workspace`,
        );
      } else {
        await removeChannelMember(activeChannel.id, memberToRemove.id);
        await refreshChannelDetails();
        toast.error(`${memberToRemove.name} removed from channel`);
      }
      setMemberToRemove(null);
    } catch (err) {
      toast.error(err.message || "Failed to remove member");
    } finally {
      setIsRemovingMember(false);
    }
  };

  // ── COLUMN 2: Secondary List Panel (Middle Column) ───────────────────────
  const renderSecondaryPanel = () => {
    if (isArchivedView || isStarredView || isMentionsView) {
      return null;
    }

    const effectivePanel = activeSecondaryPanel === "home"
      ? "home"
      : selectedDMUser
      ? "dms"
      : selectedSpace
      ? "spaces"
      : selectedGroup
      ? "groups"
      : (activeChannel || currentChannel) && !isHomeView
      ? "channels"
      : activeSecondaryPanel;

    // Filtered lists for the secondary panel
    const searchLower = panelSearchQuery.trim().toLowerCase();

    const filteredDMs = visibleDirectMessageMembers.filter((m) => {
      const matchSearch = !searchLower || m.username?.toLowerCase().includes(searchLower) || m.email?.toLowerCase().includes(searchLower);
      const isUnread = (unreadDMCounts[m.id?.toString()] || 0) > 0;
      return matchSearch && (!panelUnreadOnly || isUnread);
    });

    const filteredChannels = activeChannels.filter((c) => {
      const matchSearch = !searchLower || c.name?.toLowerCase().includes(searchLower);
      const isUnread = (unreadChannelCounts[c.id?.toString()] || 0) > 0;
      return matchSearch && (!panelUnreadOnly || isUnread);
    });

    const filteredSpaces = activeSpaces.filter((s) => {
      const matchSearch = !searchLower || s.name?.toLowerCase().includes(searchLower);
      const isUnread = (unreadSpaceCounts[(s._id || s.id)?.toString()] || 0) > 0;
      return matchSearch && (!panelUnreadOnly || isUnread);
    });

    const filteredGroups = activeGroups.filter((g) => {
      const matchSearch = !searchLower || g.name?.toLowerCase().includes(searchLower);
      return matchSearch && !panelUnreadOnly;
    });

    const homeConversations = [
      ...filteredChannels.map((c) => ({ type: "channel", data: c })),
      ...filteredSpaces.map((s) => ({ type: "space", data: s })),
      ...filteredDMs.map((m) => ({ type: "dm", data: m })),
      ...filteredGroups.map((g) => ({ type: "group", data: g })),
    ];

    const getPanelTitle = () => {
      if (effectivePanel === "dms") return "Direct Messages";
      if (effectivePanel === "channels") return "Channels";
      if (effectivePanel === "spaces") return "Spaces";
      if (effectivePanel === "groups") return "Groups";
      return "Home";
    };

    return (
      <aside className="hidden md:flex w-72 lg:w-80 flex-shrink-0 flex-col border-r border-[#D8E2E1] dark:border-[#1A2121] bg-white dark:bg-[#1E2525] select-none z-10 transition-colors h-full">
        {/* Panel Header */}
        <div className="px-3.5 py-3 border-b border-[#D8E2E1] dark:border-[#1A2121] flex items-center justify-between gap-2 flex-shrink-0">
          <h2 className="text-sm font-bold text-[#2C3333] dark:text-[#E7F6F2] truncate">
            {getPanelTitle()}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-1.5 text-xs text-[#52656A] dark:text-[#A5C9CA] cursor-pointer">
              <span className="text-[11px] font-medium">Unread</span>
              <input
                type="checkbox"
                checked={panelUnreadOnly}
                onChange={(e) => setPanelUnreadOnly(e.target.checked)}
                className="rounded text-[#395B64] focus:ring-0 cursor-pointer h-3.5 w-3.5 accent-[#395B64]"
              />
            </label>
            {effectivePanel === "dms" && (
              <button
                type="button"
                onClick={() => {
                  setShowNewChatModal(true);
                  setNewChatSearch("");
                }}
                className="flex h-6 w-6 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors"
                title="New chat"
              >
                <i className="fa-solid fa-plus text-xs" />
              </button>
            )}
            {effectivePanel === "channels" && permissions.canCreateChannels && (
              <button
                type="button"
                onClick={() => setShowCreateChannelModal(true)}
                className="flex h-6 w-6 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors"
                title="Create channel"
              >
                <i className="fa-solid fa-plus text-xs" />
              </button>
            )}
            {effectivePanel === "spaces" && isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateSpaceModal(true)}
                className="flex h-6 w-6 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors"
                title="Create space"
              >
                <i className="fa-solid fa-plus text-xs" />
              </button>
            )}
            {effectivePanel === "groups" && (
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="flex h-6 w-6 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors"
                title="Create group"
              >
                <i className="fa-solid fa-plus text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Search input in column 2 */}
        <div className="p-2.5 border-b border-[#D8E2E1] dark:border-[#1A2121] flex-shrink-0">
          <div className="flex items-center gap-2 rounded bg-[#F4F7F7] dark:bg-[#252E2E] px-2.5 py-1.5 border border-[#D8E2E1] dark:border-[#395B64]/40">
            <i className="fa-solid fa-magnifying-glass text-[11px] text-[#52656A] dark:text-[#A5C9CA]" />
            <input
              type="text"
              placeholder="Search chat or people..."
              value={panelSearchQuery}
              onChange={(e) => setPanelSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#52656A]/60 dark:placeholder-[#A5C9CA]/60 outline-none"
            />
            {panelSearchQuery && (
              <button
                type="button"
                onClick={() => setPanelSearchQuery("")}
                className="text-[#52656A] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:text-white"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable List for Column 2 */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E0E7E6]/50 dark:divide-[#252E2E]">
          {effectivePanel === "dms" ? (
            filteredDMs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]/70 px-4">
                No direct messages found
              </div>
            ) : (
              filteredDMs.map((member, idx) => {
                const isSelected = selectedDMUser?.id === member.id;
                const isMenuOpen = activeDMMenuId === member.id;
                const isUnread = (unreadDMCounts[member.id?.toString()] || 0) > 0;
                const openUpward = idx >= 4;

                return (
                  <div
                    key={member.id}
                    onClick={() => handleSelectDM(member)}
                    className={`group relative flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                        : "hover:bg-[#F8FAFB] dark:hover:bg-[#252E2E]/60 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="relative flex-shrink-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#395B64] text-xs font-bold text-white overflow-hidden">
                          {member.avatar || member.avatarUrl ? (
                            <img
                              src={member.avatar || member.avatarUrl}
                              alt={member.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            member.username?.charAt(0)?.toUpperCase() || "U"
                          )}
                        </span>
                        <StatusBadge
                          status={getUserPresenceStatus(member.id)}
                          isDnd={isDndActive?.(member)}
                          size="xs"
                          className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#1E2525]"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`truncate text-xs font-semibold ${
                              isSelected
                                ? "text-[#395B64] dark:text-white"
                                : isUnread
                                ? "text-[#2C3333] dark:text-white font-bold"
                                : "text-[#2C3333] dark:text-[#E7F6F2]"
                            }`}
                          >
                            {member.username}
                          </h4>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                          {member.email || "Direct message"}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons (toggle read/unread + three dots) */}
                    <div className="flex items-center gap-0.5 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleToggleDMRead(member, e)}
                        className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title={isUnread ? "Mark as read" : "Mark as unread"}
                      >
                        <i
                          className={`fa-regular ${
                            isUnread ? "fa-envelope-open" : "fa-envelope"
                          } text-xs`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDMMenuId(isMenuOpen ? null : member.id);
                        }}
                        className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title="Options"
                      >
                        <i className="fa-solid fa-ellipsis-vertical text-xs" />
                      </button>
                    </div>

                    {/* Context menu */}
                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setActiveDMMenuId(null)}
                        />
                        <div
                          className={`absolute right-2 ${
                            openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
                          } z-40 w-48 rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] p-1.5 shadow-xl text-xs space-y-0.5 text-[#2C3333] dark:text-[#E7F6F2]`}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleToggleDMRead(member, e)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i
                              className={`fa-regular ${
                                (unreadDMCounts[member.id?.toString()] || 0) > 0
                                  ? "fa-envelope-open"
                                  : "fa-envelope"
                              } text-[#52656A] dark:text-[#A5C9CA] w-3.5`}
                            />
                            {(unreadDMCounts[member.id?.toString()] || 0) > 0
                              ? "Mark as read"
                              : "Mark as unread"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleTogglePin("dm", member.id, e)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-thumbtack text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {pinnedKeys.has(`dm:${member.id}`) ? "Unpin conversation" : "Pin conversation"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDMMenuId(null);
                              handleToggleArchiveDM(member, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-box-archive text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {archivedDMIds.has(member.id?.toString()) ? "Unarchive chat" : "Archive chat"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveDMMenuId(null);
                              handleHideDM(member.id, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-regular fa-eye-slash text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            Hide conversation
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDMMenuId(null);
                              toggleMuteConversation("dm", member.id);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i
                              className={`fa-solid ${
                                isConversationMuted("dm", member.id)
                                  ? "fa-bell text-[#395B64] dark:text-[#A5C9CA]"
                                  : "fa-bell-slash text-[#52656A] dark:text-[#A5C9CA]"
                              } w-3.5`}
                            />
                            {isConversationMuted("dm", member.id)
                              ? "Unmute notifications"
                              : "Mute notifications"}
                          </button>
                          <div className="h-px bg-[#D8E2E1] dark:bg-[#395B64]/50 my-1" />
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveDMMenuId(null);
                              handleToggleBlockUser(member, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition cursor-pointer"
                          >
                            <i
                              className={`fa-solid ${blockedUserIds.has((member.id || member._id)?.toString()) ? "fa-unlock" : "fa-ban"} w-3.5`}
                            />
                            {blockedUserIds.has((member.id || member._id)?.toString())
                              ? "Unblock user"
                              : "Block user"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveDMMenuId(null);
                              handleDeleteDMClick(member, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-trash-can w-3.5" />
                            Delete conversation
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )
          ) : effectivePanel === "channels" ? (
            filteredChannels.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]/70 px-4">
                No channels found
              </div>
            ) : (
              filteredChannels.map((chan, idx) => {
                const isActive = (currentChannel?.id || currentChannel?._id)?.toString() === (chan.id || chan._id)?.toString() && !selectedDMUser && !selectedSpace && !selectedGroup && !isHomeView;
                const isMenuOpen = activeChannelMenuId === chan.id;
                const isUnread = (unreadChannelCounts[chan.id?.toString()] || 0) > 0;
                const openUpward = idx >= 4;

                return (
                  <div
                    key={chan.id}
                    onClick={() => handleSelectChannel(chan)}
                    className={`group relative flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                      isActive
                        ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                        : "hover:bg-[#F8FAFB] dark:hover:bg-[#252E2E]/60 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-sm font-bold">
                        {chan.type === "PRIVATE" ? <i className="fa-solid fa-lock text-xs" /> : "#"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`truncate text-xs font-semibold ${
                              isActive
                                ? "text-[#395B64] dark:text-white"
                                : isUnread
                                ? "text-[#2C3333] dark:text-white font-bold"
                                : "text-[#2C3333] dark:text-[#E7F6F2]"
                            }`}
                          >
                            {chan.name}
                          </h4>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                          {chan.description || (chan.type === "PRIVATE" ? "Private channel" : "Public channel")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleToggleChannelRead(chan, e)}
                        className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title={isUnread ? "Mark as read" : "Mark as unread"}
                      >
                        <i
                          className={`fa-regular ${
                            isUnread ? "fa-envelope-open" : "fa-envelope"
                          } text-xs`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveChannelMenuId(isMenuOpen ? null : chan.id);
                        }}
                        className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title="Options"
                      >
                        <i className="fa-solid fa-ellipsis-vertical text-xs" />
                      </button>
                    </div>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setActiveChannelMenuId(null)}
                        />
                        <div
                          className={`absolute right-2 ${
                            openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
                          } z-40 w-48 rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] p-1.5 shadow-xl text-xs space-y-0.5 text-[#2C3333] dark:text-[#E7F6F2]`}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleToggleChannelRead(chan, e)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i
                              className={`fa-regular ${
                                (unreadChannelCounts[chan.id?.toString()] || 0) > 0
                                  ? "fa-envelope-open"
                                  : "fa-envelope"
                              } text-[#52656A] dark:text-[#A5C9CA] w-3.5`}
                            />
                            {(unreadChannelCounts[chan.id?.toString()] || 0) > 0
                              ? "Mark as read"
                              : "Mark as unread"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleTogglePin("channel", chan.id, e)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-thumbtack text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {pinnedKeys.has(`channel:${chan.id}`) ? "Unpin conversation" : "Pin conversation"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveChannelMenuId(null);
                              handleToggleArchiveChannel(chan);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-box-archive text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {chan.isArchived ? "Unarchive chat" : "Archive chat"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveChannelMenuId(null);
                              toggleMuteConversation("channel", chan.id);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i
                              className={`fa-solid ${
                                isConversationMuted("channel", chan.id)
                                  ? "fa-bell text-[#395B64] dark:text-[#A5C9CA]"
                                  : "fa-bell-slash text-[#52656A] dark:text-[#A5C9CA]"
                              } w-3.5`}
                            />
                            {isConversationMuted("channel", chan.id)
                              ? "Unmute notifications"
                              : "Mute notifications"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveChannelMenuId(null);
                              handleCopyConversationLink("channel", chan.id, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-link text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            Copy link
                          </button>
                          <div className="h-px bg-[#D8E2E1] dark:bg-[#395B64]/50 my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveChannelMenuId(null);
                              handleSelectChannel(chan);
                              setShowDetailsPane(true);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-users text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {isSuperAdmin || canManageChannel(chan) ? "Manage Members" : "View Members"}
                          </button>
                          {(isSuperAdmin || canManageChannel(chan)) && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveChannelMenuId(null);
                                setEditingChannel(chan);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-pen text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                              Edit channel
                            </button>
                          )}
                          {(isSuperAdmin || canManageChannel(chan)) && chan.name !== "general" && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveChannelMenuId(null);
                                setDeletingChannel(chan);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-can w-3.5" />
                              Delete channel
                            </button>
                          )}
                          {chan.name !== "general" && !isSuperAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveChannelMenuId(null);
                                handleLeaveChannel(chan, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-arrow-right-from-bracket w-3.5" />
                              Leave channel
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )
          ) : effectivePanel === "spaces" ? (
            filteredSpaces.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]/70 px-4">
                No spaces found
              </div>
            ) : (
              filteredSpaces.map((sp, idx) => {
                const spId = (sp._id || sp.id)?.toString();
                const isActive = (selectedSpace?._id || selectedSpace?.id)?.toString() === spId;
                const isUnread = (unreadSpaceCounts[spId] || 0) > 0;
                const isMenuOpen = activeSpaceForAction?.type === "menu" && activeSpaceForAction?.id === spId;
                const isPinned = pinnedKeys.has(`space:${spId}`);
                const openUpward = idx >= 4;

                return (
                  <div
                    key={spId}
                    onClick={() => handleSelectSpace(sp)}
                    className={`group relative flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                      isActive
                        ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                        : "hover:bg-[#F8FAFB] dark:hover:bg-[#252E2E]/60 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-sm font-bold">
                        <i className="fa-solid fa-table-cells-large text-xs" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`truncate text-xs font-semibold ${
                              isActive
                                ? "text-[#395B64] dark:text-white"
                                : isUnread
                                ? "text-[#2C3333] dark:text-white font-bold"
                                : "text-[#2C3333] dark:text-[#E7F6F2]"
                            }`}
                          >
                            {sp.name}
                          </h4>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                          {sp.description || "Space conversation"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleToggleSpaceRead(sp, e)}
                        className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title={isUnread ? "Mark as read" : "Mark as unread"}
                      >
                        <i
                          className={`fa-regular ${
                            isUnread ? "fa-envelope-open" : "fa-envelope"
                          } text-xs`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSpaceForAction(
                            isMenuOpen ? null : { type: "menu", id: spId, space: sp }
                          );
                        }}
                        className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title="Options"
                      >
                        <i className="fa-solid fa-ellipsis-vertical text-xs" />
                      </button>
                    </div>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSpaceForAction(null);
                          }}
                        />
                        <div
                          className={`absolute right-2 ${
                            openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
                          } z-40 w-48 rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] p-1.5 shadow-xl text-xs space-y-0.5 text-[#2C3333] dark:text-[#E7F6F2]`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              handleToggleSpaceRead(sp, e);
                              setActiveSpaceForAction(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i
                              className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[#52656A] dark:text-[#A5C9CA] w-3.5`}
                            />
                            {isUnread ? "Mark as read" : "Mark as unread"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveSpaceForAction(null);
                              handleTogglePin("space", spId, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-thumbtack text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {isPinned ? "Unpin conversation" : "Pin conversation"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSpaceForAction(null);
                              toggleMuteConversation("space", spId);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i
                              className={`fa-solid ${
                                isConversationMuted("space", spId)
                                  ? "fa-bell text-[#395B64] dark:text-[#A5C9CA]"
                                  : "fa-bell-slash text-[#52656A] dark:text-[#A5C9CA]"
                              } w-3.5`}
                            />
                            {isConversationMuted("space", spId)
                              ? "Unmute notifications"
                              : "Mute notifications"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveSpaceForAction(null);
                              handleCopyConversationLink("space", spId, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-link text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            Copy link
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveSpaceForAction(null);
                              handleToggleArchiveSpace(sp, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition cursor-pointer"
                          >
                            <i className="fa-solid fa-box-archive text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {archivedSpaceIds.has(spId) ? "Unarchive chat" : "Archive chat"}
                          </button>
                          <div className="h-px bg-[#D8E2E1] dark:bg-[#395B64]/50 my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSpaceForAction(sp);
                              setShowManageSpaceMembersModal(true);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-users text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {isSuperAdmin ? "Manage Members" : "View Members"}
                          </button>
                          {isSuperAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSpaceForAction(sp);
                                  setShowEditSpaceModal(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-pen text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                                Edit Space
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSpaceForAction(sp);
                                  setShowDeleteSpaceModal(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition cursor-pointer"
                              >
                                <i className="fa-solid fa-trash text-rose-400 w-3.5" />
                                Delete Space
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveSpaceForAction(null);
                                handleLeaveSpace(sp, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-arrow-right-from-bracket w-3.5" />
                              Leave Space
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )
          ) : effectivePanel === "groups" ? (
            filteredGroups.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]/70 px-4">
                No groups found
              </div>
            ) : (
              filteredGroups.map((grp, idx) => {
                const grpId = (grp._id || grp.id)?.toString();
                const isActive = (selectedGroup?._id || selectedGroup?.id)?.toString() === grpId;
                const isMenuOpen = activeGroupMenuId === grpId;
                const memberCount = grp.members?.length || 0;
                const openUpward = idx >= 4;

                return (
                  <div
                    key={grpId}
                    onClick={() => handleSelectGroup(grp)}
                    className={`group relative flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                      isActive
                        ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                        : "hover:bg-[#F8FAFB] dark:hover:bg-[#252E2E]/60 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-sm font-bold">
                        <i className="fa-solid fa-user-group text-xs" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`truncate text-xs font-semibold ${
                              isActive
                                ? "text-[#395B64] dark:text-white"
                                : "text-[#2C3333] dark:text-[#E7F6F2]"
                            }`}
                          >
                            {grp.name}
                          </h4>
                        </div>
                        <p className="truncate text-[11px] text-[#4A5D61] dark:text-[#A5C9CA] font-medium">
                          {memberCount} {memberCount === 1 ? "member" : "members"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveGroupMenuId(isMenuOpen ? null : grpId);
                        }}
                        className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title="Options"
                      >
                        <i className="fa-solid fa-ellipsis-vertical text-xs" />
                      </button>
                    </div>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGroupMenuId(null);
                          }}
                        />
                        <div
                          className={`absolute right-2 ${
                            openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
                          } z-40 w-48 rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] p-1.5 shadow-xl text-xs space-y-0.5 text-[#2C3333] dark:text-[#E7F6F2]`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveGroupMenuId(null);
                              handleToggleArchiveGroup(grp, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition cursor-pointer"
                          >
                            <i className="fa-solid fa-box-archive text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                            {archivedGroupIds.has(grpId) ? "Unarchive chat" : "Archive chat"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )
          ) : (
            // Unified flat Home list in column 2 (Channels, Spaces, DMs, Groups) without category headers or count badges
            homeConversations.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]/70 px-4">
                No conversations found
              </div>
            ) : (
              homeConversations.map((item, idx) => {
                const openUpward = idx >= 4;
                if (item.type === "channel") {
                  const chan = item.data;
                  const chanId = (chan.id || chan._id)?.toString();
                  const isActive = (currentChannel?.id || currentChannel?._id)?.toString() === chanId && !selectedDMUser && !selectedSpace && !selectedGroup && !isHomeView;
                  const isMenuOpen = activeChannelMenuId === chan.id;
                  const isUnread = (unreadChannelCounts[chanId] || 0) > 0;

                  return (
                    <div
                      key={`home-chan-${chanId}`}
                      onClick={() => handleSelectChannel(chan, true)}
                      className={`group relative flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                        isActive
                          ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                          : "hover:bg-[#F8FAFB] dark:hover:bg-[#252E2E]/60 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-sm font-bold">
                          {chan.type === "PRIVATE" ? <i className="fa-solid fa-lock text-xs" /> : "#"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`truncate text-xs font-semibold ${
                                isActive
                                  ? "text-[#395B64] dark:text-white"
                                  : isUnread
                                  ? "text-[#2C3333] dark:text-white font-bold"
                                  : "text-[#2C3333] dark:text-[#E7F6F2]"
                              }`}
                            >
                              {chan.name}
                            </h4>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                            {chan.description || (chan.type === "PRIVATE" ? "Private channel" : "Public channel")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleChannelRead(chan, e)}
                          className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                            isMenuOpen ? "flex" : "hidden group-hover:flex"
                          }`}
                          title={isUnread ? "Mark as read" : "Mark as unread"}
                        >
                          <i
                            className={`fa-regular ${
                              isUnread ? "fa-envelope-open" : "fa-envelope"
                            } text-xs`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChannelMenuId(isMenuOpen ? null : chan.id);
                          }}
                          className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                            isMenuOpen ? "flex" : "hidden group-hover:flex"
                          }`}
                          title="Options"
                        >
                          <i className="fa-solid fa-ellipsis-vertical text-xs" />
                        </button>
                      </div>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveChannelMenuId(null);
                            }}
                          />
                          <div
                            className={`absolute right-2 ${
                              openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
                            } z-40 w-48 rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] p-1.5 shadow-xl text-xs space-y-0.5 text-[#2C3333] dark:text-[#E7F6F2]`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                handleToggleChannelRead(chan, e);
                                setActiveChannelMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                            >
                              <i
                                className={`fa-regular ${
                                  isUnread ? "fa-envelope-open" : "fa-envelope"
                                } text-[#52656A] dark:text-[#A5C9CA] w-3.5`}
                              />
                              {isUnread ? "Mark as read" : "Mark as unread"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveChannelMenuId(null);
                                handleCopyChannelLink(chan, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-link text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                              Copy link
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveChannelMenuId(null);
                                handleToggleArchiveChannel(chan);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-box-archive text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                              {chan.isArchived ? "Unarchive chat" : "Archive chat"}
                            </button>
                            <div className="h-px bg-[#D8E2E1] dark:bg-[#395B64]/50 my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setActiveChannelMenuId(null);
                                handleSelectChannel(chan);
                                setShowDetailsPane(true);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-users text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                              {isSuperAdmin || canManageChannel(chan) ? "Manage Members" : "View Members"}
                            </button>
                            {(isSuperAdmin || canManageChannel(chan)) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveChannelMenuId(null);
                                  setEditingChannel(chan);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-pen text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                                Edit channel
                              </button>
                            )}
                            {(isSuperAdmin || canManageChannel(chan)) && chan.name !== "general" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveChannelMenuId(null);
                                  setDeletingChannel(chan);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              >
                                <i className="fa-solid fa-trash-can w-3.5" />
                                Delete channel
                              </button>
                            )}
                            {chan.name !== "general" && !isSuperAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  setActiveChannelMenuId(null);
                                  handleLeaveChannel(chan, e);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-arrow-right-from-bracket w-3.5" />
                                Leave channel
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                if (item.type === "space") {
                  const sp = item.data;
                  const spId = (sp._id || sp.id)?.toString();
                  const isActive = (selectedSpace?._id || selectedSpace?.id)?.toString() === spId;
                  const isUnread = (unreadSpaceCounts[spId] || 0) > 0;
                  const isMenuOpen = activeSpaceForAction?.type === "menu" && activeSpaceForAction?.id === spId;

                  return (
                    <div
                      key={`home-space-${spId}`}
                      onClick={() => handleSelectSpace(sp, true)}
                      className={`group relative flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                        isActive
                          ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                          : "hover:bg-[#F8FAFB] dark:hover:bg-[#252E2E]/60 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-sm font-bold">
                          <i className="fa-solid fa-table-cells-large text-xs" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`truncate text-xs font-semibold ${
                                isActive
                                  ? "text-[#395B64] dark:text-white"
                                  : isUnread
                                  ? "text-[#2C3333] dark:text-white font-bold"
                                  : "text-[#2C3333] dark:text-[#E7F6F2]"
                              }`}
                            >
                              {sp.name}
                            </h4>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                            {sp.description || "Space conversation"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSpaceRead(sp, e)}
                          className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                            isMenuOpen ? "flex" : "hidden group-hover:flex"
                          }`}
                          title={isUnread ? "Mark as read" : "Mark as unread"}
                        >
                          <i
                            className={`fa-regular ${
                              isUnread ? "fa-envelope-open" : "fa-envelope"
                            } text-xs`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSpaceForAction(
                              isMenuOpen ? null : { type: "menu", id: spId, space: sp }
                            );
                          }}
                          className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                            isMenuOpen ? "flex" : "hidden group-hover:flex"
                          }`}
                          title="Options"
                        >
                          <i className="fa-solid fa-ellipsis-vertical text-xs" />
                        </button>
                      </div>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSpaceForAction(null);
                            }}
                          />
                          <div
                            className={`absolute right-2 ${
                              openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
                            } z-40 w-48 rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] p-1.5 shadow-xl text-xs space-y-0.5 text-[#2C3333] dark:text-[#E7F6F2]`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                handleToggleSpaceRead(sp, e);
                                setActiveSpaceForAction(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                            >
                              <i
                                className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[#52656A] dark:text-[#A5C9CA] w-3.5`}
                              />
                              {isUnread ? "Mark as read" : "Mark as unread"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveSpaceForAction(null);
                                handleCopySpaceLink(sp, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-link text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                              Copy link
                            </button>
                            <div className="h-px bg-[#D8E2E1] dark:bg-[#395B64]/50 my-1" />
                            {isSuperAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSpaceForAction(null);
                                    setEditingSpace(sp);
                                    setNewSpaceName(sp.name || "");
                                    setNewSpaceDescription(sp.description || "");
                                    setShowEditSpaceModal(true);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                                >
                                  <i className="fa-solid fa-pen text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                                  Edit Space
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSpaceForAction(null);
                                    setManagingSpace(sp);
                                    setShowManageMembersModal(true);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                                >
                                  <i className="fa-solid fa-users text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                                  Manage Members
                                </button>
                                <div className="h-px bg-[#D8E2E1] dark:bg-[#395B64]/50 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSpaceForAction(null);
                                    setDeletingSpace(sp);
                                    setShowDeleteSpaceModal(true);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <i className="fa-solid fa-trash text-rose-400 w-3.5" />
                                  Delete Space
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  setActiveSpaceForAction(null);
                                  handleLeaveSpace(sp, e);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-arrow-right-from-bracket w-3.5" />
                                Leave Space
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                if (item.type === "dm") {
                  const member = item.data;
                  const isSelected = selectedDMUser?.id === member.id;
                  const isMenuOpen = activeDMMenuId === member.id;
                  const isUnread = (unreadDMCounts[member.id?.toString()] || 0) > 0;

                  return (
                    <div
                      key={`home-dm-${member.id}`}
                      onClick={() => handleSelectDM(member, true)}
                      className={`group relative flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                        isSelected
                          ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                          : "hover:bg-[#F8FAFB] dark:hover:bg-[#252E2E]/60 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="relative flex-shrink-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#395B64] text-xs font-bold text-white overflow-hidden">
                            {member.avatar || member.avatarUrl ? (
                              <img
                                src={member.avatar || member.avatarUrl}
                                alt={member.username}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              member.username?.charAt(0)?.toUpperCase() || "U"
                            )}
                          </span>
                          <StatusBadge
                            status={getUserPresenceStatus(member.id)}
                            isDnd={isDndActive?.(member)}
                            size="xs"
                            className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#1E2525]"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`truncate text-xs font-semibold ${
                                isSelected
                                  ? "text-[#395B64] dark:text-white"
                                  : isUnread
                                  ? "text-[#2C3333] dark:text-white font-bold"
                                  : "text-[#2C3333] dark:text-[#E7F6F2]"
                              }`}
                            >
                              {member.username}
                            </h4>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70">
                            {member.email || "Direct message"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleDMRead(member, e)}
                          className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                            isMenuOpen ? "flex" : "hidden group-hover:flex"
                          }`}
                          title={isUnread ? "Mark as read" : "Mark as unread"}
                        >
                          <i
                            className={`fa-regular ${
                              isUnread ? "fa-envelope-open" : "fa-envelope"
                            } text-xs`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDMMenuId(isMenuOpen ? null : member.id);
                          }}
                          className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                            isMenuOpen ? "flex" : "hidden group-hover:flex"
                          }`}
                          title="Options"
                        >
                          <i className="fa-solid fa-ellipsis-vertical text-xs" />
                        </button>
                      </div>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDMMenuId(null);
                            }}
                          />
                          <div
                            className={`absolute right-2 ${
                              openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
                            } z-40 w-48 rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] p-1.5 shadow-xl text-xs space-y-0.5 text-[#2C3333] dark:text-[#E7F6F2]`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                handleToggleDMRead(member, e);
                                setActiveDMMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition-colors cursor-pointer"
                            >
                              <i
                                className={`fa-regular ${
                                  isUnread ? "fa-envelope-open" : "fa-envelope"
                                } text-[#52656A] dark:text-[#A5C9CA] w-3.5`}
                              />
                              {isUnread ? "Mark as read" : "Mark as unread"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveDMMenuId(null);
                                handleToggleMuteDM(member.id, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition cursor-pointer"
                            >
                              <i
                                className={`fa-solid ${mutedDMIds.has(member.id?.toString()) ? "fa-bell" : "fa-bell-slash"} text-[#52656A] dark:text-[#A5C9CA] w-3.5`}
                              />
                              {mutedDMIds.has(member.id?.toString())
                                ? "Unmute notifications"
                                : "Mute notifications"}
                            </button>
                            <div className="h-px bg-[#D8E2E1] dark:bg-[#395B64]/50 my-1" />
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveDMMenuId(null);
                                handleToggleBlockUser(member, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition cursor-pointer"
                            >
                              <i
                                className={`fa-solid ${blockedUserIds.has((member.id || member._id)?.toString()) ? "fa-unlock" : "fa-ban"} w-3.5`}
                              />
                              {blockedUserIds.has((member.id || member._id)?.toString())
                                ? "Unblock user"
                                : "Block user"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveDMMenuId(null);
                                handleDeleteDMClick(member, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-can w-3.5" />
                              Delete conversation
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                if (item.type === "group") {
                  const grp = item.data;
                  const grpId = (grp._id || grp.id)?.toString();
                  const isActive = (selectedGroup?._id || selectedGroup?.id)?.toString() === grpId;
                  const isMenuOpen = activeGroupMenuId === grpId;
                  const memberCount = grp.members?.length || 0;

                  return (
                    <div
                      key={`home-grp-${grpId}`}
                      onClick={() => handleSelectGroup(grp, true)}
                      className={`group relative flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                        isActive
                          ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                          : "hover:bg-[#F8FAFB] dark:hover:bg-[#252E2E]/60 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] text-sm font-bold">
                          <i className="fa-solid fa-user-group text-xs" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`truncate text-xs font-semibold ${
                                isActive
                                  ? "text-[#395B64] dark:text-white"
                                  : "text-[#2C3333] dark:text-[#E7F6F2]"
                              }`}
                            >
                              {grp.name}
                            </h4>
                          </div>
                          <p className="truncate text-[11px] text-[#4A5D61] dark:text-[#A5C9CA] font-medium">
                            {memberCount} {memberCount === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGroupMenuId(isMenuOpen ? null : grpId);
                          }}
                          className={`h-6 w-6 shrink-0 items-center justify-center rounded transition-colors text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] ${
                            isMenuOpen ? "flex" : "hidden group-hover:flex"
                          }`}
                          title="Options"
                        >
                          <i className="fa-solid fa-ellipsis-vertical text-xs" />
                        </button>
                      </div>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveGroupMenuId(null);
                            }}
                          />
                          <div
                            className={`absolute right-2 ${
                              openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
                            } z-40 w-48 rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#252E2E] p-1.5 shadow-xl text-xs space-y-0.5 text-[#2C3333] dark:text-[#E7F6F2]`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveGroupMenuId(null);
                                handleToggleArchiveGroup(grp, e);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#EAEFEF] dark:hover:bg-[#395B64] transition cursor-pointer"
                            >
                              <i className="fa-solid fa-box-archive text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                              {archivedGroupIds.has(grpId) ? "Unarchive chat" : "Archive chat"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                return null;
              })
            )
          )}
        </div>
      </aside>
    );
  };

  const renderWorkspaceMenu = () => (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={() => setShowWorkspaceMenu(false)}
      />
      <div className="absolute left-2 right-2 top-[calc(100%+4px)] z-40 w-72 max-w-[calc(100vw-24px)] rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#1E2525] shadow-2xl text-xs overflow-hidden text-[#2C3333] dark:text-[#E7F6F2]">
        {/* Workspace Name & Role Header (Matches Image 1) */}
        <div className="px-3.5 py-3 border-b border-[#D8E2E1] dark:border-[#2C3333]">
          <div className="font-bold text-[#2C3333] dark:text-white text-base leading-tight truncate">
            {workspaceData?.name || "Workspace"}
          </div>
          <div className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 mt-0.5 capitalize">
            {getRoleDisplayName(selectedRole) || "Member"}
          </div>
        </div>

        {/* ── Workspace Settings Actions (Role-restricted) ────────────────── */}
        <div className="py-1.5 space-y-0.5">
          {canManageWorkspace && (
            <button
              type="button"
              onClick={() => {
                setShowInviteModal(true);
                setShowWorkspaceMenu(false);
                setIsMobileSidebarOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-xs font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-user-plus text-[#395B64] dark:text-[#A5C9CA] w-4 text-xs" />
              <span>Invite people</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowMembersPanel(true);
              setShowWorkspaceMenu(false);
              setIsMobileSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-xs font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition-colors cursor-pointer"
          >
            <i className={`fa-solid ${canManageWorkspace ? "fa-users-gear" : "fa-users"} text-[#395B64] dark:text-[#A5C9CA] w-4 text-xs`} />
            <span>{canManageWorkspace ? "Manage members" : "View members"}</span>
          </button>

          {permissions.canCreateChannels && (
            <button
              type="button"
              onClick={() => {
                setShowCreateChannelModal(true);
                setShowWorkspaceMenu(false);
                setIsMobileSidebarOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-xs font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[#395B64] dark:text-[#A5C9CA] w-4 text-xs" />
              <span>Create channel</span>
            </button>
          )}

          {canManageWorkspace && (
            <button
              type="button"
              onClick={() => {
                setShowEditWorkspaceModal(true);
                setShowWorkspaceMenu(false);
                setIsMobileSidebarOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-xs font-medium text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-pen-to-square text-[#395B64] dark:text-[#A5C9CA] w-4 text-xs" />
              <span>Edit workspace</span>
            </button>
          )}

          {isOwner && (
            <>
              <div className="h-px bg-[#D8E2E1] dark:bg-[#2C3333] my-1 mx-2" />
              <button
                type="button"
                onClick={() => {
                  setShowDeleteWorkspaceModal(true);
                  setShowWorkspaceMenu(false);
                  setIsMobileSidebarOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-trash-can w-4 text-xs" />
                <span>Delete workspace</span>
              </button>
            </>
          )}
        </div>

        {/* ── Workspaces Navigation (Switch & Create) ───────── */}
        <div className="border-t border-[#D8E2E1] dark:border-[#2C3333] bg-[#F8FAFB]/60 dark:bg-[#1A2121]/50 py-1.5">
          {workspaces && workspaces.length > 1 && (
            <div className="mb-1">
              <div className="flex items-center justify-between px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]/70">
                <span>Switch Workspace</span>
                <span className="rounded-full bg-[#D8E2E1]/70 dark:bg-black/30 px-1.5 py-0.2 text-[9px] font-semibold">
                  {workspaces.length}
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-0.5 px-2 py-0.5">
                {workspaces.map((ws) => {
                  const wsId = (ws.id || ws._id)?.toString();
                  const isCurrent = wsId === workspaceId?.toString();
                  return (
                    <button
                      key={wsId || ws.name}
                      type="button"
                      onClick={() => {
                        setShowWorkspaceMenu(false);
                        setIsMobileSidebarOpen(false);
                        if (!isCurrent) {
                          handleSelectWorkspace(wsId);
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-white font-semibold"
                          : "text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold flex-shrink-0 ${
                            isCurrent
                              ? "bg-[#395B64] text-white"
                              : "bg-[#D8E2E1] dark:bg-[#2C3333] text-[#395B64] dark:text-[#A5C9CA]"
                          }`}
                        >
                          {getWorkspaceInitials(ws.name)}
                        </span>
                        <span className="text-xs truncate">{ws.name}</span>
                      </div>
                      {isCurrent && (
                        <i className="fa-solid fa-check text-xs text-[#395B64] dark:text-[#A5C9CA] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="px-2">
            <button
              type="button"
              onClick={() => {
                setShowWorkspaceMenu(false);
                setIsMobileSidebarOpen(false);
                setShowCreateWorkspaceModal(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636] transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs w-4 text-center" />
              <span>Create another workspace</span>
            </button>
          </div>

          {/* Pending Invitations (if any) */}
          {invitations && invitations.length > 0 && (
            <div className="mt-1 px-2 pt-1 border-t border-[#D8E2E1] dark:border-[#2C3333]">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#395B64] dark:text-[#A5C9CA] uppercase tracking-wider px-1 mb-1">
                <span>Pending Invitations ({invitations.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowWorkspaceMenu(false);
                    setShowInvitationsModal(true);
                  }}
                  className="text-[10px] font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:underline cursor-pointer lowercase"
                >
                  view all
                </button>
              </div>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-2 rounded-lg bg-white dark:bg-[#1E2525] border border-[#D8E2E1] dark:border-[#395B64]/40 text-xs mb-1"
                >
                  <div className="font-semibold text-[#2C3333] dark:text-white truncate">
                    {inv.workspaceName}
                  </div>
                  <div className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/80">
                    Role: {inv.role}
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        acceptInvitation(inv.id).then(() => {
                          fetchUserWorkspaces?.().catch(() => {});
                        });
                      }}
                      className="flex-1 py-1 rounded bg-[#395B64] text-white text-[10px] font-bold hover:bg-[#2C3333] transition"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => declineInvitation(inv.id)}
                      className="flex-1 py-1 rounded border border-[#D8E2E1] dark:border-[#395B64] text-[10px] font-semibold text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const isCurrentWorkspaceLoaded = Boolean(
    workspaceId &&
    workspaceData &&
    ((workspaceData.id || workspaceData._id)?.toString() === workspaceId.toString())
  );

  if (error && !loading && !isCurrentWorkspaceLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] px-6 text-[#2C3333] dark:text-[#E7F6F2]">
        <div className="w-full max-w-md rounded-2xl border border-[#D8E2E1] dark:border-[#395B64] bg-white dark:bg-[#1E2525] p-8 text-center shadow-2xl">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 text-2xl">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[#2C3333] dark:text-white">
            Workspace unavailable
          </h2>
          <p className="mb-6 text-sm text-[#52656A] dark:text-[#A5C9CA]">
            {error || "Unable to load this workspace."}
          </p>

          {workspaces && workspaces.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]">
                Switch to another workspace:
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {workspaces.map((ws) => {
                  const wsId = (ws.id || ws._id)?.toString();
                  return (
                    <button
                      key={wsId || ws.name}
                      type="button"
                      onClick={() => handleSelectWorkspace(wsId)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#D8E2E1] dark:border-[#2C3333] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded bg-[#395B64] text-xs font-bold text-white">
                          {getWorkspaceInitials(ws.name)}
                        </span>
                        <span className="text-xs font-semibold text-[#2C3333] dark:text-white">
                          {ws.name}
                        </span>
                      </div>
                      <i className="fa-solid fa-arrow-right text-xs text-[#52656A] dark:text-[#A5C9CA]" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateWorkspaceModal(true)}
              className="rounded-xl bg-[#395B64] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2C3333] transition cursor-pointer"
            >
              Create a workspace
            </button>
          )}
        </div>

        {showCreateWorkspaceModal && (
          <CreateWorkspaceModal
            onClose={() => setShowCreateWorkspaceModal(false)}
            onSuccess={async (newWs) => {
              setShowCreateWorkspaceModal(false);
              const targetId = (newWs?.id || newWs?._id)?.toString();
              if (targetId) {
                await fetchUserWorkspaces?.().catch(() => {});
                handleSelectWorkspace(targetId);
              }
            }}
          />
        )}
      </div>
    );
  }

  if (!isCurrentWorkspaceLoaded || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-[#395B64] dark:border-t-[#A5C9CA]" />
          <span className="text-sm font-medium text-[#52656A] dark:text-[#A5C9CA]">
            Loading workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F8FAFB] dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2] transition-colors">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="h-14 w-full bg-white dark:bg-[#1A2121] border-b border-[#D8E2E1] dark:border-[#252E2E] flex items-center justify-between px-2.5 sm:px-4 z-30 select-none flex-shrink-0 text-[#2C3333] dark:text-[#E7F6F2] transition-colors">
        {/* Left: Mobile sidebar toggle + WorkNest Logo & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition-colors cursor-pointer"
            title="Open menu"
            aria-label="Open navigation menu"
          >
            <i className="fa-solid fa-bars text-sm" />
          </button>

          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="flex h-8 w-8 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white transition-colors cursor-pointer"
              title="Back to Super Admin Dashboard"
              aria-label="Back to Super Admin Dashboard"
            >
              <i className="fa-solid fa-arrow-left text-sm" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 select-none">
              <img
                src={logo}
                alt="WorkNest"
                className="h-7 w-7 object-contain flex-shrink-0"
              />
              <span className="hidden sm:inline font-bold text-base text-[#2C3333] dark:text-white tracking-tight">
                WorkNest
              </span>
            </div>
          )}
        </div>

        {/* Center: search */}
        <div className="flex-1 max-w-[480px] mx-1.5 sm:mx-4 min-w-0">
          <button
            type="button"
            onClick={() => setShowGlobalSearch(true)}
            className="w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 rounded bg-[#F4F7F7] dark:bg-[#242D2D] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] border border-[#D8E2E1] dark:border-[#395B64]/40 hover:border-[#395B64]/50 text-[#52656A] dark:text-[#A5C9CA]/70 hover:text-[#2C3333] dark:hover:text-[#A5C9CA] transition-colors cursor-pointer"
            title="Search workspace (Ctrl+K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <i className="fa-solid fa-magnifying-glass text-xs flex-shrink-0" />
              <span className="text-xs truncate">
                Search {workspaceData?.name || "messages, channels, people..."}
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center rounded border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#1A2121] px-1.5 py-0.5 text-[10px] font-mono text-[#52656A] dark:text-[#A5C9CA]/60 flex-shrink-0">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: status + actions + user profile */}
        <div className="flex items-center gap-1 sm:gap-2 justify-end flex-shrink-0">
          {/* User Status pill directly in the navbar */}
          <StatusSelector align="right" />

          {permissions.canManageChannelMembers && (
            <button
              type="button"
              onClick={() => navigate(`/app/workspace/${workspaceId}/channels-manage`)}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors cursor-pointer"
              title="Channel management"
            >
              <i className="fa-solid fa-users-gear text-sm" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {isDark ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
          </button>

          <button
            type="button"
            onClick={() => setShowActivityPanel(true)}
            className="relative flex h-8 w-8 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors cursor-pointer"
            title="Notifications"
          >
            <i className="fa-solid fa-bell text-sm" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-[7px] w-[7px] rounded-full bg-[#395B64] dark:bg-[#A5C9CA]" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-[#D8E2E1] dark:bg-[#395B64]/50 mx-0.5 hidden sm:block" />

          {/* User profile with avatar + name + role */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 pl-1 pr-1 sm:pr-2 py-1 rounded hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] transition-colors cursor-pointer text-left select-none relative"
              title="User profile"
            >
              <div className="relative flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#395B64] text-xs font-semibold text-white overflow-hidden border border-[#395B64]">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username || "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user?.username?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
                {invitations && invitations.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-[#395B64] dark:bg-[#A5C9CA] border-2 border-white dark:border-[#1A2121]"
                    title={`${invitations.length} pending invitation${invitations.length === 1 ? "" : "s"}`}
                  />
                )}
              </div>
              <div className="hidden sm:flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#2C3333] dark:text-white truncate max-w-[120px] leading-tight">
                    {user?.username || "User"}
                  </span>
                  {isProUser(user) && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#395B64] text-white dark:bg-[#A5C9CA] dark:text-[#1E2525] leading-none shrink-0"
                      title={
                        user?.subscription?.cancelAtPeriodEnd
                          ? "WorkNest Pro (Auto-renewal cancelled)"
                          : "WorkNest Pro Plan"
                      }
                    >
                      <i className="fa-solid fa-crown text-[8px]" />
                      <span>PRO</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/80 truncate max-w-[130px] leading-tight capitalize">
                  {getRoleDisplayName(selectedRole) || "Member"}
                </span>
              </div>
            </button>

            {/* Profile dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 rounded border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#1E2525] shadow-2xl text-[#2C3333] dark:text-[#E7F6F2] overflow-hidden">
                  {/* User info header */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#D8E2E1] dark:border-[#2C3333]">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#395B64] text-sm font-semibold text-white overflow-hidden">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username || "Profile"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user?.username?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[#2C3333] dark:text-white leading-tight">
                        {user?.username || "User"}
                      </div>
                      <div className="truncate text-xs text-[#52656A] dark:text-[#A5C9CA]/80 leading-tight">
                        {user?.email || ""}
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {/* Subscription Status / Upgrade to Pro */}
                    {isProUser(user) ? (
                      <div className="mx-2 my-1.5 flex items-center justify-between rounded-md bg-[#E7F6F2] dark:bg-[#395B64]/20 border border-[#A5C9CA]/50 dark:border-[#395B64]/50 px-2.5 py-1.5 text-xs text-[#2C3333] dark:text-[#E7F6F2] font-semibold select-none">
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="fa-solid fa-crown text-xs text-[#395B64] dark:text-[#A5C9CA] shrink-0" />
                          <span className="truncate">
                            {user?.subscription?.cancelAtPeriodEnd
                              ? "Pro (Cancelling)"
                              : "Pro Plan"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            setShowEditProfileModal(true);
                          }}
                          className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/80 hover:text-rose-600 dark:hover:text-rose-400 font-medium underline cursor-pointer shrink-0"
                          title="Manage or cancel subscription"
                        >
                          Manage Plan
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowUpgradeModal(true);
                        }}
                        className="mx-2 my-1.5 flex w-[calc(100%-16px)] items-center justify-between rounded-md bg-[#E7F6F2] dark:bg-[#395B64]/20 border border-[#A5C9CA]/50 dark:border-[#395B64]/40 px-2.5 py-1.5 text-left text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#D8E2E1] dark:hover:bg-[#395B64]/35 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-crown text-xs text-[#395B64] dark:text-[#A5C9CA]" />
                          <span>Upgrade to Pro</span>
                        </div>
                        <span className="text-[10px] font-bold bg-[#395B64] text-white dark:bg-[#A5C9CA] dark:text-[#1E2525] px-1.5 py-0.5 rounded leading-none">
                          $12/mo
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowEditProfileModal(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3333] transition-colors cursor-pointer"
                    >
                      <i className="fa-regular fa-user text-xs text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                      <span>Edit profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowInvitationsModal(true);
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3333] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <i className="fa-solid fa-envelope-open-text text-xs text-[#52656A] dark:text-[#A5C9CA] w-3.5" />
                        <span>Invitations</span>
                      </div>
                      {invitations && invitations.length > 0 ? (
                        <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#395B64] dark:bg-[#A5C9CA] text-white dark:text-[#1E2525] text-[10px] font-bold px-1.5 shadow-xs">
                          {invitations.length}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#52656A]/60 dark:text-[#A5C9CA]/50 font-normal">
                          0
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGlobalMute();
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                        isMutedGlobal
                          ? "text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3333]"
                          : "text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3333]"
                      }`}
                    >
                      <i
                        className={`fa-solid ${isMutedGlobal ? "fa-bell-slash text-[#395B64] dark:text-[#A5C9CA]" : "fa-bell text-[#52656A] dark:text-[#A5C9CA]"} text-xs w-3.5`}
                      />
                      <span>{isMutedGlobal ? "Unmute notifications" : "Mute notifications"}</span>
                    </button>

                    {isSuperAdminUser(user) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate("/admin");
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-emerald-600 dark:text-emerald-400 hover:bg-[#F0F4F4] dark:hover:bg-[#2C3333] transition-colors cursor-pointer"
                      >
                        <i className="fa-solid fa-shield-halved text-xs w-3.5" />
                        <span>Super Admin</span>
                      </button>
                    )}

                    <div className="h-px bg-[#D8E2E1] dark:bg-[#2C3333] mx-2 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket text-xs w-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full overflow-hidden relative">
      {/* ── Mobile sidebar backdrop ─────────────────────────────────────────── */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile sidebar drawer ───────────────────────────────────────────── */}
      {/* On mobile this is a slide-in overlay. On md+ it is always rendered
          inline (the two aside elements below take over). */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex transition-transform duration-200 md:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >

        {/* Workspace sidebar — inside mobile drawer */}
        <div className="flex w-64 flex-col bg-[#F8FAFB] dark:bg-[#1E2525] text-sm text-[#2C3333] dark:text-[#E7F6F2] border-r border-[#D8E2E1] dark:border-[#1A2121] select-none transition-colors">
          {/* Close button & Workspace Header */}
          <div className="relative flex items-center justify-between border-b border-[#D8E2E1] dark:border-[#1A2121] px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShowWorkspaceMenu((prev) => !prev)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#395B64] text-[10px] font-bold tracking-wider text-white flex-shrink-0">
                {getWorkspaceInitials(workspaceData.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#2C3333] dark:text-white leading-tight">
                  {workspaceData.name}
                </div>
                <div className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 leading-tight">
                  {getRoleDisplayName(selectedRole)}
                </div>
              </div>
              <i
                className={`fa-solid fa-chevron-down text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 flex-shrink-0 transition-transform ${showWorkspaceMenu ? "rotate-180" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowNewChatModal(true);
                setNewChatSearch("");
                setIsMobileSidebarOpen(false);
              }}
              className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors"
              title="New message"
            >
              <i className="fa-solid fa-plus text-xs" />
            </button>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="ml-1 flex h-7 w-7 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E8EEED] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white transition-colors"
              aria-label="Close sidebar"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>

            {showWorkspaceMenu && renderWorkspaceMenu()}
          </div>

          <div className="px-3 pb-2 pt-2">
            <SidebarSectionHeader
              title="Shortcuts"
              isCollapsed={isShortcutsCollapsed}
              onToggle={() => setIsShortcutsCollapsed((prev) => !prev)}
            />

            {!isShortcutsCollapsed && (
              <div className="space-y-px pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsHomeView(true);
                    setIsStarredView(false);
                    setIsMentionsView(false);
                    setIsArchivedView(false);
                    setSelectedDMUser(null);
                    setSelectedSpace(null);
                    setSelectedGroup(null);
                    setActiveSecondaryPanel("home");
                    setIsMobileSidebarOpen(false);
                    navigate(`/app/workspace/${workspaceId}`);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors ${
                    activeSecondaryPanel === "home" &&
                    !isStarredView &&
                    !isMentionsView &&
                    !isArchivedView
                      ? "bg-[#395B64] text-white font-semibold"
                      : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                  }`}
                >
                  <i className="fa-solid fa-house w-4 text-center text-[11px]" />
                  <span className="flex-1 text-left">Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowActivityPanel(true);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm text-[#455252] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors"
                >
                  <i
                    className={`fa-solid ${isMutedGlobal ? "fa-bell-slash" : "fa-bell"} w-4 text-center text-[11px]`}
                  />
                  <span className="flex-1 text-left">Notifications</span>
                  {isMutedGlobal && (
                    <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 px-1">
                      Muted
                    </span>
                  )}
                  {unreadNotificationsCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#395B64] px-1 text-[10px] font-bold text-white">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHomeView(false);
                    setIsStarredView(true);
                    setIsPinnedView(false);
                    setIsMentionsView(false);
                    setIsArchivedView(false);
                    setSelectedDMUser(null);
                    setSelectedSpace(null);
                    setSelectedGroup(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors ${
                    isStarredView
                      ? "bg-[#395B64] text-white font-semibold"
                      : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                  }`}
                >
                  <i className="fa-solid fa-star w-4 text-center text-[11px]" />
                  <span className="flex-1 text-left">Starred</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHomeView(false);
                    return;
                    setIsStarredView(false);
                    setIsMentionsView(false);
                    setSelectedDMUser(null);
                    setSelectedSpace(null);
                    setSelectedGroup(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors ${
                    isPinnedView
                      ? "bg-[#395B64] text-white font-semibold"
                      : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                  }`}
                >
                  <style>{`button:has(> #pinned-hidden-mobile) { display: none !important; }`}</style><span id="pinned-hidden-mobile" className="hidden" />

                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHomeView(false);
                    setIsMentionsView(true);
                    setIsStarredView(false);
                    setIsArchivedView(false);
                    setSelectedDMUser(null);
                    setSelectedSpace(null);
                    setSelectedGroup(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors ${
                    isMentionsView
                      ? "bg-[#395B64] text-white font-semibold"
                      : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                  }`}
                >
                  <i className="fa-solid fa-at w-4 text-center text-[11px]" />
                  <span className="flex-1 text-left">Mentions</span>
                  {unreadMentionsCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#395B64] px-1 text-[10px] font-bold text-white">
                      {unreadMentionsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHomeView(false);
                    setIsArchivedView(true);
                    setIsStarredView(false);
                    setIsMentionsView(false);
                    setSelectedDMUser(null);
                    setSelectedSpace(null);
                    setSelectedGroup(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors cursor-pointer ${
                    isArchivedView
                      ? "bg-[#395B64] text-white font-semibold"
                      : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                  }`}
                >
                  <i className="fa-solid fa-box-archive w-4 text-center text-[11px]" />
                  <span className="flex-1 text-left">Archived</span>
                  {totalArchivedCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#395B64]/20 dark:bg-[#395B64]/50 px-1 text-[10px] font-bold text-[#395B64] dark:text-[#A5C9CA]">
                      {totalArchivedCount}
                    </span>
                  )}
                </button>

                {invitations && invitations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvitationsModal(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded px-2 py-[5px] text-sm text-[#395B64] dark:text-[#A5C9CA] bg-[#E7F6F2] dark:bg-[#395B64]/20 hover:bg-[#D8E2E1]/60 dark:hover:bg-[#395B64]/30 transition-colors cursor-pointer mt-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-envelope-open-text w-4 text-center text-[11px]" />
                      <span className="flex-1 text-left font-medium">Invitations</span>
                    </div>
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#395B64] dark:bg-[#A5C9CA] text-[10px] font-bold text-white dark:text-[#1E2525] px-1.5">
                      {invitations.length}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
            {/* Pinned Conversations */}
            {renderPinnedSection()}

            {/* Channels */}
            <div>
              <SidebarSectionHeader
                title="Channels"
                isCollapsed={isChannelsCollapsed}
                onToggle={() => setIsChannelsCollapsed((prev) => !prev)}
                actionButton={
                  permissions.canCreateChannels && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateChannelModal(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64]/20 dark:hover:bg-[#395B64] text-[#395B64] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white text-xs transition"
                      title="Create channel"
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  )
                }
              />
              {!isChannelsCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {activeChannels.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D8E2E1] dark:border-[#395B64] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                      No channels yet
                    </div>
                  ) : (
                    activeChannels.map((chanItem, idx) => {
                      const chanId = (chanItem.id || chanItem._id)?.toString();
                      const chan = { ...chanItem, id: chanId, _id: chanId };
                      const isActive =
                        (currentChannel?.id || currentChannel?._id)?.toString() === chanId &&
                        !selectedDMUser &&
                        !isStarredView &&
                        !isMentionsView &&
                        !isHomeView &&
                        !selectedSpace &&
                        !selectedGroup;
                      const isMenuOpen = activeChannelMenuId === chan.id;
                      const isUnread =
                        (unreadChannelCounts[chan.id.toString()] || 0) > 0;
                      const isPinned = pinnedKeys.has(`channel:${chan.id}`);
                      const openUpward = idx >= 3;
                      return (
                        <div key={chan.id} className="relative group">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectChannel(chan)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectChannel(chan);
                              }
                            }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors cursor-pointer ${
                              isActive
                                ? "bg-[#395B64] text-white font-semibold"
                                : isUnread
                                  ? "text-[#1A2525] dark:text-white font-semibold hover:bg-[#EAEFEF] dark:hover:bg-[#2C3333]"
                                  : "text-[#52656A] dark:text-[#A5C9CA]/90 hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {chan.type === "PRIVATE" ? (
                                <i className={`fa-solid fa-lock text-xs w-3.5 ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`} />
                              ) : (
                                <span className={`text-sm font-bold w-3.5 text-center ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`}>
                                  #
                                </span>
                              )}
                              <span className="min-w-0 flex-1 truncate">
                                {chan.name}
                              </span>
                              {hasDraft("channel", chan.id || chan._id) && (
                                <span
                                  className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold italic flex items-center gap-1 shrink-0"
                                  title="Draft message"
                                >
                                  <i className="fa-solid fa-pen text-[8px]" />
                                  <span>Draft</span>
                                </span>
                              )}
                              {isConversationMuted("channel", chan.id) && (
                                <i
                                  className="fa-solid fa-bell-slash text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 shrink-0"
                                  title="Notifications muted"
                                />
                              )}
                              {isUnread && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                                  title="Unread messages"
                                />
                              )}
                            </div>
                            </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Direct Messages */}
            <div>
              <SidebarSectionHeader
                title="Direct Messages"
                isCollapsed={isDMsCollapsed}
                onToggle={() => {
                  setIsDMsCollapsed((prev) => !prev);
                }}
                actionButton={
                  canManageWorkspace && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteModal(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64]/20 dark:hover:bg-[#395B64] text-[#395B64] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white text-xs transition"
                      title="Invite member"
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  )
                }
              />

              {!isDMsCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {visibleDirectMessageMembers.length > 0 ? (
                    visibleDirectMessageMembers.map((member) => {
                      const isSelected = selectedDMUser?.id === member.id;
                      const isUnread =
                        (unreadDMCounts[member.id?.toString()] || 0) > 0;
                      return (
                        <div key={member.id} className="relative group">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              handleSelectDM(member);
                              setIsMobileSidebarOpen(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectDM(member);
                                setIsMobileSidebarOpen(false);
                              }
                            }}
                            className={`group flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#395B64] text-white font-semibold"
                                : isUnread
                                  ? "text-[#2C3333] dark:text-white font-semibold hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636]"
                                  : "text-[#52656A] dark:text-[#A5C9CA]/90 font-medium hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white"
                            }`}
                          >
                            <span className="relative flex-shrink-0">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#395B64] text-xs font-bold text-white overflow-hidden">
                                {member.avatar || member.avatarUrl ? (
                                  <img
                                    src={member.avatar || member.avatarUrl}
                                    alt={member.username}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  member.username?.charAt(0)?.toUpperCase() || "U"
                                )}
                              </span>
                              <StatusBadge
                                status={getUserPresenceStatus(member.id)}
                                isDnd={isDndActive?.(member)}
                                size="xs"
                                className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#1E2525]"
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {member.username}
                            </span>
                            {hasDraft("dm", member.id || member._id) && (
                              <span
                                className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold italic flex items-center gap-1 shrink-0"
                                title="Draft message"
                              >
                                <i className="fa-solid fa-pen text-[8px]" />
                                <span>Draft</span>
                              </span>
                            )}
                            {isConversationMuted("dm", member.id) && (
                              <i
                                className="fa-solid fa-bell-slash text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 shrink-0"
                                title="Notifications muted"
                              />
                            )}
                            {isUnread && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                                title="Unread messages"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#D8E2E1] dark:border-[#395B64] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                      No members yet
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Spaces */}
            <div>
              <SidebarSectionHeader
                title="Spaces"
                isCollapsed={isSpacesCollapsed}
                onToggle={() => {
                  setIsSpacesCollapsed((prev) => !prev);
                }}
                actionButton={
                  isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateSpaceModal(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64]/20 dark:hover:bg-[#395B64] text-[#395B64] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white text-xs transition"
                      title="Create space"
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  )
                }
              />

              {!isSpacesCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {activeSpaces.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D8E2E1] dark:border-[#395B64] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                      {isSuperAdmin ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span>No Spaces yet</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateSpaceModal(true);
                              setIsMobileSidebarOpen(false);
                            }}
                            className="text-[11px] font-semibold text-[#E7F6F2] hover:text-white underline underline-offset-2"
                          >
                            Create a Space
                          </button>
                        </div>
                      ) : (
                        <span>You haven't been added to any Spaces yet</span>
                      )}
                    </div>
                  ) : (
                    activeSpaces.map((sp) => {
                      const spId = (sp._id || sp.id)?.toString();
                      const isActive =
                        selectedSpace &&
                        (selectedSpace._id || selectedSpace.id)?.toString() ===
                          spId;
                      const isUnread = (unreadSpaceCounts[spId] || 0) > 0;
                      const memberCount = sp.members?.length || 0;

                      return (
                        <div key={spId} className="relative group">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              handleSelectSpace(sp);
                              setIsMobileSidebarOpen(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectSpace(sp);
                                setIsMobileSidebarOpen(false);
                              }
                            }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors cursor-pointer ${
                              isActive
                                ? "bg-[#395B64] text-white font-semibold"
                                : isUnread
                                  ? "text-[#1A2525] dark:text-white font-semibold hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636]"
                                  : "text-[#52656A] dark:text-[#A5C9CA]/90 hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <i className={`fa-solid fa-table-cells-large text-xs w-3.5 text-center flex-shrink-0 ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm leading-tight">
                                  {sp.name}
                                </div>
                                <div className={`text-[11px] font-medium leading-tight ${isActive ? "text-white/85" : "text-[#4A5D61] dark:text-[#A5C9CA]"}`}>
                                  {memberCount}{" "}
                                  {memberCount === 1 ? "member" : "members"}
                                </div>
                              </div>
                              {hasDraft("space", spId) && (
                                <span
                                  className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold italic flex items-center gap-1 shrink-0"
                                  title="Draft message"
                                >
                                  <i className="fa-solid fa-pen text-[8px]" />
                                  <span>Draft</span>
                                </span>
                              )}
                              {isConversationMuted("space", spId) && (
                                <i
                                  className="fa-solid fa-bell-slash text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 shrink-0"
                                  title="Notifications muted"
                                />
                              )}
                              {isUnread && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                                  title="Unread messages"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Groups */}
            <div>
              <SidebarSectionHeader
                title="Groups"
                isCollapsed={isGroupsCollapsed}
                onToggle={() => setIsGroupsCollapsed((prev) => !prev)}
                icon={
                  <i className="fa-solid fa-users text-[11px] text-[#52656A] dark:text-[#A5C9CA]/80 group-hover:text-[#2C3333] dark:group-hover:text-white" />
                }
                count={0}
                actionButton={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateGroupModal(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#52656A] dark:text-[#A5C9CA] hover:text-white text-xs transition cursor-pointer"
                    title="Create group"
                  >
                    <i className="fa-solid fa-plus pointer-events-none" />
                  </button>
                }
              />

              {!isGroupsCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {activeGroups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D8E2E1] dark:border-[#395B64] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                      <div className="flex flex-col items-center gap-1.5">
                        <span>No Groups yet</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateGroupModal(true);
                            setIsMobileSidebarOpen(false);
                          }}
                          className="text-[11px] font-semibold text-[#E7F6F2] hover:text-white underline underline-offset-2"
                        >
                          Create a Group
                        </button>
                      </div>
                    </div>
                  ) : (
                    activeGroups.map((grp) => {
                      const grpId = (grp._id || grp.id)?.toString();
                      const isActive =
                        selectedGroup &&
                        (selectedGroup._id || selectedGroup.id)?.toString() ===
                          grpId;
                      const isMenuOpen = activeGroupMenuId === grpId;
                      const memberCount = grp.members?.length || 0;

                      return (
                        <div key={grpId} className="relative group">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectGroup(grp)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectGroup(grp);
                              }
                            }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors cursor-pointer ${
                              isActive
                                ? "bg-[#395B64] text-white font-semibold"
                                : "text-[#52656A] dark:text-[#A5C9CA]/90 hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <i className="fa-solid fa-user-group text-xs w-3.5 text-center flex-shrink-0 text-[#52656A] dark:text-[#A5C9CA]" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm leading-tight">
                                  {grp.name}
                                </div>
                                <div className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70 font-normal leading-tight">
                                  {memberCount}{" "}
                                  {memberCount === 1 ? "member" : "members"}
                                </div>
                              </div>
                              {hasDraft("group", grpId) && (
                                <span
                                  className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold italic flex items-center gap-1 shrink-0"
                                  title="Draft message"
                                >
                                  <i className="fa-solid fa-pen text-[8px]" />
                                  <span>Draft</span>
                                </span>
                              )}
                            </div>
                            </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* ── Desktop: sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col bg-[#F8FAFB] dark:bg-[#1E2525] text-sm text-[#2C3333] dark:text-[#E7F6F2] border-r border-[#D8E2E1] dark:border-[#1A2121] select-none z-20 transition-colors">
        {/* Workspace Name & Role Header */}
        <div className="relative border-b border-[#D8E2E1] dark:border-[#1A2121] px-3 py-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu((prev) => !prev)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] transition-colors"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#395B64] text-[10px] font-bold tracking-wider text-white flex-shrink-0">
              {getWorkspaceInitials(workspaceData.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[#2C3333] dark:text-white leading-tight">
                {workspaceData.name}
              </div>
              <div className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 leading-tight">
                {getRoleDisplayName(selectedRole)}
              </div>
            </div>
            <i
              className={`fa-solid fa-chevron-down text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 flex-shrink-0 transition-transform ${showWorkspaceMenu ? "rotate-180" : ""}`}
            />
          </button>

          {/* Compose / new chat icon */}
          <button
            type="button"
            onClick={() => {
              setShowNewChatModal(true);
              setNewChatSearch("");
            }}
            className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors"
            title="New message"
          >
            <i className="fa-solid fa-plus text-xs" />
          </button>

          {showWorkspaceMenu && renderWorkspaceMenu()}
        </div>

        <div className="px-3 pb-2 pt-2">
          {/* Shortcuts collapsible header */}
          <SidebarSectionHeader
            title="Shortcuts"
            isCollapsed={isShortcutsCollapsed}
            onToggle={() => setIsShortcutsCollapsed((prev) => !prev)}
          />

          {!isShortcutsCollapsed && (
            <div className="space-y-px pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsHomeView(true);
                  setIsStarredView(false);
                  setIsMentionsView(false);
                  setIsArchivedView(false);
                  setSelectedDMUser(null);
                  setSelectedSpace(null);
                  setSelectedGroup(null);
                  setActiveSecondaryPanel("home");
                  setIsMobileSidebarOpen(false);
                  navigate(`/app/workspace/${workspaceId}`);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors ${
                  activeSecondaryPanel === "home" &&
                  !isStarredView &&
                  !isMentionsView &&
                  !isArchivedView
                    ? "bg-[#395B64] text-white font-semibold"
                    : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                }`}
              >
                <i className="fa-solid fa-house w-4 text-center text-[11px]" />
                <span className="flex-1 text-left">Home</span>
              </button>

              <button
                type="button"
                onClick={() => setShowActivityPanel(true)}
                className="flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm text-[#455252] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2] transition-colors"
              >
                <i
                  className={`fa-solid ${isMutedGlobal ? "fa-bell-slash" : "fa-bell"} w-4 text-center text-[11px]`}
                />
                <span className="flex-1 text-left">Notifications</span>
                {isMutedGlobal && (
                  <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 px-1">Muted</span>
                )}
                {unreadNotificationsCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#395B64] px-1 text-[10px] font-bold text-white">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsHomeView(false);
                  setIsStarredView(true);
                  setIsPinnedView(false);
                  setIsMentionsView(false);
                  setIsArchivedView(false);
                  setSelectedDMUser(null);
                  setSelectedSpace(null);
                  setSelectedGroup(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors ${
                  isStarredView
                    ? "bg-[#395B64] text-white font-semibold"
                    : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                }`}
              >
                <i className="fa-solid fa-star w-4 text-center" />
                <span className="flex-1 text-left">Starred</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsHomeView(false);
                  return;
                  setIsStarredView(false);
                  setIsMentionsView(false);
                  setSelectedDMUser(null);
                  setSelectedSpace(null);
                  setSelectedGroup(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors ${
                  isPinnedView
                    ? "bg-[#395B64] text-white font-semibold"
                    : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                }`}
              >
                <style>{`button:has(> #pinned-hidden-desktop) { display: none !important; }`}</style><span id="pinned-hidden-desktop" className="hidden" />

              </button>

              <button
                type="button"
                onClick={() => {
                  setIsHomeView(false);
                  setIsMentionsView(true);
                  setIsStarredView(false);
                  setIsArchivedView(false);
                  setSelectedDMUser(null);
                  setSelectedSpace(null);
                  setSelectedGroup(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors ${
                  isMentionsView
                    ? "bg-[#395B64] text-white font-semibold"
                    : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                }`}
              >
                <i className="fa-solid fa-at w-4 text-center" />
                <span className="flex-1 text-left">Mentions</span>
                {unreadMentionsCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#395B64] px-1 text-[10px] font-bold text-white">
                    {unreadMentionsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsHomeView(false);
                  setIsArchivedView(true);
                  setIsStarredView(false);
                  setIsMentionsView(false);
                  setSelectedDMUser(null);
                  setSelectedSpace(null);
                  setSelectedGroup(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-sm transition-colors cursor-pointer ${
                  isArchivedView
                    ? "bg-[#395B64] text-white font-semibold"
                    : "text-[#455252] dark:text-[#A5C9CA] hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-[#E7F6F2]"
                }`}
              >
                <i className="fa-solid fa-box-archive w-4 text-center" />
                <span className="flex-1 text-left">Archived</span>
                {totalArchivedCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#395B64]/20 dark:bg-[#395B64]/50 px-1 text-[10px] font-bold text-[#395B64] dark:text-[#A5C9CA]">
                    {totalArchivedCount}
                  </span>
                )}
              </button>

              {invitations && invitations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInvitationsModal(true)}
                  className="flex w-full items-center justify-between rounded px-2 py-[5px] text-sm text-[#395B64] dark:text-[#A5C9CA] bg-[#E7F6F2] dark:bg-[#395B64]/20 hover:bg-[#D8E2E1]/60 dark:hover:bg-[#395B64]/30 transition-colors cursor-pointer mt-0.5"
                >
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-envelope-open-text w-4 text-center text-xs" />
                    <span className="flex-1 text-left font-medium">Invitations</span>
                  </div>
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#395B64] dark:bg-[#A5C9CA] text-[10px] font-bold text-white dark:text-[#1E2525] px-1.5">
                    {invitations.length}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 bg-[#F8FAFB] dark:bg-transparent transition-colors">
          {/* Pinned Conversations */}
          {renderPinnedSection()}

          <div>
            <SidebarSectionHeader
              title="Channels"
              isCollapsed={isChannelsCollapsed}
              onToggle={() => {
                setIsChannelsCollapsed((prev) => !prev);
                setActiveSecondaryPanel("channels");
              }}
              actionButton={
                permissions.canCreateChannels && (
                  <button
                    type="button"
                    onClick={() => setShowCreateChannelModal(true)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64]/20 dark:hover:bg-[#395B64] text-[#395B64] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white text-xs transition"
                    title="Create channel"
                  >
                    <i className="fa-solid fa-plus" />
                  </button>
                )
              }
            />

            {!isChannelsCollapsed && (
              <div className="space-y-0.5 pt-1">
                {activeChannels.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D8E2E1] dark:border-[#395B64] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                    No channels yet
                  </div>
                ) : (
                  activeChannels.map((chanItem, idx) => {
                    const chanId = (chanItem.id || chanItem._id)?.toString();
                    const chan = { ...chanItem, id: chanId, _id: chanId };
                    const isActive =
                      activeSecondaryPanel !== "home" &&
                      (currentChannel?.id || currentChannel?._id)?.toString() === chanId &&
                      !selectedDMUser &&
                      !isStarredView &&
                      !isMentionsView &&
                      !isHomeView &&
                      !selectedSpace &&
                      !selectedGroup;
                    const isMenuOpen = activeChannelMenuId === chan.id;
                    const isUnread =
                      (unreadChannelCounts[chan.id.toString()] || 0) > 0;
                    const isPinned = pinnedKeys.has(`channel:${chan.id}`);
                    const openUpward = idx >= 3;
                    return (
                      <div key={chan.id} className="relative group">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectChannel(chan)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleSelectChannel(chan);
                            }
                          }}
                          className={`group flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors ${
                            isActive
                              ? "bg-[#395B64] text-white font-semibold"
                              : isUnread
                                ? "text-[#2C3333] dark:text-white font-semibold hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636]"
                                : "text-[#52656A] dark:text-[#A5C9CA]/90 font-medium hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {chan.type === "PRIVATE" ? (
                              <i className={`fa-solid fa-lock text-xs w-3.5 ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`} />
                            ) : (
                              <span className={`text-sm font-bold w-3.5 text-center ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`}>
                                #
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate">
                              {chan.name}
                            </span>
                            {hasDraft("channel", chan.id || chan._id) && (
                              <span
                                className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold italic flex items-center gap-1 shrink-0"
                                title="Draft message"
                              >
                                <i className="fa-solid fa-pen text-[8px]" />
                                <span>Draft</span>
                              </span>
                            )}
                            {isConversationMuted("channel", chan.id) && (
                              <i
                                className="fa-solid fa-bell-slash text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 shrink-0"
                                title="Notifications muted"
                              />
                            )}
                            {isUnread && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                                title="Unread messages"
                              />
                            )}
                          </div>
                          </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div>
            <SidebarSectionHeader
              title="Direct Messages"
              isCollapsed={isDMsCollapsed}
              onToggle={() => {
                setIsDMsCollapsed((prev) => !prev);
                setActiveSecondaryPanel("dms");
              }}
              actionButton={
                canManageWorkspace && (
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64]/20 dark:hover:bg-[#395B64] text-[#395B64] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white text-xs transition"
                    title="Invite member"
                  >
                    <i className="fa-solid fa-plus" />
                  </button>
                )
              }
            />

            {!isDMsCollapsed && (
              <div className="space-y-0.5 pt-1">
                {visibleDirectMessageMembers.length > 0 ? (
                  visibleDirectMessageMembers.map((member, idx) => {
                    const isSelected = activeSecondaryPanel !== "home" && selectedDMUser?.id === member.id;
                    const isMenuOpen = activeDMMenuId === member.id;
                    const isUnread =
                      (unreadDMCounts[member.id?.toString()] || 0) > 0;
                    const isPinned = pinnedKeys.has(`dm:${member.id}`);
                    const openUpward = idx >= 2;
                    return (
                      <div key={member.id} className="relative group">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectDM(member)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectDM(member);
                            }
                          }}
                          className={`group flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#395B64] text-white font-semibold"
                              : isUnread
                                ? "text-[#2C3333] dark:text-white font-semibold hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636]"
                                : "text-[#52656A] dark:text-[#A5C9CA]/90 font-medium hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white"
                          }`}
                        >
                          <span className="relative flex-shrink-0">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#395B64] text-xs font-bold text-white overflow-hidden">
                              {member.avatar || member.avatarUrl ? (
                                <img
                                  src={member.avatar || member.avatarUrl}
                                  alt={member.username}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                member.username?.charAt(0)?.toUpperCase() || "U"
                              )}
                            </span>
                            <StatusBadge
                              status={getUserPresenceStatus(member.id)}
                        isDnd={isDndActive?.(member)}
                              size="xs"
                              className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#1E2525]"
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {member.username}
                          </span>
                          {hasDraft("dm", member.id || member._id) && (
                            <span
                              className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold italic flex items-center gap-1 shrink-0"
                              title="Draft message"
                            >
                              <i className="fa-solid fa-pen text-[8px]" />
                              <span>Draft</span>
                            </span>
                          )}
                          {isConversationMuted("dm", member.id) && (
                            <i
                              className="fa-solid fa-bell-slash text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 shrink-0"
                              title="Notifications muted"
                            />
                          )}
                          {isUnread && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                              title="Unread messages"
                            />
                          )}
                          </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-[#D8E2E1] dark:border-[#395B64] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                    No members yet
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spaces */}
          <div>
            <SidebarSectionHeader
              title="Spaces"
              isCollapsed={isSpacesCollapsed}
              onToggle={() => {
                setIsSpacesCollapsed((prev) => !prev);
                setActiveSecondaryPanel("spaces");
              }}
              actionButton={
                isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowCreateSpaceModal(true)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64]/20 dark:hover:bg-[#395B64] text-[#395B64] dark:text-[#A5C9CA] hover:text-[#2C3333] dark:hover:text-white text-xs transition"
                    title="Create space"
                  >
                    <i className="fa-solid fa-plus" />
                  </button>
                )
              }
            />

            {!isSpacesCollapsed && (
              <div className="space-y-0.5 pt-1">
                {activeSpaces.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D8E2E1] dark:border-[#395B64] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                    {isSuperAdmin ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <span>No Spaces yet</span>
                        <button
                          type="button"
                          onClick={() => setShowCreateSpaceModal(true)}
                          className="text-[11px] font-semibold text-[#E7F6F2] hover:text-white underline underline-offset-2"
                        >
                          Create a Space
                        </button>
                      </div>
                    ) : (
                      <span>You haven't been added to any Spaces yet</span>
                    )}
                  </div>
                ) : (
                  activeSpaces.map((sp) => {
                    const spId = (sp._id || sp.id)?.toString();
                    const isActive =
                      activeSecondaryPanel !== "home" &&
                      selectedSpace &&
                      (selectedSpace._id || selectedSpace.id)?.toString() ===
                        spId;
                    const isMenuOpen =
                      activeSpaceForAction?.type === "menu" &&
                      activeSpaceForAction?.id === spId;
                    const isUnread = (unreadSpaceCounts[spId] || 0) > 0;
                    const memberCount = sp.members?.length || 0;

                    const isPinned = pinnedKeys.has(`space:${spId}`);

                    return (
                      <div key={spId} className="relative group">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectSpace(sp)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectSpace(sp);
                            }
                          }}
                          className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors cursor-pointer ${
                            isActive
                              ? "bg-[#395B64] text-white font-semibold"
                              : isUnread
                                ? "text-[#1A2525] dark:text-white font-semibold hover:bg-[#EAEFEF] dark:hover:bg-[#2C3333]"
                                : "text-[#52656A] dark:text-[#A5C9CA]/90 hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <i className={`fa-solid fa-table-cells-large text-xs w-3.5 text-center flex-shrink-0 ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm leading-tight">
                                {sp.name}
                              </div>
                              <div className={`text-[11px] font-medium leading-tight ${isActive ? "text-white/85" : "text-[#4A5D61] dark:text-[#A5C9CA]"}`}>
                                {memberCount}{" "}
                                {memberCount === 1 ? "member" : "members"}
                              </div>
                            </div>
                            {hasDraft("space", spId) && (
                              <span
                                className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold italic flex items-center gap-1 shrink-0"
                                title="Draft message"
                              >
                                <i className="fa-solid fa-pen text-[8px]" />
                                <span>Draft</span>
                              </span>
                            )}
                            {isConversationMuted("space", spId) && (
                              <i
                                className="fa-solid fa-bell-slash text-[10px] text-[#52656A] dark:text-[#A5C9CA]/60 shrink-0"
                                title="Notifications muted"
                              />
                            )}
                            {isUnread && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                                title="Unread messages"
                              />
                            )}
                          </div>

                          </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Groups */}
          <div>
            <SidebarSectionHeader
              title="Groups"
              isCollapsed={isGroupsCollapsed}
              onToggle={() => {
                setIsGroupsCollapsed((prev) => !prev);
                setActiveSecondaryPanel("groups");
              }}
              icon={
                <i className="fa-solid fa-users text-[11px] text-[#52656A] dark:text-[#A5C9CA]/80 group-hover:text-[#2C3333] dark:group-hover:text-white" />
              }
              count={0}
              actionButton={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateGroupModal(true);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#52656A] dark:text-[#A5C9CA] hover:text-white text-xs transition cursor-pointer"
                  title="Create group"
                >
                  <i className="fa-solid fa-plus pointer-events-none" />
                </button>
              }
            />

            {!isGroupsCollapsed && (
              <div className="space-y-0.5 pt-1">
                {activeGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D8E2E1] dark:border-[#395B64] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                    <div className="flex flex-col items-center gap-1.5">
                      <span>No Groups yet</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateGroupModal(true);
                          setIsMobileSidebarOpen(false);
                        }}
                        className="text-[11px] font-semibold text-[#E7F6F2] hover:text-white underline underline-offset-2"
                      >
                        Create a Group
                      </button>
                    </div>
                  </div>
                ) : (
                  activeGroups.map((grp) => {
                    const grpId = (grp._id || grp.id)?.toString();
                    const isActive =
                      activeSecondaryPanel !== "home" &&
                      selectedGroup &&
                      (selectedGroup._id || selectedGroup.id)?.toString() ===
                        grpId;
                    const isMenuOpen = activeGroupMenuId === grpId;
                    const memberCount = grp.members?.length || 0;

                    return (
                      <div key={grpId} className="relative group">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectGroup(grp)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectGroup(grp);
                            }
                          }}
                          className={`flex w-full items-center gap-2 rounded px-2 py-[5px] text-left text-sm transition-colors cursor-pointer ${
                            isActive
                              ? "bg-[#395B64] text-white font-semibold"
                              : "text-[#52656A] dark:text-[#A5C9CA]/90 hover:bg-[#E5EDEC] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <i className={`fa-solid fa-user-group text-xs w-3.5 text-center flex-shrink-0 ${isActive ? "text-white" : "text-[#52656A] dark:text-[#A5C9CA]"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm leading-tight">
                                {grp.name}
                              </div>
                              <div className={`text-[11px] font-medium leading-tight ${isActive ? "text-white/85" : "text-[#4A5D61] dark:text-[#A5C9CA]"}`}>
                                {memberCount}{" "}
                                {memberCount === 1 ? "member" : "members"}
                              </div>
                            </div>
                            {hasDraft("group", grpId) && (
                              <span
                                className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-semibold italic flex items-center gap-1 shrink-0"
                                title="Draft message"
                              >
                                <i className="fa-solid fa-pen text-[8px]" />
                                <span>Draft</span>
                              </span>
                            )}
                          </div>
                          </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── COLUMN 2: Secondary List Panel ───────────────────────── */}
      {renderSecondaryPanel()}

      {/* ── COLUMN 3: Conversation / Main View ─────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#F4F6F6] dark:bg-[#121717] transition-colors">
        {!selectedDMUser &&
          !isStarredView &&
          !isMentionsView &&
          !isArchivedView &&
          !isHomeView &&
          !selectedSpace &&
          !selectedGroup && (
            <header className="flex h-12 items-center justify-between border-b border-[#D8E2E1] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] px-3 sm:px-4 select-none transition-colors gap-2 flex-shrink-0">
              <div className="flex min-w-0 items-center gap-2">
                {/* Hamburger — mobile only */}
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition-colors md:hidden"
                  aria-label="Open sidebar"
                >
                  <i className="fa-solid fa-bars text-sm" />
                </button>

                <div className="flex items-center gap-1.5 min-w-0">
                  {currentChannel?.type === "PRIVATE" ? (
                    <i className="fa-solid fa-lock text-xs text-[#395B64] dark:text-[#A5C9CA] flex-shrink-0" />
                  ) : (
                    <span className="text-base font-bold text-[#395B64] dark:text-[#A5C9CA] flex-shrink-0">
                      #
                    </span>
                  )}
                  <h1 className="truncate text-sm font-semibold text-[#2C3333] dark:text-white">
                    {currentChannel?.name || "general"}
                  </h1>
                </div>

                {currentChannel &&
                  (selectedRole === "OWNER" || selectedRole === "ADMIN") && (
                    <button
                      type="button"
                      onClick={() => setEditingChannel(currentChannel)}
                      className="flex-shrink-0 text-[#52656A] dark:text-[#A5C9CA] hover:text-[#395B64] dark:hover:text-white p-1 text-xs transition"
                      title="Edit this channel"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                  )}

                {currentChannel?.isArchived && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#395B64]/15 text-[#395B64] dark:text-[#A5C9CA] border border-[#395B64]/30 shrink-0">
                    <i className="fa-solid fa-box-archive text-[10px]" />
                    <span>Archived</span>
                  </span>
                )}

                {currentChannel?.isArchived && (
                  <button
                    type="button"
                    onClick={() => handleToggleArchiveChannel(currentChannel)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold bg-[#395B64]/20 text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#395B64]/30 border border-[#395B64]/40 transition cursor-pointer shrink-0"
                    title="Unarchive this channel"
                  >
                    <i className="fa-solid fa-box-archive text-xs" />
                    <span>Unarchive</span>
                  </button>
                )}

                {currentChannel?.description && (
                  <span className="hidden sm:block truncate text-xs text-[#52656A] dark:text-[#A5C9CA]/80 max-w-xs lg:max-w-md border-l border-[#A5C9CA]/40 pl-2">
                    {currentChannel.description}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Channel Search Button */}
                <button
                  type="button"
                  onClick={() => setShowChannelSearch((prev) => !prev)}
                  className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    showChannelSearch
                      ? "border-[#395B64] bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]"
                      : "border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#242D2D] text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636]"
                  }`}
                  title="Search in channel"
                >
                  <i className="fa-solid fa-magnifying-glass text-xs" />
                  <span className="hidden sm:inline">Search</span>
                </button>

                {/* Channel Files Gallery Button */}
                <button
                  type="button"
                  onClick={() => setShowChannelFilesGallery((prev) => !prev)}
                  className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    showChannelFilesGallery
                      ? "border-[#395B64] bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]"
                      : "border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#242D2D] text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636]"
                  }`}
                  title="Shared files"
                >
                  <i className="fa-solid fa-folder-open text-xs" />
                  <span className="hidden sm:inline">Files</span>
                  {channelFilesCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#395B64]/20 text-[#395B64] dark:text-[#A5C9CA] px-1 text-[10px] font-bold">
                      {channelFilesCount}
                    </span>
                  )}
                </button>

                {/* Pinned Messages Header Button */}
                <button
                  type="button"
                  onClick={() => setShowChannelPinnedDrawer((prev) => !prev)}
                  className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    showChannelPinnedDrawer
                      ? "border-[#395B64] bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]"
                      : "border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#242D2D] text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636]"
                  }`}
                  title="Pinned messages"
                >
                  <i className="fa-solid fa-thumbtack text-xs" />
                  <span className="hidden sm:inline">Pinned</span>
                  {safeChannelPinned.length > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#395B64]/20 text-[#395B64] dark:text-[#A5C9CA] px-1 text-[10px] font-bold">
                      {safeChannelPinned.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDetailsPane((prev) => !prev)}
                  className={`flex h-7 w-7 items-center justify-center rounded border transition-colors ${
                    showDetailsPane
                      ? "border-[#395B64] bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]"
                      : "border-[#D8E2E1] dark:border-[#395B64]/50 text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636]"
                  }`}
                  title="Channel details"
                >
                  <i className="fa-solid fa-circle-info text-xs" />
                </button>
              </div>
            </header>
          )}

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <InConversationSearch
            isOpen={showChannelSearch}
            onClose={() => setShowChannelSearch(false)}
            messages={channelMessages}
            onJumpToMessage={handleJumpToMessage}
          />
          {isHomeView ? (
            <HomeView onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
          ) : false ? (
            <PinnedMessagesView
              workspaceId={workspaceId}
              onNavigateChannel={(cId) => {
                setIsHomeView(false);
                setIsPinnedView(false);
                setSelectedDMUser(null);
                setSelectedSpace(null);
                navigate(`/app/workspace/${workspaceId}/channel/${cId}`);
              }}
              onNavigateSpace={(sId) => {
                setIsHomeView(false);
                setIsPinnedView(false);
                setSelectedDMUser(null);
                const found = spaces.find((sp) => (sp.id || sp._id)?.toString() === sId?.toString());
                if (found) setSelectedSpace(found);
              }}
              onNavigateGroup={(gId) => {
                setIsHomeView(false);
                setIsPinnedView(false);
                setSelectedDMUser(null);
                setSelectedSpace(null);
                const found = groups.find((gr) => (gr.id || gr._id)?.toString() === gId?.toString());
                if (found) setSelectedGroup(found);
              }}
              onNavigateDM={(targetId, otherUser) => {
                setIsHomeView(false);
                setIsPinnedView(false);
                setSelectedSpace(null);
                if (otherUser && (otherUser.id || otherUser._id)) {
                  setSelectedDMUser({
                    id: otherUser.id || otherUser._id,
                    username: otherUser.username,
                    avatar: otherUser.avatar,
                  });
                }
              }}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            />
          ) : isStarredView ? (
            <StarredMessagesView
              workspaceId={workspaceId}
              onNavigateChannel={(cId) => {
                setIsHomeView(false);
                setIsStarredView(false);
                setSelectedDMUser(null);
                setSelectedSpace(null);
                navigate(`/app/workspace/${workspaceId}/channel/${cId}`);
              }}
              onNavigateSpace={(sId) => {
                setIsHomeView(false);
                setIsStarredView(false);
                setSelectedDMUser(null);
                const found = spaces.find(
                  (s) => (s._id || s.id)?.toString() === sId?.toString(),
                );
                setSelectedSpace(found || { id: sId, name: "Space" });
                navigate(`/app/workspace/${workspaceId}/space/${sId}`);
              }}
              onNavigateDM={(otherUserId, otherUser) => {
                setIsHomeView(false);
                setIsStarredView(false);
                setSelectedSpace(null);
                if (otherUser && (otherUser.id || otherUser._id)) {
                  setSelectedDMUser({
                    id: otherUser.id || otherUser._id,
                    username: otherUser.username,
                    avatar: otherUser.avatar,
                  });
                } else {
                  const found = workspaceData?.members?.find(
                    (m) =>
                      (m.id || m._id)?.toString() === otherUserId?.toString(),
                  );
                  setSelectedDMUser(
                    found || { id: otherUserId, username: "User" },
                  );
                }
              }}
              onForwardMessage={handleOpenForwardModal}
              onNavigateSource={handleNavigateSource}
              onMessagesChange={setChannelMessages}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            />
          ) : isMentionsView ? (
            <MentionsView
              workspaceId={workspaceId}
              onNavigateChannel={(cId) => {
                setIsHomeView(false);
                setIsMentionsView(false);
                setSelectedDMUser(null);
                setSelectedSpace(null);
                navigate(`/app/workspace/${workspaceId}/channel/${cId}`);
              }}
              onNavigateSpace={(sId) => {
                setIsHomeView(false);
                setIsMentionsView(false);
                setSelectedDMUser(null);
                const found = spaces.find(
                  (s) => (s._id || s.id)?.toString() === sId?.toString(),
                );
                setSelectedSpace(found || { id: sId, name: "Space" });
                navigate(`/app/workspace/${workspaceId}/space/${sId}`);
              }}
              onNavigateDM={(otherUserId, otherUser) => {
                const targetId = otherUserId || otherUser?.id || otherUser?._id;
                if (targetId) handleUnhideDM(targetId);
                setIsHomeView(false);
                setIsMentionsView(false);
                setSelectedSpace(null);
                if (otherUser && (otherUser.id || otherUser._id)) {
                  setSelectedDMUser({
                    id: otherUser.id || otherUser._id,
                    username: otherUser.username,
                    avatar: otherUser.avatar,
                  });
                } else {
                  const found = workspaceData?.members?.find(
                    (m) =>
                      (m.id || m._id)?.toString() === otherUserId?.toString(),
                  );
                  setSelectedDMUser(
                    found || { id: otherUserId, username: "User" },
                  );
                }
              }}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            />
          ) : isArchivedView ? (
            <ArchivedChatsView
              channels={channels}
              directMessageMembers={directMessageMembers}
              spaces={spaces}
              groups={groups}
              archivedDMIds={archivedDMIds}
              archivedSpaceIds={archivedSpaceIds}
              archivedGroupIds={archivedGroupIds}
              onToggleArchiveChannel={handleToggleArchiveChannel}
              onToggleArchiveDM={handleToggleArchiveDM}
              onToggleArchiveSpace={handleToggleArchiveSpace}
              onToggleArchiveGroup={handleToggleArchiveGroup}
              canManageChannels={selectedRole === "OWNER" || selectedRole === "ADMIN"}
              currentUserId={user?.id || user?._id}
              currentUser={user}
              isSuperAdmin={isSuperAdmin}
              onForwardMessage={handleOpenForwardModal}
              onNavigateSource={handleNavigateSource}
              onMessagesChange={setChannelMessages}
              onViewProfile={(targetUser) => setViewingProfileUser(targetUser)}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            />
          ) : selectedDMUser ? (
            <DirectMessaging
              key={`dm-${(selectedDMUser?.id || selectedDMUser?._id)?.toString()}`}
              externalSelectedUser={selectedDMUser}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              onForwardMessage={handleOpenForwardModal}
              onNavigateSource={handleNavigateSource}
              onMessagesChange={setChannelMessages}
              isBlocked={blockedUserIds.has(
                (selectedDMUser?.id || selectedDMUser?._id)?.toString(),
              )}
              onToggleBlock={(e) => handleToggleBlockUser(selectedDMUser, e)}
              onViewProfile={(targetUser) => setViewingProfileUser(targetUser)}
            />
          ) : selectedSpace ? (
            <SpaceMessageThread
              key={`space-${(selectedSpace?.id || selectedSpace?._id)?.toString()}`}
              onViewProfile={(targetUser) => setViewingProfileUser(targetUser)}
              space={selectedSpace}
              currentUserId={user?.id || user?._id}
              currentUser={user}
              isSuperAdmin={isSuperAdmin}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              onManageMembers={() => {
                setActiveSpaceForAction(selectedSpace);
                setShowManageSpaceMembersModal(true);
              }}
              onEditSpace={() => {
                setActiveSpaceForAction(selectedSpace);
                setShowEditSpaceModal(true);
              }}
              onDeleteSpace={() => {
                setActiveSpaceForAction(selectedSpace);
                setShowDeleteSpaceModal(true);
              }}
              onForwardMessage={handleOpenForwardModal}
              onNavigateSource={handleNavigateSource}
              onMessagesChange={setChannelMessages}
            />
          ) : selectedGroup ? (
            <GroupMessageThread
              key={`group-${(selectedGroup?.id || selectedGroup?._id)?.toString()}`}
              onViewProfile={(targetUser) => setViewingProfileUser(targetUser)}
              group={selectedGroup}
              currentUserId={user?.id || user?._id}
              currentUser={user}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            />
          ) : (
            <ChannelMessageThread
              key={`channel-${(channelId || (activeChannel || currentChannel)?.id || (activeChannel || currentChannel)?._id)?.toString()}`}
              onViewProfile={(targetUser) => setViewingProfileUser(targetUser)}
              channel={activeChannel || currentChannel}
              currentUserId={user?.id || user?._id}
              onForwardMessage={handleOpenForwardModal}
              onNavigateSource={handleNavigateSource}
              onMessagesChange={setChannelMessages}
            />
          )}

          {/* Mobile backdrop for Details Pane */}
          {showDetailsPane &&
            !selectedDMUser &&
            !isStarredView &&
            !isMentionsView &&
            !isArchivedView &&
            !isHomeView &&
            !selectedSpace &&
            !selectedGroup && (
              <div
                className="absolute inset-0 z-10 bg-black/50 sm:hidden"
                onClick={() => setShowDetailsPane(false)}
              />
            )}

          {showDetailsPane &&
            !selectedDMUser &&
            !isStarredView &&
            !isMentionsView &&
            !isArchivedView &&
            !isHomeView &&
            !selectedSpace &&
            !selectedGroup && (
              <aside className="absolute inset-y-0 right-0 w-[85%] sm:relative sm:w-72 md:w-80 border-l border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] flex flex-col h-full overflow-y-auto z-20 shadow-lg transition-colors sm:inset-auto sm:shadow-none">
                <div className="flex items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] px-5 py-4">
                  <h3 className="text-base font-bold text-[#2C3333] dark:text-white">
                    Channel Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowDetailsPane(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#242D2D] hover:text-[#2C3333] dark:hover:text-white transition"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>

                <div className="p-5 space-y-6 text-sm text-[#2C3333] dark:text-[#E7F6F2]">
                  {/* Channel Name Card */}
                  <div className="rounded-2xl border border-[#A5C9CA]/50 dark:border-[#395B64]/50 bg-[#F8FAFB] dark:bg-[#242D2D] p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#395B64] dark:text-[#A5C9CA]">
                        Channel
                      </div>
                      {(selectedRole === "OWNER" || selectedRole === "ADMIN") &&
                        currentChannel && (
                          <button
                            type="button"
                            onClick={() => setEditingChannel(activeChannel)}
                            className="text-xs font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:underline"
                          >
                            Edit
                          </button>
                        )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-lg font-bold text-[#2C3333] dark:text-white">
                      {currentChannel?.type === "PRIVATE" ? (
                        <i className="fa-solid fa-lock text-sm text-[#395B64] dark:text-[#A5C9CA]" />
                      ) : (
                        <span className="text-[#395B64] dark:text-[#A5C9CA]">
                          #
                        </span>
                      )}
                      <span>{currentChannel?.name || "general"}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                      {currentChannel?.description || "General team discussion"}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA] mb-2.5">
                      About
                    </h4>
                    <div className="space-y-3 rounded-xl border border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#242D2D]/60 p-3 text-xs">
                      <div>
                        <div className="font-semibold text-[#2C3333] dark:text-white">
                          Topic
                        </div>
                        <div className="text-[#52656A] dark:text-[#A5C9CA]/80 mt-0.5">
                          {currentChannel?.description ||
                            "General team discussion"}
                        </div>
                      </div>
                      <div className="h-px bg-[#E0E7E6] dark:bg-[#2C3333]" />
                      <div>
                        <div className="font-semibold text-[#2C3333] dark:text-white">
                          Type
                        </div>
                        <div className="text-[#52656A] dark:text-[#A5C9CA]/80 mt-0.5">
                          {currentChannel?.type || "PUBLIC"}
                        </div>
                      </div>
                      <div className="h-px bg-[#E0E7E6] dark:bg-[#2C3333]" />
                      <div>
                        <div className="font-semibold text-[#2C3333] dark:text-white">
                          Workspace
                        </div>
                        <div className="text-[#52656A] dark:text-[#A5C9CA]/80 mt-0.5">
                          {workspaceData.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]">
                        Members ({activeChannel?.members?.length || 0})
                      </h4>
                    </div>
                  </div>

                  {/* Pinned Messages Section in Channel Details */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA] flex items-center gap-1.5">
                        <i className="fa-solid fa-thumbtack text-[11px]" />
                        <span>Pinned Messages ({safeChannelPinned.length})</span>
                      </h4>
                      {safeChannelPinned.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowChannelPinnedDrawer(true)}
                          className="text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:underline cursor-pointer"
                        >
                          View all
                        </button>
                      )}
                    </div>
                    {safeChannelPinned.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#E0E7E6] dark:border-[#2C3333] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]/70">
                        No pinned messages in this channel
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {safeChannelPinned.slice(0, 3).map((pm) => (
                          <div
                            key={pm.id || pm._id}
                            onClick={() => handleJumpToMessage(pm.id || pm._id)}
                            className="cursor-pointer rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/40 bg-[#F8FAFB] dark:bg-[#242D2D]/60 p-2.5 hover:bg-[#F0F4F4] dark:hover:bg-[#2A3434] transition shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA]">
                              <span>{pm.sender?.username || "User"}</span>
                              <i className="fa-solid fa-arrow-turn-up -rotate-90 text-[10px] opacity-70" />
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-[#2C3333] dark:text-[#E7F6F2]">
                              {pm.content || (pm.attachments?.length ? "[Attachment]" : "Message")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]">
                        Members ({activeChannel?.members?.length || 0})
                      </h4>
                      {permissions.canManageChannelMembers && activeChannel && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#395B64] dark:text-[#A5C9CA]">
                          Manage
                        </span>
                      )}
                    </div>
                    {permissions.canManageChannelMembers && activeChannel && (
                      <div className="mb-3 flex gap-2">
                        <select
                          value={memberToAdd}
                          onChange={(event) =>
                            setMemberToAdd(event.target.value)
                          }
                          disabled={
                            channelMemberActionLoading ||
                            availableChannelMembers.length === 0
                          }
                          className="min-w-0 flex-1 rounded-lg border border-[#A5C9CA] dark:border-[#395B64] bg-white dark:bg-[#242D2D] px-2 py-1.5 text-xs text-[#2C3333] dark:text-[#E7F6F2] disabled:opacity-60"
                        >
                          <option value="">Add workspace member...</option>
                          {availableChannelMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.username}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddChannelMember}
                          disabled={!memberToAdd || channelMemberActionLoading}
                          className="rounded-lg bg-[#395B64] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          title="Add member to channel"
                        >
                          <i className="fa-solid fa-user-plus" />
                        </button>
                      </div>
                    )}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {activeChannel?.members?.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setViewingProfileUser(m)}
                          className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-[#F8FAFB] dark:hover:bg-[#242D2D] cursor-pointer"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#395B64] text-[10px] font-bold text-white">
                              {m.username?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <StatusBadge
                              status={getUserPresenceStatus(m.id)}
                              size="xs"
                              className="absolute bottom-0 right-0 ring-1 ring-white dark:ring-[#242D2D]"
                            />
                          </div>
                          <span className="truncate text-xs font-medium text-[#2C3333] dark:text-[#E7F6F2] flex-1">
                            {m.username}
                          </span>
                          <span className="rounded bg-[#E7F6F2] dark:bg-[#395B64]/40 px-1.5 py-0.5 text-[9px] font-semibold text-[#395B64] dark:text-[#A5C9CA]">
                            {m.role}
                          </span>
                          {permissions.canManageChannelMembers &&
                            m.id !== user?.id && (
                              <button
                                type="button"
                                onClick={() => handleRemoveChannelMember(m)}
                                disabled={channelMemberActionLoading}
                                className="text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50"
                                title={`Remove ${m.username} from channel`}
                              >
                                <i className="fa-solid fa-user-minus" />
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            )}
        </div>
      </main>

      {/* Channel Pinned Messages Drawer */}
      <ConversationPinnedDrawer
        isOpen={showChannelPinnedDrawer}
        onClose={() => setShowChannelPinnedDrawer(false)}
        pinnedMessages={safeChannelPinned}
        onTogglePin={handleToggleChannelMessagePin}
        onJumpToMessage={handleJumpToMessage}
        conversationTitle={currentChannel?.name || "channel"}
        conversationType="channel"
      />

      {/* Channel Shared Files Gallery Drawer */}
      <SharedFilesGallery
        isOpen={showChannelFilesGallery}
        onClose={() => setShowChannelFilesGallery(false)}
        messages={channelMessages}
        conversationTitle={currentChannel?.name || "channel"}
        conversationType="channel"
        onJumpToMessage={handleJumpToMessage}
      />

      {/* Slack-style User Profile Card Modal */}
      {viewingProfileUser && (
        <UserProfileCardModal
          user={viewingProfileUser}
          currentUserId={user?.id || user?._id}
          onClose={() => setViewingProfileUser(null)}
          onNavigateDM={(targetUser) => {
            setViewingProfileUser(null);
            handleSelectDM(targetUser);
          }}
          onOpenEditProfile={() => {
            setViewingProfileUser(null);
            setShowProfileModal(true);
          }}
          getUserPresenceStatus={getUserPresenceStatus}
        />
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspaceModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWorkspaceModal(false)}
          onSuccess={(newWs) => {
            setShowCreateWorkspaceModal(false);
            const targetId = (newWs?.id || newWs?._id)?.toString();
            if (targetId) {
              handleSelectWorkspace(targetId);
            }
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
            handleSelectChannel(newChan);
          }}
        />
      )}

      {/* Edit Channel Modal (OWNER/ADMIN) */}
      {editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSaved={refreshChannelDetails}
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
            setSelectedMemberForRole(null);
            selectWorkspace(workspaceId);
          }}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <ProfileModal onClose={() => setShowEditProfileModal(false)} />
      )}

      {/* Workspace Invitations Modal */}
      {showInvitationsModal && (
        <InvitationsModal
          onClose={() => setShowInvitationsModal(false)}
          onSelectWorkspace={handleSelectWorkspace}
        />
      )}

      {/* Upgrade to Pro Modal */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}

      {/* Global Search Modal */}
      {showGlobalSearch && (
        <GlobalSearchModal
          workspaceId={workspaceId}
          onClose={() => setShowGlobalSearch(false)}
          onJumpToResult={handleJumpToResult}
        />
      )}

      {forwardModalData.isOpen && (
        <ForwardMessageModal
          isOpen={forwardModalData.isOpen}
          onClose={handleCloseForwardModal}
          message={forwardModalData.message}
          sourceContext={forwardModalData.sourceContext}
          channels={channels}
          spaces={spaces}
          members={workspaceMembers}
          onForwardSuccess={handleForwardSuccess}
        />
      )}

      {/* Space Modals */}
      {showCreateSpaceModal && (
        <CreateSpaceModal
          workspaceId={workspaceId}
          workspaceMembers={workspaceMembers}
          spaces={spaces}
          currentUserId={user?._id || user?.id}
          onClose={() => setShowCreateSpaceModal(false)}
          onSpaceCreated={(newSpace) => {
            setSpaces((prev) => [
              newSpace,
              ...prev.filter(
                (s) =>
                  (s._id || s.id)?.toString() !==
                  (newSpace._id || newSpace.id)?.toString(),
              ),
            ]);
            handleSelectSpace(newSpace);
          }}
        />
      )}

      {/* Group Modals */}
      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          workspaceId={workspaceId}
          workspaceMembers={workspaceMembers}
          currentUserId={user?.id || user?._id}
          onClose={() => setShowCreateGroupModal(false)}
          onGroupCreated={(newGroup) => {
            setGroups((prev) => [
              newGroup,
              ...prev.filter(
                (g) =>
                  (g._id || g.id)?.toString() !==
                  (newGroup._id || newGroup.id)?.toString(),
              ),
            ]);
            handleSelectGroup(newGroup);
          }}
        />
      )}

      {showEditSpaceModal && activeSpaceForAction && (
        <EditSpaceModal
          space={activeSpaceForAction}
          onClose={() => {
            setShowEditSpaceModal(false);
            setActiveSpaceForAction(null);
          }}
          onSpaceUpdated={(updatedSpace) => {
            setSpaces((prev) =>
              prev.map((s) =>
                (s._id || s.id)?.toString() ===
                (updatedSpace._id || updatedSpace.id)?.toString()
                  ? updatedSpace
                  : s,
              ),
            );
            if (
              selectedSpace &&
              (selectedSpace._id || selectedSpace.id)?.toString() ===
                (updatedSpace._id || updatedSpace.id)?.toString()
            ) {
              setSelectedSpace(updatedSpace);
            }
          }}
        />
      )}

      {showManageSpaceMembersModal && activeSpaceForAction && (
        <SpaceMembersModal
          space={activeSpaceForAction}
          workspaceMembers={workspaceMembers}
          currentUserId={user?.id || user?._id}
          isSuperAdmin={isSuperAdmin}
          onClose={() => {
            setShowManageSpaceMembersModal(false);
            setActiveSpaceForAction(null);
          }}
          onMembersUpdated={(updatedSpace) => {
            setActiveSpaceForAction(updatedSpace);
            setSpaces((prev) =>
              prev.map((s) =>
                (s._id || s.id)?.toString() ===
                (updatedSpace._id || updatedSpace.id)?.toString()
                  ? updatedSpace
                  : s,
              ),
            );
            if (
              selectedSpace &&
              (selectedSpace._id || selectedSpace.id)?.toString() ===
                (updatedSpace._id || updatedSpace.id)?.toString()
            ) {
              setSelectedSpace(updatedSpace);
            }
          }}
        />
      )}

      {showDeleteSpaceModal && activeSpaceForAction && (
        <DeleteSpaceModal
          space={activeSpaceForAction}
          onClose={() => {
            setShowDeleteSpaceModal(false);
            setActiveSpaceForAction(null);
          }}
          onSpaceDeleted={(deletedSpaceId) => {
            const delId = deletedSpaceId.toString();
            setSpaces((prev) =>
              prev.filter((s) => (s._id || s.id)?.toString() !== delId),
            );
            if (
              selectedSpace &&
              (selectedSpace._id || selectedSpace.id)?.toString() === delId
            ) {
              setSelectedSpace(null);
              setIsHomeView(true);
              navigate(`/app/workspace/${workspaceId}`, { replace: true });
            }
          }}
        />
      )}

      {/* Workspace Members Panel (Slide-Over) */}
      {showMembersPanel && (
        <div className="fixed inset-0 z-50 bg-[#2C3333]/60 backdrop-blur-xs flex justify-end">
          <div className="flex h-full w-full max-w-md flex-col bg-white dark:bg-[#1A2121] dark:border-l dark:border-[#2C3333] shadow-2xl animate-[fadeIn_0.15s_ease-out] transition-colors">
            <div className="flex items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] px-4 sm:px-6 py-4 bg-[#F8FAFB] dark:bg-[#1E2525]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#395B64] dark:text-[#A5C9CA]">
                  Workspace
                </p>
                <h3 className="text-lg font-bold text-[#2C3333] dark:text-white">
                  {canManageWorkspace ? "Manage Members" : "Workspace Members"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersPanel(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white transition"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Search and Invite Action */}
            <div className="border-b border-[#E0E7E6] dark:border-[#2C3333] p-4 space-y-3">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-[#52656A] dark:text-[#A5C9CA]" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or role..."
                  className="w-full rounded-xl border border-[#A5C9CA] dark:border-[#395B64] bg-[#F8FAFB] dark:bg-[#242D2D] pl-9 pr-3.5 py-2 text-xs text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#7B8B8F] dark:placeholder-[#A5C9CA]/50 focus:border-[#395B64] focus:bg-white dark:focus:bg-[#242D2D] focus:outline-none transition"
                />
              </div>

              {canManageWorkspace && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMembersPanel(false);
                    setShowInviteModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#395B64] py-2 text-xs font-semibold text-white hover:bg-[#2C3333] transition"
                >
                  <i className="fa-solid fa-user-plus text-[11px]" />
                  Invite new member
                </button>
              )}
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] px-1 mb-2">
                {filteredMembers.length}{" "}
                {filteredMembers.length === 1 ? "member" : "members"}
              </div>

              {filteredMembers.map((member) => {
                const isSelf = member.id === user?.id;
                const isOwnerMember = member.role === "OWNER";
                const isAdminMember = member.role === "ADMIN";
                const canManageThisMember =
                  canManageWorkspace &&
                  !isSelf &&
                  !isOwnerMember &&
                  (isOwner || (isAdmin && !isAdminMember));
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#242D2D] p-3 hover:border-[#A5C9CA] dark:hover:border-[#395B64] transition cursor-pointer"
                    onClick={() => setViewingProfileUser(member)}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#395B64] text-xs font-bold text-white overflow-hidden">
                        {member.avatar || member.avatarUrl ? (
                          <img
                            src={member.avatar || member.avatarUrl}
                            alt={member.username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          member.username?.charAt(0)?.toUpperCase() || "U"
                        )}
                      </div>
                      <StatusBadge
                        status={getUserPresenceStatus(member.id)}
                        isDnd={isDndActive?.(member)}
                        size="sm"
                        className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#242D2D]"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-[#2C3333] dark:text-white">
                          {member.username}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA] font-medium">
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                        {member.email}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          member.role === "OWNER"
                            ? "bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]"
                            : member.role === "ADMIN"
                              ? "bg-[#E7F6F2] dark:bg-[#395B64]/50 text-[#395B64] dark:text-[#A5C9CA]"
                              : "bg-slate-100 dark:bg-[#2C3333] text-slate-700 dark:text-[#A5C9CA]"
                        }`}
                      >
                        {member.role}
                      </span>

                      {/* Owner/Admin controls: Change role or remove member */}
                      {canManageThisMember && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberForRole(member);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition"
                            title="Change role"
                          >
                            <i className="fa-solid fa-pen-to-square" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveMember(member.id, member.username)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Remove member"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <NotificationPanel
        isOpen={showActivityPanel}
        onClose={() => setShowActivityPanel(false)}
        onSelectChannel={(cId) => {
          setIsStarredView(false);
          setSelectedDMUser(null);
          navigate(`/app/workspace/${workspaceId}/channel/${cId}`);
        }}
        onSelectDM={(otherUserId, otherUser) => {
          const targetId = otherUserId || otherUser?.id || otherUser?._id;
          if (targetId) handleUnhideDM(targetId);
          setIsStarredView(false);
          if (otherUser && (otherUser.id || otherUser._id)) {
            setSelectedDMUser({
              id: otherUser.id || otherUser._id,
              username: otherUser.username,
              avatar: otherUser.avatar,
            });
          } else {
            const found = workspaceData?.members?.find(
              (m) => (m.id || m._id)?.toString() === otherUserId?.toString(),
            );
            setSelectedDMUser(found || { id: otherUserId, username: "User" });
          }
        }}
      />
      {/* ── New Chat Modal ─────────────────────────────────────────────── */}
      {showNewChatModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowNewChatModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[#D8E2E1] dark:border-[#395B64] bg-white dark:bg-[#1E2525] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#D8E2E1] dark:border-[#2C3333]">
                <h2 className="text-base font-bold text-[#2C3333] dark:text-white">New chat</h2>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#EAEFEF] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white transition"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 rounded-xl bg-[#F4F7F6] dark:bg-[#2C3333] px-3 py-2 border border-[#D8E2E1] dark:border-[#395B64]/40">
                  <i className="fa-solid fa-magnifying-glass text-[#52656A] dark:text-[#A5C9CA] text-xs" />
                  <input
                    type="text"
                    placeholder="Search people..."
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#52656A]/60 dark:placeholder-[#A5C9CA]/60 outline-none"
                  />
                </div>
              </div>

              {/* Members list */}
              <div className="max-h-72 overflow-y-auto px-2 pb-3 space-y-0.5">
                {directMessageMembers
                  .filter(
                    (m) =>
                      !newChatSearch.trim() ||
                      m.username
                        ?.toLowerCase()
                        .includes(newChatSearch.toLowerCase()),
                  )
                  .map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        handleSelectDM(member);
                        setShowNewChatModal(false);
                        navigate(`/app/workspace/${workspaceId}`);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#EAEFEF] dark:hover:bg-[#2C3333] transition-colors"
                    >
                      <span className="relative flex-shrink-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#395B64] text-sm font-bold text-white overflow-hidden">
                          {member.avatar || member.avatarUrl ? (
                            <img
                              src={member.avatar || member.avatarUrl}
                              alt={member.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            member.username?.charAt(0)?.toUpperCase() || "U"
                          )}
                        </span>
                        <StatusBadge
                          status={getUserPresenceStatus(member.id)}
                        isDnd={isDndActive?.(member)}
                          size="xs"
                          className="absolute bottom-0 right-0 ring-2 ring-[#1E2525]"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2]">
                          {member.username}
                        </div>
                        <div className="truncate text-xs text-[#52656A] dark:text-[#A5C9CA]">
                          {member.email}
                        </div>
                      </div>
                      <StatusBadge
                        status={getUserPresenceStatus(member.id)}
                        isDnd={isDndActive?.(member)}
                        size="xs"
                      />
                    </button>
                  ))}
                {directMessageMembers.filter(
                  (m) =>
                    !newChatSearch.trim() ||
                    m.username
                      ?.toLowerCase()
                      .includes(newChatSearch.toLowerCase()),
                ).length === 0 && (
                  <div className="py-6 text-center text-sm text-[#52656A] dark:text-[#A5C9CA]">
                    No members found
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Direct Conversation Confirmation Modal */}
      {dmToDelete && (
        <div
          className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/65 px-4 py-6 backdrop-blur-xs sm:px-6"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isDeletingConversation
            ) {
              setDmToDelete(null);
            }
          }}
        >
          <div
            className="m-auto w-full max-w-md rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-6 shadow-[0_24px_70px_rgba(44,51,51,0.4)] sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/50 text-base font-bold">
                  <i className="fa-solid fa-trash-can" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">
                    Delete Conversation
                  </p>
                  <h2 className="text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2]">
                    Delete chat with @{dmToDelete.username}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingConversation && setDmToDelete(null)}
                disabled={isDeletingConversation}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition disabled:opacity-50"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-3.5 mb-5 text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
              <p className="font-semibold mb-1">
                Are you sure you want to delete this conversation?
              </p>
              <p>
                All message history between you and{" "}
                <strong>@{dmToDelete.username}</strong> will be deleted.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDmToDelete(null)}
                disabled={isDeletingConversation}
                className="flex-1 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] py-2.5 text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteConversation}
                disabled={isDeletingConversation}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isDeletingConversation ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" />
                    Delete for me
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {leaveTarget && (
        <div
          className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/65 px-4 py-6 backdrop-blur-xs sm:px-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isLeavingTarget) {
              setLeaveTarget(null);
            }
          }}
        >
          <div
            className="m-auto w-full max-w-md rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-6 shadow-[0_24px_70px_rgba(44,51,51,0.4)] sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50 text-base font-bold">
                  <i className="fa-solid fa-arrow-right-from-bracket" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                    Leave {leaveTarget.type === "channel" ? "Channel" : "Space"}
                  </p>
                  <h2 className="text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2]">
                    Leave{" "}
                    {leaveTarget.type === "channel"
                      ? `#${leaveTarget.name}`
                      : `"${leaveTarget.name}"`}
                    ?
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isLeavingTarget && setLeaveTarget(null)}
                disabled={isLeavingTarget}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition disabled:opacity-50"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 mb-5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              <p className="font-semibold mb-1">
                Are you sure you want to leave this{" "}
                {leaveTarget.type === "channel" ? "channel" : "space"}?
              </p>
              <p>
                You will no longer receive new messages or notifications from{" "}
                <strong>
                  {leaveTarget.type === "channel"
                    ? `#${leaveTarget.name}`
                    : `"${leaveTarget.name}"`}
                </strong>
                .
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLeaveTarget(null)}
                disabled={isLeavingTarget}
                className="flex-1 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] py-2.5 text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={isLeavingTarget}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isLeavingTarget ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-arrow-right-from-bracket text-xs" />
                    Leave
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Block User Confirmation Modal */}
      {blockTarget && (
        <div
          className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/65 px-4 py-6 backdrop-blur-xs sm:px-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isBlockingUser) {
              setBlockTarget(null);
            }
          }}
        >
          <div
            className="m-auto w-full max-w-md rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-6 shadow-[0_24px_70px_rgba(44,51,51,0.4)] sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50 text-base font-bold">
                  <i className="fa-solid fa-ban" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                    Block User
                  </p>
                  <h2 className="text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2]">
                    Block @{blockTarget.username}?
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isBlockingUser && setBlockTarget(null)}
                disabled={isBlockingUser}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition disabled:opacity-50"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 mb-5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              <p className="font-semibold mb-1">
                Are you sure you want to block this user?
              </p>
              <p>
                You and <strong>@{blockTarget.username}</strong> will no longer
                be able to send direct messages to each other.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBlockTarget(null)}
                disabled={isBlockingUser}
                className="flex-1 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] py-2.5 text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlockUser}
                disabled={isBlockingUser}
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isBlockingUser ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    Blocking...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-ban text-xs" />
                    Block user
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 grid overflow-y-auto bg-[#2C3333]/65 px-4 py-6 backdrop-blur-xs sm:px-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isRemovingMember) {
              setMemberToRemove(null);
            }
          }}
        >
          <div
            className="m-auto w-full max-w-md rounded-2xl bg-white dark:bg-[#1E2525] dark:border dark:border-[#395B64]/40 p-6 shadow-[0_24px_70px_rgba(44,51,51,0.4)] sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/50 text-base font-bold">
                  <i className="fa-solid fa-user-minus" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">
                    Remove Member
                  </p>
                  <h2 className="text-xl font-bold text-[#2C3333] dark:text-[#E7F6F2]">
                    Remove {memberToRemove.name}?
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isRemovingMember && setMemberToRemove(null)}
                disabled={isRemovingMember}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#52656A] hover:bg-[#E7F6F2] hover:text-[#2C3333] dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-[#E7F6F2] transition disabled:opacity-50"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-3.5 mb-5 text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
              <p className="font-semibold mb-1">
                Are you sure you want to remove this member?
              </p>
              <p>
                <strong>{memberToRemove.name}</strong> will be removed from this{" "}
                {memberToRemove.type === "workspace" ? "workspace" : "channel"}.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
                className="flex-1 rounded-xl border border-[#A5C9CA] dark:border-[#395B64] py-2.5 text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={isRemovingMember}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isRemovingMember ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    Removing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-minus text-xs" />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SlackShell;
