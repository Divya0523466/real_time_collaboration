import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiSun, FiMoon } from "react-icons/fi";
import { toast } from "react-toastify";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useTheme } from "../../context/ThemeContext";
import StatusBadge from "../common/StatusBadge";

const ChannelManagementPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme, isDark } = useTheme();

  const {
    user,
    channels,
    workspaceData,
    fetchWorkspaceData,
    getChannel,
    addChannelMember,
    removeChannelMember,
    refreshChannels,
    getUserPresenceStatus = () => "offline",
  } = useWorkspace();

  // Load workspace data if not yet loaded
  useEffect(() => {
    if (workspaceId && (!workspaceData || workspaceData.id !== workspaceId)) {
      fetchWorkspaceData?.(workspaceId).catch(() => {});
    }
  }, [workspaceId, workspaceData, fetchWorkspaceData]);

  const workspaceMembers = workspaceData?.members || [];

  // Channels sorted: Private channels first, then Public channels alphabetically
  const sortedChannels = useMemo(() => {
    return [...(channels || [])].sort((a, b) => {
      if (a.type === "PRIVATE" && b.type !== "PRIVATE") return -1;
      if (a.type !== "PRIVATE" && b.type === "PRIVATE") return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [channels]);

  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL"); // ALL, PRIVATE, PUBLIC
  const [memberFilterTerm, setMemberFilterTerm] = useState("");
  const [channelDetails, setChannelDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [channelMemberCounts, setChannelMemberCounts] = useState({});

  const filterOptions = [
    { id: "ALL", label: "All", icon: "fa-solid fa-layer-group" },
    { id: "PRIVATE", label: "Private", icon: "fa-solid fa-lock" },
    { id: "PUBLIC", label: "Public", icon: "fa-solid fa-hashtag" },
  ];

  // Filter channels based on active filter (All, Private, Public)
  const displayedChannels = useMemo(() => {
    return sortedChannels.filter((c) => {
      if (channelFilter === "PRIVATE") return c.type === "PRIVATE";
      if (channelFilter === "PUBLIC") return c.type !== "PRIVATE";
      return true;
    });
  }, [sortedChannels, channelFilter]);

  // Auto-select first channel or update selection if filtered out
  useEffect(() => {
    if (displayedChannels.length > 0) {
      const exists = displayedChannels.some(
        (c) => (c.id || c._id)?.toString() === selectedChannelId?.toString()
      );
      if (!exists) {
        setSelectedChannelId((displayedChannels[0].id || displayedChannels[0]._id)?.toString());
      }
    } else {
      setSelectedChannelId("");
    }
  }, [displayedChannels]);

  // Load full channel details
  const loadChannelData = async (cId) => {
    if (!cId || !getChannel) return;
    setLoadingDetails(true);
    try {
      const data = await getChannel(cId, workspaceId);
      setChannelDetails(data);
      if (data && Array.isArray(data.members)) {
        setChannelMemberCounts((prev) => ({
          ...prev,
          [cId]: data.members.length,
        }));
      }
    } catch (err) {
      console.error("Failed to load channel details:", err);
      toast.error(err.message || "Failed to load channel details");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedChannelId) {
      loadChannelData(selectedChannelId);
      setMemberToAdd("");
      setMemberFilterTerm("");
    }
  }, [selectedChannelId]);

  // Pre-load channel member counts for all channels in this workspace
  useEffect(() => {
    if (!channels || channels.length === 0 || !getChannel || !workspaceId) return;

    let isMounted = true;
    const channelsToFetch = channels.filter((c) => {
      const cId = (c.id || c._id)?.toString();
      return channelMemberCounts[cId] === undefined && (!Array.isArray(c.members) || c.members.length === 0);
    });

    if (channelsToFetch.length === 0) return;

    Promise.allSettled(
      channelsToFetch.map((c) => getChannel(c.id || c._id, workspaceId))
    ).then((results) => {
      if (!isMounted) return;
      setChannelMemberCounts((prev) => {
        const next = { ...prev };
        results.forEach((res, idx) => {
          if (res.status === "fulfilled" && res.value && Array.isArray(res.value.members)) {
            const cId = (channelsToFetch[idx].id || channelsToFetch[idx]._id)?.toString();
            next[cId] = res.value.members.length;
          }
        });
        return next;
      });
    });

    return () => {
      isMounted = false;
    };
  }, [channels, workspaceId, getChannel]);

  const activeChannel = useMemo(() => {
    return (
      sortedChannels.find(
        (c) => (c.id || c._id)?.toString() === selectedChannelId?.toString()
      ) || channelDetails
    );
  }, [sortedChannels, selectedChannelId, channelDetails]);

  // Members in currently selected channel
  const currentMembers = useMemo(() => {
    if (channelDetails && Array.isArray(channelDetails.members)) {
      return channelDetails.members.map((m) => {
        const mId = (m.id || m._id)?.toString();
        const found = workspaceMembers.find(
          (wm) => (wm.id || wm._id || wm.userId?._id || wm.userId)?.toString() === mId
        );
        return {
          ...m,
          role: found?.role || m.role || "MEMBER",
        };
      });
    }
    if (activeChannel && Array.isArray(activeChannel.members)) {
      return activeChannel.members.map((m) => {
        const mId = ((typeof m === "object" && m !== null) ? (m.id || m._id) : m)?.toString();
        const found = workspaceMembers.find(
          (wm) => (wm.id || wm._id || wm.userId?._id || wm.userId)?.toString() === mId
        );
        if (typeof m === "object" && m !== null) {
          return { ...m, role: found?.role || m.role || "MEMBER" };
        }
        return found || { id: m, username: "Member", role: "MEMBER" };
      });
    }
    return [];
  }, [channelDetails, activeChannel, workspaceMembers]);

  // Workspace members who can be added
  const availableMembersToAdd = useMemo(() => {
    const existingMemberIds = new Set(
      currentMembers.map((m) => (m.id || m._id)?.toString())
    );
    return (workspaceMembers || []).filter(
      (wm) => !existingMemberIds.has((wm.id || wm._id)?.toString())
    );
  }, [workspaceMembers, currentMembers]);

  // Filtered members in current channel
  const filteredCurrentMembers = useMemo(() => {
    const query = memberFilterTerm.toLowerCase().trim();
    if (!query) return currentMembers;
    return currentMembers.filter(
      (m) =>
        m.username?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query)
    );
  }, [currentMembers, memberFilterTerm]);

  const handleAddMember = async () => {
    if (!memberToAdd || !selectedChannelId || !addChannelMember) return;
    setAddingMember(true);
    try {
      await addChannelMember(selectedChannelId, memberToAdd);
      toast.success("Member added to channel", { toastId: `add-${memberToAdd}` });
      setMemberToAdd("");
      await loadChannelData(selectedChannelId);
      refreshChannels?.(workspaceId);
    } catch (err) {
      toast.error(err.message || "Failed to add member", { toastId: "add-err" });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const mId = (member.id || member._id)?.toString();
    if (!mId || !selectedChannelId || !removeChannelMember) return;
    if (mId === (user?.id || user?._id)?.toString()) {
      toast.info("You cannot remove yourself from here.");
      return;
    }

    setRemovingMemberId(mId);
    try {
      await removeChannelMember(selectedChannelId, mId);
      toast.success(`${member.username || "Member"} removed from channel`, {
        toastId: `remove-${mId}`,
      });
      await loadChannelData(selectedChannelId);
      refreshChannels?.(workspaceId);
    } catch (err) {
      toast.error(err.message || "Failed to remove member", { toastId: "remove-err" });
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#F8FAFB] dark:bg-[#121717] text-[#2C3333] dark:text-[#E7F6F2] overflow-hidden select-none transition-colors">
      {/* ── TOP FULL-WIDTH GLOBAL HEADER (Dark, matching chat shell header) ────── */}
      <header className="flex h-14 w-full items-center justify-between border-b border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#1A2121] px-4 sm:px-6 shadow-xs z-20 flex-shrink-0 text-[#2C3333] dark:text-white transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button to workspace (clean arrow button) */}
          <button
            type="button"
            onClick={() => navigate(`/app/workspace/${workspaceId}`)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#242D2D] text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white transition cursor-pointer"
            title="Back to Workspace"
          >
            <i className="fa-solid fa-arrow-left text-sm" />
          </button>

          <div className="h-5 w-px bg-[#D8E2E1] dark:bg-[#2C3333]" />

          {/* Title and Workspace Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA] shadow-xs flex-shrink-0">
              <i className="fa-solid fa-users-gear text-sm" />
            </span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#2C3333] dark:text-white leading-tight truncate">
                Channel Management
              </h1>
              <p className="text-[11px] text-[#52656A] dark:text-[#A5C9CA]/75 truncate">
                {workspaceData?.name || "Workspace"}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/50 bg-white dark:bg-[#242D2D] text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F0F4F4] dark:hover:bg-[#2C3636] hover:text-[#2C3333] dark:hover:text-white transition cursor-pointer shadow-2xs"
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? <FiSun className="text-sm text-[#395B64] dark:text-white" /> : <FiMoon className="text-sm text-[#52656A] dark:text-[#A5C9CA]" />}
          </button>
        </div>
      </header>

      {/* ── 2-COLUMN WORKSPACE BODY ────────────────────────────────────────────── */}
      <div className="flex flex-1 w-full min-h-0 overflow-hidden">
        {/* Left Column: Channels Directory (Dark Sidebar matching normal chat sidebar) */}
        <div
          className={`${
            selectedChannelId ? "hidden md:flex" : "flex"
          } w-full md:w-80 lg:w-96 flex-col flex-shrink-0 border-r border-[#D8E2E1] dark:border-[#2C3333] bg-white dark:bg-[#1E2525] text-[#2C3333] dark:text-[#E7F6F2] h-full transition-colors`}
        >
          {/* Channels Header */}
          <div className="flex h-14 items-center justify-between border-b border-[#D8E2E1] dark:border-[#2C3333] px-5 flex-shrink-0 bg-white dark:bg-[#1E2525]">
            <h2 className="text-sm font-bold text-[#2C3333] dark:text-white tracking-wide">
              Channels
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0F4F4] dark:bg-[#2C3333] text-[#395B64] dark:text-[#A5C9CA] border border-[#D8E2E1] dark:border-[#395B64]/30">
              {displayedChannels.length}
            </span>
          </div>

          {/* Filter Bar with Icons: All, Private, Public */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#D8E2E1] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2121]/80 flex-shrink-0">
            {filterOptions.map((f) => {
              const isActive = channelFilter === f.id;
              const count =
                f.id === "ALL"
                  ? sortedChannels.length
                  : f.id === "PRIVATE"
                  ? sortedChannels.filter((c) => c.type === "PRIVATE").length
                  : sortedChannels.filter((c) => c.type !== "PRIVATE").length;

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setChannelFilter(f.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
                    isActive
                      ? "bg-[#395B64] text-white shadow-xs"
                      : "text-[#52656A] dark:text-[#A5C9CA]/80 hover:bg-[#EAEFEF] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white"
                  }`}
                  title={`Show ${f.label} Channels`}
                >
                  <i className={`${f.icon} text-[10px]`} />
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-[#EAEFEF] dark:bg-[#2C3333] text-[#52656A] dark:text-[#A5C9CA]/70"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Channels List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E0E7E6]/70 dark:divide-[#2C3333]/50">
            {displayedChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F4F4] dark:bg-[#2C3333] text-[#395B64] dark:text-[#A5C9CA] mb-3">
                  <i className={channelFilter === "PRIVATE" ? "fa-solid fa-lock text-xl" : "fa-solid fa-hashtag text-xl"} />
                </span>
                <p className="text-sm font-semibold text-[#2C3333] dark:text-white mb-1">
                  No {channelFilter === "PRIVATE" ? "private" : channelFilter === "PUBLIC" ? "public" : ""} channels found
                </p>
                <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/60 max-w-xs">
                  {channelFilter === "ALL"
                    ? "There are no channels in this workspace yet."
                    : `No ${channelFilter.toLowerCase()} channels match this filter.`}
                </p>
              </div>
            ) : (
              displayedChannels.map((c) => {
                const cId = (c.id || c._id)?.toString();
                const isSelected = selectedChannelId === cId;
                const isPrivate = c.type === "PRIVATE";
                
                // Prioritize accurate counts from loaded channel details, local state cache, or channel.members
                const memberCount =
                  channelMemberCounts[cId] !== undefined
                    ? channelMemberCounts[cId]
                    : Array.isArray(c.members) && c.members.length > 0
                    ? c.members.length
                    : isSelected && Array.isArray(channelDetails?.members)
                    ? channelDetails.members.length
                    : Array.isArray(c.members)
                    ? c.members.length
                    : 0;

                return (
                  <div
                    key={cId}
                    onClick={() => setSelectedChannelId(cId)}
                    className={`group relative flex items-center justify-between p-3.5 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-[#395B64]/15 dark:bg-[#395B64]/30 border-l-4 border-l-[#395B64] dark:border-l-[#A5C9CA]"
                        : "hover:bg-[#F8FAFB] dark:hover:bg-[#242D2D] border-l-4 border-l-transparent text-[#2C3333] dark:text-[#A5C9CA]/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Brand color for private and public */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                          isSelected
                            ? "bg-[#395B64] text-white shadow-xs"
                            : "bg-[#395B64]/15 dark:bg-[#2C3333] text-[#395B64] dark:text-[#A5C9CA] group-hover:bg-[#395B64]/25 dark:group-hover:bg-[#395B64]/40"
                        }`}
                      >
                        {isPrivate ? <i className="fa-solid fa-lock text-xs" /> : <span className="font-semibold text-sm">#</span>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`truncate text-xs font-bold ${
                            isSelected ? "text-[#395B64] dark:text-white" : "text-[#2C3333] dark:text-[#E7F6F2] group-hover:text-[#395B64] dark:group-hover:text-white"
                          }`}
                        >
                          {c.name}
                        </h4>
                        <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/70 font-medium">
                          {c.description || `${memberCount} ${memberCount === 1 ? "member" : "members"}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[11px] font-medium text-[#52656A] dark:text-[#A5C9CA]/70 flex items-center gap-1">
                        <i className="fa-solid fa-users text-[10px]" />
                        <span>{memberCount}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Clean Operations Dashboard (Light in light mode, Dark in dark mode; NO BOX CARDS) */}
        <div
          className={`${
            selectedChannelId ? "flex" : "hidden md:flex"
          } flex-1 flex-col h-full min-w-0 bg-white dark:bg-[#151B1B] text-[#2C3333] dark:text-[#E7F6F2] transition-colors`}
        >
          {activeChannel ? (
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
              {/* Channel Header Bar */}
              <div className="flex h-14 items-center justify-between border-b border-[#D8E2E1] dark:border-[#2C3333] bg-white dark:bg-[#1A2121] px-4 sm:px-6 shadow-xs select-none transition-colors flex-shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedChannelId("")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition md:hidden cursor-pointer"
                    title="Back to channels"
                  >
                    <i className="fa-solid fa-arrow-left text-sm" />
                  </button>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold flex-shrink-0 bg-[#395B64]/15 dark:bg-[#395B64]/30 text-[#395B64] dark:text-[#A5C9CA]">
                      {activeChannel.type === "PRIVATE" ? (
                        <i className="fa-solid fa-lock text-xs" />
                      ) : (
                        "#"
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-bold text-[#2C3333] dark:text-white">
                          {activeChannel.name}
                        </h2>
                        {/* Normal brand color badge — NO AMBER */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 bg-[#395B64]/10 dark:bg-[#395B64]/25 text-[#395B64] dark:text-[#A5C9CA] border-[#395B64]/20">
                          {activeChannel.type === "PRIVATE" ? "Private" : "Public"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right button: Jump to channel conversation */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/workspace/${workspaceId}/channel/${activeChannel.id || activeChannel._id}`)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#395B64] text-white hover:bg-[#2C3333] transition shadow-xs cursor-pointer"
                    title="Open in conversation view"
                  >
                    <i className="fa-solid fa-comments text-xs" />
                    <span>Go to Conversation</span>
                  </button>
                </div>
              </div>

              {/* Seamless Action & Info Strip (No separated card box) */}
              <div className="border-b border-[#D8E2E1] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2121]/60 px-4 sm:px-6 py-3.5 flex-shrink-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80">
                    {activeChannel.description || "General channel discussion"}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-[#52656A] dark:text-[#A5C9CA] shrink-0">
                    <i className="fa-solid fa-users text-[#395B64] dark:text-[#A5C9CA]" />
                    <span className="font-bold text-[#2C3333] dark:text-white">
                      {currentMembers.length}
                    </span>
                    <span>{currentMembers.length === 1 ? "member enrolled" : "members enrolled"}</span>
                  </div>
                </div>

                {/* Inline Add Member Control */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                  <div className="relative flex-1">
                    <select
                      value={memberToAdd}
                      onChange={(e) => setMemberToAdd(e.target.value)}
                      disabled={addingMember || availableMembersToAdd.length === 0}
                      className="w-full appearance-none rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#242D2D] px-3.5 py-2 text-xs text-[#2C3333] dark:text-[#E7F6F2] disabled:opacity-50 transition cursor-pointer pr-9 shadow-2xs focus:border-[#395B64] focus:outline-hidden"
                    >
                      <option value="">
                        {availableMembersToAdd.length === 0
                          ? "All workspace members are already enrolled in this channel"
                          : "Choose workspace colleague to add..."}
                      </option>
                      {availableMembersToAdd.map((m) => (
                        <option key={m.id || m._id} value={(m.id || m._id)?.toString()}>
                          {m.username} ({m.email || m.role || "Member"})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#52656A] dark:text-[#A5C9CA]">
                      <i className="fa-solid fa-chevron-down text-[10px]" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!memberToAdd || addingMember}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#395B64] hover:bg-[#2C3333] px-4 py-2 text-xs font-semibold text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex-shrink-0"
                  >
                    {addingMember ? (
                      <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                    ) : (
                      <i className="fa-solid fa-user-plus text-xs" />
                    )}
                    <span>Add Member</span>
                  </button>
                </div>
              </div>

              {/* Seamless Full-height Members Section (Clean List View without cards) */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#151B1B]">
                {/* Section Sub-header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8E2E1] dark:border-[#2C3333] px-4 sm:px-6 py-3 bg-white dark:bg-[#1A2121] flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#52656A] dark:text-[#A5C9CA]">
                      Channel Members
                    </h3>
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#395B64]/15 dark:bg-[#395B64]/30 px-1.5 text-[10px] font-bold text-[#395B64] dark:text-[#A5C9CA]">
                      {filteredCurrentMembers.length}
                    </span>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#52656A] dark:text-[#A5C9CA]" />
                    <input
                      type="text"
                      value={memberFilterTerm}
                      onChange={(e) => setMemberFilterTerm(e.target.value)}
                      placeholder="Search enrolled members..."
                      className="w-full rounded-xl border border-[#D8E2E1] dark:border-[#395B64]/50 bg-[#F8FAFB] dark:bg-[#242D2D] pl-8 pr-3 py-1.5 text-xs text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#7B8B8F] dark:placeholder-[#A5C9CA]/50 focus:border-[#395B64] focus:outline-hidden transition"
                    />
                    {memberFilterTerm && (
                      <button
                        type="button"
                        onClick={() => setMemberFilterTerm("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52656A] dark:text-[#A5C9CA] hover:text-[#2C3333] text-xs cursor-pointer"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Members List Items */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#E0E7E6]/70 dark:divide-[#2C3333]/80">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-20 text-xs text-[#52656A] dark:text-[#A5C9CA]">
                      <i className="fa-solid fa-circle-notch fa-spin mr-2" />
                      Loading channel members...
                    </div>
                  ) : filteredCurrentMembers.length === 0 ? (
                    <div className="py-20 text-center text-xs text-[#52656A] dark:text-[#A5C9CA]">
                      {memberFilterTerm
                        ? "No channel members match your search."
                        : "No members currently enrolled in this channel."}
                    </div>
                  ) : (
                    filteredCurrentMembers.map((m) => {
                      const mId = (m.id || m._id)?.toString();
                      const isSelf = mId === (user?.id || user?._id)?.toString();
                      const isRemoving = removingMemberId === mId;
                      const currentUserRole = workspaceData?.userRole || (user?.platformRole === "super_admin" ? "OWNER" : "MEMBER");
                      const canRemove =
                        !isSelf &&
                        (currentUserRole === "OWNER" || currentUserRole === "ADMIN");

                      return (
                        <div
                          key={mId || m.username}
                          className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 hover:bg-[#F8FAFB] dark:hover:bg-[#1E2525]/70 transition"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative flex-shrink-0">
                              {m.avatar ? (
                                <img
                                  src={m.avatar}
                                  alt={m.username}
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#395B64] text-xs font-bold text-white shadow-2xs">
                                  {m.username?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                              )}
                              <StatusBadge
                                status={getUserPresenceStatus(mId)}
                                size="xs"
                                className="absolute bottom-0 right-0 ring-1 ring-white dark:ring-[#151B1B]"
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs font-bold text-[#2C3333] dark:text-white">
                                  {m.username}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] text-[#52656A] dark:text-[#A5C9CA]/70 font-semibold">
                                    (you)
                                  </span>
                                )}
                              </div>
                              {m.email && (
                                <p className="truncate text-[11px] text-[#52656A] dark:text-[#A5C9CA]/75">
                                  {m.email}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {m.role && (
                              <span className="rounded-lg bg-[#E7F6F2] dark:bg-[#395B64]/40 px-2 py-0.5 text-[10px] font-semibold text-[#395B64] dark:text-[#A5C9CA] border border-[#395B64]/20">
                                {m.role}
                              </span>
                            )}

                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m)}
                                disabled={isRemoving}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 disabled:opacity-50 transition cursor-pointer"
                                title={`Remove ${m.username} from channel`}
                              >
                                {isRemoving ? (
                                  <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                                ) : (
                                  <i className="fa-solid fa-user-minus text-xs" />
                                )}
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#395B64]/10 dark:bg-[#395B64]/20 text-[#395B64] dark:text-[#A5C9CA] mb-4">
                <i className="fa-solid fa-users-gear text-2xl" />
              </span>
              <h3 className="text-base font-bold text-[#2C3333] dark:text-white mb-1">
                Select a Channel
              </h3>
              <p className="text-xs text-[#52656A] dark:text-[#A5C9CA]/80 max-w-sm">
                Choose any channel from the list to manage its members, view details, and add workspace colleagues.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelManagementPage;