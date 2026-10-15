require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const WasteRecord = require('./models/WasteRecord');
const bcrypt = require('bcryptjs');

const STAFF_NAMES = [
  "Dr. Rajesh Sharma", "Nurse Priya Nair", "Dr. Ananya Iyer", "Staff Vikram Sen", "Dr. Kavita Deshmukh",
  "Nurse Deepika Menon", "Dr. Arjun Kulkarni", "Staff Meera Pillai", "Dr. Suresh Bhatt", "Nurse Pooja Varma",
  "Dr. Rohan Banerjee", "Staff Swati Hegde", "Dr. Aditya Joshi", "Nurse Sunita Rao", "Dr. Manoj Tiwari",
  "Staff Archana Pandey", "Dr. Siddharth Malhotra", "Nurse Divya Nambiar", "Dr. Ritu Choudhury", "Staff Alok Mishra",
  "Dr. Neha Agarwal", "Nurse Sneha Reddy", "Dr. Pradeep Chawla", "Staff Rekha Das", "Dr. Tarun Sethi",
  "Nurse Bhavna Saxena", "Dr. Arvind Swamy", "Staff Shalini Sinha", "Dr. Karthik Sundaram", "Nurse Preeti Kapoor",
  "Dr. Sanjay Mathur", "Staff Vandana Ghosh", "Dr. Harish Mahajan", "Nurse Reshma Khan", "Dr. Varun Bhatia",
  "Staff Nidhi Tripathi", "Dr. Abhinav Mukherji", "Nurse Rupa Somani", "Dr. Ashok Rastogi", "Staff Madhavi Krishnan",
  "Dr. Gautam Shenoy", "Nurse Smita Kulkarni", "Dr. Naveen Hegde", "Staff Priyanka Soni", "Dr. Kunal Mehra",
  "Nurse Tanvi Mittal", "Dr. Sandeep Parikh", "Staff Anita Bhalla", "Dr. Hemant Saxena", "Nurse Shilpa Gowda",
  "Dr. Ramanathan K.", "Staff Geeta Somani", "Dr. Chetan Shetty", "Nurse Rashmi Bansal", "Dr. Deepak Vohra",
  "Staff Leela Viswanathan", "Dr. Bhaskar Roy", "Nurse Monica Saini", "Dr. Ishan Kapoor", "Staff Uma Parameswaran",
  "Dr. Nitin Kaushik", "Nurse Suman Lata", "Dr. Devendra Somani", "Staff Radhika Menon", "Dr. Yashwant Patil",
  "Nurse Asha Bhonsle", "Dr. Mohan Ramachandran", "Staff Bindu Nair", "Dr. Shreekant Dubey", "Nurse Sarita Devi",
  "Dr. Anand Subbaraman", "Staff Payal Tandon", "Dr. Chirag Thaker", "Nurse Lata Murthy", "Dr. Vivek Singhania",
  "Staff Kalpana Shah", "Dr. Pankaj Ahuja", "Nurse Usha Ramaswamy", "Dr. Sourav Dutta", "Staff Komal Aggarwal"
];

