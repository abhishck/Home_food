import mongoose from 'mongoose';
import { NOTIFICATION_TYPE } from '../constants/index.js';

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 500 },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    data: { type: Map, of: mongoose.Schema.Types.Mixed }, // contextual payload
    actionUrl: { type: String }, // deep link / route
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 }); // TTL: 90 days

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
