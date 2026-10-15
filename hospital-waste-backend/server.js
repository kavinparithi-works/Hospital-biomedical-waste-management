require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const WasteRecord = require('./models/WasteRecord');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const wasteRoutes = require('./routes/waste');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/biowaste_db';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set in .env — using an insecure development default.');
}

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hospital Biomedical Waste API is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/waste', requireAuth, wasteRoutes);
app.use('/api/ai', requireAuth, aiRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);

// JSON 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Central error handler (malformed JSON, invalid ObjectIds, validation errors)
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body' });
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Auto-seed default users and initial sample waste records
async function seedDatabase() {
  try {
    // Migration: Update any legacy status values
    await WasteRecord.updateMany({ status: 'Pending Collection' }, { status: 'Pending' });

    const userCount = await User.countDocuments();
    if (userCount < 100) {
      console.log('Seeding 150 users (Admin, 75 Staff, 75 Workers)...');
      const salt = await bcrypt.genSalt(10);
      const defaultPasswordHash = await bcrypt.hash('Password123', salt);

      const usersToInsert = [];

      // Ensure Admin exists
      const adminExists = await User.findOne({ email: 'admin@hospital.com' });
      if (!adminExists) {
        usersToInsert.push({
          name: 'System Admin',
          email: 'admin@hospital.com',
          username: 'adminname',
          password: defaultPasswordHash,
          phone: '9876543210',
          role: 'admin',
          department: 'Administration',
          isActive: true
        });
      }

      // 75 Staff Users
      const departments = ['Emergency', 'ICU', 'Pediatrics', 'Surgery', 'General Ward', 'Oncology', 'Cardiology', 'Radiology'];
      for (let i = 1; i <= 75; i++) {
        const numStr = String(i).padStart(3, '0');
        const email = `staff${numStr}@hospital.com`;
        const exists = await User.findOne({ email });
        if (!exists) {
          usersToInsert.push({
            name: `Staff Member ${i}`,
            email,
            username: `staff${numStr}`,
            password: defaultPasswordHash,
            phone: `9800000${numStr}`,
            role: 'staff',
            department: departments[i % departments.length],
            isActive: i % 10 !== 0 // 1 in 10 is inactive for testing filter
          });
        }
      }

      // 75 Worker Users
      const workerDepts = ['Logistics', 'Sanitation', 'Waste Mgt', 'Environmental Care'];
      for (let i = 1; i <= 75; i++) {
        const numStr = String(i).padStart(3, '0');
        const email = `worker${numStr}@hospital.com`;
        const exists = await User.findOne({ email });
        if (!exists) {
          usersToInsert.push({
            name: `Sanitation Worker ${i}`,
            email,
            username: `worker${numStr}`,
            password: defaultPasswordHash,
            phone: `9700000${numStr}`,
            role: 'worker',
            department: workerDepts[i % workerDepts.length],
            isActive: i % 12 !== 0
          });
        }
      }

      if (usersToInsert.length > 0) {
        await User.insertMany(usersToInsert);
        console.log(`Seeded ${usersToInsert.length} new users successfully!`);
      }
    }

    const wasteCount = await WasteRecord.countDocuments();
    if (wasteCount < 10) {
      console.log('Seeding sample waste records for current week (Mon-Sun)...');
      
      const now = new Date();
      const createDateForOffset = (daysAgo, hour = 10) => {
        const d = new Date(now.getTime() - daysAgo * 86400000);
        d.setHours(hour, 15, 0, 0);
        return d;
      };

      const sampleRecords = [
        {
          recordId: 'WR-101',
          description: 'Expired pharmaceuticals & chemical solutions',
          room: 'Pharmacy Store',
          category: 'Chemical Waste',
          weight: 12.5,
          assignedBin: 'Yellow',
          status: 'Completed',
          createdBy: 'Staff Member 1',
          collectedBy: 'Sanitation Worker 1',
          collectedAt: createDateForOffset(6, 14),
          createdAt: createDateForOffset(6, 9)
        },
        {
          recordId: 'WR-102',
          description: 'Used blood bags & IV tubing',
          room: 'ICU Bed 4',
          category: 'Infectious Waste',
          weight: 18.2,
          assignedBin: 'Yellow',
          status: 'Completed',
          createdBy: 'Staff Member 2',
          collectedBy: 'Sanitation Worker 3',
          collectedAt: createDateForOffset(5, 12),
          createdAt: createDateForOffset(5, 8)
        },
        {
          recordId: 'WR-103',
          description: 'Surgical scalpels & glass vials',
          room: 'Operation Theater 2',
          category: 'Sharps',
          weight: 8.4,
          assignedBin: 'White',
          status: 'Completed',
          createdBy: 'Staff Member 3',
          collectedBy: 'Sanitation Worker 2',
          collectedAt: createDateForOffset(4, 15),
          createdAt: createDateForOffset(4, 10)
        },
        {
          recordId: 'WR-104',
          description: 'Disposed masks & general packaging',
          room: 'General Ward 101',
          category: 'General Waste',
          weight: 25.0,
          assignedBin: 'Green',
          status: 'Completed',
          createdBy: 'Staff Member 4',
          collectedBy: 'Sanitation Worker 1',
          collectedAt: createDateForOffset(3, 11),
          createdAt: createDateForOffset(3, 8)
        },
        {
          recordId: 'WR-105',
          description: 'Plastic IV bottles & syringes',
          room: 'Pediatrics Ward',
          category: 'Contaminated Recyclable',
          weight: 14.8,
          assignedBin: 'Red',
          status: 'Collected',
          createdBy: 'Staff Member 5',
          collectedBy: 'Sanitation Worker 4',
          collectedAt: createDateForOffset(2, 16),
          createdAt: createDateForOffset(2, 11)
        },
        {
          recordId: 'WR-106',
          description: 'Soiled cotton swabs & bandages',
          room: 'Emergency Room',
          category: 'Infectious Waste',
          weight: 22.3,
          assignedBin: 'Yellow',
          status: 'Assigned',
          createdBy: 'Staff Member 6',
          createdAt: createDateForOffset(1, 9)
        },
        {
          recordId: 'WR-107',
          description: 'Broken glass ampoules & slides',
          room: 'Pathology Lab',
          category: 'Sharps',
          weight: 6.7,
          assignedBin: 'Blue',
          status: 'Pending',
          createdBy: 'Staff Member 7',
          createdAt: createDateForOffset(0, 8)
        },
        {
          recordId: 'WR-108',
          description: 'General office waste & paper wrappers',
          room: 'Admin Block',
          category: 'General Waste',
          weight: 19.5,
          assignedBin: 'Green',
          status: 'Pending',
          createdBy: 'Staff Member 1',
          createdAt: createDateForOffset(0, 10)
        }
      ];

      await WasteRecord.insertMany(sampleRecords);
      console.log('Sample weekly waste records seeded successfully!');
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

// Connect to MongoDB and start server
async function start(uri = MONGO_URI) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('Connected to MongoDB at', uri);
    await seedDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Backend server is running on http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other process or set a different PORT in .env.`);
        process.exit(1);
      }
      throw err;
    });
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error(`Could not reach MongoDB at ${uri}. Start MongoDB (e.g. "docker compose up -d mongo") or run "npm run dev:memory" for a throwaway in-memory database.`);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
