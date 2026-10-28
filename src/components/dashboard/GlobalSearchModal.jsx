import { useState, useEffect, useRef, useCallback } from "react";
import { globalSearchApi } from "../../services/searchService";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_META = {
  channel: { icon: "fa-hashtag", label: "Channel", color: "text-[#395B64] dark:text-[#A5C9CA]" },
  space:   { icon: "fa-layer-group", label: "Space",   color: "text-purple-600 dark:text-purple-400" },
  group:   { icon: "fa-user-group", label: "Group",   color: "text-emerald-600 dark:text-emerald-400" },
  dm:      { icon: "fa-user",       label: "DM",      color: "text-amber-600 dark:text-amber-400" },
};

const highlightText = (text, query) => {
  if (!query || !text) return text || "";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-200 dark:bg-yellow-400/30 text-amber-900 dark:text-yellow-200 font-medium rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ResultItem = ({ result, query, onJump }) => {
  const meta = SOURCE_META[result.sourceType] || SOURCE_META.channel;
  const senderName = result.sender?.username || "Unknown";
  const avatar = result.sender?.avatar;
  const hasAttachment = !result.content && result.attachments?.length > 0;

  return (
    <button
      type="button"
      onClick={() => onJump(result)}
      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#F0F4F4] dark:hover:bg-[#2C3333] transition-colors text-left group rounded-xl"
    >
      {/* Sender avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#395B64] flex items-center justify-center text-xs font-bold text-white overflow-hidden mt-0.5">
        {avatar ? (
          <img src={avatar} alt={senderName} className="w-full h-full object-cover" />
        ) : (
          senderName.charAt(0).toUpperCase()
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[11px] font-semibold ${meta.color} flex items-center gap-1`}>
            <i className={`fa-solid ${meta.icon} text-[10px]`} />
            {result.sourceName}
          </span>
          <span className="text-[10px] text-[#52656A]/50 dark:text-[#A5C9CA]/50">·</span>
          <span className="text-xs font-semibold text-[#2C3333] dark:text-[#E7F6F2]">{senderName}</span>
          <span className="ml-auto text-[10px] text-[#52656A]/70 dark:text-[#A5C9CA]/60 flex-shrink-0">
            {formatDate(result.createdAt)}
          </span>
        </div>
        <p className="text-sm text-[#52656A] dark:text-[#A5C9CA] leading-snug line-clamp-2">
          {hasAttachment ? (
            <span className="italic text-[#52656A]/70 dark:text-[#A5C9CA]/70">
              <i className="fa-solid fa-paperclip mr-1 text-[10px]" />
              {result.attachments[0]?.originalName || "Attachment"}
            </span>
          ) : (
            highlightText(result.content, query)
          )}
        </p>
      </div>

      {/* Jump arrow */}
      <i className="fa-solid fa-arrow-right text-xs text-[#52656A]/30 dark:text-[#A5C9CA]/30 group-hover:text-[#395B64] dark:group-hover:text-[#A5C9CA] transition-colors flex-shrink-0 mt-1" />
    </button>
  );
};

const Skeleton = () => (
  <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-[#EAEFEF] dark:bg-[#2C3333] flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-[#EAEFEF] dark:bg-[#2C3333] rounded w-1/3" />
      <div className="h-3 bg-[#EAEFEF] dark:bg-[#2C3333] rounded w-3/4" />
    </div>
  </div>
);

// ── Main Modal ────────────────────────────────────────────────────────────────

const FILTERS = ["all", "channel", "space", "group", "dm"];

const GlobalSearchModal = ({ onClose, workspaceId, onJumpToResult }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto-focus on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    setError("");
    try {
      const data = await globalSearchApi({ q: q.trim(), workspaceId });
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const filtered = filter === "all"
    ? results
    : results.filter((r) => r.sourceType === filter);

  const filterCount = (type) =>
    type === "all" ? results.length : results.filter((r) => r.sourceType === type).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-[#D8E2E1] dark:border-[#395B64] bg-white dark:bg-[#1E2525] shadow-2xl flex flex-col overflow-hidden text-[#2C3333] dark:text-[#E7F6F2]"
          style={{ maxHeight: "75vh" }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#D8E2E1] dark:border-[#2C3333] bg-white dark:bg-[#1E2525]">
            <i className="fa-solid fa-magnifying-glass text-[#52656A] dark:text-[#A5C9CA] text-sm flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search messages across all conversations…"
              className="flex-1 bg-transparent text-sm text-[#2C3333] dark:text-[#E7F6F2] placeholder-[#52656A]/60 dark:placeholder-[#A5C9CA]/50 outline-none"
            />
            {loading && (
              <i className="fa-solid fa-circle-notch fa-spin text-[#395B64] dark:text-[#A5C9CA]/60 text-xs flex-shrink-0" />
            )}
            <kbd
              onClick={onClose}
              className="flex-shrink-0 cursor-pointer rounded-md border border-[#D8E2E1] dark:border-[#395B64] px-1.5 py-0.5 text-[10px] font-mono text-[#52656A] dark:text-[#A5C9CA]/70 hover:bg-[#F0F4F4] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white transition-colors"
            >
              Esc
            </kbd>
          </div>

          {/* Filter tabs — only show once there are results */}
          {results.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[#D8E2E1] dark:border-[#2C3333] bg-[#F8FAFB] dark:bg-[#1A2121]/50 overflow-x-auto">
              {FILTERS.map((f) => {
                const count = filterCount(f);
                if (f !== "all" && count === 0) return null;
                const isActive = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-[#395B64] text-white shadow-xs"
                        : "text-[#52656A] dark:text-[#A5C9CA]/80 hover:bg-[#EAEFEF] dark:hover:bg-[#2C3333] hover:text-[#2C3333] dark:hover:text-white"
                    }`}
                  >
                    {f === "all" ? "All" : (
                      <>
                        <i className={`fa-solid ${SOURCE_META[f].icon} text-[10px]`} />
                        <span className="capitalize">{f === "dm" ? "DMs" : f + "s"}</span>
                      </>
                    )}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      isActive ? "bg-black/20 text-white" : "bg-[#D8E2E1]/60 dark:bg-black/30 text-[#52656A] dark:text-[#A5C9CA]"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Results area */}
          <div className="flex-1 overflow-y-auto py-1">
            {/* Empty — before typing */}
            {!query && !loading && (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E7F6F2] dark:bg-[#2C3333] text-[#395B64] dark:text-[#A5C9CA]">
                  <i className="fa-solid fa-magnifying-glass text-lg" />
                </div>
                <p className="text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2]">Search everything</p>
                <p className="mt-1 text-xs text-[#52656A] dark:text-[#A5C9CA]/70">
                  Search across channels, spaces, groups, and DMs
                </p>
              </div>
            )}

            {/* Loading skeletons */}
            {loading && (
              <div className="space-y-0.5 py-1">
                {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-rose-500 dark:text-rose-400">
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </div>
            )}

            {/* No results */}
            {!loading && !error && query.length >= 2 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAEFEF] dark:bg-[#2C3333] text-[#52656A] dark:text-[#A5C9CA]">
                  <i className="fa-solid fa-magnifying-glass text-lg opacity-60" />
                </div>
                <p className="text-sm font-semibold text-[#2C3333] dark:text-[#E7F6F2]">No results for "{query}"</p>
                <p className="mt-1 text-xs text-[#52656A] dark:text-[#A5C9CA]/70">
                  Try a different keyword or check another filter
                </p>
              </div>
            )}

            {/* Results */}
            {!loading && !error && filtered.length > 0 && (
              <div className="space-y-0.5 px-2 py-1">
                {filtered.map((result) => (
                  <ResultItem
                    key={result._id}
                    result={result}
                    query={query}
                    onJump={onJumpToResult}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-3 px-4 py-2 border-t border-[#D8E2E1] dark:border-[#2C3333] text-[10px] text-[#52656A]/70 dark:text-[#A5C9CA]/50 bg-[#F8FAFB] dark:bg-[#1A2121]/50">
            <span><kbd className="font-mono rounded border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#1E2525] px-1 py-0.5 text-[9px] text-[#2C3333] dark:text-[#E7F6F2]">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono rounded border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#1E2525] px-1 py-0.5 text-[9px] text-[#2C3333] dark:text-[#E7F6F2]">↵</kbd> jump to message</span>
            <span><kbd className="font-mono rounded border border-[#D8E2E1] dark:border-[#395B64]/60 bg-white dark:bg-[#1E2525] px-1 py-0.5 text-[9px] text-[#2C3333] dark:text-[#E7F6F2]">Esc</kbd> close</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalSearchModal;
