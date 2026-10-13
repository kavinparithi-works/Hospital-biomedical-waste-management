const mongoose = require('mongoose');
const User = require('./models/User');
const WasteRecord = require('./models/WasteRecord');

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

async function updateAllUserNames() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/biowaste_db');
    console.log('Connected to MongoDB');

    const staffUsers = await User.find({ role: 'staff' });
    console.log(`Found ${staffUsers.length} staff users.`);

    let staffIdx = 0;
    const nameMap = {}; // oldName -> newName

    for (const u of staffUsers) {
      const newName = STAFF_NAMES[staffIdx % STAFF_NAMES.length];
      nameMap[u.name] = newName;
      u.name = newName;
      await u.save();
      staffIdx++;
    }

    const workerUsers = await User.find({ role: 'worker' });
    console.log(`Found ${workerUsers.length} worker users.`);

    let workerIdx = 0;
    for (const u of workerUsers) {
      const newName = WORKER_NAMES[workerIdx % WORKER_NAMES.length];
      nameMap[u.name] = newName;
      u.name = newName;
      await u.save();
      workerIdx++;
    }

    console.log('Updated all user names to unique random names!');

    // Update existing WasteRecord documents to use updated names
    const records = await WasteRecord.find();
    let updatedRecordsCount = 0;
    for (const r of records) {
      let modified = false;
      if (r.createdBy && nameMap[r.createdBy]) {
        r.createdBy = nameMap[r.createdBy];
        modified = true;
      } else if (!r.createdBy || r.createdBy.startsWith('Staff Member')) {
        r.createdBy = STAFF_NAMES[Math.floor(Math.random() * STAFF_NAMES.length)];
        modified = true;
      }

      if (r.collectedBy && nameMap[r.collectedBy]) {
        r.collectedBy = nameMap[r.collectedBy];
        modified = true;
      } else if (r.collectedBy && r.collectedBy.startsWith('Sanitation Worker')) {
        r.collectedBy = WORKER_NAMES[Math.floor(Math.random() * WORKER_NAMES.length)];
        modified = true;
      }

      if (modified) {
        await r.save();
        updatedRecordsCount++;
      }
    }

    console.log(`Updated ${updatedRecordsCount} waste records with new unique names.`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating user names:', err);
    process.exit(1);
  }
}

updateAllUserNames();