const WORKER_NAMES = [
  "Ramesh Kumar", "Santhosh M.", "Ganesh V.", "Pravin K.", "Murugan R.",
  "Selvam P.", "Dinesh Kumar", "Anand T.", "Kathiravan S.", "Velu M.",
  "Manjunath B.", "Rajendran K.", "Suresh Babu", "Venkatesh R.", "Kumaravel P.",
  "Loganathan S.", "Balaji N.", "Prakash Chand", "Soundar R.", "Mohan Raj",
  "Ashok Kumar", "Sivakumar T.", "Thangaraj M.", "Gurusamy K.", "Karthikeyan S.",
  "Palani M.", "Vijaykumar R.", "Sakthivel N.", "Saravanan K.", "Dharmalingam P.",
  "Manikandan S.", "Senthil Kumar", "Prabhakaran V.", "Arumugam K.", "Boopathi R.",
  "Chandran M.", "Durairaj P.", "Elumalai S.", "Francis A.", "Gunasekaran K.",
  "Hariharan N.", "Iniyan T.", "Jayaraman R.", "Kannan M.", "Lingam S.",
  "Mahendran K.", "Natarajan V.", "Periasamy R.", "Raghu K.", "Sampath M.",
  "Thirunavukkarasu P.", "Udayakumar S.", "Vadivelu K.", "Xavier J.", "Yogeshwaran R.",
  "Zamir Ahmed", "Arunachalam S.", "Bhaskar M.", "Chidambaram K.", "Devaraj R.",
  "Ezhil S.", "Gopinath P.", "Harikrishnan M.", "Illango K.", "Jegadeesan S.",
  "Kaliappan R.", "Lakshmanan M.", "Marimuthu K.", "Nallasamy P.", "Ondiraj S.",
  "Ponraj M.", "Radhakrishnan K.", "Shanmugam R.", "Tamilselvan M.", "Umashankar K.",
  "Veeramani S.", "Vetrivel P.", "Washington R.", "Yuvaraj M.", "Zackaria Khan"
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/biowaste_db');
  console.log('Connected to DB');
  
  // Migration: Update legacy status
  await WasteRecord.updateMany({ status: 'Pending Collection' }, { status: 'Pending' });

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Password123', salt);

  const usersToInsert = [];
  const departments = ['Emergency', 'ICU', 'Pediatrics', 'Surgery', 'General Ward', 'Oncology', 'Cardiology', 'Radiology'];
  for (let i = 1; i <= Math.min(75, STAFF_NAMES.length); i++) {
    const numStr = String(i).padStart(3, '0');
    const email = `staff${numStr}@hospital.com`;
    const exists = await User.findOne({ email });
    if (!exists) {
      usersToInsert.push({
        name: STAFF_NAMES[i - 1],
        email,
        username: `staff${numStr}`,
        password: defaultPasswordHash,
        phone: `9800000${numStr}`,
        role: 'staff',
        department: departments[i % departments.length],
        isActive: i % 10 !== 0
      });
    }
  }

  const workerDepts = ['Logistics', 'Sanitation', 'Waste Mgt', 'Environmental Care'];
  for (let i = 1; i <= Math.min(75, WORKER_NAMES.length); i++) {
    const numStr = String(i).padStart(3, '0');
    const email = `worker${numStr}@hospital.com`;
    const exists = await User.findOne({ email });
    if (!exists) {
      usersToInsert.push({
        name: WORKER_NAMES[i - 1],
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
    console.log(`Seeded ${usersToInsert.length} users!`);
  }

  const yesterday = new Date(Date.now() - 86400000 * 1);
  const twoDaysAgo = new Date(Date.now() - 86400000 * 2);

  const sampleRecords = [
    {
      recordId: 'WR-101',
      description: 'Expired pharmaceuticals',
      room: 'Pharmacy Store',
      category: 'Chemical Waste',
      weight: 4.2,
      assignedBin: 'Yellow',
      status: 'Pending',
      createdBy: STAFF_NAMES[0],
      createdAt: twoDaysAgo
    },
    {
      recordId: 'WR-102',
      description: 'Used blood bags & tubing',
      room: 'ICU Bed 4',
      category: 'Infectious Waste',
      weight: 3.1,
      assignedBin: 'Yellow',
      status: 'Assigned',
      createdBy: STAFF_NAMES[1],
      createdAt: yesterday
    },
    {
      recordId: 'WR-103',
      description: 'Plastic IV bottles',
      room: 'Pediatrics Ward',
      category: 'Contaminated Recyclable',
      weight: 2.8,
      assignedBin: 'Red',
      status: 'Collected',
      createdBy: STAFF_NAMES[2],
      collectedBy: WORKER_NAMES[0],
      collectedAt: new Date(),
      createdAt: new Date()
    }
  ];

  for (const r of sampleRecords) {
    const exists = await WasteRecord.findOne({ recordId: r.recordId });
    if (!exists) {
      await WasteRecord.create(r);
    }
  }
  console.log('Sample waste records seeded successfully!');
  process.exit(0);
}

run();
