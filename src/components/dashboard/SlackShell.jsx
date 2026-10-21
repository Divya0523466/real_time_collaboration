import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiSun, FiMoon } from "react-icons/fi";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useTheme } from "../../context/ThemeContext";
import { getPermissions, getRoleDisplayName } from "../../utils/permissions";
import { isSuperAdminUser } from "../../utils/adminAuth";
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
import { fetchPinnedMessagesApi, togglePinMessageApi } from "../../services/messageService";
import { onPinnedUpdated, offPinnedUpdated } from "../../services/socket";
import { fetchGroupsApi } from "../../services/groupService";
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
  <div className="flex items-center justify-between px-2 pb-1.5">
    <button
      type="button"
      onClick={onToggle}
      className="group flex items-center gap-2 text-sm font-semibold text-[#A5C9CA]/80 hover:text-white transition cursor-pointer select-none"
    >
      <i
        className={`fa-solid fa-chevron-${isCollapsed ? "right" : "down"} text-[10px] w-3 text-[#A5C9CA]/60 group-hover:text-white transition`}
      />
      {icon}
      <span>{title}</span>
      {count > 0 && (
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold text-white ${countBadgeClass} rounded-full shadow-xs`}
        >
          {count}
        </span>
      )}
    </button>
    {actionButton}
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
    loading,
    error,
  } = useWorkspace();
  const { theme, toggleTheme, isDark } = useTheme();

  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] =
    useState(false);
  const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState(false);
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] =
    useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [deletingChannel, setDeletingChannel] = useState(null);
  const [activeChannelMenuId, setActiveChannelMenuId] = useState(null);
  const [activeDMMenuId, setActiveDMMenuId] = useState(null);
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
  const [isHomeView, setIsHomeView] = useState(!channelId && !spaceId);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState(null);
  const [showChannelPinnedDrawer, setShowChannelPinnedDrawer] = useState(false);
  const [channelPinnedMessages, setChannelPinnedMessages] = useState([]);

  const [isChannelsCollapsed, setIsChannelsCollapsed] = useState(false);
  const [isDMsCollapsed, setIsDMsCollapsed] = useState(false);
  const [isShortcutsCollapsed, setIsShortcutsCollapsed] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedDMUser, setSelectedDMUser] = useState(null);
  const [unreadDMCounts, setUnreadDMCounts] = useState({});
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
    return channels[0];
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
    channelDetails?.id === currentChannel?.id ? channelDetails : currentChannel;
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

  const selectedRole = workspaceData?.userRole || "MEMBER";
  const permissions = useMemo(
    () => getPermissions(selectedRole),
    [selectedRole],
  );
  const isSuperAdmin = useMemo(() => isSuperAdminUser(user), [user]);
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
  }, [workspaceId, user?.id, user?._id]);

  // Synchronize channel pinned messages in real-time
  useEffect(() => {
    const cId = (currentChannel?.id || currentChannel?._id || channelId)?.toString();
    if (!cId) {
      setChannelPinnedMessages([]);
      return;
    }

    fetchPinnedMessagesApi({ channelId: cId })
      .then((data) => setChannelPinnedMessages(data || []))
      .catch(() => setChannelPinnedMessages([]));

    const handlePinnedUpdated = (payload) => {
      if (payload.conversationType !== "channel" || payload.channelId?.toString() !== cId) return;
      if (payload.isPinned) {
        fetchPinnedMessagesApi({ channelId: cId })
          .then((data) => setChannelPinnedMessages(data || []))
          .catch(() => {});
      } else {
        setChannelPinnedMessages((prev) =>
          prev.filter((m) => (m.id || m._id)?.toString() !== payload.messageId?.toString())
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

  const handleSelectGroup = (grp) => {
    setSelectedGroup(grp);
    setSelectedSpace(null);
    setSelectedDMUser(null);
    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
    setShowDetailsPane(false);
    setActiveChannelMenuId(null);
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    setIsMobileSidebarOpen(false);
  };

  const handleSelectSpace = (sp) => {
    setSelectedSpace(sp);
    setSelectedGroup(null);
    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
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

  const handleSelectChannel = (chan) => {
    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
    setSelectedDMUser(null);
    setSelectedSpace(null);
    setSelectedGroup(null);
    setUnreadChannelCounts((counts) => {
      const nextCounts = { ...counts };
      delete nextCounts[chan.id.toString()];
      return nextCounts;
    });
    markChannelAsRead(chan.id).catch(() => {});
    setActiveChannelMenuId(null);
    setActiveDMMenuId(null);
    setActivePinnedMenuKey(null);
    setIsMobileSidebarOpen(false);
    navigate(`/app/workspace/${workspaceId}/channel/${chan.id}`);
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

  const handleSelectDM = (member) => {
    const mId = (member.id || member._id)?.toString();
    if (mId) handleUnhideDM(mId);
    setIsHomeView(false);
    setIsStarredView(false);
    setIsMentionsView(false);
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
      <div className="border-b border-[#2C3333] pb-3 mb-2">
        <SidebarSectionHeader
          title="Pinned"
          isCollapsed={isPinnedCollapsed}
          onToggle={() => setIsPinnedCollapsed((prev) => !prev)}
          icon={
            <i className="fa-solid fa-thumbtack text-[11px] text-amber-400 w-3 text-center shrink-0" />
          }
          count={pinnedItems.length}
          countBadgeClass="bg-amber-500/80"
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
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm transition cursor-pointer ${
                      isActive
                        ? "bg-[#395B64] text-white shadow-xs font-semibold"
                        : isUnread
                          ? "text-white font-semibold hover:bg-[#2C3333]"
                          : "text-[#A5C9CA]/90 font-medium hover:bg-[#2C3333] hover:text-white"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {item.type === "channel" ? (
                        item.isPrivate ? (
                          <i className="fa-solid fa-lock text-xs text-[#A5C9CA] w-3.5 text-center shrink-0" />
                        ) : (
                          <span className="text-sm font-bold text-[#A5C9CA] w-3.5 text-center shrink-0">
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
                            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-[#1E2525] ${
                              item.isOnline ? "bg-emerald-500" : "bg-gray-500"
                            }`}
                          />
                        </span>
                      ) : (
                        <span className="text-amber-400 text-xs w-3.5 text-center flex-shrink-0">
                          ✦
                        </span>
                      )}

                      <span className="min-w-0 flex-1 truncate">
                        {item.name}
                      </span>
                      <i
                        className="fa-solid fa-thumbtack text-[9px] text-amber-400/70 shrink-0"
                        title="Pinned"
                      />
                      {isConversationMuted(item.type, item.id) && (
                        <i
                          className="fa-solid fa-bell-slash text-[9px] text-[#A5C9CA]/60 shrink-0"
                          title="Notifications muted"
                        />
                      )}

                      {isUnread && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs"
                          title="Unread messages"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (item.type === "channel")
                            handleToggleChannelRead(item.data, e);
                          else if (item.type === "dm")
                            handleToggleDMRead(item.data, e);
                          else if (item.type === "space")
                            handleToggleSpaceRead(item.data, e);
                        }}
                        className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title={isUnread ? "Mark as read" : "Mark as unread"}
                      >
                        <i
                          className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[11px]`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePinnedMenuKey(isMenuOpen ? null : item.key);
                        }}
                        className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                          isMenuOpen ? "flex" : "hidden group-hover:flex"
                        }`}
                        title="Conversation options"
                      >
                        <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                      </button>
                    </div>
                  </div>

                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setActivePinnedMenuKey(null)}
                      />
                      <div className="absolute right-2 top-[calc(100%+4px)] z-40 w-48 rounded-xl border border-[#395B64] bg-[#2C3333] p-1.5 shadow-xl text-xs space-y-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (item.type === "channel")
                              handleToggleChannelRead(item.data, e);
                            else if (item.type === "dm")
                              handleToggleDMRead(item.data, e);
                            else if (item.type === "space")
                              handleToggleSpaceRead(item.data, e);
                            setActivePinnedMenuKey(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                        >
                          <i
                            className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[#A5C9CA] w-3.5`}
                          />
                          {isUnread ? "Mark as read" : "Mark as unread"}
                        </button>

                        <button
                          type="button"
                          onClick={(e) =>
                            handleTogglePin(item.type, item.id, e)
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                        >
                          <i className="fa-solid fa-thumbtack text-amber-400 w-3.5" />
                          Unpin conversation
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePinnedMenuKey(null);
                            toggleMuteConversation(item.type, item.id);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                        >
                          <i
                            className={`fa-solid ${
                              isConversationMuted(item.type, item.id)
                                ? "fa-bell text-amber-400"
                                : "fa-bell-slash text-[#A5C9CA]"
                            } w-3.5`}
                          />
                          {isConversationMuted(item.type, item.id)
                            ? "Unmute notifications"
                            : "Mute notifications"}
                        </button>

                        {item.type === "dm" && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleHideDM(item.id, e)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                            >
                              <i className="fa-regular fa-eye-slash text-[#A5C9CA] w-3.5" />
                              Hide conversation
                            </button>
                            <div className="h-px bg-[#395B64]/50 my-1" />
                            <button
                              type="button"
                              onClick={(e) =>
                                handleToggleBlockUser(
                                  item.data || {
                                    id: item.id,
                                    username: item.name,
                                  },
                                  e,
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-amber-400 hover:bg-[#395B64] transition"
                            >
                              <i
                                className={`fa-solid ${blockedUserIds.has(item.id?.toString()) ? "fa-unlock" : "fa-ban"} w-3.5`}
                              />
                              {blockedUserIds.has(item.id?.toString())
                                ? "Unblock user"
                                : "Block user"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleDeleteDMClick(
                                  { id: item.id, username: item.name },
                                  e,
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                            >
                              <i className="fa-solid fa-trash-can w-3.5" />
                              Delete conversation
                            </button>
                          </>
                        )}

                        {item.type === "channel" && (
                          <>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleCopyConversationLink(
                                  "channel",
                                  item.id,
                                  e,
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                            >
                              <i className="fa-solid fa-link text-[#A5C9CA] w-3.5" />
                              Copy link
                            </button>
                            <div className="h-px bg-[#395B64]/50 my-1" />
                            <button
                              type="button"
                              onClick={(e) => handleLeaveChannel(item.data, e)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                            >
                              <i className="fa-solid fa-arrow-right-from-bracket w-3.5" />
                              Leave channel
                            </button>
                          </>
                        )}

                        {item.type === "space" && (
                          <>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleCopyConversationLink("space", item.id, e)
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                            >
                              <i className="fa-solid fa-link text-[#A5C9CA] w-3.5" />
                              Copy link
                            </button>
                            <div className="h-px bg-[#395B64]/50 my-1" />
                            <button
                              type="button"
                              onClick={(e) => handleLeaveSpace(item.data, e)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                            >
                              <i className="fa-solid fa-arrow-right-from-bracket w-3.5" />
                              Leave space
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
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
    };

    socket.on("receive-channel-message", handleChannelMessage);
    return () => socket.off("receive-channel-message", handleChannelMessage);
  }, [channels, currentChannel?.id, user?.id]);

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;
    setSelectedDMUser(null);

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

    fetchSpaces(workspaceId)
      .then((res) => {
        if (!cancelled && res?.spaces) {
          setSpaces(res.spaces);
        }
      })
      .catch((err) => console.warn("Failed to load spaces:", err.message));

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

    fetchGroupsApi(workspaceId)
      .then((res) => {
        if (!cancelled) {
          const list = Array.isArray(res) ? res : res?.groups || [];
          setGroups(list);
        }
      })
      .catch((err) => console.warn("Failed to load groups:", err.message));

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
      if (workspaceId && grpWsId && grpWsId !== workspaceId.toString()) return;

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

  const handleSelectWorkspace = async (id) => {
    if (!id || id === workspaceId) return;
    await selectWorkspace(id);
    navigate(`/app/workspace/${id}`);
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

  if (loading && !workspaceData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFB] dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-[#395B64] dark:border-t-[#A5C9CA]" />
          <span className="text-sm text-[#52656A] dark:text-[#A5C9CA]">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (error || !workspaceData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2C3333] px-6 text-[#E7F6F2]">
        <div className="w-full max-w-md rounded-2xl border border-[#395B64] bg-[#1E2525] p-8 text-center shadow-2xl">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-900/40 text-rose-400 text-2xl">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">
            Workspace unavailable
          </h2>
          <p className="mb-6 text-sm text-[#A5C9CA]">
            {error || "Unable to load this workspace."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/app/dashboard")}
            className="rounded-xl bg-[#395B64] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2C3333] border border-[#A5C9CA]/30 transition"
          >
            Back to workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFB] dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2] transition-colors">
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
        {/* Icon rail — merged into mobile drawer */}
        <div className="flex w-14 flex-col items-center bg-[#2C3333] py-3.5 text-white shadow-[1px_0_0_rgba(0,0,0,0.15)] select-none">
          <button
            type="button"
            onClick={() => {
              navigate("/app/dashboard");
              setIsMobileSidebarOpen(false);
            }}
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#395B64] text-base font-bold text-[#E7F6F2] shadow-md transition hover:bg-[#A5C9CA] hover:text-[#2C3333]"
            title="WorkNest Dashboard"
          >
            <i className="fa-solid fa-layer-group text-lg" />
          </button>
          <div className="w-8 h-px bg-[#395B64]/50 mb-3" />
          <div className="flex w-full flex-1 flex-col items-center gap-2.5 overflow-y-auto px-2">
            {workspaces.map((ws) => {
              const active = ws.id === workspaceId;
              const initials = getWorkspaceInitials(ws.name);
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    handleSelectWorkspace(ws.id);
                    setIsMobileSidebarOpen(false);
                  }}
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
              );
            })}
            <button
              type="button"
              onClick={() => {
                setShowCreateWorkspaceModal(true);
                setIsMobileSidebarOpen(false);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[#52656A] text-lg text-[#A5C9CA] transition hover:border-[#E7F6F2] hover:bg-[#395B64]/40 hover:text-white"
              title="Create new workspace"
            >
              <i className="fa-solid fa-plus text-xs" />
            </button>
          </div>
          <div className="relative mt-auto w-full px-2 pt-2">
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="relative mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#52656A] bg-[#395B64] text-xs font-bold text-white shadow-sm transition hover:border-[#A5C9CA]"
              title="Your Profile"
            >
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
              <StatusBadge
                status={user?.presenceStatus || "active"}
                size="xs"
                className="absolute bottom-0.5 right-0.5 ring-1 ring-[#2C3333]"
              />
            </button>

            {/* Profile Menu Popover (Mobile Icon Rail) */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute bottom-2 left-16 z-50 w-64 rounded-2xl border border-[#395B64] bg-[#1E2525] p-3 text-left text-[#E7F6F2] shadow-2xl max-h-[80vh] overflow-y-auto">
                  <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#2C3333] p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#395B64] text-sm font-bold text-[#E7F6F2]">
                      {user?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">
                        {user?.username || "User"}
                      </div>
                      <div className="truncate text-xs text-[#A5C9CA] mb-1.5">
                        {user?.email || ""}
                      </div>
                      <StatusSelector />
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
                        <span className="truncate font-medium text-[#E7F6F2]">
                          {ws.name}
                        </span>
                        <span className="rounded bg-[#395B64] px-1.5 py-0.5 text-[10px] font-semibold text-[#A5C9CA]">
                          {ws.role}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-[#395B64]/50 my-2" />

                  {isSuperAdminUser(user) && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/admin");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-emerald-400 hover:bg-[#395B64]/40 transition mb-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-shield-halved text-xs text-emerald-400" />
                      <span>Super Admin Dashboard</span>
                    </button>
                  )}

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
        </div>

        {/* Workspace sidebar — inside mobile drawer */}
        <div className="flex w-64 flex-col bg-[#1E2525] text-sm text-[#E7F6F2] border-r border-[#2C3333]/60 select-none">
          {/* Close button */}
          <div className="flex items-center justify-between px-3 pt-3">
            <span className="text-xs font-bold text-[#A5C9CA] uppercase tracking-widest">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition"
              aria-label="Close sidebar"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
          {/* Workspace Name & Role Header */}
          <div className="relative border-b border-[#2C3333] px-3.5 py-3 bg-[#1E2525] mt-1">
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
                  <div className="truncate text-sm font-bold text-white">
                    {workspaceData.name}
                  </div>
                  <div className="text-[10px] font-semibold tracking-wider text-[#A5C9CA]">
                    {getRoleDisplayName(selectedRole)}
                  </div>
                </div>
              </div>
              <i
                className={`fa-solid fa-chevron-down text-xs text-[#A5C9CA] transition-transform ${showWorkspaceMenu ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-[#2C3333] px-3.5 py-2 bg-[#1A2121]/90">
            <span className="text-[11px] font-semibold text-[#A5C9CA] tracking-wide uppercase">
              Status
            </span>
            <StatusSelector align="right" />
          </div>

          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={() => {
                setShowNewChatModal(true);
                setNewChatSearch("");
                setIsMobileSidebarOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-[#395B64]/60 bg-[#2C3333]/50 px-3 py-2 text-sm font-semibold text-[#E7F6F2] hover:bg-[#395B64]/60 transition"
            >
              <i className="fa-regular fa-pen-to-square text-[#A5C9CA] text-xs" />
              <span>New chat</span>
            </button>
          </div>

          <div className="border-b border-[#2C3333] px-3 pb-3 pt-2">
            <SidebarSectionHeader
              title="Shortcuts"
              isCollapsed={isShortcutsCollapsed}
              onToggle={() => setIsShortcutsCollapsed((prev) => !prev)}
            />

            {!isShortcutsCollapsed && (
              <div className="space-y-0.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsHomeView(true);
                    setIsStarredView(false);
                    setIsMentionsView(false);
                    setSelectedDMUser(null);
                    setSelectedSpace(null);
                    setSelectedGroup(null);
                    setIsMobileSidebarOpen(false);
                    navigate(`/app/workspace/${workspaceId}`);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    isHomeView &&
                    !isStarredView &&
                    !isMentionsView &&
                    !selectedDMUser &&
                    !selectedSpace &&
                    !selectedGroup
                      ? "bg-[#395B64] text-white font-semibold shadow-xs"
                      : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
                  }`}
                >
                  <i className="fa-solid fa-house w-4 text-center" />
                  <span className="flex-1 text-left">Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowActivityPanel(true);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition"
                >
                  <i
                    className={`fa-solid ${isMutedGlobal ? "fa-bell-slash text-amber-400" : "fa-bell text-[#A5C9CA]"} w-4 text-center`}
                  />
                  <span className="flex-1 text-left">Notifications</span>
                  {isMutedGlobal && (
                    <span className="text-[10px] font-semibold text-amber-400/90 px-1">
                      Muted
                    </span>
                  )}
                  {unreadNotificationsCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#395B64] px-1 text-[10px] font-bold text-[#E7F6F2]">
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
                    setSelectedDMUser(null);
                    setSelectedSpace(null);
                    setSelectedGroup(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    isStarredView
                      ? "bg-[#395B64] text-white font-semibold shadow-xs"
                      : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
                  }`}
                >
                  <i className="fa-solid fa-star w-4 text-center text-emerald-400" />
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
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    isPinnedView
                      ? "bg-[#395B64] text-white font-semibold shadow-xs"
                      : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
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
                    setSelectedDMUser(null);
                    setSelectedSpace(null);
                    setSelectedGroup(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    isMentionsView
                      ? "bg-[#395B64] text-white font-semibold shadow-xs"
                      : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
                  }`}
                >
                  <i className="fa-solid fa-at w-4 text-center text-[#A5C9CA]" />
                  <span className="flex-1 text-left">Mentions</span>
                  {unreadMentionsCount > 0 && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-blue-500 shadow-xs ring-2 ring-blue-500/20"
                      title={`${unreadMentionsCount} unread mentions`}
                    />
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
            {/* Pinned Conversations */}
            {renderPinnedSection()}

            {/* Channels */}
            <div>
              <SidebarSectionHeader
                title="Channels"
                isCollapsed={isChannelsCollapsed}
                onToggle={() => setIsChannelsCollapsed((prev) => !prev)}
                count={totalUnreadChannelsCount}
                countBadgeClass="bg-emerald-600/90"
                actionButton={
                  permissions.canCreateChannels && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateChannelModal(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition"
                      title="Create channel"
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  )
                }
              />
              {!isChannelsCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {channels.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
                      No channels yet
                    </div>
                  ) : (
                    channels.map((chan, idx) => {
                      const isActive =
                        currentChannel?.id === chan.id &&
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
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-medium transition cursor-pointer ${
                              isActive
                                ? "bg-[#395B64] text-white shadow-xs font-semibold"
                                : isUnread
                                  ? "text-white font-semibold hover:bg-[#2C3333]"
                                  : "text-[#A5C9CA]/90 hover:bg-[#2C3333] hover:text-white"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {chan.type === "PRIVATE" ? (
                                <i className="fa-solid fa-lock text-xs text-[#A5C9CA] w-3.5" />
                              ) : (
                                <span className="text-sm font-bold text-[#A5C9CA] w-3.5 text-center">
                                  #
                                </span>
                              )}
                              <span className="min-w-0 flex-1 truncate">
                                {chan.name}
                              </span>
                              {isConversationMuted("channel", chan.id) && (
                                <i
                                  className="fa-solid fa-bell-slash text-[10px] text-[#A5C9CA]/60 shrink-0"
                                  title="Notifications muted"
                                />
                              )}
                              {isUnread && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs"
                                  title="Unread messages"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleToggleChannelRead(chan, e)
                                }
                                className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                  isMenuOpen
                                    ? "flex"
                                    : "hidden group-hover:flex"
                                }`}
                                title={
                                  isUnread ? "Mark as read" : "Mark as unread"
                                }
                              >
                                <i
                                  className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[11px]`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveChannelMenuId(
                                    isMenuOpen ? null : chan.id,
                                  );
                                }}
                                className="h-5 w-5 shrink-0 flex items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition"
                                title="Channel options"
                              >
                                <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                              </button>
                            </div>
                          </div>

                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveChannelMenuId(null)}
                              />
                              <div
                                className={`absolute right-2  ${openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"} z-40 w-48 rounded-xl border border-[#395B64] bg-[#2C3333] p-1.5 shadow-xl text-xs space-y-0.5`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleToggleChannelRead(chan, e)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i
                                    className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[#A5C9CA] w-3.5`}
                                  />
                                  {isUnread ? "Mark as read" : "Mark as unread"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleTogglePin("channel", chan.id, e)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i className="fa-solid fa-thumbtack text-amber-400 w-3.5" />
                                  {isPinned
                                    ? "Unpin conversation"
                                    : "Pin conversation"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveChannelMenuId(null);
                                    toggleMuteConversation("channel", chan.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i
                                    className={`fa-solid ${
                                      isConversationMuted("channel", chan.id)
                                        ? "fa-bell text-amber-400"
                                        : "fa-bell-slash text-[#A5C9CA]"
                                    } w-3.5`}
                                  />
                                  {isConversationMuted("channel", chan.id)
                                    ? "Unmute notifications"
                                    : "Mute notifications"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopyConversationLink(
                                      "channel",
                                      chan.id,
                                      e,
                                    )
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i className="fa-solid fa-link text-[#A5C9CA] w-3.5" />
                                  Copy link
                                </button>
                                {(selectedRole === "OWNER" ||
                                  selectedRole === "ADMIN") && (
                                  <>
                                    <div className="h-px bg-[#395B64]/50 my-1" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingChannel(chan);
                                        setActiveChannelMenuId(null);
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
                                          setDeletingChannel(chan);
                                          setActiveChannelMenuId(null);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                                      >
                                        <i className="fa-solid fa-trash-can w-3.5" />
                                        Delete channel
                                      </button>
                                    )}
                                  </>
                                )}
                                {channels.length > 1 &&
                                  selectedRole === "MEMBER" && (
                                    <>
                                      <div className="h-px bg-[#395B64]/50 my-1" />
                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          handleLeaveChannel(chan, e)
                                        }
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                                      >
                                        <i className="fa-solid fa-arrow-right-from-bracket w-3.5" />
                                        Leave channel
                                      </button>
                                    </>
                                  )}
                              </div>
                            </>
                          )}
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
                onToggle={() => setIsDMsCollapsed((prev) => !prev)}
                count={totalUnreadDMsCount}
                countBadgeClass="bg-emerald-600/90"
              />
              {!isDMsCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {visibleDirectMessageMembers.length > 0 ? (
                    visibleDirectMessageMembers.map((member, idx) => {
                      const openUpward = idx >= 3;
                      const isSelected = selectedDMUser?.id === member.id;
                      const isMenuOpen = activeDMMenuId === member.id;
                      const isUnread =
                        (unreadDMCounts[member.id?.toString()] || 0) > 0;
                      const isPinned = pinnedKeys.has(`dm:${member.id}`);
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
                            className={`group flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm transition cursor-pointer ${
                              isSelected
                                ? "bg-[#395B64] text-white font-semibold"
                                : isUnread
                                  ? "text-white font-semibold hover:bg-[#2C3333]"
                                  : "text-[#A5C9CA]/90 font-medium hover:bg-[#2C3333] hover:text-white"
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
                                  member.username?.charAt(0)?.toUpperCase() ||
                                  "U"
                                )}
                              </span>
                              <StatusBadge
                                status={getUserPresenceStatus(member.id)}
                                size="xs"
                                className="absolute bottom-0 right-0 ring-2 ring-[#1E2525]"
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {member.username}
                            </span>
                            {isConversationMuted("dm", member.id) && (
                              <i
                                className="fa-solid fa-bell-slash text-[10px] text-[#A5C9CA]/60 shrink-0"
                                title="Notifications muted"
                              />
                            )}
                            {isUnread && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs"
                                title="Unread messages"
                              />
                            )}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleToggleDMRead(member, e)}
                                className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                  isMenuOpen
                                    ? "flex"
                                    : "hidden group-hover:flex"
                                }`}
                                title={
                                  isUnread ? "Mark as read" : "Mark as unread"
                                }
                              >
                                <i
                                  className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[11px]`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDMMenuId(
                                    isMenuOpen ? null : member.id,
                                  );
                                }}
                                className="h-5 w-5 shrink-0 flex items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition"
                                title="DM options"
                              >
                                <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                              </button>
                            </div>
                          </div>

                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveDMMenuId(null)}
                              />
                              <div className="absolute right-2 top-[calc(100%+4px)] z-40 w-48 rounded-xl border border-[#395B64] bg-[#2C3333] p-1.5 shadow-xl text-xs space-y-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleDMRead(member, e)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i
                                    className={`fa-regular ${(unreadDMCounts[member.id?.toString()] || 0) > 0 ? "fa-envelope-open" : "fa-envelope"} text-[#A5C9CA] w-3.5`}
                                  />
                                  {(unreadDMCounts[member.id?.toString()] ||
                                    0) > 0
                                    ? "Mark as read"
                                    : "Mark as unread"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleTogglePin("dm", member.id, e)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i className="fa-solid fa-thumbtack text-amber-400 w-3.5" />
                                  {isPinned
                                    ? "Unpin conversation"
                                    : "Pin conversation"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleHideDM(member.id, e)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i className="fa-regular fa-eye-slash text-[#A5C9CA] w-3.5" />
                                  Hide conversation
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDMMenuId(null);
                                    toggleMuteConversation("dm", member.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i
                                    className={`fa-solid ${
                                      isConversationMuted("dm", member.id)
                                        ? "fa-bell text-amber-400"
                                        : "fa-bell-slash text-[#A5C9CA]"
                                    } w-3.5`}
                                  />
                                  {isConversationMuted("dm", member.id)
                                    ? "Unmute notifications"
                                    : "Mute notifications"}
                                </button>
                                <div className="h-px bg-[#395B64]/50 my-1" />
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleToggleBlockUser(member, e)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-amber-400 hover:bg-[#395B64] transition"
                                >
                                  <i
                                    className={`fa-solid ${blockedUserIds.has((member.id || member._id)?.toString()) ? "fa-unlock" : "fa-ban"} w-3.5`}
                                  />
                                  {blockedUserIds.has(
                                    (member.id || member._id)?.toString(),
                                  )
                                    ? "Unblock user"
                                    : "Block user"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleDeleteDMClick(member, e)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
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
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
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
                onToggle={() => setIsSpacesCollapsed((prev) => !prev)}
                icon={
                  <i className="fa-solid fa-table-cells-large text-[11px] text-[#A5C9CA]/80 group-hover:text-white" />
                }
                count={totalUnreadSpacesCount}
                countBadgeClass="bg-emerald-600/90"
                actionButton={
                  isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateSpaceModal(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition"
                      title="Create space"
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  )
                }
              />

              {!isSpacesCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {spaces.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
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
                    spaces.map((sp) => {
                      const spId = (sp._id || sp.id)?.toString();
                      const isActive =
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
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-medium transition cursor-pointer ${
                              isActive
                                ? "bg-[#395B64] text-white shadow-xs font-semibold"
                                : isUnread
                                  ? "text-white font-semibold hover:bg-[#2C3333]"
                                  : "text-[#A5C9CA]/90 hover:bg-[#2C3333] hover:text-white"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <i className="fa-solid fa-table-cells-large text-xs w-3.5 text-center flex-shrink-0 text-[#A5C9CA]" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm leading-tight">
                                  {sp.name}
                                </div>
                                <div className="text-[11px] text-[#A5C9CA]/70 font-normal leading-tight">
                                  {memberCount}{" "}
                                  {memberCount === 1 ? "member" : "members"}
                                </div>
                              </div>
                              {isConversationMuted("space", spId) && (
                                <i
                                  className="fa-solid fa-bell-slash text-[10px] text-[#A5C9CA]/60 shrink-0"
                                  title="Notifications muted"
                                />
                              )}
                              {isUnread && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs"
                                  title="Unread messages"
                                />
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleToggleSpaceRead(sp, e)}
                                className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                  isMenuOpen
                                    ? "flex"
                                    : "hidden group-hover:flex"
                                }`}
                                title={
                                  isUnread ? "Mark as read" : "Mark as unread"
                                }
                              >
                                <i
                                  className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[11px]`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSpaceForAction(
                                    isMenuOpen
                                      ? null
                                      : { type: "menu", id: spId, space: sp },
                                  );
                                }}
                                className="h-5 w-5 shrink-0 flex items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition"
                                title="Space options"
                              >
                                <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                              </button>
                            </div>
                          </div>

                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveSpaceForAction(null)}
                              />
                              <div className="absolute right-2 top-[calc(100%+4px)] z-40 w-48 rounded-xl border border-[#395B64] bg-[#2C3333] p-1.5 shadow-xl text-xs space-y-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    handleToggleSpaceRead(sp, e);
                                    setActiveSpaceForAction(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i
                                    className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[#A5C9CA] w-3.5`}
                                  />
                                  {isUnread ? "Mark as read" : "Mark as unread"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleTogglePin("space", spId, e)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i className="fa-solid fa-thumbtack text-amber-400 w-3.5" />
                                  {isPinned
                                    ? "Unpin conversation"
                                    : "Pin conversation"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSpaceForAction(null);
                                    toggleMuteConversation("space", spId);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i
                                    className={`fa-solid ${
                                      isConversationMuted("space", spId)
                                        ? "fa-bell text-amber-400"
                                        : "fa-bell-slash text-[#A5C9CA]"
                                    } w-3.5`}
                                  />
                                  {isConversationMuted("space", spId)
                                    ? "Unmute notifications"
                                    : "Mute notifications"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopyConversationLink("space", spId, e)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i className="fa-solid fa-link text-[#A5C9CA] w-3.5" />
                                  Copy link
                                </button>
                                <div className="h-px bg-[#395B64]/50 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSpaceForAction(sp);
                                    setShowManageSpaceMembersModal(true);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                >
                                  <i className="fa-solid fa-users text-[#A5C9CA] w-3.5" />
                                  {isSuperAdmin
                                    ? "Manage Members"
                                    : "View Members"}
                                </button>
                                {isSuperAdmin ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveSpaceForAction(sp);
                                        setShowEditSpaceModal(true);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                    >
                                      <i className="fa-solid fa-pen text-[#A5C9CA] w-3.5" />
                                      Edit Space
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveSpaceForAction(sp);
                                        setShowDeleteSpaceModal(true);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
                                    >
                                      <i className="fa-solid fa-trash text-rose-400 w-3.5" />
                                      Delete Space
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleLeaveSpace(sp, e)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
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
                  <i className="fa-solid fa-users text-[11px] text-[#A5C9CA]/80 group-hover:text-white" />
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
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition cursor-pointer"
                    title="Create group"
                  >
                    <i className="fa-solid fa-plus pointer-events-none" />
                  </button>
                }
              />

              {!isGroupsCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {groups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
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
                    groups.map((grp) => {
                      const grpId = (grp._id || grp.id)?.toString();
                      const isActive =
                        selectedGroup &&
                        (selectedGroup._id || selectedGroup.id)?.toString() ===
                          grpId;
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
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-medium transition cursor-pointer ${
                              isActive
                                ? "bg-[#395B64] text-white shadow-xs font-semibold"
                                : "text-[#A5C9CA]/90 hover:bg-[#2C3333] hover:text-white"
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <i className="fa-solid fa-user-group text-xs w-3.5 text-center flex-shrink-0 text-[#A5C9CA]" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm leading-tight">
                                  {grp.name}
                                </div>
                                <div className="text-[11px] text-[#A5C9CA]/70 font-normal leading-tight">
                                  {memberCount}{" "}
                                  {memberCount === 1 ? "member" : "members"}
                                </div>
                              </div>
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

      {/* ── Desktop: Icon rail aside (hidden on mobile) ─────────────────────── */}
      <aside className="hidden md:flex w-17 flex-col items-center bg-[#2C3333] py-3.5 text-white shadow-[1px_0_0_rgba(0,0,0,0.15)] z-30 select-none">
        <button
          type="button"
          onClick={() => navigate("/app/dashboard")}
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#395B64] text-base font-bold text-[#E7F6F2] shadow-md transition hover:bg-[#A5C9CA] hover:text-[#2C3333]"
          title="WorkNest Dashboard"
        >
          <i className="fa-solid fa-layer-group text-lg" />
        </button>

        <div className="w-8 h-px bg-[#395B64]/50 mb-3" />
        <div className="flex w-full flex-1 flex-col items-center gap-2.5 overflow-y-auto px-2">
          {workspaces.map((ws) => {
            const active = ws.id === workspaceId;
            const initials = getWorkspaceInitials(ws.name);
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
            );
          })}

          <button
            type="button"
            onClick={() => setShowCreateWorkspaceModal(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-[#52656A] text-lg text-[#A5C9CA] transition hover:border-[#E7F6F2] hover:bg-[#395B64]/40 hover:text-white"
            title="Create new workspace"
          >
            <i className="fa-solid fa-plus text-xs" />
          </button>
        </div>

        {/* user profile at the bottom */}
        <div className="relative mt-auto w-full px-2 pt-2">
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="relative mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#52656A] bg-[#395B64] text-xs font-bold text-white shadow-sm transition hover:border-[#A5C9CA]"
            title="Your Profile"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username || "Profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              user?.username?.charAt(0)?.toUpperCase() || "U"
            )}
            <StatusBadge
              status={user?.presenceStatus || "active"}
              size="xs"
              className="absolute bottom-0.5 right-0.5 ring-1 ring-[#2C3333]"
            />
          </button>

          {/* Profile Menu Popover */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute bottom-2 left-16 z-50 w-64 rounded-2xl border border-[#395B64] bg-[#1E2525] p-3 text-left text-[#E7F6F2] shadow-2xl max-h-[80vh] overflow-y-auto">
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#2C3333] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#395B64] text-sm font-bold text-[#E7F6F2] overflow-hidden flex-shrink-0">
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
                    <div className="truncate text-sm font-bold text-white">
                      {user?.username || "User"}
                    </div>
                    <div className="truncate text-xs text-[#A5C9CA] mb-1.5">
                      {user?.email || ""}
                    </div>
                    <StatusSelector />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowEditProfileModal(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#E7F6F2] hover:bg-[#395B64] transition mb-2 border border-[#395B64]/50 bg-[#2C3333]/60 hover:text-white cursor-pointer"
                >
                  <i className="fa-regular fa-user text-xs text-[#A5C9CA]" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGlobalMute();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition mb-3 border cursor-pointer ${
                    isMutedGlobal
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                      : "bg-[#2C3333]/60 border-[#395B64]/50 text-[#E7F6F2] hover:bg-[#395B64] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <i
                      className={`fa-solid ${isMutedGlobal ? "fa-bell-slash text-amber-400" : "fa-bell text-[#A5C9CA]"} text-xs`}
                    />
                    <span>
                      {isMutedGlobal
                        ? "Notifications Muted"
                        : "Mute Notifications"}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isMutedGlobal ? "bg-amber-500/20 text-amber-300" : "bg-[#395B64] text-[#A5C9CA]"}`}
                  >
                    {isMutedGlobal ? "ON" : "OFF"}
                  </span>
                </button>

                <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#A5C9CA]">
                  Workspace Memberships
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 mb-3 px-1">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs bg-[#2C3333]/50"
                    >
                      <span className="truncate font-medium text-[#E7F6F2]">
                        {ws.name}
                      </span>
                      <span className="rounded bg-[#395B64] px-1.5 py-0.5 text-[10px] font-semibold text-[#A5C9CA]">
                        {ws.role}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-[#395B64]/50 my-2" />

                {isSuperAdminUser(user) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/admin");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-emerald-400 hover:bg-[#395B64]/40 transition mb-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-shield-halved text-xs text-emerald-400" />
                    <span>Super Admin Dashboard</span>
                  </button>
                )}

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
      {/* Workspace sidebar — desktop only, hidden on mobile */}
      <aside className="hidden md:flex w-64 flex-col bg-[#1E2525] text-sm text-[#E7F6F2] border-r border-[#2C3333]/60 select-none z-20">
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
                <div className="truncate text-sm font-bold text-white">
                  {workspaceData.name}
                </div>
                <div className="text-[10px] font-semibold tracking-wider text-[#A5C9CA]">
                  {getRoleDisplayName(selectedRole)}
                </div>
              </div>
            </div>
            <i
              className={`fa-solid fa-chevron-down text-xs text-[#A5C9CA] transition-transform ${showWorkspaceMenu ? "rotate-180" : ""}`}
            />
          </button>

          {showWorkspaceMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowWorkspaceMenu(false)}
              />
              <div className="absolute left-3 right-3 top-[calc(100%+6px)] z-40 rounded-2xl border border-[#395B64] bg-[#2C3333] p-2 shadow-2xl text-xs">
                <div className="px-3 py-2 border-b border-[#395B64]/50">
                  <div className="font-bold text-white text-sm truncate">
                    {workspaceData.name}
                  </div>
                  <div className="text-[11px] text-[#A5C9CA] mt-0.5 flex items-center gap-1.5">
                    <span>Role:</span>
                    <span className="font-semibold text-white">
                      {getRoleDisplayName(selectedRole)}
                    </span>
                  </div>
                </div>

                <div className="py-1 space-y-0.5">
                  {selectedRole === "OWNER" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowInviteModal(true);
                          setShowWorkspaceMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-user-plus text-[#A5C9CA] w-4" />
                        Invite people
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMembersPanel(true);
                          setShowWorkspaceMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-users-gear text-[#A5C9CA] w-4" />
                        Manage members
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateChannelModal(true);
                          setShowWorkspaceMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-plus text-[#A5C9CA] w-4" />
                        Create channel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditWorkspaceModal(true);
                          setShowWorkspaceMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-pen-to-square text-[#A5C9CA] w-4" />
                        Edit workspace
                      </button>
                      <div className="h-px bg-[#395B64]/50 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteWorkspaceModal(true);
                          setShowWorkspaceMenu(false);
                        }}
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
                        onClick={() => {
                          setShowCreateChannelModal(true);
                          setShowWorkspaceMenu(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                      >
                        <i className="fa-solid fa-plus text-[#A5C9CA] w-4" />
                        Create channel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMembersPanel(true);
                          setShowWorkspaceMenu(false);
                        }}
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
                      onClick={() => {
                        setShowMembersPanel(true);
                        setShowWorkspaceMenu(false);
                      }}
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

        <div className="flex items-center justify-between border-b border-[#2C3333] px-3.5 py-2 bg-[#1A2121]/90">
          <span className="text-[11px] font-semibold text-[#A5C9CA] tracking-wide uppercase">
            Status
          </span>
          <StatusSelector align="right" />
        </div>

        <div className="px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={() => {
              setShowNewChatModal(true);
              setNewChatSearch("");
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-[#395B64]/60 bg-[#2C3333]/50 px-3 py-2 text-sm font-semibold text-[#E7F6F2] hover:bg-[#395B64]/60 hover:border-[#A5C9CA]/40 transition"
          >
            <i className="fa-regular fa-pen-to-square text-[#A5C9CA] text-xs" />
            <span>New chat</span>
          </button>
        </div>

        <div className="border-b border-[#2C3333] px-3 pb-3 pt-2">
          {/* Shortcuts collapsible header */}
          <SidebarSectionHeader
            title="Shortcuts"
            isCollapsed={isShortcutsCollapsed}
            onToggle={() => setIsShortcutsCollapsed((prev) => !prev)}
          />

          {!isShortcutsCollapsed && (
            <div className="space-y-0.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsHomeView(true);
                  setIsStarredView(false);
                  setIsMentionsView(false);
                  setSelectedDMUser(null);
                  setSelectedSpace(null);
                  setSelectedGroup(null);
                  setIsMobileSidebarOpen(false);
                  navigate(`/app/workspace/${workspaceId}`);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  isHomeView &&
                  !isStarredView &&
                  !isMentionsView &&
                  !selectedDMUser &&
                  !selectedSpace &&
                  !selectedGroup
                    ? "bg-[#395B64] text-white font-semibold shadow-xs"
                    : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
                }`}
              >
                <i className="fa-solid fa-house w-4 text-center" />
                <span className="flex-1 text-left">Home</span>
              </button>

              <button
                type="button"
                onClick={() => setShowActivityPanel(true)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition"
              >
                <i
                  className={`fa-solid ${isMutedGlobal ? "fa-bell-slash text-amber-400" : "fa-bell text-[#A5C9CA]"} w-4 text-center`}
                />
                <span className="flex-1 text-left">Notifications</span>
                {isMutedGlobal && (
                  <span className="text-[10px] font-semibold text-amber-400/90 px-1">
                    Muted
                  </span>
                )}
                {unreadNotificationsCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#395B64] px-1 text-[10px] font-bold text-[#E7F6F2]">
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
                  setSelectedDMUser(null);
                  setSelectedSpace(null);
                  setSelectedGroup(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  isStarredView
                    ? "bg-[#395B64] text-white font-semibold shadow-xs"
                    : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
                }`}
              >
                <i className="fa-solid fa-star w-4 text-center text-emerald-400" />
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
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  isPinnedView
                    ? "bg-[#395B64] text-white font-semibold shadow-xs"
                    : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
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
                  setSelectedDMUser(null);
                  setSelectedSpace(null);
                  setSelectedGroup(null);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  isMentionsView
                    ? "bg-[#395B64] text-white font-semibold shadow-xs"
                    : "text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white"
                }`}
              >
                <i className="fa-solid fa-at w-4 text-center text-[#A5C9CA]" />
                <span className="flex-1 text-left">Mentions</span>
                {unreadMentionsCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#395B64] px-1 text-[10px] font-bold text-[#E7F6F2]">
                    {unreadMentionsCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {/* Pinned Conversations */}
          {renderPinnedSection()}

          <div>
            <SidebarSectionHeader
              title="Channels"
              isCollapsed={isChannelsCollapsed}
              onToggle={() => setIsChannelsCollapsed((prev) => !prev)}
              count={totalUnreadChannelsCount}
              countBadgeClass="bg-emerald-600/90"
              actionButton={
                permissions.canCreateChannels && (
                  <button
                    type="button"
                    onClick={() => setShowCreateChannelModal(true)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition"
                    title="Create channel"
                  >
                    <i className="fa-solid fa-plus" />
                  </button>
                )
              }
            />

            {!isChannelsCollapsed && (
              <div className="space-y-0.5 pt-1">
                {channels.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
                    No channels yet
                  </div>
                ) : (
                  channels.map((chan, idx) => {
                    const isActive =
                      currentChannel?.id === chan.id &&
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
                          className={`group flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm transition ${
                            isActive
                              ? "bg-[#395B64] text-white shadow-xs font-semibold"
                              : isUnread
                                ? "text-white font-semibold hover:bg-[#2C3333]"
                                : "text-[#A5C9CA]/90 font-medium hover:bg-[#2C3333] hover:text-white"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {chan.type === "PRIVATE" ? (
                              <i className="fa-solid fa-lock text-xs text-[#A5C9CA] w-3.5" />
                            ) : (
                              <span className="text-sm font-bold text-[#A5C9CA] w-3.5 text-center">
                                #
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate">
                              {chan.name}
                            </span>
                            {isConversationMuted("channel", chan.id) && (
                              <i
                                className="fa-solid fa-bell-slash text-[10px] text-[#A5C9CA]/60 shrink-0"
                                title="Notifications muted"
                              />
                            )}
                            {isUnread && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs"
                                title="Unread messages"
                              />
                            )}
                          </div>
                          {/* Channel action buttons: Read/unread toggle button visible on hover / active */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleToggleChannelRead(chan, e)}
                              className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                isMenuOpen ? "flex" : "hidden group-hover:flex"
                              }`}
                              title={
                                isUnread ? "Mark as read" : "Mark as unread"
                              }
                            >
                              <i
                                className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[11px]`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveChannelMenuId(
                                  isMenuOpen ? null : chan.id,
                                );
                              }}
                              className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                isMenuOpen ? "flex" : "hidden group-hover:flex"
                              }`}
                              title="Channel options"
                            >
                              <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                            </button>
                          </div>
                        </div>

                        {/* Channel Context Menu */}
                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveChannelMenuId(null)}
                            />
                            <div
                              className={`absolute right-2 ${openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"} z-40 w-48 rounded-xl border border-[#395B64] bg-[#2C3333] p-1.5 shadow-xl text-xs space-y-0.5`}
                            >
                              {/* Toggle Read / Unread */}
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleToggleChannelRead(chan, e)
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i
                                  className={`fa-regular ${(unreadChannelCounts[chan.id.toString()] || 0) > 0 ? "fa-envelope-open" : "fa-envelope"} text-[#A5C9CA] w-3.5`}
                                />
                                {(unreadChannelCounts[chan.id.toString()] ||
                                  0) > 0
                                  ? "Mark as read"
                                  : "Mark as unread"}
                              </button>

                              {/* Pin / Unpin */}
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleTogglePin("channel", chan.id, e)
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i className="fa-solid fa-thumbtack text-amber-400 w-3.5" />
                                {isPinned
                                  ? "Unpin conversation"
                                  : "Pin conversation"}
                              </button>

                              {/* Mute */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveChannelMenuId(null);
                                  toggleMuteConversation("channel", chan.id);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i
                                  className={`fa-solid ${
                                    isConversationMuted("channel", chan.id)
                                      ? "fa-bell text-amber-400"
                                      : "fa-bell-slash text-[#A5C9CA]"
                                  } w-3.5`}
                                />
                                {isConversationMuted("channel", chan.id)
                                  ? "Unmute notifications"
                                  : "Mute notifications"}
                              </button>

                              {/* Copy link */}
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleCopyConversationLink(
                                    "channel",
                                    chan.id,
                                    e,
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i className="fa-solid fa-link text-[#A5C9CA] w-3.5" />
                                Copy link
                              </button>

                              {(selectedRole === "OWNER" ||
                                selectedRole === "ADMIN") && (
                                <>
                                  <div className="h-px bg-[#395B64]/50 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingChannel(chan);
                                      setActiveChannelMenuId(null);
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
                                        setDeletingChannel(chan);
                                        setActiveChannelMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                                    >
                                      <i className="fa-solid fa-trash-can w-3.5" />
                                      Delete channel
                                    </button>
                                  )}
                                </>
                              )}

                              {channels.length > 1 &&
                                selectedRole === "MEMBER" && (
                                  <>
                                    <div className="h-px bg-[#395B64]/50 my-1" />
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleLeaveChannel(chan, e)
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
                                    >
                                      <i className="fa-solid fa-arrow-right-from-bracket w-3.5" />
                                      Leave channel
                                    </button>
                                  </>
                                )}
                            </div>
                          </>
                        )}
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
              onToggle={() => setIsDMsCollapsed((prev) => !prev)}
              count={totalUnreadDMsCount}
              countBadgeClass="bg-emerald-600/90"
              actionButton={
                selectedRole === "OWNER" && (
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition"
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
                    const isSelected = selectedDMUser?.id === member.id;
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
                          className={`group flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm transition cursor-pointer ${
                            isSelected
                              ? "bg-[#395B64] text-white font-semibold"
                              : isUnread
                                ? "text-white font-semibold hover:bg-[#2C3333]"
                                : "text-[#A5C9CA]/90 font-medium hover:bg-[#2C3333] hover:text-white"
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
                              size="xs"
                              className="absolute bottom-0 right-0 ring-2 ring-[#1E2525]"
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {member.username}
                          </span>
                          {isConversationMuted("dm", member.id) && (
                            <i
                              className="fa-solid fa-bell-slash text-[10px] text-[#A5C9CA]/60 shrink-0"
                              title="Notifications muted"
                            />
                          )}
                          {isUnread && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs"
                              title="Unread messages"
                            />
                          )}
                          {/* DM action buttons: Read/unread toggle button visible ONLY on hover (or when menu is open) */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleToggleDMRead(member, e)}
                              className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                isMenuOpen ? "flex" : "hidden group-hover:flex"
                              }`}
                              title={
                                isUnread ? "Mark as read" : "Mark as unread"
                              }
                            >
                              <i
                                className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[11px]`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDMMenuId(
                                  isMenuOpen ? null : member.id,
                                );
                              }}
                              className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                isMenuOpen ? "flex" : "hidden group-hover:flex"
                              }`}
                              title="DM options"
                            >
                              <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                            </button>
                          </div>
                        </div>

                        {/* DM Context Menu */}
                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveDMMenuId(null)}
                            />
                            <div
                              className={`absolute right-2 ${openUpward ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"} z-40 w-48 rounded-xl border border-[#395B64] bg-[#2C3333] p-1.5 shadow-xl text-xs space-y-0.5`}
                            >
                              {/* Toggle Read / Unread */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleDMRead(member, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i
                                  className={`fa-regular ${(unreadDMCounts[member.id?.toString()] || 0) > 0 ? "fa-envelope-open" : "fa-envelope"} text-[#A5C9CA] w-3.5`}
                                />
                                {(unreadDMCounts[member.id?.toString()] || 0) >
                                0
                                  ? "Mark as read"
                                  : "Mark as unread"}
                              </button>

                              {/* Pin / Unpin */}
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleTogglePin("dm", member.id, e)
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i className="fa-solid fa-thumbtack text-amber-400 w-3.5" />
                                {isPinned
                                  ? "Unpin conversation"
                                  : "Pin conversation"}
                              </button>

                              {/* Hide */}
                              <button
                                type="button"
                                onClick={(e) => handleHideDM(member.id, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i className="fa-regular fa-eye-slash text-[#A5C9CA] w-3.5" />
                                Hide conversation
                              </button>

                              {/* Mute */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDMMenuId(null);
                                  toggleMuteConversation("dm", member.id);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i
                                  className={`fa-solid ${
                                    isConversationMuted("dm", member.id)
                                      ? "fa-bell text-amber-400"
                                      : "fa-bell-slash text-[#A5C9CA]"
                                  } w-3.5`}
                                />
                                {isConversationMuted("dm", member.id)
                                  ? "Unmute notifications"
                                  : "Mute notifications"}
                              </button>

                              <div className="h-px bg-[#395B64]/50 my-1" />

                              {/* Block */}
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleToggleBlockUser(member, e)
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-amber-400 hover:bg-[#395B64] transition"
                              >
                                <i
                                  className={`fa-solid ${blockedUserIds.has((member.id || member._id)?.toString()) ? "fa-unlock" : "fa-ban"} w-3.5`}
                                />
                                {blockedUserIds.has(
                                  (member.id || member._id)?.toString(),
                                )
                                  ? "Unblock user"
                                  : "Block user"}
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteDMClick(member, e)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
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
                ) : (
                  <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
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
              onToggle={() => setIsSpacesCollapsed((prev) => !prev)}
              count={totalUnreadSpacesCount}
              countBadgeClass="bg-emerald-600/90"
              actionButton={
                isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowCreateSpaceModal(true)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition"
                    title="Create space"
                  >
                    <i className="fa-solid fa-plus" />
                  </button>
                )
              }
            />

            {!isSpacesCollapsed && (
              <div className="space-y-0.5 pt-1">
                {spaces.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
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
                  spaces.map((sp) => {
                    const spId = (sp._id || sp.id)?.toString();
                    const isActive =
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
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-medium transition cursor-pointer ${
                            isActive
                              ? "bg-[#395B64] text-white shadow-xs font-semibold"
                              : isUnread
                                ? "text-white font-semibold hover:bg-[#2C3333]"
                                : "text-[#A5C9CA]/90 hover:bg-[#2C3333] hover:text-white"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="text-amber-400 text-xs w-3.5 text-center flex-shrink-0">
                              ✦
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm leading-tight">
                                {sp.name}
                              </div>
                              <div className="text-[11px] text-[#A5C9CA]/70 font-normal leading-tight">
                                {memberCount}{" "}
                                {memberCount === 1 ? "member" : "members"}
                              </div>
                            </div>
                            {isConversationMuted("space", spId) && (
                              <i
                                className="fa-solid fa-bell-slash text-[10px] text-[#A5C9CA]/60 shrink-0"
                                title="Notifications muted"
                              />
                            )}
                            {isUnread && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-xs"
                                title="Unread messages"
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleToggleSpaceRead(sp, e)}
                              className={`h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition ${
                                isMenuOpen ? "flex" : "hidden group-hover:flex"
                              }`}
                              title={
                                isUnread ? "Mark as read" : "Mark as unread"
                              }
                            >
                              <i
                                className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[11px]`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSpaceForAction(
                                  isMenuOpen
                                    ? null
                                    : { type: "menu", id: spId, space: sp },
                                );
                              }}
                              className="h-5 w-5 shrink-0 flex items-center justify-center rounded hover:bg-[#2C3333] text-[#A5C9CA] hover:text-white transition"
                              title="Space options"
                            >
                              <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                            </button>
                          </div>
                        </div>

                        {isMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveSpaceForAction(null)}
                            />
                            <div className="absolute right-2 top-[calc(100%+4px)] z-40 w-48 rounded-xl border border-[#395B64] bg-[#2C3333] p-1.5 shadow-xl text-xs space-y-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  handleToggleSpaceRead(sp, e);
                                  setActiveSpaceForAction(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i
                                  className={`fa-regular ${isUnread ? "fa-envelope-open" : "fa-envelope"} text-[#A5C9CA] w-3.5`}
                                />
                                {isUnread ? "Mark as read" : "Mark as unread"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleTogglePin("space", spId, e)
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i className="fa-solid fa-thumbtack text-amber-400 w-3.5" />
                                {isPinned
                                  ? "Unpin conversation"
                                  : "Pin conversation"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSpaceForAction(null);
                                  toggleMuteConversation("space", spId);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i
                                  className={`fa-solid ${
                                    isConversationMuted("space", spId)
                                      ? "fa-bell text-amber-400"
                                      : "fa-bell-slash text-[#A5C9CA]"
                                  } w-3.5`}
                                />
                                {isConversationMuted("space", spId)
                                  ? "Unmute notifications"
                                  : "Mute notifications"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleCopyConversationLink("space", spId, e)
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i className="fa-solid fa-link text-[#A5C9CA] w-3.5" />
                                Copy link
                              </button>
                              <div className="h-px bg-[#395B64]/50 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSpaceForAction(sp);
                                  setShowManageSpaceMembersModal(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                              >
                                <i className="fa-solid fa-users text-[#A5C9CA] w-3.5" />
                                {isSuperAdmin
                                  ? "Manage Members"
                                  : "View Members"}
                              </button>
                              {isSuperAdmin ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSpaceForAction(sp);
                                      setShowEditSpaceModal(true);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-[#E7F6F2] hover:bg-[#395B64] transition"
                                  >
                                    <i className="fa-solid fa-pen text-[#A5C9CA] w-3.5" />
                                    Edit Space
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSpaceForAction(sp);
                                      setShowDeleteSpaceModal(true);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
                                  >
                                    <i className="fa-solid fa-trash text-rose-400 w-3.5" />
                                    Delete Space
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleLeaveSpace(sp, e)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-rose-400 hover:bg-rose-950/40 transition"
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
                <i className="fa-solid fa-users text-[11px] text-[#A5C9CA]/80 group-hover:text-white" />
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
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#395B64] text-[#A5C9CA] hover:text-white text-xs transition cursor-pointer"
                  title="Create group"
                >
                  <i className="fa-solid fa-plus pointer-events-none" />
                </button>
              }
            />

            {!isGroupsCollapsed && (
              <div className="space-y-0.5 pt-1">
                {groups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#395B64] p-3 text-center text-xs text-[#A5C9CA]">
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
                  groups.map((grp) => {
                    const grpId = (grp._id || grp.id)?.toString();
                    const isActive =
                      selectedGroup &&
                      (selectedGroup._id || selectedGroup.id)?.toString() ===
                        grpId;
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
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-medium transition cursor-pointer ${
                            isActive
                              ? "bg-[#395B64] text-white shadow-xs font-semibold"
                              : "text-[#A5C9CA]/90 hover:bg-[#2C3333] hover:text-white"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <i className="fa-solid fa-user-group text-xs w-3.5 text-center flex-shrink-0 text-[#A5C9CA]" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm leading-tight">
                                {grp.name}
                              </div>
                              <div className="text-[11px] text-[#A5C9CA]/70 font-normal leading-tight">
                                {memberCount}{" "}
                                {memberCount === 1 ? "member" : "members"}
                              </div>
                            </div>
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

      <main className="flex min-w-0 flex-1 flex-col bg-[#F8FAFB] dark:bg-[#121717] transition-colors">
        {!selectedDMUser &&
          !isStarredView &&
          !isMentionsView &&
          !isHomeView &&
          !selectedSpace &&
          !selectedGroup && (
            <header className="flex h-14 items-center justify-between border-b border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] px-3 sm:px-6 shadow-xs select-none transition-colors gap-2">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                {/* Hamburger — mobile only */}
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition md:hidden"
                  aria-label="Open sidebar"
                >
                  <i className="fa-solid fa-bars text-sm" />
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  {currentChannel?.type === "PRIVATE" ? (
                    <i className="fa-solid fa-lock text-sm text-[#395B64] dark:text-[#A5C9CA] flex-shrink-0" />
                  ) : (
                    <span className="text-lg font-bold text-[#395B64] dark:text-[#A5C9CA] flex-shrink-0">
                      #
                    </span>
                  )}
                  <h1 className="truncate text-base font-bold text-[#2C3333] dark:text-white">
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

                {currentChannel?.description && (
                  <span className="hidden sm:block truncate text-xs text-[#52656A] dark:text-[#A5C9CA]/80 max-w-xs lg:max-w-md border-l border-[#A5C9CA]/40 pl-2">
                    {currentChannel.description}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
                <StatusSelector align="right" />
                <button
                  type="button"
                  onClick={() => setShowMembersPanel(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#A5C9CA]/40 dark:border-[#395B64]/50 bg-[#F8FAFB] dark:bg-[#242D2D] px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636] transition"
                  title="View members"
                >
                  <i className="fa-solid fa-users text-xs" />
                  <span>{workspaceMembers.length}</span>
                </button>

                {/* Pinned Messages Header Button */}
                <button
                  type="button"
                  onClick={() => setShowChannelPinnedDrawer((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    showChannelPinnedDrawer
                      ? "border-[#395B64] bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]"
                      : "border-[#A5C9CA]/40 dark:border-[#395B64]/50 bg-[#F8FAFB] dark:bg-[#242D2D] text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636]"
                  }`}
                  title="Pinned messages in this channel"
                >
                  <i className="fa-solid fa-thumbtack text-xs" />
                  <span className="hidden sm:inline">Pinned</span>
                  {channelPinnedMessages.length > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#395B64]/20 text-[#395B64] dark:text-[#A5C9CA] px-1 text-[10px] font-bold">
                      {channelPinnedMessages.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDetailsPane((prev) => !prev)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                    showDetailsPane
                      ? "border-[#395B64] bg-[#E7F6F2] dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]"
                      : "border-[#A5C9CA]/40 dark:border-[#395B64]/50 text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F8FAFB] dark:hover:bg-[#242D2D] hover:text-[#2C3333] dark:hover:text-white"
                  }`}
                  title="Channel details"
                >
                  <i className="fa-solid fa-circle-info text-sm" />
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#A5C9CA]/40 dark:border-[#395B64]/50 bg-[#F8FAFB] dark:bg-[#242D2D] text-[#395B64] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3636] transition shadow-xs"
                  title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <FiSun className="text-sm text-amber-400" />
                  ) : (
                    <FiMoon className="text-sm text-[#395B64]" />
                  )}
                </button>
              </div>
            </header>
          )}

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
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
          ) : selectedDMUser ? (
            <DirectMessaging
              externalSelectedUser={selectedDMUser}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              onForwardMessage={handleOpenForwardModal}
              onNavigateSource={handleNavigateSource}
              isBlocked={blockedUserIds.has(
                (selectedDMUser?.id || selectedDMUser?._id)?.toString(),
              )}
              onToggleBlock={(e) => handleToggleBlockUser(selectedDMUser, e)}
            />
          ) : selectedSpace ? (
            <SpaceMessageThread
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
            />
          ) : selectedGroup ? (
            <GroupMessageThread
              group={selectedGroup}
              currentUserId={user?.id || user?._id}
              currentUser={user}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            />
          ) : (
            <ChannelMessageThread
              channel={activeChannel || currentChannel}
              currentUserId={user?.id || user?._id}
              onForwardMessage={handleOpenForwardModal}
              onNavigateSource={handleNavigateSource}
            />
          )}

          {/* Mobile backdrop for Details Pane */}
          {showDetailsPane &&
            !selectedDMUser &&
            !isStarredView &&
            !isMentionsView &&
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
                        <span>Pinned Messages ({channelPinnedMessages.length})</span>
                      </h4>
                      {channelPinnedMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowChannelPinnedDrawer(true)}
                          className="text-[11px] font-semibold text-[#395B64] dark:text-[#A5C9CA] hover:underline cursor-pointer"
                        >
                          View all
                        </button>
                      )}
                    </div>
                    {channelPinnedMessages.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#E0E7E6] dark:border-[#2C3333] p-3 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]/70">
                        No pinned messages in this channel
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {channelPinnedMessages.slice(0, 3).map((pm) => (
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
                          className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-[#F8FAFB] dark:hover:bg-[#242D2D]"
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
        pinnedMessages={channelPinnedMessages}
        onTogglePin={handleToggleChannelMessagePin}
        onJumpToMessage={handleJumpToMessage}
        conversationTitle={currentChannel?.name || "channel"}
        conversationType="channel"
      />

      {/* Create Workspace Modal */}
      {showCreateWorkspaceModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWorkspaceModal(false)}
          onSuccess={(newWs) => {
            setShowCreateWorkspaceModal(false);
            handleSelectWorkspace(newWs.id);
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

      {/* Forward Message Modal */}
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
                  Manage Members
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

              {selectedRole === "OWNER" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMembersPanel(false);
                    setShowInviteModal(true);
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
              <div className="text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] px-1 mb-2">
                {filteredMembers.length}{" "}
                {filteredMembers.length === 1 ? "member" : "members"}
              </div>

              {filteredMembers.map((member) => {
                const isSelf = member.id === user?.id;
                const isOwner = member.role === "OWNER";
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-[#E0E7E6] dark:border-[#2C3333] bg-white dark:bg-[#242D2D] p-3 hover:border-[#A5C9CA] dark:hover:border-[#395B64] transition shadow-xs"
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
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                            : member.role === "ADMIN"
                              ? "bg-[#E7F6F2] dark:bg-[#395B64]/50 text-[#395B64] dark:text-[#A5C9CA]"
                              : "bg-slate-100 dark:bg-[#2C3333] text-slate-700 dark:text-[#A5C9CA]"
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
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[#395B64] bg-[#1E2525] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#2C3333]">
                <h2 className="text-base font-bold text-white">New chat</h2>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 rounded-xl bg-[#2C3333] px-3 py-2 border border-[#395B64]/40">
                  <i className="fa-solid fa-magnifying-glass text-[#A5C9CA] text-xs" />
                  <input
                    type="text"
                    placeholder="Search people..."
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-[#E7F6F2] placeholder-[#A5C9CA]/60 outline-none"
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
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#2C3333] transition"
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
                          size="xs"
                          className="absolute bottom-0 right-0 ring-2 ring-[#1E2525]"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[#E7F6F2]">
                          {member.username}
                        </div>
                        <div className="truncate text-xs text-[#A5C9CA]">
                          {member.email}
                        </div>
                      </div>
                      <StatusBadge
                        status={getUserPresenceStatus(member.id)}
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
                  <div className="py-6 text-center text-sm text-[#A5C9CA]">
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
  );
};

export default SlackShell;
