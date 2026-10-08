const HomeView = ({ onOpenSidebar }) => {
  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#121717] overflow-hidden select-none transition-colors">
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

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F6F2] dark:bg-[#395B64]/30 text-xl text-[#395B64] dark:text-[#A5C9CA] shadow-xs">
          <i className="fa-regular fa-comments" />
        </div>

        <h2 className="text-lg font-semibold text-[#2C3333] dark:text-white mb-1.5 tracking-tight">
          Select a conversation
        </h2>
        <p className="text-sm text-[#52656A] dark:text-[#A5C9CA]/80 max-w-sm leading-relaxed">
          Choose a channel or direct message to start chatting.
        </p>
      </div>
    </div>
  );
};

export default HomeView;
