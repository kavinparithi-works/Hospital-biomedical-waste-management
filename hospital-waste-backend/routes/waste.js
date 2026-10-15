const express = require('express');
const router = express.Router();
const WasteRecord = require('../models/WasteRecord');
const Notification = require('../models/Notification');
const { requireRole } = require('../middleware/auth');
const { isCompliant, hasMismatch, CATEGORIES, BINS } = require('../utils/compliance');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ACTIVE_STATUSES = ['Pending', 'Assigned'];
const DONE_STATUSES = ['Completed', 'Disposed'];
const sumWeight = (arr) => arr.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

// Reject malformed Mongo ids up-front so handlers never throw CastErrors
router.param('id', (req, res, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({ message: `Invalid record id: ${id}` });
  next();
});

/**
 * Build IST-correct start and end UTC timestamps for a given date string (YYYY-MM-DD)
 * or today if no date is provided.
 *
 * Root cause of the date bug:
 * The old getTodayStart() called d.setHours(0,0,0,0) which uses the Node.js
 * process TZ. If TZ is not set (defaults to UTC on most servers), midnight
 * is computed in UTC, not IST. IST is UTC+5:30, so:
 *   - UTC midnight = 5:30 AM IST  (records 12am-5:30am IST were excluded from "today")
 *   - IST midnight = 6:30 PM previous UTC day (yesterday's evening appeared as "today")
 * Fix: Build IST midnight explicitly by parsing the date string + IST offset.
 */
function getISTDayBounds(dateStr) {
  let year, month, day;
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    [year, month, day] = dateStr.split('-').map(Number);
  } else {
    // Default: today in IST
    const now = new Date();
    // Convert current UTC time to IST (UTC+5:30 = +330 minutes)
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    year = istNow.getUTCFullYear();
    month = istNow.getUTCMonth() + 1;
    day = istNow.getUTCDate();
  }
  // IST midnight = UTC time minus 5h30m
  // e.g. 2024-10-09 00:00:00 IST = 2024-10-08 18:30:00 UTC
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const startIST = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const startUTC = new Date(startIST.getTime() - istOffsetMs);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  return { startUTC, endUTC };
}

// Legacy compat — today's start in IST-correct UTC
function getTodayStart() {
  return getISTDayBounds().startUTC;
}

// Helper function to generate unique auto-incrementing Record ID (WR-001, WR-002...)
async function generateRecordId() {
  const count = await WasteRecord.countDocuments();
  const nextNum = count + 1;
  const padded = String(nextNum).padStart(3, '0');
  let candidate = `WR-${padded}`;
  let exists = await WasteRecord.findOne({ recordId: candidate });
  let offset = 0;
  while (exists) {
    offset++;
    candidate = `WR-${String(nextNum + offset).padStart(3, '0')}`;
    exists = await WasteRecord.findOne({ recordId: candidate });
  }
  return candidate;
}

// Workers are always scoped to their own records regardless of query params
function scopeWorker(req) {
  if (req.user.role === 'worker') {
    return { workerName: req.user.name, workerId: req.user.id };
  }
  return { workerName: req.query.workerName, workerId: req.query.workerId };
}

// GET /api/waste - Get all waste records (with optional date & worker filter)
router.get('/', async (req, res) => {
  try {
    const { date, status } = req.query;
    const { workerName, workerId } = scopeWorker(req);
    let query = {};
    if (date === 'today') {
      const { startUTC, endUTC } = getISTDayBounds();
      query.createdAt = { $gte: startUTC, $lt: endUTC };
    } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const { startUTC, endUTC } = getISTDayBounds(date);
      query.createdAt = { $gte: startUTC, $lt: endUTC };
    }
    if (status) {
      query.status = status;
    }
    if (workerName || workerId) {
      const workerMatch = [];
      if (workerName) {
        workerMatch.push({ assignedTo: workerName });
        workerMatch.push({ collectedBy: workerName });
      }
      if (workerId) {
        workerMatch.push({ assignedToUserId: workerId });
        workerMatch.push({ collectedByUserId: workerId });
      }
      query.$or = workerMatch;
    }
    const records = await WasteRecord.find(query).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    console.error('Error fetching waste records:', err);
    res.status(500).json({ message: 'Error fetching waste records' });
  }
});

