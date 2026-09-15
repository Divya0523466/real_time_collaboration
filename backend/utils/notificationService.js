import Notification from "../models/Notification.js";

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
  } catch {
    return null;
  }
};