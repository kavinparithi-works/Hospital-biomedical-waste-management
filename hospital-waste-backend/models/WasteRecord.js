const mongoose = require('mongoose');

const wasteRecordSchema = new mongoose.Schema({
  recordId: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  room: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Infectious Waste', 'Sharps', 'Chemical Waste', 'General Waste', 'Contaminated Recyclable']
  },
  weight: {
    type: Number,
    required: true
  },
  assignedBin: {
    type: String,
    required: true,
    enum: ['Yellow', 'Red', 'White', 'Blue', 'Green']
  },
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'Collected', 'Completed', 'Disposed', 'Cancelled'],
    default: 'Pending'
  },
  createdBy: {
    type: String,
    default: 'Medical Staff'
  },
  assignedTo: {
    type: String,
    default: ''
  },
  assignedToUserId: {
    type: String,
    default: ''
  },
  assignedTime: {
    type: Date,
    default: null
  },
  collectedBy: {
    type: String,
    default: ''
  },
  collectedByUserId: {
    type: String,
    default: ''
  },
  collectedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  disposedAt: {
    type: Date,
    default: null
  },
  binVerified: {
    type: Boolean,
    default: false
  },
  binMismatchNote: {
    type: String,
    default: ''
  },
  lastReminderSentAt: {
    type: Date,
    default: null
  },
  reminderCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WasteRecord', wasteRecordSchema);