// GET /api/waste/today - Only today's records
router.get('/today', async (req, res) => {
  try {
    const records = await WasteRecord.find({ createdAt: { $gte: getTodayStart() } }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    console.error('Error fetching today records:', err);
    res.status(500).json({ message: 'Error fetching today records' });
  }
});

// GET /api/waste/pending-previous - Pending/Assigned records from BEFORE today
router.get('/pending-previous', async (req, res) => {
  try {
    const records = await WasteRecord.find({
      status: { $in: ['Pending', 'Assigned'] },
      createdAt: { $lt: getTodayStart() }
    }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    console.error('Error fetching previous pending records:', err);
    res.status(500).json({ message: 'Error fetching previous pending records' });
  }
});

// GET /api/waste/worker-stats - Dedicated statistics for Worker Dashboard
router.get('/worker-stats', async (req, res) => {
  try {
    const { workerName, workerId } = scopeWorker(req);
    const { startUTC: todayStart, endUTC: todayEnd } = getISTDayBounds();

    let workerQuery = {};
    if (workerName || workerId) {
      const workerMatch = [];
      if (workerName) {
        workerMatch.push({ assignedTo: workerName });
        workerMatch.push({ collectedBy: workerName });
      }
      if (workerId) {
        workerMatch.push({ assignedToUserId: workerId });
        workerMatch.push({ collectedByUserId: workerId });
      }
      workerQuery.$or = workerMatch;
    }

    const workerRecords = await WasteRecord.find(workerQuery);

    // 1. Total assigned pickups today: records assigned to this worker where assignedTime or createdAt is today
    const todayAssignedPickups = workerRecords.filter(r => {
      const dateToCheck = r.assignedTime ? new Date(r.assignedTime) : new Date(r.createdAt);
      return dateToCheck >= todayStart && dateToCheck < todayEnd;
    }).length;

    // 2. Pending collections: pending or assigned tasks for this worker
    const pendingCollections = workerRecords.filter(r => r.status === 'Pending' || r.status === 'Assigned').length;

    // 3. In-transit collections: 0 (transportation is not tracked as a distinct stage in existing backend; do not fabricate)
    const inTransitCollections = 0;

    // 4. Collected / ready to dispose
    const collectedCollections = workerRecords.filter(r => r.status === 'Collected').length;

    // 5. Completed disposals: all records completed/disposed by this worker
    const completedDisposals = workerRecords.filter(r => r.status === 'Completed' || r.status === 'Disposed').length;

    // 6. Overdue count: unfinished tasks (Pending or Assigned) created before today or older than 2 hours
    const overdueCount = workerRecords.filter(r => {
      if (r.status !== 'Pending' && r.status !== 'Assigned') return false;
      const refTime = r.assignedTime ? new Date(r.assignedTime).getTime() : new Date(r.createdAt).getTime();
      return refTime < todayStart.getTime() || (Date.now() - refTime) > 2 * 60 * 60 * 1000;
    }).length;

    // Additional metrics for worker dashboard
    const todayCollections = workerRecords.filter(r =>
      (r.status === 'Collected' || r.status === 'Completed' || r.status === 'Disposed') &&
      r.collectedAt && new Date(r.collectedAt) >= todayStart
    ).length;

    const userTotalCollections = workerRecords.filter(r => r.status === 'Collected' || r.status === 'Completed' || r.status === 'Disposed').length;

    const todayWeightCollected = workerRecords
      .filter(r =>
        (r.status === 'Collected' || r.status === 'Completed' || r.status === 'Disposed') &&
        r.collectedAt &&
        new Date(r.collectedAt) >= todayStart
      )
      .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

    const roomMap = {};
    workerRecords.filter(r => r.status === 'Pending' || r.status === 'Assigned').forEach(r => {
      roomMap[r.room] = (roomMap[r.room] || 0) + 1;
    });
    const roomWisePending = Object.keys(roomMap).map(room => ({ room, count: roomMap[room] }));

    const recentNotifications = workerRecords
      .filter(r => r.status === 'Pending' || r.status === 'Assigned')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.json({
      todayAssignedPickups,
      pendingCollections,
      collectedCollections,
      inTransitCollections,
      completedDisposals,
      overdueCount,
      todayCollections,
      userTotalCollections,
      todayWeightCollected: Number(todayWeightCollected.toFixed(2)),
      roomWisePending,
      recentNotifications
    });
  } catch (err) {
    console.error('Error fetching worker stats:', err);
    res.status(500).json({ message: 'Error calculating worker statistics' });
  }
});

// GET /api/waste/history - Collection history with filters and search for logged-in worker
router.get('/history', async (req, res) => {
  try {
    const { search, category, room } = req.query;
    const { workerName, workerId } = scopeWorker(req);
    let query = { status: 'Completed' };
    if (category) query.category = category;
    if (room) query.room = room;
    
    // Ensure worker only sees completed records belonging to them
    if (workerName || workerId) {
      const workerMatch = [];
      if (workerName) {
        workerMatch.push({ collectedBy: workerName });
        workerMatch.push({ assignedTo: workerName });
      }
      if (workerId) {
        workerMatch.push({ collectedByUserId: workerId });
        workerMatch.push({ assignedToUserId: workerId });
      }
      query.$or = workerMatch;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      const searchConditions = [
        { recordId: searchRegex },
        { room: searchRegex },
        { description: searchRegex }
      ];
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            { $or: searchConditions },
            { status: 'Completed' }
          ]
        };
        if (category) query.$and.push({ category });
        if (room) query.$and.push({ room });
      } else {
        query.$or = searchConditions;
      }
    }

    const history = await WasteRecord.find(query).sort({ completedAt: -1, collectedAt: -1, createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error('Error fetching collection history:', err);
    res.status(500).json({ message: 'Error fetching collection history' });
  }
});

// GET /api/waste/stats - Dynamic system analytics for Admin (date-aware, IST-correct)
router.get('/stats', async (req, res) => {
  try {
    const { date, from, to } = req.query;

    // Build the selected day's IST-correct UTC bounds
    const { startUTC: dayStart, endUTC: dayEnd } = getISTDayBounds(date || null);
    // Fetch all waste records (sorted newest to oldest)
    const allRecords = await WasteRecord.find().sort({ createdAt: -1 });

    // Records for the SELECTED day (or today by default)
    const selectedDayRecords = allRecords.filter(r => {
      const t = new Date(r.createdAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });

    const liveDayRecords = selectedDayRecords.filter(r => r.status !== 'Cancelled');
    const totalWeight = sumWeight(liveDayRecords);
    const pendingCount = liveDayRecords.filter(r => ACTIVE_STATUSES.includes(r.status)).length;
    const collectedCount = liveDayRecords.filter(r => r.status === 'Collected' || DONE_STATUSES.includes(r.status)).length;
    const cancelledCount = selectedDayRecords.length - liveDayRecords.length;

    const totalRecords = liveDayRecords.length;
    // Real segregation compliance: category placed in its statutory bin colour, and no mismatch reported by the worker
    const compliantRecords = liveDayRecords.filter(r => isCompliant(r.category, r.assignedBin) && !hasMismatch(r));
    const complianceRate = totalRecords > 0 ? Math.round((compliantRecords.length / totalRecords) * 100) : 100;

    const todayTotalRecords = totalRecords;
    const todayPending = pendingCount;
    const todayCompleted = collectedCount;

    // Previous-day comparison for trend indicators
    const prevDayStart = new Date(dayStart.getTime() - 86400000);
    const prevDayRecords = allRecords.filter(r => {
      const t = new Date(r.createdAt).getTime();
      return t >= prevDayStart.getTime() && t < dayStart.getTime() && r.status !== 'Cancelled';
    });
    const prevWeight = sumWeight(prevDayRecords);
    const weightChangePct = prevWeight > 0 ? Math.round(((totalWeight - prevWeight) / prevWeight) * 1000) / 10 : null;
    const prevCompliant = prevDayRecords.filter(r => isCompliant(r.category, r.assignedBin) && !hasMismatch(r)).length;
    const prevComplianceRate = prevDayRecords.length > 0 ? Math.round((prevCompliant / prevDayRecords.length) * 100) : null;
    const complianceChangePct = prevComplianceRate === null ? null : complianceRate - prevComplianceRate;

    // Average collection turnaround (creation -> collection) for the selected day, in minutes
    const turnaroundSamples = liveDayRecords
      .filter(r => r.collectedAt)
      .map(r => (new Date(r.collectedAt).getTime() - new Date(r.createdAt).getTime()) / 60000)
      .filter(m => m >= 0);
    const avgTurnaroundMinutes = turnaroundSamples.length > 0
      ? Math.round(turnaroundSamples.reduce((a, b) => a + b, 0) / turnaroundSamples.length)
      : null;

    // Previous pending: pending from before the selected day
    const previousDaysPending = allRecords.filter(r =>
      ACTIVE_STATUSES.includes(r.status) &&
      new Date(r.createdAt).getTime() < dayStart.getTime()
    ).length;

    const mismatchCount = liveDayRecords.filter(hasMismatch).length;

    // Weight by statutory bin colour (exhaustive, no double counting)
    const binBreakdown = {};
    BINS.forEach(bin => { binBreakdown[bin] = Number(sumWeight(liveDayRecords.filter(r => r.assignedBin === bin)).toFixed(2)); });
    const categoryWeights = {};
    CATEGORIES.forEach(cat => { categoryWeights[cat] = Number(sumWeight(liveDayRecords.filter(r => r.category === cat)).toFixed(2)); });

    const infectious = binBreakdown.Yellow;
    const sharps = binBreakdown.White;
    const general = binBreakdown.Green + binBreakdown.Red + binBreakdown.Blue;

    // Calculate Sunday-Saturday week bounds for the WEEK containing selectedDate
    const selectedISTDate = new Date(dayStart.getTime() + 5.5 * 60 * 60 * 1000);
    const dayOfWeek = selectedISTDate.getUTCDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
    const weekSundayStartUTC = new Date(dayStart.getTime() - dayOfWeek * 86400000);

    const daysOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyChartData = daysOrder.map((dayName, idx) => {
      const currentDayStart = new Date(weekSundayStartUTC.getTime() + idx * 86400000);
      const currentDayEnd = new Date(currentDayStart.getTime() + 86400000);

      const dayRecords = allRecords.filter(r => {
        const t = new Date(r.createdAt).getTime();
        return t >= currentDayStart.getTime() && t < currentDayEnd.getTime() && r.status !== 'Cancelled';
      });

      return {
        name: dayName,
        infectious: Number(sumWeight(dayRecords.filter(r => r.assignedBin === 'Yellow')).toFixed(1)) || 0,
        sharps: Number(sumWeight(dayRecords.filter(r => r.assignedBin === 'White')).toFixed(1)) || 0,
        general: Number(sumWeight(dayRecords.filter(r => ['Green', 'Red', 'Blue'].includes(r.assignedBin))).toFixed(1)) || 0,
        records: dayRecords.length
      };
    });

    const recentActivity = selectedDayRecords.map(r => ({
      id: r._id,
      recordId: r.recordId,
      room: r.room,
      category: r.category,
      weight: r.weight,
      assignedBin: r.assignedBin,
      status: r.status,
      createdAt: r.createdAt,
      action: (r.status === 'Collected' || r.status === 'Completed')
        ? `Collected by ${r.collectedBy || 'Worker'}`
        : `Logged by ${r.createdBy || 'Medical Staff'}`,
      updatedAt: r.updatedAt || r.createdAt
    }));

    const sunDateIST = new Date(weekSundayStartUTC.getTime() + 5.5 * 60 * 60 * 1000);
    const satDateIST = new Date(weekSundayStartUTC.getTime() + 6 * 86400000 + 5.5 * 60 * 60 * 1000);
    const opts = { month: 'short', day: '2-digit' };
    const weekRangeLabel = `${sunDateIST.toLocaleDateString('en-US', opts)} – ${satDateIST.toLocaleDateString('en-US', opts)}, ${satDateIST.getFullYear()}`;

    res.json({
      totalWeight: Number(totalWeight.toFixed(2)),
      pendingCount,
      collectedCount,
      complianceRate,
      todayTotalRecords,
      todayPending,
      todayCompleted,
      previousDaysPending,
      cancelledCount,
      mismatchCount,
      weightChangePct,
      complianceChangePct,
      avgTurnaroundMinutes,
      categoryBreakdown: { infectious, sharps, general },
      binBreakdown,
      categoryWeights,
      weeklyChartData,
      weekRangeLabel,
      recentActivity,
      recordsCount: totalRecords,
      selectedDate: date || null,
      noRecords: totalRecords === 0
    });
  } catch (err) {
    console.error('Error calculating waste stats:', err);
    res.status(500).json({ message: 'Error calculating waste statistics' });
  }
});

// POST /api/waste - Staff logs a new waste record
router.post('/', requireRole('staff', 'admin'), async (req, res) => {
  try {
    const { description, room, category, weight, assignedBin, assignedTo, assignedToUserId } = req.body;
    const createdBy = req.user.name || req.body.createdBy;
    if (!room || !category || !weight || !assignedBin) {
      return res.status(400).json({ message: 'Room number, Category, Weight, and Assigned Bin are required' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Invalid category. Allowed: ${CATEGORIES.join(', ')}` });
    }
    if (!BINS.includes(assignedBin)) {
      return res.status(400).json({ message: `Invalid bin. Allowed: ${BINS.join(', ')}` });
    }
    if (!(Number(weight) > 0)) {
      return res.status(400).json({ message: 'Weight must be a positive number' });
    }
    const recordId = await generateRecordId();
    const isAssigned = Boolean(assignedTo || assignedToUserId);
    const newRecord = new WasteRecord({
      recordId,
      description: description || '',
      room: room.trim(),
      category,
      weight: Number(weight),
      assignedBin,
      status: isAssigned ? 'Assigned' : 'Pending',
      createdBy: createdBy || 'Medical Staff',
      assignedTo: assignedTo || '',
      assignedToUserId: assignedToUserId || '',
      assignedTime: isAssigned ? new Date() : null
    });
    await newRecord.save();

    // Create notification for assigned worker if assigned
    if (isAssigned && (assignedToUserId || assignedTo)) {
      try {
        const notif = new Notification({
          recipientUserId: assignedToUserId || '',
          recipientRole: 'worker',
          senderName: createdBy || 'Medical Staff',
          recordId: newRecord.recordId,
          wasteRecordId: newRecord._id,
          type: 'assignment',
          title: `New Task Assigned: ${newRecord.recordId}`,
          message: `You have been assigned to collect ${newRecord.category} (${newRecord.weight} kg) from ${newRecord.room}.`,
          room: newRecord.room,
          category: newRecord.category,
          weight: newRecord.weight,
          assignedBin: newRecord.assignedBin,
          isRead: false
        });
        await notif.save();
      } catch (errNotif) {
        console.warn('Failed to dispatch worker assignment notification:', errNotif);
      }
    }

    res.status(201).json({ message: 'Waste record logged successfully', record: newRecord });
  } catch (err) {
    console.error('Error logging waste record:', err);
    res.status(500).json({ message: 'Failed to log waste record' });
  }
});

// PUT /api/waste/:id/assign - Staff assigns/reassigns a worker to an existing waste record
router.put('/:id/assign', requireRole('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, assignedToUserId } = req.body;
    const staffName = req.user.name || req.body.staffName;
    const record = await WasteRecord.findById(id);
    if (!record) return res.status(404).json({ message: 'Waste record not found' });
    if (DONE_STATUSES.includes(record.status) || record.status === 'Cancelled') {
      return res.status(400).json({ message: `Cannot reassign a record with status '${record.status}'` });
    }
    record.assignedTo = assignedTo || '';
    record.assignedToUserId = assignedToUserId || '';
    record.assignedTime = new Date();
    if (record.status === 'Pending') {
      record.status = 'Assigned';
    }
    await record.save();

    // Notify assigned worker
    if (assignedToUserId || assignedTo) {
      try {
        const notif = new Notification({
          recipientUserId: assignedToUserId || '',
          recipientRole: 'worker',
          senderName: staffName || 'Medical Staff',
          recordId: record.recordId,
          wasteRecordId: record._id,
          type: 'assignment',
          title: `Task Assigned: ${record.recordId}`,
          message: `You were assigned to collect ${record.category} (${record.weight} kg) from ${record.room}.`,
          room: record.room,
          category: record.category,
          weight: record.weight,
          assignedBin: record.assignedBin,
          isRead: false
        });
        await notif.save();
      } catch (errNotif) {
        console.warn('Failed to create assignment notification:', errNotif);
      }
    }

    res.json({ message: `Waste record assigned to ${record.assignedTo}`, record });
  } catch (err) {
    console.error('Error assigning worker:', err);
    res.status(500).json({ message: 'Failed to assign worker' });
  }
});

// PUT /api/waste/:id/collect - Worker marks waste as Collected
router.put('/:id/collect', requireRole('worker', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const collectedBy = req.user.name || req.body.collectedBy || 'Worker User';
    const collectedByUserId = req.user.id;
    const record = await WasteRecord.findById(id);
    if (!record) return res.status(404).json({ message: 'Waste record not found' });
    if (record.status === 'Cancelled') {
      return res.status(400).json({ message: 'This waste record was cancelled by staff' });
    }
    if (record.status === 'Collected' || DONE_STATUSES.includes(record.status)) {
      return res.status(400).json({ message: 'This waste record has already been collected or disposed' });
    }
    record.status = 'Collected';
    record.collectedBy = collectedBy;
    record.collectedByUserId = collectedByUserId;
    record.collectedAt = new Date();
    await record.save();

    // Create confirmation notification for staff
    try {
      const notif = new Notification({
        recipientRole: 'staff',
        senderUserId: collectedByUserId || '',
        senderName: record.collectedBy,
        recordId: record.recordId,
        wasteRecordId: record._id,
        type: 'collection',
        title: `Waste Collected: ${record.recordId}`,
        message: `${record.collectedBy} collected waste from ${record.room} (${record.category}, ${record.weight} kg). Ready for disposal.`,
        room: record.room,
        category: record.category,
        weight: record.weight,
        assignedBin: record.assignedBin,
        isRead: false
      });
      await notif.save();
    } catch (errNotif) {
      console.warn('Failed to dispatch collection notification to staff:', errNotif);
    }

    res.json({ message: 'Waste marked as collected successfully', recordId: record.recordId, status: record.status, collectedBy: record.collectedBy, collectedAt: record.collectedAt, record });
  } catch (err) {
    console.error('Error marking waste as collected:', err);
    res.status(500).json({ message: 'Failed to update collection status' });
  }
});

// PUT /api/waste/:id/complete - Worker marks waste as Completed (disposal done)
// Enforces workflow: Pending/Assigned → Collected → Completed (Disposed)
router.put('/:id/complete', requireRole('worker', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { binVerified, binMismatchNote } = req.body;
    const collectedBy = req.user.name || req.body.collectedBy;
    const collectedByUserId = req.user.id;
    const record = await WasteRecord.findById(id);
    if (!record) return res.status(404).json({ message: 'Waste record not found' });
    if (record.status === 'Completed' || record.status === 'Disposed') {
      return res.status(400).json({ message: 'This waste record is already completed/disposed' });
    }
    if (record.status !== 'Collected') {
      return res.status(400).json({ message: 'Waste must be collected before it can be disposed of. Current status: ' + record.status });
    }
    record.status = 'Completed';
    if (collectedBy) record.collectedBy = collectedBy;
    if (collectedByUserId) record.collectedByUserId = collectedByUserId;
    if (!record.collectedAt) record.collectedAt = new Date();
    record.completedAt = new Date();
    record.disposedAt = new Date();
    if (typeof binVerified !== 'undefined') record.binVerified = binVerified;
    if (binMismatchNote) record.binMismatchNote = binMismatchNote;
    await record.save();

    // Create confirmation notification for staff
    try {
      const notif = new Notification({
        recipientRole: 'staff',
        senderUserId: collectedByUserId || '',
        senderName: record.collectedBy || 'Worker',
        recordId: record.recordId,
        wasteRecordId: record._id,
        type: 'disposal',
        title: `Disposal Completed: ${record.recordId}`,
        message: `${record.collectedBy || 'Worker'} completed disposal for ${record.room}. Verification: ${binVerified !== false ? 'Bag Matched Bin' : 'Mismatch Reported'}.`,
        room: record.room,
        category: record.category,
        weight: record.weight,
        assignedBin: record.assignedBin,
        isRead: false
      });
      await notif.save();
    } catch (errNotif) {
      console.warn('Failed to dispatch disposal notification to staff:', errNotif);
    }

    res.json({ message: 'Waste disposal marked as completed', recordId: record.recordId, status: record.status, record });
  } catch (err) {
    console.error('Error marking waste as completed:', err);
    res.status(500).json({ message: 'Failed to update completion status' });
  }
});

// PUT /api/waste/:id/cancel - Staff/Admin cancels a record that has not been collected yet
router.put('/:id/cancel', requireRole('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const record = await WasteRecord.findById(id);
    if (!record) return res.status(404).json({ message: 'Waste record not found' });
    if (!ACTIVE_STATUSES.includes(record.status)) {
      return res.status(400).json({ message: `Only Pending/Assigned records can be cancelled. Current status: ${record.status}` });
    }
    record.status = 'Cancelled';
    record.cancelledAt = new Date();
    record.cancelledBy = req.user.name || 'Medical Staff';
    record.cancelReason = (reason || '').trim();
    await record.save();

    if (record.assignedToUserId || record.assignedTo) {
      try {
        await new Notification({
          recipientUserId: record.assignedToUserId || '',
          recipientRole: 'worker',
          senderUserId: req.user.id,
          senderName: record.cancelledBy,
          recordId: record.recordId,
          wasteRecordId: record._id,
          type: 'status_update',
          title: `Task Cancelled: ${record.recordId}`,
          message: `${record.cancelledBy} cancelled the collection for ${record.room} (${record.category}, ${record.weight} kg).${record.cancelReason ? ' Reason: ' + record.cancelReason : ''}`,
          room: record.room,
          category: record.category,
          weight: record.weight,
          assignedBin: record.assignedBin
        }).save();
      } catch (errNotif) {
        console.warn('Failed to dispatch cancellation notification:', errNotif);
      }
    }

    res.json({ message: `Waste record ${record.recordId} cancelled`, record });
  } catch (err) {
    console.error('Error cancelling waste record:', err);
    res.status(500).json({ message: 'Failed to cancel waste record' });
  }
});

// DELETE /api/waste/:id - Admin permanently removes a record (audit cleanup)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const record = await WasteRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Waste record not found' });
    await Notification.deleteMany({ wasteRecordId: record._id });
    res.json({ message: `Waste record ${record.recordId} deleted` });
  } catch (err) {
    console.error('Error deleting waste record:', err);
    res.status(500).json({ message: 'Failed to delete waste record' });
  }
});

module.exports = router;
