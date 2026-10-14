import React, { useState } from "react";
import { toast } from "react-toastify";
import { createGroupApi } from "../../services/groupService";

const CreateGroupModal = ({
  isOpen = true,
  onClose,
  workspaceId,
  workspaceMembers = [],
  currentUserId,
  onGroupCreated,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Filter members: exclude logged-in user (creator)
  const availableMembers = (workspaceMembers || []).filter((m) => {
    const mId = (m.id || m._id)?.toString();
    const cId = currentUserId?.toString();
    return mId && mId !== cId;
  });

  const filteredMembers = availableMembers.filter((m) => {
    const q = searchQuery.toLowerCase();
    const username = (m.username || "").toLowerCase();
    const displayName = (m.displayName || "").toLowerCase();
    const email = (m.email || "").toLowerCase();
    return username.includes(q) || displayName.includes(q) || email.includes(q);
  });

  const toggleMember = (memberId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    try {
      setLoading(true);
      const newGroup = await createGroupApi({
        workspaceId,
        name: name.trim(),
        description: description.trim(),
        members: selectedMemberIds,
      });

      toast.success(`Group "${newGroup.name}" created!`);
      if (onGroupCreated) {
        onGroupCreated(newGroup);
      }
      handleClose();
    } catch (err) {
      toast.error(err.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setSearchQuery("");
    setSelectedMemberIds([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-default"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E2525] border border-gray-200 dark:border-[#395B64] p-6 shadow-2xl text-gray-900 dark:text-[#E7F6F2] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#395B64]/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/20">
              <i className="fa-solid fa-user-group text-sm" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Create a Group</h3>
              <p className="text-xs text-gray-500 dark:text-[#A5C9CA]">
                Collaborate with a custom squad inside this workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-white transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-[#E7F6F2] mb-1">
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend Squad, Design Review, Project Alpha"
              className="w-full rounded-xl border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#2C3333] px-3.5 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-hidden transition"
              autoFocus
            />
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-[#E7F6F2] mb-1">
              Purpose / Description <span className="text-[10px] text-gray-400 dark:text-[#A5C9CA] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group working on?"
              className="w-full rounded-xl border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#2C3333] px-3.5 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-hidden transition"
            />
          </div>

          {/* Member Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#E7F6F2]">
                Add Members
              </label>
              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-300">
                {selectedMemberIds.length} selected
              </span>
            </div>

            <div className="relative mb-2">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-gray-400 dark:text-[#A5C9CA]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search colleagues to add..."
                className="w-full rounded-xl border border-gray-200 dark:border-[#395B64]/70 bg-white dark:bg-[#2C3333]/80 pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-hidden transition"
              />
            </div>

            <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-[#395B64]/50 bg-gray-50/50 dark:bg-[#2C3333]/40 divide-y divide-gray-100 dark:divide-[#395B64]/30 p-1">
              {filteredMembers.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500 dark:text-[#A5C9CA]">
                  {searchQuery ? "No members match your search" : "No other members available in workspace"}
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const mId = (member.id || member._id)?.toString();
                  const isSelected = selectedMemberIds.includes(mId);

                  return (
                    <div
                      key={mId}
                      onClick={() => toggleMember(mId)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                        isSelected
                          ? "bg-teal-50 dark:bg-teal-500/15 text-teal-900 dark:text-white"
                          : "hover:bg-gray-100 dark:hover:bg-[#2C3333] text-gray-800 dark:text-[#E7F6F2]"
                      }`}
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

                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border transition shrink-0 ${
                          isSelected
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "border-gray-300 dark:border-[#395B64] bg-white dark:bg-[#1E2525]"
                        }`}
                      >
                        {isSelected && <i className="fa-solid fa-check text-[10px]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-[#395B64]/50">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
            >
              {loading && <i className="fa-solid fa-circle-notch fa-spin text-xs" />}
              <span>Create Group</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
