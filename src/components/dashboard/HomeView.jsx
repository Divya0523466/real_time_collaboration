const HomeView = ({ onOpenSidebar }) => {
  return (
    <div className="flex h-full w-full flex-col bg-[#F8FAFB] dark:bg-[#121717] overflow-hidden select-none transition-colors">
      {onOpenSidebar && (
        <div className="flex items-center px-4 py-3 border-b border-[#D8E2E1] dark:border-[#2C3333] md:hidden flex-shrink-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-8 w-8 items-center justify-center rounded text-[#52656A] dark:text-[#A5C9CA] hover:bg-[#E7F6F2] dark:hover:bg-[#2C3333] transition-colors"
            aria-label="Open sidebar"
          >
            <i className="fa-solid fa-bars text-sm" />
          </button>
        </div>
      )}

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          {/* Main Icon container */}
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E7F6F2] to-[#D8E2E1]/60 dark:from-[#252E2E] dark:to-[#1A2121] border border-[#D8E2E1] dark:border-[#395B64]/40 shadow-sm">
              <i className="fa-regular fa-comments text-3xl text-[#395B64] dark:text-[#A5C9CA]" />
            </div>
          </div>

          {/* Heading */}
          <h3 className="text-base font-semibold text-[#2C3333] dark:text-[#E7F6F2] tracking-tight">
            Select a conversation
          </h3>

          {/* Subtitle */}
          <p className="mt-1.5 text-xs text-[#52656A] dark:text-[#A5C9CA]/70 leading-relaxed max-w-[280px]">
            Choose a channel, direct message, space, or group from the list to start collaborating
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
