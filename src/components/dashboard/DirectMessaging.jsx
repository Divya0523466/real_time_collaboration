import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  sendDirectMessage,
  editDirectMessage,
  deleteDirectMessage,
  onDirectMessageReceived,
  onDirectMessageSent,
  onDirectMessageError,
  onDirectMessageEdited,
  onDirectMessageDeleted,
  onDirectMessageEditError,
  onDirectMessageDeleteError,
  offDirectMessageReceived,
  offDirectMessageSent,
  offDirectMessageError,
  offDirectMessageEdited,
  offDirectMessageDeleted,
  offDirectMessageEditError,
  offDirectMessageDeleteError,
  sendReactionSocket,
  onReactionUpdated,
  offReactionUpdated,
  onDirectMessagesRead,
  offDirectMessagesRead,
  markMessagesSeenSocket,
} from "../../services/socket";
import {
  starMessageApi,
  unstarMessageApi,
} from "../../services/messageService";
import { isImageOrFileMessage } from "../../utils/fileUtils";
import { toast } from "react-toastify";
import MessageThread from "./MessageThread";

const DirectMessaging = ({
  externalSelectedUser = null,
  onOpenSidebar,
  onForwardMessage = () => {},
  onNavigateSource = () => {},
  isBlocked = false,
  onToggleBlock,
}) => {
  const { workspaceData, user } = useWorkspace();
  const [selectedUser, setSelectedUser] = useState(externalSelectedUser);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messageIdsRef = useRef(new Set());

  const API_URL = import.meta.env.VITE_API_URL;

  // Use external selected user if provided, otherwise use internal state
  const currentSelectedUser = externalSelectedUser || selectedUser;

  // Load message history when user is selected
  useEffect(() => {
    if (!currentSelectedUser?.id || !user) {
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        setMessages([]);
        messageIdsRef.current = new Set();

        const token = localStorage.getItem("worknestToken");
        const response = await fetch(
          `${API_URL}/messages/${currentSelectedUser.id}`,
          {
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch message history");
        }

        const data = await response.json();
        if (!cancelled) {
          const history = data.messages || [];
          setMessages(history);
          markMessagesSeenSocket({
            type: "dm",
            targetId: currentSelectedUser?.id || currentSelectedUser?._id,
          });
          messageIdsRef.current = new Set(
            history.map((msg) => msg.id.toString()),
          );
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load message history");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [currentSelectedUser?.id, user, API_URL]);

  // Handle incoming messages
  const handleDirectMessageReceived = (message) => {
    const messageId = message.id.toString();

    // Ignore if already in state
    if (messageIdsRef.current.has(messageId)) {
      return;
    }

    // Only add if from current selected user or to current selected user
    if (
      !currentSelectedUser ||
      (message.senderId.toString() !== currentSelectedUser.id.toString() &&
        message.receiverId.toString() !== currentSelectedUser.id.toString())
    ) {
      return;
    }

    messageIdsRef.current.add(messageId);
    setMessages((prev) => [...prev, message]);
  };

  // Handle sent message confirmation
  const handleDirectMessageSent = (message) => {
    const messageId = message.id.toString();

    // Ignore if already in state
    if (messageIdsRef.current.has(messageId)) {
      return;
    }

    messageIdsRef.current.add(messageId);
    setMessages((prev) => [...prev, message]);
  };

  // Handle errors
  const handleDirectMessageError = (error) => {
    const msg = error?.message || "Failed to send message";
    setError(msg);
    toast.error(msg);
  };

  // Handle edit — update the message in place without touching messageIdsRef
  const handleDirectMessageEdited = (payload) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id?.toString() === payload.id?.toString()
          ? {
              ...m,
              content: payload.content,
              mentions:
                payload.mentions !== undefined ? payload.mentions : m.mentions,
              isEdited: true,
              updatedAt: payload.updatedAt,
            }
          : m,
      ),
    );
  };

  // Handle delete — mark as deleted in place without touching messageIdsRef
  const handleDirectMessageDeleted = (payload) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id?.toString() === payload.id?.toString()
          ? { ...m, isDeleted: true, content: null }
          : m,
      ),
    );
  };

  const handleReactionUpdated = (payload) => {
    if (payload.conversationType !== "dm") return;
    setMessages((prev) =>
      prev.map((m) =>
        (m.id || m._id)?.toString() === payload.messageId?.toString()
          ? { ...m, reactions: payload.reactions }
          : m,
      ),
    );
  };

  const handleDirectMessagesRead = (payload) => {
    if (payload.readerId?.toString() === (currentSelectedUser?.id || currentSelectedUser?._id)?.toString()) {
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId?.toString() !== payload.readerId?.toString()
            ? { ...m, isRead: true }
            : m,
        ),
      );
    }
  };

  // Setup socket listeners — all registered in one effect, all cleaned up together
  useEffect(() => {
    onDirectMessageReceived(handleDirectMessageReceived);
    onDirectMessageSent(handleDirectMessageSent);
    onDirectMessageError(handleDirectMessageError);
    onDirectMessageEdited(handleDirectMessageEdited);
    onDirectMessageDeleted(handleDirectMessageDeleted);
    onDirectMessageEditError(handleDirectMessageError);
    onDirectMessageDeleteError(handleDirectMessageError);
    onReactionUpdated(handleReactionUpdated);
    onDirectMessagesRead(handleDirectMessagesRead);

    return () => {
      offDirectMessageReceived(handleDirectMessageReceived);
      offDirectMessageSent(handleDirectMessageSent);
      offDirectMessageError(handleDirectMessageError);
      offDirectMessageEdited(handleDirectMessageEdited);
      offDirectMessageDeleted(handleDirectMessageDeleted);
      offDirectMessageEditError(handleDirectMessageError);
      offDirectMessageDeleteError(handleDirectMessageError);
      offReactionUpdated(handleReactionUpdated);
      offDirectMessagesRead(handleDirectMessagesRead);
    };
  }, [currentSelectedUser]);

  const handleSendMessage = (content, attachments = [], mentions = []) => {
    if (!currentSelectedUser) return;
    setError(null);
    const trimmed = typeof content === "string" ? content.trim() : "";
    if (!trimmed && (!attachments || attachments.length === 0)) {
      return;
    }

    try {
      sendDirectMessage(
        currentSelectedUser.id,
        trimmed,
        attachments,
        mentions,
        workspaceData?.id,
      );
    } catch {
      setError("Failed to send message");
    }
  };

  // Emit edit to server via socket
  const handleEditMessage = (messageId, newContent, mentions = undefined) => {
    editDirectMessage(messageId, newContent, mentions, workspaceData?.id);
  };

  // Emit delete to server via socket
  const handleDeleteMessage = (messageId) => {
    deleteDirectMessage(messageId);
  };

  const handleToggleStar = async (message) => {
    if (!message || isImageOrFileMessage(message)) return;
    const messageId = (message.id || message._id)?.toString();
    if (!messageId) return;

    const currentlyStarred = Boolean(message.isStarred);
    const nextStarred = !currentlyStarred;

    setMessages((prev) =>
      prev.map((m) =>
        (m.id || m._id)?.toString() === messageId
          ? { ...m, isStarred: nextStarred }
          : m,
      ),
    );

    try {
      if (currentlyStarred) {
        await unstarMessageApi(messageId);
        toast.success("Message unstarred");
      } else {
        await starMessageApi(messageId, "DIRECT");
        toast.success("Message starred");
      }
    } catch (err) {
      console.error("Failed to toggle star:", err);
      toast.error(err.message || "Failed to update star");
      // Revert optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id)?.toString() === messageId
            ? { ...m, isStarred: currentlyStarred }
            : m,
        ),
      );
    }
  };

  const handleToggleReaction = (message, emoji) => {
    const messageId = (message.id || message._id)?.toString();
    if (!messageId || !currentSelectedUser) return;

    const myId = (user?.id || user?._id)?.toString();
    const myName = user?.username || "You";

    setMessages((prev) =>
      prev.map((m) => {
        if ((m.id || m._id)?.toString() !== messageId) return m;
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
      messageId,
      conversationType: "dm",
      conversationId: currentSelectedUser.id,
      emoji,
    });
  };

  return (
    <MessageThread
      selectedUser={currentSelectedUser}
      messages={messages}
      loading={loading}
      error={error}
      onSendMessage={handleSendMessage}
      onEditMessage={handleEditMessage}
      onDeleteMessage={handleDeleteMessage}
      onToggleStar={handleToggleStar}
      onToggleReaction={handleToggleReaction}
      onForwardMessage={onForwardMessage}
      onNavigateSource={onNavigateSource}
      currentUserId={user?.id || user?._id}
      onOpenSidebar={onOpenSidebar}
      isBlocked={isBlocked}
      onToggleBlock={onToggleBlock}
      onClearError={() => setError(null)}
    />
  );
};

export default DirectMessaging;
