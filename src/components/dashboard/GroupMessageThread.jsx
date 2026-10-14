import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  fetchGroupMessagesApi,
  sendGroupMessageApi,
} from "../../services/groupService";
import socket, {
  joinGroup,
  leaveGroup,
  sendGroupMessageSocket,
  onGroupMessageReceived,
  offGroupMessageReceived,
} from "../../services/socket";
import GroupInfoModal from "./GroupInfoModal";
import { useTheme } from "../../context/ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";

const formatMessageTime = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const GroupMessageThread = ({
  group,
  currentUserId,
  currentUser,
  onOpenSidebar,
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const messagesEndRef = useRef(null);

  const groupId = (group?._id || group?.id)?.toString();

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch initial group messages & join socket room
  useEffect(() => {
    if (!groupId) return;

    setLoading(true);
    joinGroup(groupId);

    fetchGroupMessagesApi(groupId)
      .then((data) => {
        setMessages(data || []);
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      })
      .catch((err) => {
        console.error("Failed to fetch group messages:", err);
        setLoading(false);
      });

    return () => {
      leaveGroup(groupId);
    };
  }, [groupId]);

  // Listen for real-time group messages
  useEffect(() => {
    const handleNewMessage = (newMsg) => {
      if ((newMsg.groupId || newMsg.groupId?._id)?.toString() === groupId) {
        setMessages((prev) => {
          // Avoid duplicate messages
          const exists = prev.some(
            (m) =>
              (m.id || m._id)?.toString() ===
              (newMsg.id || newMsg._id)?.toString(),
          );
          if (exists) return prev;
          return [...prev, newMsg];
        });
        setTimeout(scrollToBottom, 50);
      }
    };

    onGroupMessageReceived(handleNewMessage);
    return () => {
      offGroupMessageReceived(handleNewMessage);
    };
  }, [groupId]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      setInputText("");

      // Try sending via Socket first for instant real-time delivery
      if (socket.connected) {
        sendGroupMessageSocket(groupId, trimmed);
      } else {
        // Fallback to REST API if socket is disconnected
        const saved = await sendGroupMessageApi(groupId, { content: trimmed });
        setMessages((prev) => [...prev, saved]);
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const memberCount = group?.members?.length || 0;

  return (
    <div className="flex min-w-0 flex-1 w-full h-full flex-col bg-white dark:bg-[#121717] text-gray-900 dark:text-[#E7F6F2] transition-colors">
      {/* ── Group Header ────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-[#2C3333] bg-white dark:bg-[#1A2121] px-4 sm:px-6 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-[#A5C9CA] dark:hover:bg-[#2C3333] dark:hover:text-white transition"
            >
              <i className="fa-solid fa-bars text-sm" />
            </button>
          )}

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/30 shrink-0">
            <i className="fa-solid fa-user-group text-sm" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {group?.name || "Group Chat"}
              </h2>
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="flex items-center gap-1 rounded-full bg-teal-50 hover:bg-teal-100 dark:bg-[#395B64]/50 dark:hover:bg-[#395B64]/80 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-[#A5C9CA] border border-teal-200/50 dark:border-[#395B64]/50 transition cursor-pointer"
                title="View group members"
              >
                <i className="fa-solid fa-users text-[9px]" />
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </button>
            </div>
            {group?.description && (
              <p className="truncate text-[11px] text-gray-500 dark:text-[#A5C9CA]/80">
                {group.description}
              </p>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#242D2D] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#395B64]/40 transition shadow-xs cursor-pointer"
            title="Group Info & Members"
          >
            <i className="fa-solid fa-circle-info text-xs text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Group Info</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-[#395B64]/50 bg-white dark:bg-[#242D2D] text-[#395B64] dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#2C3636] transition shadow-xs cursor-pointer"
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
      </div>

      {/* ── Messages List ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFB] dark:bg-[#121717]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-500 dark:text-[#A5C9CA]">
            <i className="fa-solid fa-circle-notch fa-spin mr-2" />
            Loading group conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 text-2xl mb-3 border border-teal-200/50 dark:border-teal-500/20">
              <i className="fa-solid fa-comments" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Welcome to {group?.name}!
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-[#A5C9CA] max-w-sm">
              This is the start of the <strong>{group?.name}</strong> group
              chat.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe =
              (msg.senderId?._id || msg.senderId)?.toString() ===
              (
                currentUserId ||
                currentUser?.id ||
                currentUser?._id
              )?.toString();
            const senderName =
              msg.sender?.displayName ||
              msg.sender?.username ||
              (isMe ? "You" : "Member");

            return (
              <div
                key={msg.id || msg._id || index}
                className={`flex gap-3 items-start group ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                {!isMe && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-[#395B64] text-xs font-bold text-gray-700 dark:text-white overflow-hidden shrink-0 mt-0.5">
                    {msg.sender?.avatar ? (
                      <img
                        src={msg.sender.avatar}
                        alt={senderName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      senderName.charAt(0).toUpperCase()
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                    isMe
                      ? "bg-teal-600 text-white rounded-tr-xs shadow-xs"
                      : "bg-white dark:bg-[#2C3333] text-gray-800 dark:text-[#E7F6F2] rounded-tl-xs border border-gray-200 dark:border-[#395B64]/40 shadow-xs"
                  }`}
                >
                  {!isMe && (
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-bold text-teal-600 dark:text-teal-300">
                        {senderName}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-[#A5C9CA]/60 font-normal">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>

                  {isMe && (
                    <div className="mt-1 text-right text-[10px] text-teal-100/80">
                      {formatMessageTime(msg.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Input Bar ───────────────────────────────── */}
      <div className="p-3 border-t border-gray-200 dark:border-[#2C3333] bg-white dark:bg-[#1A2121] flex-shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#2C3333] px-3 py-1.5 focus-within:border-teal-500 dark:focus-within:border-teal-400 transition"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${group?.name || "group"}...`}
            className="flex-1 bg-transparent py-1 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#A5C9CA]/50 focus:outline-hidden"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
            title="Send message"
          >
            {sending ? (
              <i className="fa-solid fa-circle-notch fa-spin text-xs" />
            ) : (
              <i className="fa-solid fa-paper-plane text-xs" />
            )}
          </button>
        </form>
      </div>

      {/* ── Group Info Modal ─────────────────────────────────── */}
      {showInfoModal && (
        <GroupInfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          group={group}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default GroupMessageThread;
