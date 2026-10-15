require('dotenv').config();
const mongoose = require('mongoose');
const WasteRecord = require('./models/WasteRecord');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/biowaste_db';

const STAFF_NAMES = [
  "Dr. Rajesh Sharma", "Nurse Priya Nair", "Dr. Ananya Iyer", "Staff Vikram Sen", "Dr. Kavita Deshmukh",
  "Nurse Deepika Menon", "Dr. Arjun Kulkarni", "Staff Meera Pillai", "Dr. Suresh Bhatt", "Nurse Pooja Varma",
  "Dr. Rohan Banerjee", "Staff Swati Hegde", "Dr. Aditya Joshi", "Nurse Sunita Rao", "Dr. Manoj Tiwari"
];

const WORKER_NAMES = [
  "Ramesh Kumar", "Santhosh M.", "Ganesh V.", "Pravin K.", "Murugan R.",
  "Selvam P.", "Dinesh Kumar", "Anand T.", "Kathiravan S.", "Velu M."
];

const rooms = ['ICU Bed 2', 'Emergency Ward A', 'Surgery OT 1', 'Pediatrics Ward', 'General Ward B', 'Oncology Ward', 'Radiology Room 3', 'ICU Bed 8'];
const categories = [
  { name: 'Infectious Waste', bin: 'Yellow', baseWeight: 14 },
  { name: 'Contaminated Recyclable', bin: 'Red', baseWeight: 18 },
  { name: 'Chemical Waste', bin: 'Yellow', baseWeight: 8 },
  { name: 'Glassware & Metallic Implants', bin: 'Blue', baseWeight: 6 },
  { name: 'Sharps', bin: 'White', baseWeight: 5 },
  { name: 'General Waste', bin: 'Green', baseWeight: 22 }
];

async function seedPastWeeks() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB for past weeks seeding');

    // Create records for the past 6 weeks (from today going back 45 days)
    const today = new Date();
    const recordsToInsert = [];
    let recordCounter = await WasteRecord.countDocuments() + 200;

    for (let dayOffset = 1; dayOffset <= 45; dayOffset++) {
      const recordDate = new Date(today.getTime() - dayOffset * 86400000);
      
      // Seed 2 to 4 waste entries for each day
      const entriesPerDay = Math.floor(Math.random() * 3) + 2;
      for (let j = 0; j < entriesPerDay; j++) {
        recordCounter++;
        const cat = categories[(dayOffset + j) % categories.length];
        const weightVariation = (Math.random() * 8 - 4).toFixed(1);
        const weight = Math.max(1.5, Number((cat.baseWeight + Number(weightVariation)).toFixed(1)));
        
        const staff = STAFF_NAMES[(dayOffset + j) % STAFF_NAMES.length];
        const worker = WORKER_NAMES[(dayOffset + j) % WORKER_NAMES.length];
        const room = rooms[(dayOffset + j) % rooms.length];

        const isCompleted = j % 2 === 0;
        const collectedAt = new Date(recordDate.getTime() + (45 + ((dayOffset * 7 + j * 13) % 120)) * 60000);
        recordsToInsert.push({
          recordId: `WR-HIST-${recordCounter}`,
          description: `${cat.name} logged from ${room}`,
          room,
          category: cat.name,
          weight,
          assignedBin: cat.bin,
          status: isCompleted ? 'Completed' : 'Collected',
          createdBy: staff,
          assignedTo: worker,
          collectedBy: worker,
          collectedAt,
          completedAt: isCompleted ? new Date(collectedAt.getTime() + 30 * 60000) : null,
          disposedAt: isCompleted ? new Date(collectedAt.getTime() + 30 * 60000) : null,
          binVerified: isCompleted,
          createdAt: recordDate
        });
      }
    }

    let insertedCount = 0;
    for (const r of recordsToInsert) {
      const exists = await WasteRecord.findOne({ recordId: r.recordId });
      if (!exists) {
        await WasteRecord.create(r);
        insertedCount++;
      }
    }

    console.log(`Seeded historical records for past 6 weeks! Total records inserted: ${insertedCount}`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding past weeks:', err);
    process.exit(1);
  }
}

seedPastWeeks();
