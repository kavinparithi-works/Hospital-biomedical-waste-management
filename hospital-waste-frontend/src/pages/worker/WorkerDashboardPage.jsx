import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, MapPin, CheckCircle, Clock, Bell, Info, RefreshCw, X, Globe,
  AlertTriangle, Filter, Calendar, Camera, Search, ChevronRight,
  Package, ArrowRight, Shield, AlertCircle, Check, Eye, ClipboardList, ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import WasteChatbot from '../../components/WasteChatbot';
import NotificationBell from '../../components/NotificationBell';
import { 
  getTodayISTDateString, 
  formatISTDate, 
  formatISTTime, 
  formatISTDateTime, 
  calculateOverdueInfo, 
  isTodayInIST 
} from '../../utils/dateUtils';

// ─── Multi-lingual Translations ─────────────────────────────────────────────
const translations = {
  en: {
    title: 'KMCH Hospital — Worker Dashboard',
    subtitle: 'Biomedical Waste Collection & Room-wise Pickup Operations',
    role: 'Role: KMCH Waste Collection Worker',
    alertTitle: 'New Collection Requests Alert!',
    alertBody: (count, room, cat) => `${count} room collection(s) pending — Latest: ${room} (${cat})`,
    viewRequest: 'View Request',
    todayAssigned: 'Total Assigned Pickups Today',
    pendingCollections: 'Pending Collections',
    inTransitCollections: 'In-Transit Collections',
    completedDisposals: 'Completed Disposals',
    pendingPickups: 'Pending Collections',
    inTransit: 'In-Transit Collections',
    totalCompleted: 'Completed Disposals',
    weightToday: 'Weight Today',
    collectionRequests: 'Assigned Collection Tasks',
    refresh: 'Refresh',
    recordId: 'Record ID',
    room: 'Room',
    category: 'Waste Category',
    weight: 'Weight',
    bin: 'Assigned Bin',
    assignedTime: 'Assigned Time',
    time: 'Time',
    status: 'Current Status',
    actions: 'Available Action',
    availableAction: 'Available Action',
    loading: 'Loading assigned collection tasks...',
    allDone: 'All assigned waste collections are currently complete!',
    collect: 'Collect',
    dispose: 'Dispose',
    complete: 'Dispose',
    inTransitLabel: 'In Transit',
    collectedLabel: 'Collected',
    completedLabel: 'Disposed',
    pendingLabel: 'Pending',
    tabAll: 'All Assigned Tasks',
    tabPending: 'Pending Pickups',
    tabCollected: 'Collected (Ready to Dispose)',
    tabCompleted: 'Completed Disposals',
    pendingByLocation: 'Pending by Location',
    noPending: 'No pending pickups across rooms.',
    binGuide: 'Bin Reference Guide',
    binGuideItems: [
      { label: 'Infectious Waste', tag: 'Yellow Bin' },
      { label: 'Sharps & Needles', tag: 'White Bin' },
      { label: 'Contaminated Plastics', tag: 'Red Bin' },
      { label: 'Glassware & Implants', tag: 'Blue Bin' },
      { label: 'General Municipal', tag: 'Green Bin' },
    ],
    pending: 'Pending',
    modalTitle: 'Collection Request',
    modalSubtitle: 'Read-only details created by Medical Staff',
    roomLabel: 'Room Location',
    wasteCategory: 'Waste Category',
    weightLabel: 'Weight',
    assignedBin: 'Assigned Bin',
    requestedAt: 'Requested At',
    requestedBy: 'Requested By',
    descriptionLabel: 'Description',
    close: 'Close',
    markCompleted: 'Mark Completed',
    updating: 'Updating...',
    completedDone: 'Completed ✓',
    collectedBy: 'Collected By',
    collectedAt: 'Collected At',
    completedAt: 'Completed At',
    department: 'Department',
    date: 'Date',
    allCategories: 'All Categories',
    allRooms: 'All Rooms',
    allDepartments: 'All Departments',
    noRecordsTab: 'No records in this category.',
    filterByDate: 'Filter by Date',
    binVerification: 'Bin Verification',
    binVerifyQuestion: 'Does the waste bag match the assigned bin colour?',
    binVerifyYes: 'Yes — Bag matches assigned bin',
    binVerifyNo: 'No — Report mismatch',
    binMismatchLabel: 'Describe the mismatch:',
    binMismatchPlaceholder: 'e.g. Wrong colour bag used, waste in wrong bin...',
    confirmComplete: 'Confirm & Complete',
    cancelVerify: 'Cancel',
    tabPending: 'Pending',
    tabInTransit: 'In Transit',
    tabCompleted: 'Completed',
    tabVerification: 'Worker Verification',
    workerVerification: 'Worker Verification',
    workerVerificationSubtitle: 'Color-coded waste bag verification and mismatch audit before final disposal',
    awaitingVerification: 'Awaiting Verification',
    verifiedCompleted: 'Verified & Completed',
    mismatchesReported: 'Mismatches Reported',
    verifyAndComplete: 'Verify & Complete',
    verificationProtocol: 'Verification Protocol',
    verificationStatus: 'Verification Status',
    verifiedMatch: 'Verified (Bag Matched Bin)',
    mismatchFlagged: 'Mismatch Flagged',
    noAwaitingVerify: 'No waste items currently awaiting verification.',
  },
  ta: {
    title: 'KMCH மருத்துவமனை — தொழிலாளர் பக்கம்',
    subtitle: 'மருத்துவ கழிவு சேகரிப்பு & அறை வாரியான வேலைகள்',
    role: 'பங்கு: KMCH கழிவு சேகரிப்பு தொழிலாளர்',
    alertTitle: 'புதிய சேகரிப்பு கோரிக்கைகள்!',
    alertBody: (count, room, cat) => `${count} அறை சேகரிப்பு நிலுவையிலுள்ளது — கடைசி: ${room} (${cat})`,
    viewRequest: 'கோரிக்கை காண்க',
    pendingPickups: 'நிலுவையிலுள்ள சேகரிப்புகள்',
    inTransit: 'வழியில் உள்ளவை',
    totalCompleted: 'மொத்த முடிந்தவை',
    weightToday: 'இன்றைய எடை',
    collectionRequests: 'சேகரிப்பு கோரிக்கைகள்',
    refresh: 'புதுப்பி',
    recordId: 'பதிவு ID',
    room: 'அறை',
    category: 'வகை',
    weight: 'எடை',
    bin: 'தொட்டி',
    time: 'நேரம்',
    status: 'நிலை',
    actions: 'செயல்கள்',
    loading: 'சேகரிப்பு கோரிக்கைகள் ஏற்றுகிறது...',
    allDone: 'அனைத்து அறை கழிவு சேகரிப்புகளும் முடிந்தன!',
    collect: 'சேகரி',
    complete: 'முடி',
    inTransitLabel: 'வழியில்',
    completedLabel: 'முடிந்தது',
    pendingLabel: 'நிலுவை',
    pendingByLocation: 'இடம் வாரியான நிலுவைகள்',
    noPending: 'எந்த அறையிலும் நிலுவை சேகரிப்பு இல்லை.',
    binGuide: 'தொட்டி வழிகாட்டி',
    binGuideItems: [
      { label: 'தொற்று கழிவு', tag: 'மஞ்சள் தொட்டி' },
      { label: 'கூரான கழிவு & ஊசிகள்', tag: 'வெள்ளை தொட்டி' },
      { label: 'அசுத்தமான பிளாஸ்டிக்', tag: 'சிவப்பு தொட்டி' },
      { label: 'கண்ணாடி & உள்வை பொருட்கள்', tag: 'நீல தொட்டி' },
      { label: 'பொது கழிவு', tag: 'பச்சை தொட்டி' },
    ],
    pending: 'நிலுவை',
    modalTitle: 'சேகரிப்பு கோரிக்கை',
    modalSubtitle: 'மருத்துவ ஊழியர் உருவாக்கிய விவரங்கள்',
    roomLabel: 'அறை இடம்',
    wasteCategory: 'கழிவு வகை',
    weightLabel: 'எடை',
    assignedBin: 'ஒதுக்கப்பட்ட தொட்டி',
    requestedAt: 'கோரிக்கை நேரம்',
    requestedBy: 'கோரியவர்',
    descriptionLabel: 'விவரம்',
    close: 'மூடு',
    markCompleted: 'முடிந்தது என குறி',
    updating: 'புதுப்பிக்கிறது...',
    completedDone: 'முடிந்தது ✓',
    collectedBy: 'சேகரித்தவர்',
    collectedAt: 'சேகரிக்கப்பட்ட நேரம்',
    completedAt: 'முடிக்கப்பட்ட நேரம்',
    department: 'துறை',
    date: 'தேதி',
    allCategories: 'அனைத்து வகைகள்',
    allRooms: 'அனைத்து அறைகள்',
    allDepartments: 'அனைத்து துறைகள்',
    noRecordsTab: 'இந்த வகையில் பதிவுகள் இல்லை.',
    filterByDate: 'தேதி வடிகட்டி',
    binVerification: 'தொட்டி சரிபார்ப்பு',
    binVerifyQuestion: 'கழிவுப் பை ஒதுக்கப்பட்ட தொட்டி நிறத்துடன் பொருந்துகிறதா?',
    binVerifyYes: 'ஆம் — பை தொட்டியுடன் பொருந்துகிறது',
    binVerifyNo: 'இல்லை — பொருத்தமின்மையை புகார் செய்',
    binMismatchLabel: 'பொருத்தமின்மையை விவரிக்கவும்:',
    binMismatchPlaceholder: 'எ.கா. தவறான நிற பை பயன்படுத்தப்பட்டது...',
    confirmComplete: 'உறுதிசெய்து முடி',
    cancelVerify: 'ரத்துசெய்',
    tabPending: 'நிலுவை',
    tabInTransit: 'வழியில்',
    tabCompleted: 'முடிந்தவை',
    tabVerification: 'தொழிலாளர் சரிபார்ப்பு',
    workerVerification: 'தொழிலாளர் சரிபார்ப்பு',
    workerVerificationSubtitle: 'கழிவுப் பை நிறப் பொருத்தம் மற்றும் முறையான ஆய்வு',
    awaitingVerification: 'சரிபார்ப்பு நிலுவையில்',
    verifiedCompleted: 'சரிபார்க்கப்பட்டு முடிந்தது',
    mismatchesReported: 'புகார் செய்யப்பட்ட பொருத்தமின்மை',
    verifyAndComplete: 'சரிபார்த்து முடி',
    verificationProtocol: 'சரிபார்ப்பு நெறிமுறை',
    verificationStatus: 'சரிபார்ப்பு நிலை',
    verifiedMatch: 'சரிபார்க்கப்பட்டது (பொருந்தியது)',
    mismatchFlagged: 'பொருத்தமின்மை குறிக்கப்பட்டது',
    noAwaitingVerify: 'சரிபார்ப்புக்கு நிலுவையில் உள்ள பொருட்கள் இல்லை.',
  },
  kn: {
    title: 'KMCH ಆಸ್ಪತ್ರೆ — ಕಾರ್ಮಿಕರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    subtitle: 'ಬಯೋಮೆಡಿಕಲ್ ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹಣೆ ಮತ್ತು ಕೊಠಡಿವಾರು ಕಾರ್ಯಾಚರಣೆಗಳು',
    role: 'ಪಾತ್ರ: KMCH ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹಣಾ ಕಾರ್ಮಿಕ',
    alertTitle: 'ಹೊಸ ಸಂಗ್ರಹಣೆ ವಿನಂತಿಗಳ ಎಚ್ಚರಿಕೆ!',
    alertBody: (count, room, cat) => `${count} ಕೊಠಡಿ ಬಾಕಿ — ಇತ್ತೀಚಿನ: ${room} (${cat})`,
    viewRequest: 'ವಿನಂತಿ ನೋಡಿ',
    pendingPickups: 'ಬಾಕಿ ಸಂಗ್ರಹಣೆ',
    inTransit: 'ಸಾಗಣೆಯಲ್ಲಿ',
    totalCompleted: 'ಒಟ್ಟು ಪೂರ್ಣ',
    weightToday: 'ಇಂದಿನ ತೂಕ',
    collectionRequests: 'ಸಂಗ್ರಹಣೆ ವಿನಂತಿಗಳು',
    refresh: 'ನವೀಕರಿಸಿ',
    recordId: 'ದಾಖಲೆ ID', room: 'ಕೊಠಡಿ', category: 'ವರ್ಗ', weight: 'ತೂಕ', bin: 'ತೊಟ್ಟಿ', time: 'ಸಮಯ', status: 'ಸ್ಥಿತಿ', actions: 'ಕ್ರಮಗಳು',
    loading: 'ವಿನಂತಿಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', allDone: 'ಎಲ್ಲಾ ಸಂಗ್ರಹಣೆಗಳು ಪೂರ್ಣ!',
    collect: 'ಸಂಗ್ರಹಿಸಿ', complete: 'ಪೂರ್ಣಗೊಳಿಸಿ', inTransitLabel: 'ಸಾಗಣೆಯಲ್ಲಿ', completedLabel: 'ಪೂರ್ಣ', pendingLabel: 'ಬಾಕಿ',
    pendingByLocation: 'ಸ್ಥಳವಾರು ಬಾಕಿ', noPending: 'ಬಾಕಿ ಇಲ್ಲ.',
    binGuide: 'ತೊಟ್ಟಿ ಮಾರ್ಗದರ್ಶಿ',
    binGuideItems: [
      { label: 'ಸಾಂಕ್ರಾಮಿಕ', tag: 'ಹಳದಿ' }, { label: 'ಚೂಪಾದ', tag: 'ಬಿಳಿ' },
      { label: 'ಕಲುಷಿತ ಪ್ಲಾಸ್ಟಿಕ್', tag: 'ಕೆಂಪು' }, { label: 'ಗಾಜು', tag: 'ನೀಲಿ' },
      { label: 'ಸಾಮಾನ್ಯ', tag: 'ಹಸಿರು' },
    ],
    pending: 'ಬಾಕಿ', modalTitle: 'ಸಂಗ್ರಹಣೆ ವಿನಂತಿ', modalSubtitle: 'ವೈದ್ಯಕೀಯ ಸಿಬ್ಬಂದಿ ರಚಿಸಿದ ವಿವರಗಳು',
    roomLabel: 'ಕೊಠಡಿ ಸ್ಥಳ', wasteCategory: 'ತ್ಯಾಜ್ಯ ವರ್ಗ', weightLabel: 'ತೂಕ', assignedBin: 'ನಿಯೋಜಿತ ತೊಟ್ಟಿ',
    requestedAt: 'ಕೋರಿದ ಸಮಯ', requestedBy: 'ಕೋರಿದವರು', descriptionLabel: 'ವಿವರಣೆ',
    close: 'ಮುಚ್ಚಿ', markCompleted: 'ಪೂರ್ಣ ಎಂದು ಗುರುತಿಸಿ', updating: 'ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ...', completedDone: 'ಪೂರ್ಣ ✓',
    collectedBy: 'ಸಂಗ್ರಹಿಸಿದವರು', collectedAt: 'ಸಂಗ್ರಹಿಸಿದ ಸಮಯ', completedAt: 'ಪೂರ್ಣ ಸಮಯ',
    department: 'ವಿಭಾಗ', date: 'ದಿನಾಂಕ', allCategories: 'ಎಲ್ಲಾ ವರ್ಗಗಳು', allRooms: 'ಎಲ್ಲಾ ಕೊಠಡಿಗಳು', allDepartments: 'ಎಲ್ಲಾ ವಿಭಾಗಗಳು',
    noRecordsTab: 'ಈ ವಿಭಾಗದಲ್ಲಿ ದಾಖಲೆಗಳಿಲ್ಲ.', filterByDate: 'ದಿನಾಂಕ ಫಿಲ್ಟರ್',
    binVerification: 'ತೊಟ್ಟಿ ಪರಿಶೀಲನೆ', binVerifyQuestion: 'ಕಸದ ಚೀಲ ನಿಯೋಜಿತ ತೊಟ್ಟಿ ಬಣ್ಣಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆಯೇ?',
    binVerifyYes: 'ಹೌದು — ಹೊಂದಾಣಿಕೆ', binVerifyNo: 'ಇಲ್ಲ — ವರದಿ ಮಾಡಿ',
    binMismatchLabel: 'ಹೊಂದಾಣಿಕೆಯಿಲ್ಲದಿಕೆ ವಿವರಿಸಿ:', binMismatchPlaceholder: 'ಉದಾ: ತಪ್ಪು ಬಣ್ಣದ ಚೀಲ...',
    confirmComplete: 'ಖಚಿತಪಡಿಸಿ ಪೂರ್ಣ', cancelVerify: 'ರದ್ದು',
    tabPending: 'ಬಾಕಿ', tabInTransit: 'ಸಾಗಣೆಯಲ್ಲಿ', tabCompleted: 'ಪೂರ್ಣ',
    tabVerification: 'ಕಾರ್ಮಿಕರ ಪರಿಶೀಲನೆ',
    workerVerification: 'ಕಾರ್ಮಿಕರ ಪರಿಶೀಲನೆ',
    workerVerificationSubtitle: 'ತ್ಯಾಜ್ಯ ಚೀಲ ಬಣ್ಣ ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಪರಿಶೀಲನೆ',
    awaitingVerification: 'ಪರಿಶೀಲನೆ ಬಾಕಿ',
    verifiedCompleted: 'ಪರಿಶೀಲಿಸಿ ಪೂರ್ಣ',
    mismatchesReported: 'ವರದಿ ಮಾಡಲಾದ ಹೊಂದಾಣಿಕೆಯಿಲ್ಲದಿರುವಿಕೆ',
    verifyAndComplete: 'ಪರಿಶೀಲಿಸಿ ಪೂರ್ಣಗೊಳಿಸಿ',
    verificationProtocol: 'ಪರಿಶೀಲನಾ ಪ್ರೋಟೋಕಾಲ್',
    verificationStatus: 'ಪರಿಶೀಲನಾ ಸ್ಥಿತಿ',
    verifiedMatch: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ (ಹೊಂದಾಣಿಕೆ)',
    mismatchFlagged: 'ಹೊಂದಾಣಿಕೆಯಿಲ್ಲ ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ',
    noAwaitingVerify: 'ಯಾವುದೇ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇಲ್ಲ.',
  },
  te: {
    title: 'KMCH ఆసుపత్రి — కార్మికుల డ్యాష్‌బోర్డ్',
    subtitle: 'బయోమెడికల్ వ్యర్థాల సేకరణ & గది వారీ కార్యకలాపాలు',
    role: 'పాత్ర: KMCH వ్యర్థాల కార్మికుడు',
    alertTitle: 'కొత్త సేకరణ హెచ్చరిక!',
    alertBody: (count, room, cat) => `${count} గది పెండింగ్ — తాజా: ${room} (${cat})`,
    viewRequest: 'చూడండి',
    pendingPickups: 'పెండింగ్', inTransit: 'రవాణాలో', totalCompleted: 'పూర్తి', weightToday: 'నేటి బరువు',
    collectionRequests: 'సేకరణ అభ్యర్థనలు', refresh: 'రిఫ్రెష్',
    recordId: 'ID', room: 'గది', category: 'వర్గం', weight: 'బరువు', bin: 'తొట్టి', time: 'సమయం', status: 'స్థితి', actions: 'చర్యలు',
    loading: 'లోడ్ అవుతోంది...', allDone: 'అన్నీ పూర్తి!',
    collect: 'సేకరించు', complete: 'పూర్తి', inTransitLabel: 'రవాణాలో', completedLabel: 'పూర్తయింది', pendingLabel: 'పెండింగ్',
    pendingByLocation: 'స్థానవారీ పెండింగ్', noPending: 'పెండింగ్ లేదు.',
    binGuide: 'తొట్టి గైడ్',
    binGuideItems: [
      { label: 'ఇన్ఫెక్షియస్', tag: 'పసుపు' }, { label: 'సూదులు', tag: 'తెలుపు' },
      { label: 'ప్లాస్టిక్', tag: 'ఎరుపు' }, { label: 'గాజు', tag: 'నీలం' },
      { label: 'సాధారణ', tag: 'ఆకుపచ్చ' },
    ],
    pending: 'పెండింగ్', modalTitle: 'సేకరణ', modalSubtitle: 'వైద్య సిబ్బంది వివరాలు',
    roomLabel: 'గది', wasteCategory: 'వర్గం', weightLabel: 'బరువు', assignedBin: 'తొట్టి',
    requestedAt: 'సమయం', requestedBy: 'అభ్యర్థన', descriptionLabel: 'వివరణ',
    close: 'మూసివేయి', markCompleted: 'పూర్తి చేయి', updating: 'నవీకరిస్తోంది...', completedDone: 'పూర్తి ✓',
    collectedBy: 'సేకరించినవారు', collectedAt: 'సేకరణ సమయం', completedAt: 'పూర్తి సమయం',
    department: 'విభాగం', date: 'తేదీ', allCategories: 'అన్ని వర్గాలు', allRooms: 'అన్ని గదులు', allDepartments: 'అన్ని విభాగాలు',
    noRecordsTab: 'ఈ విభాగంలో రికార్డులు లేవు.', filterByDate: 'తేదీ ఫిల్టర్',
    binVerification: 'తొట్టి ధృవీకరణ', binVerifyQuestion: 'వ్యర్థాల సంచి తొట్టి రంగుకు సరిపోతుందా?',
    binVerifyYes: 'అవును', binVerifyNo: 'లేదు — నివేదించు',
    binMismatchLabel: 'వివరించండి:', binMismatchPlaceholder: 'ఉదా: తప్పు రంగు...',
    confirmComplete: 'నిర్ధారించు', cancelVerify: 'రద్దు',
    tabPending: 'పెండింగ్', tabInTransit: 'రవాణాలో', tabCompleted: 'పూర్తి',
    tabVerification: 'కార్మికుల ధృవీకరణ',
    workerVerification: 'కార్మికుల ధృవీకరణ',
    workerVerificationSubtitle: 'వ్యర్థాల సంచి రంగు సరిపోలిక మరియు తనిఖీ',
    awaitingVerification: 'ధృవీకరణ పెండింగ్',
    verifiedCompleted: 'ధృవీకరించబడింది & పూర్తి',
    mismatchesReported: 'నివేదించబడిన అసమతుల్యతలు',
    verifyAndComplete: 'ధృవీకరించి పూర్తి చేయండి',
    verificationProtocol: 'ధృవీకరణ విధానం',
    verificationStatus: 'ధృవీకరణ స్థితి',
    verifiedMatch: 'ధృవీకరించబడింది (సరిపోయింది)',
    mismatchFlagged: 'అసమతుల్యత ఫ్లాగ్ చేయబడింది',
    noAwaitingVerify: 'ధృవీకరణ కోసం పెండింగ్ అంశాలు లేవు.',
  },
  hi: {
    title: 'KMCH अस्पताल — कर्मचारी डैशबोर्ड',
    subtitle: 'बायोमेडिकल कचरा संग्रहण एवं वार्ड-वार संचालन',
    role: 'भूमिका: KMCH कचरा संग्रहण कर्मचारी',
    alertTitle: 'नये कचरा संग्रहण अनुरोध!',
    alertBody: (count, room, cat) => `${count} कमरा पेंडिंग — नवीनतम: ${room} (${cat})`,
    viewRequest: 'देखें',
    pendingPickups: 'लंबित', inTransit: 'परिवहन में', totalCompleted: 'कुल पूर्ण', weightToday: 'आज का वजन',
    collectionRequests: 'संग्रहण अनुरोध', refresh: 'रिफ्रेश',
    recordId: 'ID', room: 'कमरा', category: 'श्रेणी', weight: 'वजन', bin: 'डिब्बा', time: 'समय', status: 'स्थिति', actions: 'कार्रवाई',
    loading: 'लोड हो रहा...', allDone: 'सब पूर्ण!',
    collect: 'संग्रहित', complete: 'पूर्ण', inTransitLabel: 'परिवहन', completedLabel: 'पूर्ण', pendingLabel: 'लंबित',
    pendingByLocation: 'स्थान-वार लंबित', noPending: 'कोई लंबित नहीं।',
    binGuide: 'कचरा पात्र गाइड',
    binGuideItems: [
      { label: 'संक्रामक', tag: 'पीला' }, { label: 'सुई', tag: 'सफेद' },
      { label: 'प्लास्टिक', tag: 'लाल' }, { label: 'कांच', tag: 'नीला' },
      { label: 'सामान्य', tag: 'हरा' },
    ],
    pending: 'लंबित', modalTitle: 'संग्रहण अनुरोध', modalSubtitle: 'चिकित्सा कर्मचारी द्वारा विवरण',
    roomLabel: 'कमरा', wasteCategory: 'श्रेणी', weightLabel: 'वजन', assignedBin: 'डिब्बा',
    requestedAt: 'अनुरोध समय', requestedBy: 'अनुरोधकर्ता', descriptionLabel: 'विवरण',
    close: 'बंद', markCompleted: 'पूर्ण चिह्नित', updating: 'अपडेट...', completedDone: 'पूर्ण ✓',
    collectedBy: 'संग्रहकर्ता', collectedAt: 'संग्रहण समय', completedAt: 'पूर्ण समय',
    department: 'विभाग', date: 'तिथि', allCategories: 'सभी श्रेणियाँ', allRooms: 'सभी कमरे', allDepartments: 'सभी विभाग',
    noRecordsTab: 'इस श्रेणी में कोई रिकॉर्ड नहीं।', filterByDate: 'तिथि फ़िल्टर',
    binVerification: 'डिब्बा सत्यापन', binVerifyQuestion: 'क्या कचरा थैला सही डिब्बे के रंग से मेल खाता है?',
    binVerifyYes: 'हाँ — मेल खाता है', binVerifyNo: 'नहीं — रिपोर्ट करें',
    binMismatchLabel: 'बेमेल का विवरण:', binMismatchPlaceholder: 'उदा: गलत रंग का थैला...',
    confirmComplete: 'पुष्टि करें', cancelVerify: 'रद्द करें',
    tabPending: 'लंबित', tabInTransit: 'परिवहन', tabCompleted: 'पूर्ण',
    tabVerification: 'कर्मचारी सत्यापन',
    workerVerification: 'कर्मचारी सत्यापन',
    workerVerificationSubtitle: 'कचरा बैग रंग मिलान एवं सत्यापन जांच',
    awaitingVerification: 'सत्यापन लंबित',
    verifiedCompleted: 'सत्यापित एवं पूर्ण',
    mismatchesReported: 'रिपोर्ट किए गए बेमेल',
    verifyAndComplete: 'सत्यापित कर पूर्ण करें',
    verificationProtocol: 'सत्यापन प्रोटोकॉल',
    verificationStatus: 'सत्यापन स्थिति',
    verifiedMatch: 'सत्यापित (रंग सही)',
    mismatchFlagged: 'बेमेल चिह्नित',
    noAwaitingVerify: 'सत्यापन के लिए कोई कचरा लंबित नहीं है।',
  },
  ml: {
    title: 'KMCH ആശുപത്രി — തൊഴിലാളി ഡാഷ്‌ബോർഡ്',
    subtitle: 'ബയോമെഡിക്കൽ മാലിന്യ ശേഖരണവും റൂം പ്രവർത്തനങ്ങളും',
    role: 'റോൾ: KMCH മാലിന്യ ശേഖരണ തൊഴിലാളി',
    alertTitle: 'പുതിയ ശേഖരണ മുന്നറിയിപ്പ്!',
    alertBody: (count, room, cat) => `${count} റൂം ബാക്കി — പുതിയത്: ${room} (${cat})`,
    viewRequest: 'കാണുക',
    pendingPickups: 'ബാക്കി', inTransit: 'ട്രാൻസിറ്റ്', totalCompleted: 'പൂർത്തി', weightToday: 'ഇന്നത്തെ ഭാരം',
    collectionRequests: 'ശേഖരണ അഭ്യർത്ഥനകൾ', refresh: 'പുതുക്കുക',
    recordId: 'ID', room: 'റൂം', category: 'വിഭാഗം', weight: 'ഭാരം', bin: 'ബിൻ', time: 'സമയം', status: 'നില', actions: 'നടപടി',
    loading: 'ലോഡ് ചെയ്യുന്നു...', allDone: 'എല്ലാം പൂർത്തി!',
    collect: 'ശേഖരിക്കുക', complete: 'പൂർത്തി', inTransitLabel: 'ട്രാൻസിറ്റ്', completedLabel: 'പൂർത്തി', pendingLabel: 'ബാക്കി',
    pendingByLocation: 'സ്ഥലം അനുസരിച്ച്', noPending: 'ബാക്കിയില്ല.',
    binGuide: 'ബിൻ ഗൈഡ്',
    binGuideItems: [
      { label: 'പകർച്ചവ്യാധി', tag: 'മഞ്ഞ' }, { label: 'സൂചികൾ', tag: 'വെള്ള' },
      { label: 'പ്ലാസ്റ്റിക്', tag: 'ചുവപ്പ്' }, { label: 'ഗ്ലാസ്', tag: 'നീല' },
      { label: 'സാധാരണ', tag: 'പച്ച' },
    ],
    pending: 'ബാക്കി', modalTitle: 'ശേഖരണ', modalSubtitle: 'സ്റ്റാഫ് വിവരങ്ങൾ',
    roomLabel: 'റൂം', wasteCategory: 'വിഭാഗം', weightLabel: 'ഭാരം', assignedBin: 'ബിൻ',
    requestedAt: 'സമയം', requestedBy: 'അഭ്യർത്ഥന', descriptionLabel: 'വിവരണം',
    close: 'അടയ്ക്കുക', markCompleted: 'പൂർത്തി', updating: 'അപ്ഡേറ്റ്...', completedDone: 'പൂർത്തി ✓',
    collectedBy: 'ശേഖരിച്ചയാൾ', collectedAt: 'ശേഖരണ സമയം', completedAt: 'പൂർത്തി സമയം',
    department: 'വിഭാഗം', date: 'തീയതി', allCategories: 'എല്ലാ വിഭാഗങ്ങൾ', allRooms: 'എല്ലാ മുറികൾ', allDepartments: 'എല്ലാം',
    noRecordsTab: 'രേഖകളില്ല.', filterByDate: 'തീയതി ഫിൽറ്റർ',
    binVerification: 'ബിൻ പരിശോധന', binVerifyQuestion: 'മാലിന്യ ബാഗ് ബിൻ നിറവുമായി പൊരുത്തപ്പെടുന്നുണ്ടോ?',
    binVerifyYes: 'അതെ', binVerifyNo: 'ഇല്ല — റിപ്പോർട്ട്',
    binMismatchLabel: 'വിവരിക്കുക:', binMismatchPlaceholder: 'ഉദാ: തെറ്റായ ബാഗ്...',
    confirmComplete: 'ഉറപ്പിക്കുക', cancelVerify: 'റദ്ദാക്കുക',
    tabPending: 'ബാക്കി', tabInTransit: 'ട്രാൻസിറ്റ്', tabCompleted: 'പൂർത്തി',
    tabVerification: 'തൊഴിലാളി പരിശോധന',
    workerVerification: 'തൊഴിലാളി പരിശോധന',
    workerVerificationSubtitle: 'മാലിന്യ ബാഗ് വർണ്ണ പൊരുത്തവും പരിശോധനയും',
    awaitingVerification: 'പരിശോധന ബാക്കി',
    verifiedCompleted: 'പരിശോധിച്ച് പൂർത്തിയായി',
    mismatchesReported: 'റിപ്പോർട്ട് ചെയ്ത പൊരുത്തക്കേടുകൾ',
    verifyAndComplete: 'പരിശോധിച്ച് പൂർത്തിയാക്കുക',
    verificationProtocol: 'പരിശോധനാ പ്രോട്ടോക്കോൾ',
    verificationStatus: 'പരിശോധനാ നില',
    verifiedMatch: 'പരിശോധിച്ചു (പൊരുത്തപ്പെടുന്നു)',
    mismatchFlagged: 'പൊരുത്തക്കേട് അടയാളപ്പെടുത്തി',
    noAwaitingVerify: 'പരിശോധനയ്ക്കായി ഇനങ്ങൾ ബാക്കിയില്ല.',
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const binClass = (bin) => `bin-tag bin-${(bin || '').toLowerCase()}`;
const BIN_COLORS = { Yellow: '#F59E0B', Red: '#EF4444', White: '#94A3B8', Blue: '#3B82F6', Green: '#22C55E' };

const WorkerDashboardPage = () => {
  const [lang, setLang] = useState('en');
  const t = translations[lang] || translations.en;

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    todayAssignedPickups: 0,
    pendingCollections: 0,
    inTransitCollections: 0,
    completedDisposals: 0,
    todayWeightCollected: 0,
    roomWisePending: [],
    recentNotifications: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Tabs: all | today | overdue | pending | collected | completed
  const [activeTab, setActiveTab] = useState('all');
  const [filterDate, setFilterDate] = useState(getTodayISTDateString());
  const [filterRoom, setFilterRoom] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Bin Verification Modal
  const [binVerifyRecord, setBinVerifyRecord] = useState(null);
  const [binMatch, setBinMatch] = useState(true);
  const [binMismatchNote, setBinMismatchNote] = useState('');
  const [showProtocol, setShowProtocol] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recordsData, statsData] = await Promise.all([
        api.getWasteRecords({ workerName: currentUser.name, workerId: currentUser.id }),
        api.getWorkerStats(currentUser.name, currentUser.id)
      ]);
      setRecords(recordsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading worker dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.name, currentUser.id]);

  // Click on a notification opens/filters that task directly
  const handleNotificationSelectTask = (notif) => {
    if (notif.recordId) {
      setSearchTerm(notif.recordId);
      setActiveTab('all');
      setFilterDate('');
      const targetRecord = records.find(r => r.recordId === notif.recordId);
      if (targetRecord) {
        setSelectedRequest(targetRecord);
      }
    }
  };

  // ─── Collection Workflow: Pending → Collected → Disposed ──────────────────
  // Stage 1: Pending → Collected
  const handleCollect = async (record) => {
    if (record.status === 'Collected' || record.status === 'Completed' || record.status === 'Disposed') return;
    try {
      setActionLoading(true);
      await api.collectWasteRecord(record._id, currentUser.name || 'Worker User', currentUser.id);
      setSelectedRequest(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to mark waste as collected');
    } finally {
      setActionLoading(false);
    }
  };

  // Stage 2: Collected → Disposed (initiates bin verification modal)
  const handleComplete = (record) => {
    if (record.status === 'Completed' || record.status === 'Disposed') return;
    if (record.status !== 'Collected') {
      alert('Waste must be collected first before completing disposal.');
      return;
    }
    setBinVerifyRecord(record);
    setBinMatch(true);
    setBinMismatchNote('');
  };

  const confirmBinVerifyAndComplete = async () => {
    if (!binVerifyRecord) return;
    try {
      setActionLoading(true);
      await api.completeWasteRecord(
        binVerifyRecord._id,
        currentUser.name || 'Worker User',
        currentUser.id || '',
        binMatch,
        binMatch ? '' : binMismatchNote
      );
      setBinVerifyRecord(null);
      setSelectedRequest(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to complete disposal');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Format Helpers ──────────────────────────────────────────────────────────
  const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return formatISTTime(dateStr);
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return formatISTDate(dateStr);
  };
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return formatISTDateTime(dateStr);
  };

  // ─── Derived Record Splits (Filtered strictly for logged-in worker) ────────
  const todayAssignedRecords = records.filter(r => isTodayInIST(r.assignedTime || r.createdAt));
  const overduePendingRecords = records.filter(r => {
    if (r.status !== 'Pending' && r.status !== 'Assigned') return false;
    const isPast = !isTodayInIST(r.createdAt);
    const { isOverdue } = calculateOverdueInfo(r.assignedTime || r.createdAt, 120);
    return isPast || isOverdue;
  });
  const pendingRecords = records.filter(r => r.status === 'Pending' || r.status === 'Assigned');
  const collectedRecords = records.filter(r => r.status === 'Collected');
  const completedRecords = records.filter(r => r.status === 'Completed' || r.status === 'Disposed');

  // Unique rooms and categories from worker's records for filter dropdowns
  const uniqueRooms = [...new Set(records.map(r => r.room).filter(Boolean))].sort();
  const uniqueCategories = [...new Set(records.map(r => r.category).filter(Boolean))].sort();

  // Apply filters to current tab records
  const getFilteredRecords = (tabRecords) => {
    return tabRecords.filter(r => {
      if (filterRoom && r.room !== filterRoom) return false;
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterDate) {
        const recordDate = getTodayISTDateString(r.assignedTime || r.createdAt);
        if (recordDate !== filterDate) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const mId = (r.recordId || '').toLowerCase().includes(term);
        const mRoom = (r.room || '').toLowerCase().includes(term);
        const mDesc = (r.description || '').toLowerCase().includes(term);
        if (!mId && !mRoom && !mDesc) return false;
      }
      return true;
    });
  };

  const currentTabRecords = activeTab === 'today' ? todayAssignedRecords
    : activeTab === 'overdue' ? overduePendingRecords
    : activeTab === 'pending' ? pendingRecords
    : activeTab === 'collected' ? collectedRecords
    : activeTab === 'completed' ? completedRecords
    : records;
  const filteredRecords = getFilteredRecords(currentTabRecords);


  // Status badge
  const getStatusBadge = (status) => {
    if (status === 'Pending' || status === 'Assigned') {
      return (
        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} /> {t.pendingLabel || 'Pending'}
        </span>
      );
    }
    if (status === 'Collected') {
      return (
        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #93C5FD' }}>
          <Package size={12} /> {t.collectedLabel || 'Collected'}
        </span>
      );
    }
    if (status === 'Completed') {
      return (
        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle size={12} /> {t.completedLabel || 'Disposed'}
        </span>
      );
    }
    return <span className="badge">{status}</span>;
  };

  return (
    <div className="fade-in">

      {/* ── Top Bar: Notification Bell & Language Dropdown ────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: '12px', marginBottom: '1rem', padding: '0.5rem 1rem',
        backgroundColor: '#FFFFFF', borderRadius: '10px',
        border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <NotificationBell role="worker" userId={currentUser.id} onSelectTask={handleNotificationSelectTask} />
        <Globe size={16} color="var(--primary-blue)" />
        <select
          id="worker-language-selector"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{
            padding: '0.4rem 0.8rem', borderRadius: '8px',
            border: '1.5px solid var(--primary-blue)', backgroundColor: '#FFFFFF',
            color: '#0F172A', fontSize: '0.83rem', fontWeight: 600,
            cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="en">🇬🇧 English</option>
          <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
          <option value="kn">🇮🇳 ಕನ್ನಡ (Kannada)</option>
          <option value="te">🇮🇳 తెలుగు (Telugu)</option>
          <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
          <option value="ml">🇮🇳 മലയാളം (Malayalam)</option>
        </select>
      </div>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>{t.title}</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.subtitle}</p>
        </div>
        <div className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
          <Truck size={16} /> {t.role}
        </div>
      </div>

      {/* ── Alert Banner (dismissable) ─────────────────────────────────────── */}
      {!alertDismissed && stats.recentNotifications && stats.recentNotifications.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(241,196,15,0.15)', borderLeft: '4px solid var(--yellow-bin)',
          padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bell size={20} color="#B7950B" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#B7950B', fontSize: '0.9rem' }}>{t.alertTitle}</strong>
              <p style={{ fontSize: '0.8rem', color: '#7D6608', margin: '0.1rem 0 0 0' }}>
                {t.alertBody(stats.recentNotifications.length, stats.recentNotifications[0].room, stats.recentNotifications[0].category)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem', borderColor: '#B7950B', color: '#B7950B', whiteSpace: 'nowrap', fontWeight: 600 }}
              onClick={() => { setSelectedRequest(stats.recentNotifications[0]); setAlertDismissed(true); }}
            >
              {t.viewRequest}
            </button>
            <button onClick={() => setAlertDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B7950B', padding: '4px', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: <ClipboardList size={24} color="#2563EB" />, label: t.todayAssigned || 'Total Assigned Pickups Today', value: loading ? '...' : (stats.todayAssignedPickups ?? todayAssignedRecords.length), bg: '#EFF6FF' },
          { icon: <Clock size={24} color="#F59E0B" />, label: t.pendingCollections || 'Pending Collections', value: loading ? '...' : (stats.pendingCollections ?? pendingRecords.length), bg: '#FFFBEB' },
          { icon: <Package size={24} color="#059669" />, label: 'Collected / Ready to Dispose', value: loading ? '...' : (stats.collectedCollections ?? collectedRecords.length), bg: '#ECFDF5' },
          { icon: <CheckCircle size={24} color="#10B981" />, label: t.completedDisposals || 'Completed Disposals', value: loading ? '...' : (stats.completedDisposals ?? completedRecords.length), bg: '#F0FDF4' },
        ].map((card, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Table + Sidebar ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left: Collection Records with Tabs & Filters ────────────────── */}
        <div className="card" style={{ minWidth: 0 }}>

          {/* Tab Bar: 6 views */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: 0, overflowX: 'auto' }}>
            {[
              { key: 'all', label: 'All Assigned Tasks', count: records.length, color: '#2563EB', bg: '#EFF6FF', icon: <ClipboardList size={15} /> },
              { key: 'today', label: "Today's Tasks", count: todayAssignedRecords.length, color: '#0284C7', bg: '#F0F9FF', icon: <Calendar size={15} /> },
              { key: 'overdue', label: 'Overdue Pending', count: overduePendingRecords.length, color: '#DC2626', bg: '#FEF2F2', icon: <AlertTriangle size={15} /> },
              { key: 'pending', label: 'Pending Pickups', count: pendingRecords.length, color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={15} /> },
              { key: 'collected', label: 'Collected (Ready)', count: collectedRecords.length, color: '#059669', bg: '#ECFDF5', icon: <Package size={15} /> },
              { key: 'completed', label: 'Completed Disposals', count: completedRecords.length, color: '#10B981', bg: '#F0FDF4', icon: <CheckCircle size={15} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === 'today') {
                    setFilterDate(getTodayISTDateString());
                  } else if (tab.key === 'all' || tab.key === 'overdue') {
                    setFilterDate('');
                  }
                }}
                style={{
                  flex: 1, padding: '0.75rem 0.6rem', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '0.8rem', fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? tab.color : '#64748B',
                  backgroundColor: activeTab === tab.key ? tab.bg : 'transparent',
                  borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span style={{
                  backgroundColor: tab.color, color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                  padding: '1px 6px', borderRadius: '12px', minWidth: '20px', textAlign: 'center'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filters Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '0.85rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                id="worker-search-input"
                type="text"
                placeholder="Search Record ID or Room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '0.35rem 0.6rem 0.35rem 2.2rem', borderRadius: '6px',
                  border: '1px solid var(--border-color)', fontSize: '0.82rem', backgroundColor: '#FFFFFF'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#64748B" />
              <input
                id="worker-date-filter"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                  fontSize: '0.82rem', backgroundColor: '#FFFFFF', color: '#334155'
                }}
              />
            </div>
            <select
              id="worker-room-filter"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', backgroundColor: '#FFFFFF' }}
            >
              <option value="">{t.allRooms}</option>
              {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              id="worker-category-filter"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', backgroundColor: '#FFFFFF' }}
            >
              <option value="">{t.allCategories}</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(filterDate || filterRoom || filterCategory || searchTerm) && (
              <button
                onClick={() => { setFilterDate(''); setFilterRoom(''); setFilterCategory(''); setSearchTerm(''); }}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.78rem', backgroundColor: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}
              >
                ✕ Clear
              </button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <button id="btn-refresh-worker-dashboard" className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={loadData}>
                <RefreshCw size={13} /> {t.refresh}
              </button>
            </div>
          </div>

          {/* Assigned Collection Tasks Table */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '820px' }}>
              <thead>
                <tr>
                  <th>{t.recordId || 'Record ID'}</th>
                  <th>{t.room || 'Room'}</th>
                  <th>{t.category || 'Waste Category'}</th>
                  <th>{t.weight || 'Weight'}</th>
                  <th>{t.bin || 'Assigned Bin'}</th>
                  <th>{t.assignedTime || 'Assigned Time'}</th>
                  <th>{t.status || 'Current Status'}</th>
                  <th style={{ textAlign: 'right' }}>{t.availableAction || 'Available Action'}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>{t.loading}</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <CheckCircle size={26} color="var(--green-success)" style={{ display: 'block', margin: '0 auto 0.4rem' }} />
                    <strong style={{ display: 'block', color: '#1E293B', marginBottom: '0.2rem' }}>No Tasks in this View</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.noRecordsTab}</span>
                  </td></tr>
                ) : (
                  filteredRecords.map(req => (
                    <tr key={req._id || req.recordId}>
                      <td>
                        <strong>{req.recordId}</strong>
                        {(req.status === 'Pending' || req.status === 'Assigned') && (() => {
                          const overdue = calculateOverdueInfo(req.assignedTime || req.createdAt, 120);
                          const isPast = !isTodayInIST(req.createdAt);
                          if (isPast || overdue.isOverdue) {
                            return (
                              <span style={{ display: 'block', color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, marginTop: '2px' }}>
                                ⚠ {overdue.durationStr || 'Overdue'}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedRequest(req)}
                          style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, color: 'var(--primary-blue)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {req.room}
                        </button>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{req.category}</td>
                      <td style={{ fontWeight: 600 }}>{req.weight} kg</td>
                      <td><span className={binClass(req.assignedBin)}>{req.assignedBin}</span></td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {formatDateTime(req.assignedTime || req.createdAt)}
                      </td>
                      <td>
                        {getStatusBadge(req.status)}
                        {req.binMismatchNote && (
                          <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '2px', fontWeight: 600 }}>
                            ⚠️ {req.binMismatchNote}
                          </div>
                        )}
                        {!req.binMismatchNote && req.binVerified && (
                          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
                            ✓ Verified
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Stage 1: Pending → Enable Collect */}
                          {(req.status === 'Pending' || req.status === 'Assigned') && (
                            <button
                              id={`btn-collect-${req.recordId}`}
                              className="btn btn-primary"
                              style={{ padding: '0.28rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleCollect(req)}
                              disabled={actionLoading}
                            >
                              <Package size={13} /> {t.collect}
                            </button>
                          )}
                          {/* Stage 2: Collected → Enable Dispose (next valid action) */}
                          {req.status === 'Collected' && (
                            <button
                              id={`btn-dispose-${req.recordId}`}
                              className="btn btn-primary"
                              style={{ padding: '0.28rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap', backgroundColor: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleComplete(req)}
                              disabled={actionLoading}
                            >
                              <ShieldCheck size={13} /> {t.dispose || 'Dispose'}
                            </button>
                          )}
                          {/* Stage 3: Completed / Disposed → View details */}
                          {(req.status === 'Completed' || req.status === 'Disposed') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <CheckCircle size={13} /> Disposed ✓
                              </span>
                              <button
                                className="btn btn-outline"
                                style={{ padding: '0.22rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}
                                onClick={() => setSelectedRequest(req)}
                              >
                                <Eye size={12} /> View
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Sidebar: AI Chatbot (Bin Reference Guide removed) ───────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <WasteChatbot role="worker" lang={lang} />
        </div>
      </div>

      {/* ── Down the Worker Dashboard: Interactive Verification Protocol ─── */}
      <div style={{ marginTop: '1.5rem' }}>
        <div
          onClick={() => setShowProtocol(prev => !prev)}
          id="verification-protocol-card"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProtocol(prev => !prev); } }}
          style={{
            cursor: 'pointer',
            backgroundColor: '#FFFFFF',
            border: '2px solid #E2E8F0',
            borderRadius: showProtocol ? '12px 12px 0 0' : '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            userSelect: 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={22} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>
                Verification Protocol
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                {showProtocol ? 'Touch to close' : '👆 Touch / Click to show Verification Protocol'}
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '0.82rem', fontWeight: 700, color: '#2563EB',
            backgroundColor: '#EFF6FF', padding: '0.4rem 0.85rem', borderRadius: '20px'
          }}>
            <span>{showProtocol ? 'Close' : '👆 Touch to View'}</span>
            <ChevronRight size={16} style={{ transform: showProtocol ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </div>
        </div>

        {showProtocol && (
          <div
            id="verification-protocol-details"
            className="fade-in"
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #E2E8F0',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem' }}>
              Verification Protocol:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0.65rem 0.85rem', backgroundColor: '#FFFBEB', borderRadius: '8px', borderLeft: '4px solid #F59E0B' }}>
                <span style={{ fontWeight: 800, color: '#B45309', minWidth: '20px' }}>1.</span>
                <div>
                  <strong style={{ color: '#92400E' }}>Yellow:</strong> <span style={{ color: '#78350F' }}>Anatomical, soiled cotton & swabs</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0.65rem 0.85rem', backgroundColor: '#FEF2F2', borderRadius: '8px', borderLeft: '4px solid #EF4444' }}>
                <span style={{ fontWeight: 800, color: '#DC2626', minWidth: '20px' }}>2.</span>
                <div>
                  <strong style={{ color: '#B91C1C' }}>Red:</strong> <span style={{ color: '#991B1B' }}>Catheters, IV tubing & infected plastics</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0.65rem 0.85rem', backgroundColor: '#F8FAFC', borderRadius: '8px', borderLeft: '4px solid #94A3B8' }}>
                <span style={{ fontWeight: 800, color: '#475569', minWidth: '20px' }}>3.</span>
                <div>
                  <strong style={{ color: '#334155' }}>White:</strong> <span style={{ color: '#475569' }}>Needles, scalpels & sharp blades</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0.65rem 0.85rem', backgroundColor: '#EFF6FF', borderRadius: '8px', borderLeft: '4px solid #3B82F6' }}>
                <span style={{ fontWeight: 800, color: '#1D4ED8', minWidth: '20px' }}>4.</span>
                <div>
                  <strong style={{ color: '#1E40AF' }}>Blue:</strong> <span style={{ color: '#1E3A8A' }}>Glass vials, ampoules & implants</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0.65rem 0.85rem', backgroundColor: '#ECFDF5', borderRadius: '8px', borderLeft: '4px solid #10B981' }}>
                <span style={{ fontWeight: 800, color: '#047857', minWidth: '20px' }}>5.</span>
                <div>
                  <strong style={{ color: '#065F46' }}>Green:</strong> <span style={{ color: '#064E3B' }}>General municipal & kitchen waste</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Collection Details Modal ───────────────────────────────────────── */}
      {selectedRequest && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '520px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setSelectedRequest(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} color="var(--text-muted)" />
            </button>

            <h3 style={{ marginBottom: '0.25rem' }}>{t.modalTitle}: {selectedRequest.recordId}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{t.modalSubtitle}</p>

            {/* Status Flow Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
              {[
                { label: t.pendingLabel, active: selectedRequest.status === 'Pending' || selectedRequest.status === 'Assigned', color: '#F59E0B', done: selectedRequest.status === 'Collected' || selectedRequest.status === 'Completed' },
                { label: t.inTransitLabel, active: selectedRequest.status === 'Collected', color: '#2563EB', done: selectedRequest.status === 'Completed' },
                { label: t.completedLabel, active: selectedRequest.status === 'Completed', color: '#10B981', done: false },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ArrowRight size={16} color="#CBD5E1" />}
                  <div style={{
                    padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                    backgroundColor: step.active ? step.color : (step.done ? step.color + '20' : '#E2E8F0'),
                    color: step.active ? '#fff' : (step.done ? step.color : '#94A3B8'),
                    border: step.done ? `1px solid ${step.color}50` : 'none'
                  }}>
                    {step.done && <Check size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} />}
                    {step.label}
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.roomLabel}</span>
                <p style={{ fontWeight: 600, color: 'var(--primary-blue)', margin: '0.2rem 0 0 0' }}>{selectedRequest.room}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.wasteCategory}</span>
                <p style={{ fontWeight: 600, margin: '0.2rem 0 0 0' }}>{selectedRequest.category}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.weightLabel}</span>
                <p style={{ fontWeight: 600, margin: '0.2rem 0 0 0' }}>{selectedRequest.weight} kg</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.assignedBin}</span>
                <div style={{ marginTop: '0.2rem' }}>
                  <span className={binClass(selectedRequest.assignedBin)}>{selectedRequest.assignedBin}</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.requestedAt}</span>
                <p style={{ fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>{formatDateTime(selectedRequest.createdAt)}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.requestedBy}</span>
                <p style={{ fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>{selectedRequest.createdBy || 'Medical Staff'}</p>
              </div>
              {selectedRequest.collectedBy && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.collectedBy}</span>
                  <p style={{ fontSize: '0.9rem', margin: '0.2rem 0 0 0', fontWeight: 600 }}>{selectedRequest.collectedBy}</p>
                </div>
              )}
              {selectedRequest.collectedAt && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.collectedAt}</span>
                  <p style={{ fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>{formatDateTime(selectedRequest.collectedAt)}</p>
                </div>
              )}
            </div>

            {selectedRequest.description && (
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.descriptionLabel}</span>
                <p style={{ fontSize: '0.9rem', backgroundColor: '#FFF', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', margin: '0.2rem 0 0 0' }}>
                  {selectedRequest.description}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedRequest(null)}>
                {t.close}
              </button>
              {/* Collect: only when Pending */}
              {(selectedRequest.status === 'Pending' || selectedRequest.status === 'Assigned') && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => handleCollect(selectedRequest)}
                  disabled={actionLoading}
                >
                  <Package size={15} /> {actionLoading ? t.updating : t.collect}
                </button>
              )}
              {/* Complete: only when In Transit (Collected) */}
              {selectedRequest.status === 'Collected' && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => handleComplete(selectedRequest)}
                  disabled={actionLoading}
                >
                  <CheckCircle size={15} /> {actionLoading ? t.updating : t.complete}
                </button>
              )}
              {selectedRequest.status === 'Completed' && (
                <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--green-success)' }} disabled>
                  {t.completedDone}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bin Verification Modal (before completing) ─────────────────────── */}
      {binVerifyRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '1rem'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '480px', position: 'relative' }}>
            <button onClick={() => setBinVerifyRecord(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} color="var(--text-muted)" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shield size={22} color="#D97706" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{t.binVerification}</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {binVerifyRecord.recordId} — {binVerifyRecord.room}
                </p>
              </div>
            </div>

            {/* Show assigned bin color prominently */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', marginBottom: '1rem',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                backgroundColor: BIN_COLORS[binVerifyRecord.assignedBin] || '#CBD5E1',
                border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Package size={24} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Bin Colour</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: BIN_COLORS[binVerifyRecord.assignedBin] || '#334155' }}>
                  {binVerifyRecord.assignedBin} Bin
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>{binVerifyRecord.category} • {binVerifyRecord.weight} kg</div>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.75rem' }}>
              {t.binVerifyQuestion}
            </p>

            {/* Yes / No Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
              <button
                onClick={() => setBinMatch(true)}
                style={{
                  flex: 1, padding: '0.7rem', borderRadius: '8px', cursor: 'pointer',
                  border: binMatch ? '2px solid #10B981' : '2px solid var(--border-color)',
                  backgroundColor: binMatch ? '#ECFDF5' : '#FFFFFF',
                  color: binMatch ? '#059669' : '#475569', fontWeight: 700, fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <CheckCircle size={16} /> {t.binVerifyYes}
              </button>
              <button
                onClick={() => setBinMatch(false)}
                style={{
                  flex: 1, padding: '0.7rem', borderRadius: '8px', cursor: 'pointer',
                  border: !binMatch ? '2px solid #EF4444' : '2px solid var(--border-color)',
                  backgroundColor: !binMatch ? '#FEF2F2' : '#FFFFFF',
                  color: !binMatch ? '#DC2626' : '#475569', fontWeight: 700, fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <AlertTriangle size={16} /> {t.binVerifyNo}
              </button>
            </div>

            {/* Mismatch note textarea */}
            {!binMatch && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#DC2626', display: 'block', marginBottom: '0.3rem' }}>
                  {t.binMismatchLabel}
                </label>
                <textarea
                  value={binMismatchNote}
                  onChange={(e) => setBinMismatchNote(e.target.value)}
                  placeholder={t.binMismatchPlaceholder}
                  rows={3}
                  style={{
                    width: '100%', padding: '0.65rem', borderRadius: '8px',
                    border: '1px solid #FECACA', fontSize: '0.85rem', resize: 'vertical',
                    backgroundColor: '#FEF2F2'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setBinVerifyRecord(null)}>
                {t.cancelVerify}
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1.2, backgroundColor: '#10B981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
                onClick={confirmBinVerifyAndComplete}
                disabled={actionLoading || (!binMatch && !binMismatchNote.trim())}
              >
                <Check size={16} /> {actionLoading ? t.updating : t.confirmComplete}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkerDashboardPage;
