const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const WasteRecord = require('../models/WasteRecord');
const User = require('../models/User');
const { requireRole } = require('../middleware/auth');

router.param('id', (req, res, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ message: `Invalid notification id: ${id}` });
  next();
});

// GET /api/notifications - Notifications addressed to the logged-in user, or broadcast to their role
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const query = {
      $or: [
        { recipientUserId: userId },
        { recipientUserId: '', recipientRole: { $in: [role, 'all'] } },
        { recipientUserId: { $exists: false }, recipientRole: { $in: [role, 'all'] } }
      ]
    };

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(100);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const query = {
      isRead: false,
      $or: [
        { recipientUserId: userId },
        { recipientUserId: '', recipientRole: { $in: [role, 'all'] } },
        { recipientUserId: { $exists: false }, recipientRole: { $in: [role, 'all'] } }
      ]
    };
    await Notification.updateMany(query, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

// POST /api/notifications/reminder - Staff sends an overdue reminder to assigned worker
router.post('/reminder', requireRole('staff', 'admin'), async (req, res) => {
  try {
    const { wasteRecordId, recordId, cooldownSeconds = 60 } = req.body;
    const staffName = req.user.name || req.body.staffName;
    const staffId = req.user.id;

    // Find the waste record
    let record = null;
    if (wasteRecordId) {
      record = await WasteRecord.findById(wasteRecordId);
    } else if (recordId) {
      record = await WasteRecord.findOne({ recordId });
    }

    if (!record) {
      return res.status(404).json({ message: 'Waste record not found' });
    }

    if (record.status === 'Completed' || record.status === 'Disposed' || record.status === 'Cancelled') {
      return res.status(400).json({ message: `Waste record is already ${record.status.toLowerCase()}. No reminder needed.` });
    }

    if (!record.assignedTo && !record.assignedToUserId) {
      return res.status(400).json({ message: 'No worker is assigned to this record yet. Please assign a worker first.' });
    }

    // Cooldown check (prevent spam)
    if (record.lastReminderSentAt) {
      const elapsedMs = Date.now() - new Date(record.lastReminderSentAt).getTime();
      const cooldownMs = cooldownSeconds * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          message: `Reminder was recently sent to ${record.assignedTo}. Please wait ${remainingSec}s before sending another reminder.`,
          remainingSeconds: remainingSec
        });
      }
    }

    // Determine recipient user ID
    let recipientUserId = record.assignedToUserId || '';
    if (!recipientUserId && record.assignedTo) {
      // Find worker by name if ID was not stored
      const workerUser = await User.findOne({ name: record.assignedTo, role: 'worker' });
      if (workerUser) {
        recipientUserId = workerUser._id.toString();
        record.assignedToUserId = recipientUserId;
      }
    }

    // Calculate overdue duration
    const referenceTime = record.assignedTime || record.createdAt;
    const diffMs = Math.max(0, Date.now() - new Date(referenceTime).getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const overdueStr = diffHours > 0 ? `${diffHours}h ${diffMins}m` : `${diffMins}m`;

    // 1. Notification for the assigned worker
    const workerNotification = new Notification({
      recipientUserId: recipientUserId || '',
      recipientRole: 'worker',
      senderUserId: staffId || '',
      senderName: staffName || 'Medical Staff',
      recordId: record.recordId,
      wasteRecordId: record._id,
      type: 'reminder',
      title: `Collection Reminder: ${record.recordId}`,
      message: `Medical Staff (${staffName || 'Ward Staff'}) sent a reminder for uncollected waste in ${record.room} (${record.category}, ${record.weight} kg). Overdue by ${overdueStr}.`,
      room: record.room,
      category: record.category,
      weight: record.weight,
      assignedBin: record.assignedBin,
      isRead: false
    });
    await workerNotification.save();

    // 2. Notification confirmation for Staff Dashboard inbox
    const staffNotification = new Notification({
      recipientUserId: staffId || '',
      recipientRole: 'staff',
      senderUserId: staffId || '',
      senderName: staffName || 'Medical Staff',
      recordId: record.recordId,
      wasteRecordId: record._id,
      type: 'reminder',
      title: `Reminder Sent: ${record.recordId}`,
      message: `Reminder successfully dispatched to ${record.assignedTo || 'Assigned Worker'} for Room ${record.room}. Overdue: ${overdueStr}.`,
      room: record.room,
      category: record.category,
      weight: record.weight,
      assignedBin: record.assignedBin,
      isRead: false
    });
    await staffNotification.save();

    // Update record reminder timestamp
    record.lastReminderSentAt = new Date();
    record.reminderCount = (record.reminderCount || 0) + 1;
    await record.save();

    res.json({
      message: `Reminder sent to ${record.assignedTo || 'worker'} successfully`,
      lastReminderSentAt: record.lastReminderSentAt,
      reminderCount: record.reminderCount,
      notificationId: workerNotification._id
    });
  } catch (err) {
    console.error('Error sending reminder:', err);
    res.status(500).json({ message: 'Failed to send reminder' });
  }
});

module.exports = router;
