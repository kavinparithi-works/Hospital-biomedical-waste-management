const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientUserId: {
    type: String,
    default: ''
  },
  recipientRole: {
    type: String,
    enum: ['admin', 'staff', 'worker', 'all'],
    default: 'worker'
  },
  senderUserId: {
    type: String,
    default: ''
  },
  senderName: {
    type: String,
    default: ''
  },
  recordId: {
    type: String,
    default: ''
  },
  wasteRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteRecord',
    default: null
  },
  type: {
    type: String,
    enum: ['assignment', 'reminder', 'collection', 'disposal', 'status_update'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  room: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  weight: {
    type: Number,
    default: 0
  },
  assignedBin: {
    type: String,
    default: ''
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
