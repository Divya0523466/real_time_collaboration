import React from "react";

const MessageDeleteModal = ({
  isOpen = false,
  type = "DELETE_MESSAGES", // "DELETE_MESSAGES" | "CLEAR_CHAT"
  count = 1,
  allMine = false,
  isDeleting = false,
  onClose,
  onConfirm, // (deleteForEveryone: boolean) => void
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !isDeleting && onClose && onClose()}
    >
      <div
        className="w-full max-w-sm sm:max-w-md rounded-2xl border border-gray-200 dark:border-[#395B64]/50 bg-white dark:bg-[#1E2525] p-5 sm:p-6 shadow-2xl text-[#2C3333] dark:text-[#E7F6F2] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "CLEAR_CHAT" ? (
          <>
            <div className="flex items-center gap-3 pb-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <i className="fa-solid fa-trash-can text-lg" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Clear this chat?
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#A5C9CA]">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-[#A5C9CA] leading-relaxed">
              All messages in this conversation will be cleared from your account history.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t border-gray-100 dark:border-[#2C3333]">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] hover:bg-gray-100 dark:hover:bg-[#2C3333] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                ) : (
                  <i className="fa-solid fa-trash-can text-xs" />
                )}
                <span>Clear Chat</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 pb-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <i className="fa-solid fa-trash-can text-lg" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {count === 1 ? "Delete message?" : `Delete ${count} messages?`}
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#A5C9CA]">
                  WhatsApp-style message removal
                </p>
              </div>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-[#A5C9CA] leading-relaxed">
              {allMine
                ? "You can delete these messages for everyone in this chat or delete them only for yourself."
                : "Delete these messages from your account history."}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-5 mt-4 border-t border-gray-100 dark:border-[#2C3333]">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="order-last sm:order-first px-4 py-2 rounded-xl text-xs font-semibold text-[#52656A] dark:text-[#A5C9CA] hover:bg-gray-100 dark:hover:bg-[#2C3333] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-[#2C3333] hover:bg-gray-200 dark:hover:bg-[#395B64]/50 text-[#2C3333] dark:text-white transition cursor-pointer"
              >
                Delete for me
              </button>
              {allMine && (
                <button
                  type="button"
                  onClick={() => onConfirm(true)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isDeleting && (
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                  )}
                  <span>Delete for everyone</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageDeleteModal;
