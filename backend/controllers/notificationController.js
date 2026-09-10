import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, skip = 0, unreadOnly } = req.query;

    const filter = { recipientId: userId };
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const parsedSkip = Math.max(parseInt(skip, 10) || 0, 0);

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(parsedSkip)
        .limit(parsedLimit)
        .populate("actorId", "username email avatar")
        .populate("workspaceId", "name")
        .populate("channelId", "name type"),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      totalCount,
      unreadCount,
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get unread count",
      error: error.message,
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { new: true }
    )
      .populate("actorId", "username email avatar")
      .populate("workspaceId", "name")
      .populate("channelId", "name type");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
      unreadCount,
    });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      recipientId: userId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      unreadCount,
    });
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};
