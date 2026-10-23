import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import {
  fetchGroupMessagesApi,
  sendGroupMessageApi,
} from "../../services/groupService";
import { togglePinMessageApi } from "../../services/messageService";
import { onPinnedUpdated, offPinnedUpdated } from "../../services/socket";
import socket, {
  joinGroup,
  leaveGroup,
  sendGroupMessageSocket,
  onGroupMessageReceived,
  offGroupMessageReceived,
  sendReactionSocket,
  onReactionUpdated,
  offReactionUpdated,
} from "../../services/socket";
import MessageReactionPicker from "../common/MessageReactionPicker";
import MessageReactions from "../common/MessageReactions";
import SeenAvatars from "../common/SeenAvatars";
import GroupInfoModal from "./GroupInfoModal";
import ConversationPinnedDrawer from "../common/ConversationPinnedDrawer";
import SharedFilesGallery from "../common/SharedFilesGallery";
import { getMessageAttachments } from "../../utils/fileUtils";
import { useTheme } from "../../context/ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";
import TypingIndicator from "../common/TypingIndicator";
import useTypingIndicator from "../../hooks/useTypingIndicator";
import StatusSelector from "../common/StatusSelector";

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
  onViewProfile,
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [showFilesGallery, setShowFilesGallery] = useState(false);
  const filesCount = useMemo(() => {
    return messages.reduce((acc, msg) => {
      if (msg.isDeleted) return acc;
      const atts = getMessageAttachments(msg);
      return acc + (atts?.length || 0);
    }, 0);
  }, [messages]);
  const { isDark, toggleTheme } = useTheme();
  const messagesEndRef = useRef(null);
  const groupId = (group?._id || group?.id)?.toString();
  const activeUserId = (
    currentUserId ||
    currentUser?._id ||
    currentUser?.id
  )?.toString();

  const lastReadSenderMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const isMsgSender =
        (msg.senderId?._id || msg.senderId)?.toString() === activeUserId;
      if (isMsgSender && msg.readBy?.length > 0 && !msg.isDeleted) {
        return (msg.id || msg._id)?.toString();
      }
    }
    return null;
  }, [messages, activeUserId]);

  // Filter pinned messages specifically for this group conversation
  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned && !m.isDeleted),
    [messages],
  );

  const handleJumpToMessage = (messageId) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });




    }
  };

  const { typingText, isAnyoneTyping, handleKeystroke, handleStopTypingNow } =
    useTypingIndicator({
      type: "group",
      targetId: groupId,
      currentUserId: activeUserId,
    });

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

  // Listen for real-time group messages & reactions
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

    const handleReaction = (payload) => {
      if (
        payload?.conversationType !== "group" ||
        payload?.groupId?.toString() !== groupId
      )
        return;
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id)?.toString() === payload.messageId?.toString()
            ? { ...m, reactions: payload.reactions }
            : m,
        ),
      );
    };

    onGroupMessageReceived(handleNewMessage);
    onReactionUpdated(handleReaction);
    const handleGroupMessagesRead = (payload) => {
      if (payload.groupId?.toString() === groupId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId?.toString() === payload.user?.userId?.toString())
              return m;
            const alreadyRead = (m.readBy || []).some(
              (r) => r.userId?.toString() === payload.user?.userId?.toString(),
            );
            if (alreadyRead) return m;
            return {
              ...m,
              readBy: [...(m.readBy || []), payload.user],
            };
          }),
        );
      }
    };
    socket.on("group-messages-read", handleGroupMessagesRead);
    const handlePinnedUpdated = (payload) => {
      if (
        payload.conversationType !== "group" ||
        payload.groupId?.toString() !== groupId
      )
        return;
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id)?.toString() === payload.messageId?.toString()
            ? {
                ...m,
                isPinned: payload.isPinned,
                pinnedBy: payload.pinnedBy,
                pinnedAt: payload.pinnedAt,
              }
            : m,
        ),
      );
    };
    onPinnedUpdated(handlePinnedUpdated);

    return () => {
      offGroupMessageReceived(handleNewMessage);
      offReactionUpdated(handleReaction);
      socket.off("group-messages-read", handleGroupMessagesRead);
      offPinnedUpdated(handlePinnedUpdated);
    };
  }, [groupId]);

  const handleTogglePin = async (msg) => {
    const msgId = (msg.id || msg._id)?.toString();
    if (!msgId) return;

    setMessages((prev) =>
      prev.map((m) =>
        (m.id || m._id)?.toString() === msgId
          ? { ...m, isPinned: !m.isPinned }
          : m,
      ),
    );

    try {
      const res = await togglePinMessageApi(msgId);
      toast.success(res.isPinned ? "Message pinned" : "Message unpinned");
    } catch {
      toast.error("Failed to update pin status");
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id)?.toString() === msgId
            ? { ...m, isPinned: msg.isPinned }
            : m,
        ),
      );
    }
  };

  const handleToggleReaction = (msg, emoji) => {
    const msgId = (msg.id || msg._id)?.toString();
    if (!msgId || !groupId) return;

    const myId = (
      currentUser?.id ||
      currentUser?._id ||
      currentUserId
    )?.toString();
    const myName = currentUser?.username || "You";

    setMessages((prev) =>
      prev.map((m) => {
        if ((m.id || m._id)?.toString() !== msgId) return m;
        const reactions = (m.reactions || []).map((r) => ({
          ...r,
          users: [...r.users],
        }));

        let previousEmoji = null;
        for (const group of reactions) {
          const uIdx = group.users.findIndex(
            (u) => (u.userId?._id || u.userId)?.toString() === myId,
          );
          if (uIdx !== -1) {
            previousEmoji = group.emoji;
            group.users.splice(uIdx, 1);
            break;
          }
        }

        if (previousEmoji !== emoji) {
          const targetGroup = reactions.find((r) => r.emoji === emoji);
          if (targetGroup) {
            targetGroup.users.push({ userId: myId, username: myName });
          } else {
            reactions.push({
              emoji,
              users: [{ userId: myId, username: myName }],
            });
          }
        }

        const filtered = reactions.filter((r) => r.users && r.users.length > 0);
        return { ...m, reactions: filtered };
      }),
    );

    sendReactionSocket({
      messageId: msgId,
      conversationType: "group",
      conversationId: groupId,
      emoji,
    });
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      handleStopTypingNow();
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
          <StatusSelector align="right" />
          {/* Pinned Messages Button */}
          <button
            type="button"
            onClick={() => setShowPinnedDrawer(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition shadow-xs cursor-pointer ${
              showPinnedDrawer
                ? "border-teal-600 bg-teal-50 dark:bg-[#395B64]/40 text-teal-700 dark:text-[#A5C9CA]"
                : "border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#242D2D] text-gray-700 dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#395B64]/40"
            }`}
            title="Pinned messages in this Group"
          >
            <i className="fa-solid fa-thumbtack text-xs" />
            <span className="hidden sm:inline">Pinned</span>
            {pinnedMessages.length > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gray-200 dark:bg-[#395B64]/50 text-gray-700 dark:text-[#A5C9CA] px-1 text-[10px] font-bold">
                {pinnedMessages.length}
              </span>
            )}
          </button>

          {/* Files Gallery Button */}
          <button
            type="button"
            onClick={() => setShowFilesGallery((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition shadow-xs cursor-pointer ${
              showFilesGallery
                ? "border-teal-600 bg-teal-50 dark:bg-[#395B64]/40 text-teal-700 dark:text-[#A5C9CA]"
                : "border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#242D2D] text-gray-700 dark:text-[#A5C9CA] hover:bg-gray-50 dark:hover:bg-[#395B64]/40"
            }`}
            title="Shared files in this Group"
          >
            <i className="fa-solid fa-folder-open text-xs text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Files</span>
            {filesCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-100 dark:bg-[#395B64]/60 text-teal-700 dark:text-teal-200 px-1 text-[10px] font-bold">
                {filesCount}
              </span>
            )}
          </button>
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
                id={`msg-${(msg.id || msg._id)?.toString()}`}
                className={`flex gap-3 items-start group ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                {!isMe && (
                  <button type="button" onClick={() => onViewProfile && onViewProfile(msg.sender || { _id: msg.senderId?._id || msg.senderId, id: msg.senderId?._id || msg.senderId, username: senderName, avatar: msg.sender?.avatar })} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-[#395B64] text-xs font-bold text-gray-700 dark:text-white overflow-hidden shrink-0 mt-0.5 hover:opacity-80 transition cursor-pointer focus:outline-none">
                    {msg.sender?.avatar ? (
                      <img
                        src={msg.sender.avatar}
                        alt={senderName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      senderName.charAt(0).toUpperCase()
                    )}
                  </button>

                )}

                {isMe && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#242D2D] rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50 shadow-sm px-1 py-0.5 flex-shrink-0 self-center pointer-events-none group-hover:pointer-events-auto">
                    <MessageReactionPicker
                      onSelectEmoji={(emoji) =>
                        handleToggleReaction(msg, emoji)
                      }
                      align="right"
                    />
                  </div>
                )}

                <div
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}
                >
                  {/* Pinned message badge indicator */}
                  {false && (
                    <div
                      className={`flex items-center gap-1.5 mb-1 px-1 text-xs font-semibold text-amber-600 dark:text-amber-400 select-none ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400">
                        <i className="fa-solid fa-thumbtack text-[9px] -rotate-45" />
                      </span>
                      <span className="text-[11px] font-bold tracking-wide uppercase">
                        Pinned message
                      </span>
                    </div>
                  )}
                  <div
                    className={`w-fit max-w-full rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                      isMe
                        ? "bg-teal-600 text-white rounded-tr-xs shadow-xs"
                        : "bg-white dark:bg-[#2C3333] text-gray-800 dark:text-[#E7F6F2] rounded-tl-xs border border-gray-200 dark:border-[#395B64]/40 shadow-xs"
                    }`}
                  >
                    {!isMe && (
                      <div className="mb-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewProfile && onViewProfile(msg.sender || { _id: msg.senderId?._id || msg.senderId, id: msg.senderId?._id || msg.senderId, username: senderName, avatar: msg.sender?.avatar })}
                          className="font-bold text-teal-600 dark:text-teal-300 hover:underline cursor-pointer text-left focus:outline-none"
                        >
                          {senderName}
                        </button>
                        <span className="text-[10px] text-gray-400 dark:text-[#A5C9CA]/60 font-normal">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>

                    <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                      {msg.isPinned && (
                        <button
                          type="button"
                          onClick={() => handleTogglePin(msg)}
                          title="Pinned message (click to unpin)"
                          className={
                            isMe
                              ? "text-white/90 hover:text-white"
                              : "text-teal-600 dark:text-teal-400"
                          }
                        >
                          <i className="fa-solid fa-thumbtack text-[9px]" />
                        </button>
                      )}
                      <span
                        className={
                          isMe
                            ? "text-[10px] text-teal-100/80"
                            : "text-[10px] text-gray-400 dark:text-[#A5C9CA]/60"
                        }
                      >
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>

                  <MessageReactions
                    reactions={msg.reactions || []}
                    currentUserId={activeUserId}
                    onToggleReaction={(emoji) =>
                      handleToggleReaction(msg, emoji)
                    }
                    className={
                      isMe
                        ? "justify-end -mt-2 mr-1 relative z-10"
                        : "justify-start -mt-2 ml-1 relative z-10"
                    }
                  />
                  {isMe && msg.readBy?.length > 0 && (
                    <SeenAvatars
                      readBy={msg.readBy}
                      className="justify-end mt-1 mr-1"
                    />
                  )}
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#242D2D] rounded-lg border border-[#E0E7E6] dark:border-[#395B64]/50 shadow-sm px-1 py-0.5 flex-shrink-0 self-center pointer-events-none group-hover:pointer-events-auto">
                  {!isMe && (
                    <MessageReactionPicker
                      onSelectEmoji={(emoji) =>
                        handleToggleReaction(msg, emoji)
                      }
                      align="left"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleTogglePin(msg)}
                    title={msg.isPinned ? "Unpin message" : "Pin message"}
                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                      msg.isPinned
                        ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                        : "text-[#52656A] dark:text-[#A5C9CA] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-[#E7F6F2] dark:hover:bg-[#1E2525]"
                    }`}
                  >
                    <i className="fa-solid fa-thumbtack text-[10px]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Input Bar ───────────────────────────────── */}
      <div className="p-3 border-t border-gray-200 dark:border-[#2C3333] bg-white dark:bg-[#1A2121] flex-shrink-0">
        <TypingIndicator
          typingText={typingText}
          isAnyoneTyping={isAnyoneTyping}
          className="mb-2 px-1"
        />
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#395B64] bg-white dark:bg-[#2C3333] px-3 py-1.5 focus-within:border-teal-500 dark:focus-within:border-teal-400 transition"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              handleKeystroke(e.target.value);
            }}
            onBlur={handleStopTypingNow}
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
          onViewProfile={(targetUser) => {
            setShowInfoModal(false);
            if (onViewProfile) onViewProfile(targetUser);
          }}
        />
      )}

      <ConversationPinnedDrawer
        isOpen={showPinnedDrawer}
        onClose={() => setShowPinnedDrawer(false)}
        pinnedMessages={pinnedMessages}
        onTogglePin={handleTogglePin}
        onJumpToMessage={handleJumpToMessage}
        conversationTitle={group?.name || "Group Chat"}
        conversationType="group"
      />

      {/* Shared Files Gallery Drawer for Group */}
      <SharedFilesGallery
        isOpen={showFilesGallery}
        onClose={() => setShowFilesGallery(false)}
        messages={messages}
        conversationTitle={group?.name || "Group Chat"}
        conversationType="group"
        onJumpToMessage={handleJumpToMessage}
      />
    </div>
  );
};

export default GroupMessageThread;
