const HomeView = ({ onOpenSidebar }) => {
  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#121717] overflow-hidden select-none transition-colors">
      {/* Mobile sidebar toggle button - small screens only */}
      {onOpenSidebar && (
        <div className="flex items-center px-4 py-3 border-b border-[#E0E7E6] dark:border-[#2C3333] md:hidden flex-shrink-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#F1F5F4] dark:hover:bg-[#2C3333] transition"
            aria-label="Open sidebar"
          >
            <i className="fa-solid fa-bars text-sm" />
          </button>
        </div>
      )}

      {/* ── Centered Empty State (Google Workspace style) ──────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        {/* Minimalist Chat Graphic */}
        <svg
          width="180"
          height="150"
          viewBox="0 0 180 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-6 select-none opacity-90"
        >
          {/* Main speech bubble outline */}
          <path
            d="M32 35C32 23.9543 40.9543 15 52 15H128C139.046 15 148 23.9543 148 35V85C148 96.0457 139.046 105 128 105H75L45 125V105H52C40.9543 105 32 96.0457 32 85V35Z"
            className="stroke-[#2C3333] dark:stroke-[#A5C9CA]"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Document card top right */}
          <rect
            x="102"
            y="26"
            width="36"
            height="46"
            rx="6"
            className="fill-[#A5C9CA]/30 dark:fill-[#395B64]/40 stroke-[#2C3333] dark:stroke-[#A5C9CA]"
            strokeWidth="2"
          />
          <line x1="110" y1="38" x2="130" y2="38" className="stroke-[#2C3333] dark:stroke-[#E7F6F2]" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="110" y1="46" x2="130" y2="46" className="stroke-[#2C3333] dark:stroke-[#E7F6F2]" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="110" y1="54" x2="124" y2="54" className="stroke-[#2C3333] dark:stroke-[#E7F6F2]" strokeWidth="2.5" strokeLinecap="round" />

          {/* Accent circle badge */}
          <circle
            cx="60"
            cy="68"
            r="16"
            className="fill-[#E7F6F2] dark:fill-[#242D2D] stroke-[#395B64] dark:stroke-[#A5C9CA]"
            strokeWidth="2"
          />
          <line x1="52" y1="65" x2="68" y2="65" className="stroke-[#395B64] dark:stroke-[#A5C9CA]" strokeWidth="2" strokeLinecap="round" />
          <line x1="52" y1="72" x2="63" y2="72" className="stroke-[#395B64] dark:stroke-[#A5C9CA]" strokeWidth="2" strokeLinecap="round" />

          {/* Decorative soft dot */}
          <circle
            cx="98"
            cy="88"
            r="12"
            className="fill-[#395B64]/15 dark:fill-[#A5C9CA]/20"
          />
        </svg>

        <h2 className="text-xl sm:text-2xl font-semibold text-[#2C3333] dark:text-white mb-2 tracking-tight">
          No conversation selected
        </h2>
        <p className="text-sm text-[#52656A] dark:text-[#A5C9CA]/90 max-w-sm leading-relaxed">
          Select a channel or direct message from the sidebar to start chatting
        </p>
      </div>
    </div>
  )
}

export default HomeView
