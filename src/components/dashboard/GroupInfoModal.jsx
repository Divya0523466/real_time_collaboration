import React, { useState, useEffect } from "react";
import { fetchGroupApi } from "../../services/groupService";

const formatGroupDate = (dateString) => {
  if (!dateString) return "Recently";
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const GroupInfoModal = ({ isOpen = true, onClose, group, currentUserId, onViewProfile }) => {
  const [groupDetails, setGroupDetails] = useState(group);
  const [searchMember, setSearchMember] = useState("");
  const [loading, setLoading] = useState(false);

  const groupId = (group?._id || group?.id)?.toString();

  // Load fresh group details whenever modal opens
  useEffect(() => {
    if (!isOpen || !groupId) return;

    setGroupDetails(group);
    setLoading(true);

    fetchGroupApi(groupId)
      .then((data) => {
        if (data) setGroupDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Could not refresh group details:", err);
        setLoading(false);
      });
  }, [isOpen, groupId]);

  if (!isOpen) return null;

  const currentGroup = groupDetails || group || {};
  const members = currentGroup.members || [];
  const creator = currentGroup.createdBy || {};
  const creatorId = (creator._id || creator.id || creator)?.toString();
  const currentUid = currentUserId?.toString();

  const filteredMembers = members.filter((m) => {
    const q = searchMember.toLowerCase();
    const username = (m.username || "").toLowerCase();
    const displayName = (m.displayName || "").toLowerCase();
    return username.includes(q) || displayName.includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-default"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1E2525] border border-gray-200 dark:border-[#395B64] p-6 shadow-2xl text-gray-900 dark:text-[#E7F6F2] animate-in fade-in zoom-in-95 duration-150 cursor-auto flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#395B64]/50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/30 shrink-0">
              <i className="fa-solid fa-users text-base" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">
                {currentGroup.name || "Group Details"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#A5C9CA]">
                Group Details & Members
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-white transition cursor-pointer"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 py-4 flex-1 pr-1">
          {/* Overview Info Card */}
          <div className="rounded-xl border border-gray-200 dark:border-[#395B64]/50 bg-gray-50/70 dark:bg-[#2C3333]/40 p-4 space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#A5C9CA]/70">
                Description
              </span>
              <p className="mt-0.5 text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {currentGroup.description || (
                  <span className="italic text-gray-400 dark:text-gray-500">
                    No description provided
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60 dark:border-[#395B64]/30 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#A5C9CA]/70 block mb-0.5">
                  Created By
                </span>
                <span className="font-semibold text-gray-900 dark:text-white truncate block">
                  {creator.displayName || creator.username ? `@${creator.username || creator.displayName}` : "Workspace Member"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#A5C9CA]/70 block mb-0.5">
                  Created On
                </span>
                <span className="text-gray-700 dark:text-gray-300 block">
                  {formatGroupDate(currentGroup.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                Members
              </span>
              <span className="rounded-full bg-teal-50 dark:bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-500/30">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>

            {/* Member search filter */}
            {members.length > 3 && (
              <div className="relative mb-2">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-gray-400 dark:text-[#A5C9CA]" />
                <input
                  type="text"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Filter members..."
                  className="w-full rounded-xl border border-gray-200 dark:border-[#395B64]/70 bg-white dark:bg-[#2C3333]/80 pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-hidden transition"
                />
              </div>
            )}

            <div className="rounded-xl border border-gray-200 dark:border-[#395B64]/50 bg-white dark:bg-[#2C3333]/30 divide-y divide-gray-100 dark:divide-[#395B64]/30 max-h-56 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500 dark:text-[#A5C9CA]">
                  No members found
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const mId = (member._id || member.id)?.toString();
                  const isCreator = mId === creatorId;
                  const isYou = mId === currentUid;

                  return (
                    <div
                      key={mId || Math.random()}
                      className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-[#2C3333] transition cursor-pointer"
                      onClick={() => onViewProfile && onViewProfile(member)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-[#395B64] text-xs font-bold text-gray-700 dark:text-white overflow-hidden shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            member.username?.charAt(0)?.toUpperCase() || "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                            {member.displayName || member.username}
                          </p>
                          <p className="truncate text-[10px] text-gray-500 dark:text-[#A5C9CA]">
                            @{member.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCreator && (
                          <span className="rounded-md bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                            Creator
                          </span>
                        )}
                        {isYou && (
                          <span className="rounded-md bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/40">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 dark:border-[#395B64]/50 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#2C3333] dark:hover:bg-[#395B64] px-4 py-2 text-xs font-semibold text-gray-700 dark:text-[#E7F6F2] transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;
