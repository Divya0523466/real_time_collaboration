import Notification from "../models/Notification.js";

/**
 * Creates and persists a notification in MongoDB and broadcasts it in real-time
 * via Socket.IO to the recipient's personal room ('user:<userId>').
 */
export const createAndSendNotification = async (io, {
  recipientId,
  actorId = null,
  type,
  title,
  message,
  workspaceId = null,
  channelId = null,
  messageId = null,
  metadata = {},
}) => {
  try {
    if (!recipientId) return null;

    // Do not notify self
    if (actorId && recipientId.toString() === actorId.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipientId,
      actorId,
      type,
      title,
      message,
      workspaceId,
      channelId,
      messageId,
      metadata,
      isRead: false,
    });

    const populated = await Notification.findById(notification._id)
      .populate("actorId", "username email avatar")
      .populate("workspaceId", "name")
      .populate("channelId", "name type");

    if (io) {
      io.to(`user:${recipientId}`).emit("receive-notification", populated);
    }

    return populated;
  } catch (error) {
    console.error("Error creating/sending notification:", error);
    return null;
  }
};

/**
 * Batch version for notifying multiple recipients (e.g. channel broadcasts).
 */
export const createAndSendBatchNotifications = async (io, notifications) => {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];
  const results = [];
  for (const item of notifications) {
    const res = await createAndSendNotification(io, item);
    if (res) results.push(res);
  }
  return results;
};
