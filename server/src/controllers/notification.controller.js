import Notification from '../models/Notification.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import notificationService from '../services/notification.service.js';
import { paginate, getPaginationOptions } from '../utils/paginate.js';

// GET /api/notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const { docs, meta } = await paginate(
    Notification,
    { recipient: req.user._id },
    getPaginationOptions(req.query)
  );
  const unreadCount = await notificationService.getUnreadCount(req.user._id);
  return ApiResponse.success(res, { notifications: docs, unreadCount }, 'Notifications', 200, meta);
});

// PATCH /api/notifications/read
export const markAsRead = asyncHandler(async (req, res) => {
  const { ids } = req.body; // optional array of notification ids
  await notificationService.markAsRead(req.user._id, ids || []);
  return ApiResponse.success(res, null, 'Notifications marked as read');
});

// DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  return ApiResponse.success(res, null, 'Notification deleted');
});
