import React from "react";

const ArchivedChannelsModal = ({
  isOpen,
  onClose,
  channels = [],
  onSelectChannel,
  onToggleArchive,
  canManage = false,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  if (!isOpen) return null;

  const archivedChannels = channels.filter((c) => c.isArchived);
  const filtered = archivedChannels.filter((c) =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    (c.description || "").toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-xl rounded-2xl border border-[#395B64] bg-[#1E2525] p-5 text-[#E7F6F2] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#2C3333]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 text-sm">
                <i className="fa-solid fa-box-archive" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Archived Channels</h3>
                <p className="text-xs text-[#A5C9CA]/70">
                  Read-only archived channels in this workspace ({archivedChannels.length})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#A5C9CA] hover:bg-[#2C3333] hover:text-white transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>

          {/* Search filter */}
          <div className="py-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#242D2D] border border-[#395B64]/50 focus-within:border-[#A5C9CA]">
              <i className="fa-solid fa-magnifying-glass text-xs text-[#A5C9CA]/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search archived channels..."
                className="flex-1 bg-transparent text-xs text-white placeholder-[#A5C9CA]/40 outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-xs text-[#A5C9CA]/60 hover:text-white"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#A5C9CA]/60">
                <i className="fa-solid fa-box-archive text-2xl mb-2 text-[#A5C9CA]/30 block" />
                {archivedChannels.length === 0
                  ? "No channels have been archived in this workspace."
                  : `No archived channels matching "${searchTerm}".`}
              </div>
            ) : (
              filtered.map((chan) => (
                <div
                  key={chan.id || chan._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#242D2D]/60 hover:bg-[#2C3333] border border-[#395B64]/30 transition group"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer mr-3"
                    onClick={() => {
                      onSelectChannel(chan);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <i className="fa-solid fa-box-archive text-[10px]" />
                        #{chan.name}
                      </span>
                      {chan.type === "PRIVATE" && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#395B64]/40 text-[#A5C9CA]">
                          Private
                        </span>
                      )}
                    </div>
                    {chan.description && (
                      <p className="text-[11px] text-[#A5C9CA]/70 truncate mt-0.5">
                        {chan.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectChannel(chan);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-[#A5C9CA] hover:text-white bg-[#395B64]/40 hover:bg-[#395B64] transition cursor-pointer"
                    >
                      View History
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onToggleArchive(chan)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 transition cursor-pointer flex items-center gap-1"
                        title="Unarchive channel"
                      >
                        <i className="fa-solid fa-arrow-rotate-left text-[10px]" />
                        <span>Unarchive</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ArchivedChannelsModal;
