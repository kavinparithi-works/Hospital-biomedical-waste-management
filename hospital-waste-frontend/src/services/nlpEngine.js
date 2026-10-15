/**
 * KMCH Biomedical Waste NLP & Knowledge Engine
 * Provides multi-lingual tokenization, word-by-word morphological NLP analysis,
 * conversational dialogue management, and regulatory Bio-Medical Waste (BMW 2016) classification
 * supporting Tamil, Hindi, Telugu, Malayalam, Kannada, and English.
 */

// Supported Voice & Speech Recognition Languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)', short: 'TA', flag: '🇮🇳' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)', short: 'HI', flag: '🇮🇳' },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)', short: 'ML', flag: '🇮🇳' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)', short: 'TE', flag: '🇮🇳' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', short: 'KN', flag: '🇮🇳' },
];

// Regulatory Biomedical Waste Classifier Knowledge Base (CPCB & BMW Rules 2016)
export const WASTE_KNOWLEDGE_BASE = [
  {
    id: 'sharps',
    category: 'Sharps',
    displayName: 'Sharps & Cutters',
    bin: 'White',
    binFullName: 'White Bin (Translucent / Puncture-Proof, Leak-Proof Container)',
    colorClass: 'bin-white',
    badgeColor: '#2C3E50',
    badgeBg: '#F4F6F7',
    guidance: 'Autoclave or dry heat sterilization, followed by shredding or encapsulation. Always deposit into puncture-proof, leak-proof translucent container immediately.',
    safetyWarning: 'Puncture Hazard: High risk of transmitting Hepatitis B, Hepatitis C, and HIV through needle-stick injuries. Never recap, bend, or hand-break needles.',
    confidenceBase: 98.0
  },
  {
    id: 'infectious',
    category: 'Infectious Waste',
    displayName: 'Infectious / Soiled Waste',
    bin: 'Yellow',
    binFullName: 'Yellow Non-Chlorinated Plastic Bag',
    colorClass: 'bin-yellow',
    badgeColor: '#D63031',
    badgeBg: '#FFEAA7',
    guidance: 'Incineration in dual-chamber incinerator (>1100°C), plasma pyrolysis, or deep burial.',
    safetyWarning: 'Biohazard Warning: Highly contagious biological contaminants (TB, MRSA, viral pathogens, Hepatitis, HIV). Always wear heavy nitrile gloves, face shield, and apron.',
    confidenceBase: 97.5
  },
  {
    id: 'plastics',
    category: 'Contaminated Recyclable',
    displayName: 'Contaminated Recyclable Plastics',
    bin: 'Red',
    binFullName: 'Red Non-Chlorinated Plastic Bag',
    colorClass: 'bin-red',
    badgeColor: '#C0392B',
    badgeBg: '#FFD2D2',
    guidance: 'Autoclave or microwave sterilization followed by shredding and registered plastic recycling. Ensure tubing and bags are drained of all fluids before bagging.',
    safetyWarning: 'Environmental Hazard: If mixed with municipal waste, toxic dioxins and furans are released upon open burning. Must be recycled exclusively through registered recyclers.',
    confidenceBase: 96.5
  },
  {
    id: 'glassware',
    category: 'Glassware & Metallic Implants',
    displayName: 'Glassware & Metallic Implants',
    bin: 'Blue',
    binFullName: 'Blue Cardboard Box / Bin with Blue Marking',
    colorClass: 'bin-blue',
    badgeColor: '#2980B9',
    badgeBg: '#D6EAF8',
    guidance: 'Disinfection by soaking in 1-2% sodium hypochlorite solution or autoclaving/microwaving, then glass/metal recycling.',
    safetyWarning: 'Cut & Contamination Hazard: Broken glass can cause deep lacerations and transmit pathogens. Wear cut-resistant gloves during transfer.',
    confidenceBase: 95.0
  },
  {
    id: 'general',
    category: 'General Waste',
    displayName: 'General Municipal Waste',
    bin: 'Green',
    binFullName: 'Green Bin (Municipal / General Non-Hazardous Waste)',
    colorClass: 'bin-green',
    badgeColor: '#1E8449',
    badgeBg: '#D4EFDF',
    guidance: 'Standard municipal solid waste disposal or organic composting. Never mix with biomedical waste.',
    safetyWarning: 'Cross-Contamination Warning: Mixing general waste into yellow/red bins multiplies biomedical incineration costs by 10x and overloads hazardous waste plants.',
    confidenceBase: 98.5
  }
];

// Helper: Determine Primary Language from text input (Tamil, Hindi, Telugu, Malayalam, Kannada, or English)
export function detectLanguage(text = '') {
  const str = (text || '').toLowerCase().trim();
  
  // 1. Tamil: Unicode Range (\u0B80-\u0BFF) or Tanglish keywords
  if (/[\u0B80-\u0BFF]/.test(str) || /(?:^|\s)(vanakkam|nandri|irukku|enna|thotti|oosi|kadavul|ungal|epdi|solla|oru|sandeham|ratham|iratham|thuni|panju|kattu|kaiyurai|saapadu|kuppai|kannadi|marunthu)(?:\s|$)/i.test(str)) {
    return 'ta';
  }

  // 2. Hindi: Unicode Range (\u0900-\u097F) or Hinglish keywords
  if (/[\u0900-\u097F]/.test(str) || /(?:^|\s)(namaste|shukriya|kya|kaise|dabba|kachra|khoon|batao|chahiye|madad|kripya|sui|patti|dawa|dastane)(?:\s|$)/i.test(str)) {
    return 'hi';
  }

  // 3. Telugu: Unicode Range (\u0C00-\u0C7F) or Telugu transliteration keywords
  if (/[\u0C00-\u0C7F]/.test(str) || /(?:^|\s)(namaskaram|dhanyavadalu|raktham|soodi|gudda|mandulu|sahayam|cheti chila|dabba|kuppa|chettha)(?:\s|$)/i.test(str)) {
    return 'te';
  }

  // 4. Malayalam: Unicode Range (\u0D00-\u0D7F) or Malayalam transliteration keywords
  if (/[\u0D00-\u0D7F]/.test(str) || /(?:^|\s)(namaskaram|nanni|raktham|soochi|thuni|marunnu|kayyura|kuppi|sahayam|maalinyam)(?:\s|$)/i.test(str)) {
    return 'ml';
  }

  // 5. Kannada: Unicode Range (\u0C80-\u0CFF) or Kannada transliteration keywords
  if (/[\u0C80-\u0CFF]/.test(str) || /(?:^|\s)(namaskara|dhanyavadagalu|raktha|sooji|batte|aushadha|kasa|sahaya|kai chilu)(?:\s|$)/i.test(str)) {
    return 'kn';
  }

  return 'en';
}

/**
 * =========================================================================
 * MULTI-LINGUAL MORPHOLOGICAL STEMMER (TAMIL, HINDI, TELUGU, MALAYALAM, KANNADA)
 * =========================================================================
 */

const SUFFIXES_BY_LANG = {
  ta: [
    'களில்', 'ங்களை', 'களுக்கு', 'க்களுக்கு', 'களின்', 'க்கள்', 'கள்',
    'யில்', 'இல்', 'தில்', 'ல்',
    'யை', 'வை', 'ஐ',
    'யுடன்', 'உடன்', 'டன்', 'யோடு', 'ஓடு',
    'க்கு', 'வுக்கு', 'ற்கு',
    'யால்', 'ஆல்',
    'படிந்த', 'பட்ட', 'கறை', 'கறையான', 'தோய்ந்த', 'நனைந்த', 'அழுக்கான',
    'இல்லாத', 'அற்ற', 'நீக்கப்பட்ட', 'வெட்டப்பட்ட',
    'உடைந்த', 'நொறுங்கிய',
    'காலாவதியான', 'பழைய', 'வீணான'
  ],
  hi: [
    'ियों', 'ियां', 'ों', 'एं', 'े', 'वाली', 'वाले', 'वाला', 'युक्त', 'सहित',
    'रहित', 'बिना', 'टूटा', 'टूटी', 'सड़ा', 'खराब'
  ],
  te: [
    'లకు', 'లను', 'లతో', 'లలో', 'లు', 'ల', 'తో', 'లో', 'కు', 'కి', 'ను', 'ని',
    'వలన', 'చేత', 'అంటిన', 'తడిసిన', 'లేని'
  ],
  ml: [
    'ങ്ങൾക്ക്', 'ങ്ങളിൽ', 'ങ്ങളെ', 'കൾ', 'കളിൽ', 'കളെ', 'ൽ', 'ഇൽ', 'ഓട്', 'ഉമായി',
    'ആൽ', 'പുരണ്ട', 'നനഞ്ഞ', 'ഇല്ലാത്ത'
  ],
  kn: [
    'ಗಳಲ್ಲಿ', 'ಗಳಿಗೆ', 'ಗಳನ್ನು', 'ಗಳ', 'ಗಳು', 'ಅನ್ನು', 'ಇಂದ', 'ಗೆ', 'ಕ್ಕೆ', 'ಅಲ್ಲಿ',
    'ಒಂದಿಗೆ', 'ಅಂಟಿದ', 'ನೆನೆದ', 'ಇಲ್ಲದ'
  ]
};

function stemIndianWord(rawWord, lang = 'en') {
  let word = rawWord.trim();
  if (word.length <= 2) return word;

  const suffixes = SUFFIXES_BY_LANG[lang] || [
    ...(SUFFIXES_BY_LANG.ta),
    ...(SUFFIXES_BY_LANG.hi),
    ...(SUFFIXES_BY_LANG.te),
    ...(SUFFIXES_BY_LANG.ml),
    ...(SUFFIXES_BY_LANG.kn)
  ];

  for (const suf of suffixes) {
    if (word.endsWith(suf) && word.length > suf.length + 1) {
      word = word.slice(0, word.length - suf.length);
      break;
    }
  }
  return word;
}

/**
 * =========================================================================
 * MULTI-LINGUAL SEMANTIC LEXICON
 * Covers English, Tamil, Hindi, Telugu, Malayalam, Kannada
 * =========================================================================
 */
const SEMANTIC_LEXICON = {
  // ── 1. INFECTIOUS / SOILED (Yellow Bin) ───────────────────────────────────
  // Blood / Body Fluids
  'ரத்தம்': { cat: 'infectious', score: 10, role: { ta: 'உடல் திரவம் / நோய்த்தொற்று காரணி', hi: 'जैविक रक्त संदूषक', te: 'రక్త సంక్రమణ కారకం', ml: 'രക്ത അണുബാധ സാധ്യത', kn: 'ರಕ್ತ ಸೋಂಕು ಕಾರಕ', en: 'Blood / biohazard' } },
  'இரத்தம்': { cat: 'infectious', score: 10, role: { ta: 'உடல் திரவம் / நோய்த்தொற்று காரணி', hi: 'जैविक रक्त संदूषक', te: 'రక్త సంక్రమణ కారకం', ml: 'രക്ത അണുബാധ സാധ്യത', kn: 'ರಕ್ತ ಸೋಂಕು ಕಾರಕ', en: 'Blood / biohazard' } },
  'குருதி': { cat: 'infectious', score: 10, role: { ta: 'இரத்தம் (Blood contaminant)', hi: 'रक्त संदूषक', te: 'రక్త కారకం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood contaminant' } },
  'ரத்த': { cat: 'infectious', score: 10, role: { ta: 'ரத்தக்கறை (Blood soiled)', hi: 'रक्त लगा', te: 'రక్తం అంటిన', ml: 'രക്തം പുരണ്ട', kn: 'ರಕ್ತ ಅಂಟಿದ', en: 'Blood soiled' } },
  'இரத்த': { cat: 'infectious', score: 10, role: { ta: 'இரத்தக்கறை (Blood soiled)', hi: 'रक्त लगा', te: 'రక్తం అంటిన', ml: 'രക്തം പുരണ്ട', kn: 'ರಕ್ತ ಅಂಟಿದ', en: 'Blood soiled' } },
  'ratham': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம் (Blood)', hi: 'खून (Blood)', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood' } },
  'iratham': { cat: 'infectious', score: 10, role: { ta: 'இரத்தம் (Blood)', hi: 'खून (Blood)', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood' } },
  'blood': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood / biological fluid' } },
  'khoon': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून / रक्त', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood' } },
  'खून': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून / जैविक रक्त संदूषक', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood contaminant' } },
  'रक्त': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'रक्त संदूषक', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood biohazard' } },
  'రక్తం': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून', te: 'రక్తం / శారీరక సంక్రమణ ద్రవం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood biohazard' } },
  'రక్తము': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून', te: 'రక్తము (Blood biohazard)', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood biohazard' } },
  'raktham': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood' } },
  'രക്തം': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून', te: 'రక్తం', ml: 'രക്തം / ശരീര ദ്രവം (Blood biohazard)', kn: 'ರಕ್ತ', en: 'Blood biohazard' } },
  'ರಕ್ತ': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ / ದೇಹದ ಸೋಂಕು ದ್ರವ (Blood biohazard)', en: 'Blood biohazard' } },
  'raktha': { cat: 'infectious', score: 10, role: { ta: 'ரத்தம்', hi: 'खून', te: 'రక్తం', ml: 'രക്തം', kn: 'ರಕ್ತ', en: 'Blood' } },

  // Pus, body fluid, vomit, urine, stool
  'சீழ்': { cat: 'infectious', score: 8, role: { ta: 'தொற்று திரவம் (Infectious pus)', hi: 'मवाद (Pus)', te: 'చీము (Pus)', ml: 'ചലം (Pus)', kn: 'ಕೀವು (Pus)', en: 'Infectious pus' } },
  'मवाद': { cat: 'infectious', score: 8, role: { ta: 'சீழ்', hi: 'मवाद (Infectious pus)', te: 'చీము', ml: 'ചലം', kn: 'ಕೀವು', en: 'Infectious pus' } },
  'చీము': { cat: 'infectious', score: 8, role: { ta: 'சீழ்', hi: 'मवाद', te: 'చీము (Infectious pus)', ml: 'ചലം', kn: 'ಕೀವು', en: 'Infectious pus' } },
  'ചലം': { cat: 'infectious', score: 8, role: { ta: 'சீழ்', hi: 'मवाद', te: 'చీము', ml: 'ചലം (Infectious pus)', kn: 'ಕೀವು', en: 'Infectious pus' } },
  'ಕೀವು': { cat: 'infectious', score: 8, role: { ta: 'சீழ்', hi: 'मवाद', te: 'చీము', ml: 'ചലം', kn: 'ಕೀವು (Infectious pus)', en: 'Infectious pus' } },

  // Soiled cloth, gauze, cotton, bandages, dressings
  'துணி': { cat: 'infectious', score: 6, role: { ta: 'உறிஞ்சும் மருத்துவ ஆடை/துணி', hi: 'चिकित्सा कपड़ा / गॉज', te: 'వైద్య వస్త్రం / గుడ్డ', ml: 'മെഡിക്കൽ തുണി', kn: 'ವೈದ್ಯಕೀಯ ಬಟ್ಟೆ', en: 'Clinical textile / linen' } },
  'thuni': { cat: 'infectious', score: 6, role: { ta: 'மருத்துவ துணி', hi: 'कपड़ा', te: 'గుడ్డ', ml: 'തുണി', kn: 'ಬಟ್ಟೆ', en: 'Clinical cloth' } },
  'cloth': { cat: 'infectious', score: 5, role: { ta: 'மருத்துவ துணி', hi: 'चिकित्सा कपड़ा', te: 'గుడ్డ', ml: 'തുണി', kn: 'ಬಟ್ಟೆ', en: 'Clinical linen' } },
  'linen': { cat: 'infectious', score: 6, role: { ta: 'படுக்கை விரிப்பு', hi: 'हॉस्पिटल लिनन', te: 'ఆసుపత్రి వస్త్రం', ml: 'ആശുപത്രി തുണി', kn: 'ಆಸ್ಪತ್ರೆ ಬಟ್ಟೆ', en: 'Soiled hospital linen' } },
  'कपड़ा': { cat: 'infectious', score: 6, role: { ta: 'துணி', hi: 'चिकित्सा कपड़ा / गॉज', te: 'గుడ్డ', ml: 'തുണി', kn: 'ಬಟ್ಟೆ', en: 'Clinical cloth / textile' } },
  'कपड़े': { cat: 'infectious', score: 6, role: { ta: 'துணிகள்', hi: 'चिकित्सा कपड़े', te: 'బట్టలు', ml: 'തുണികൾ', kn: 'ಬಟ್ಟೆಗಳು', en: 'Clinical textiles' } },
  'బట్ట': { cat: 'infectious', score: 6, role: { ta: 'துணி', hi: 'कपड़ा', te: 'రక్తపు లేదా వైద్య వస్త్రం', ml: 'തുണി', kn: 'ಬಟ್ಟೆ', en: 'Clinical cloth' } },
  'గుడ్డ': { cat: 'infectious', score: 6, role: { ta: 'துணி', hi: 'कपड़ा', te: 'వైద్య గుడ్డ / వస్త్రం', ml: 'തുണി', kn: 'ಬಟ್ಟೆ', en: 'Clinical cloth' } },
  'തുണി': { cat: 'infectious', score: 6, role: { ta: 'துணி', hi: 'कपड़ा', te: 'గుడ్డ', ml: 'മെഡിക്കൽ തുണി / ഡ്രസ്സിംഗ്', kn: 'ಬಟ್ಟೆ', en: 'Clinical cloth / dressing' } },
  'ಬಟ್ಟೆ': { cat: 'infectious', score: 6, role: { ta: 'துணி', hi: 'कपड़ा', te: 'గుడ్డ', ml: 'തുണി', kn: 'ವೈದ್ಯಕೀಯ ಬಟ್ಟೆ / ಡ್ರೆಸ್ಸಿಂಗ್', en: 'Clinical cloth / dressing' } },

  // Cotton / Gauze / Bandages
  'பஞ்சு': { cat: 'infectious', score: 7, role: { ta: 'மருத்துவ பஞ்சு (Clinical cotton)', hi: 'रुई', te: 'దూది', ml: 'പഞ്ഞി', kn: 'ಹತ್ತಿ', en: 'Clinical cotton swab' } },
  'panju': { cat: 'infectious', score: 7, role: { ta: 'மருத்துவ பஞ்சு', hi: 'रुई', te: 'దూది', ml: 'പഞ്ഞി', kn: 'ಹತ್ತಿ', en: 'Cotton swab' } },
  'cotton': { cat: 'infectious', score: 7, role: { ta: 'பஞ்சு', hi: 'रुई', te: 'దూది', ml: 'പഞ്ഞി', kn: 'ಹತ್ತಿ', en: 'Absorbent clinical cotton' } },
  'gauze': { cat: 'infectious', score: 7, role: { ta: 'காஸ் துணி', hi: 'गॉज पट्टी', te: 'గాజ్', ml: 'ഗാസ്', kn: 'ಗಾಜ್', en: 'Surgical gauze dressing' } },
  'bandage': { cat: 'infectious', score: 7, role: { ta: 'பேண்டேஜ்', hi: 'बैंडेज', te: 'బ్యాండేజ్', ml: 'ബാൻഡേജ്', kn: 'ಬ್ಯಾಂಡೇಜ್', en: 'Wound bandage dressing' } },
  'dressing': { cat: 'infectious', score: 7, role: { ta: 'கட்டு', hi: 'ड्रेसिंग', te: 'డ్రెస్సింగ్', ml: 'ഡ്രസ്സിംഗ്', kn: 'ಡ್ರೆಸ್ಸಿಂಗ್', en: 'Surgical wound dressing' } },
  'रुई': { cat: 'infectious', score: 7, role: { ta: 'பஞ்சு', hi: 'कपास / रुई (Clinical cotton)', te: 'దూది', ml: 'പഞ്ഞി', kn: 'ಹತ್ತಿ', en: 'Clinical cotton swab' } },
  'कपास': { cat: 'infectious', score: 7, role: { ta: 'பஞ்சு', hi: 'कपास (Cotton)', te: 'దూది', ml: 'പഞ്ഞി', kn: 'ಹತ್ತಿ', en: 'Cotton' } },
  'पट्टी': { cat: 'infectious', score: 7, role: { ta: 'கட்டுத்துணி', hi: 'पट्टी / बैंडेज (Bandage)', te: 'కట్టు', ml: 'കെട്ട്', kn: 'ಪಟ್ಟಿ', en: 'Bandage / dressing' } },
  'गॉज': { cat: 'infectious', score: 7, role: { ta: 'காஸ்', hi: 'गॉज पट्टी (Gauze)', te: 'గాజ్', ml: 'ഗാസ്', kn: 'ಗಾಜ್', en: 'Gauze dressing' } },
  'बैंडेज': { cat: 'infectious', score: 7, role: { ta: 'பேண்டேஜ்', hi: 'बैंडेज (Bandage)', te: 'బ్యాండేజ్', ml: 'ബാൻഡേജ്', kn: 'ಬ್ಯಾಂಡೇಜ್', en: 'Bandage' } },
  'దూది': { cat: 'infectious', score: 7, role: { ta: 'பஞ்சு', hi: 'रुई', te: 'వైద్య దూది (Clinical cotton)', ml: 'പഞ്ഞി', kn: 'ಹತ್ತಿ', en: 'Clinical cotton swab' } },
  'గాజ్': { cat: 'infectious', score: 7, role: { ta: 'காஸ்', hi: 'गॉज', te: 'గాజ్ పట్టీ (Gauze dressing)', ml: 'ഗാസ്', kn: 'ಗಾಜ್', en: 'Gauze dressing' } },
  'బ్యాండేజ్': { cat: 'infectious', score: 7, role: { ta: 'பேண்டேஜ்', hi: 'बैंडेज', te: 'బ్యాండేజ్ (Bandage)', ml: 'ബാൻഡേജ്', kn: 'ಬ್ಯಾಂಡೇಜ್', en: 'Bandage' } },
  'కట్టు': { cat: 'infectious', score: 7, role: { ta: 'கட்டு', hi: 'पट्टी', te: 'కట్టు గుడ్డ (Dressing)', ml: 'കെട്ട്', kn: 'ಪಟ್ಟಿ', en: 'Wound dressing' } },
  'പഞ്ഞി': { cat: 'infectious', score: 7, role: { ta: 'பஞ்சு', hi: 'रुई', te: 'దూది', ml: 'പഞ്ഞി (Clinical cotton)', kn: 'ಹತ್ತಿ', en: 'Clinical cotton' } },
  'ഗാസ്': { cat: 'infectious', score: 7, role: { ta: 'காஸ்', hi: 'गॉज', te: 'గాజ్', ml: 'ഗാസ് ഡ്രസ്സിംഗ് (Gauze)', kn: 'ಗಾಜ್', en: 'Gauze dressing' } },
  'ബാൻഡേജ്': { cat: 'infectious', score: 7, role: { ta: 'பேண்டேஜ்', hi: 'बैंडेज', te: 'బ్యాండేజ్', ml: 'ബാൻഡേജ് (Bandage)', kn: 'ಬ್ಯಾಂಡೇಜ್', en: 'Bandage' } },
  'കെട്ട്': { cat: 'infectious', score: 7, role: { ta: 'கட்டு', hi: 'पट्टी', te: 'కట్టు', ml: 'മുറിവ് കെട്ട് (Wound dressing)', kn: 'ಪಟ್ಟಿ', en: 'Wound dressing' } },
  'ಹತ್ತಿ': { cat: 'infectious', score: 7, role: { ta: 'பஞ்சு', hi: 'रुई', te: 'దూది', ml: 'പഞ്ഞി', kn: 'ವೈದ್ಯಕೀಯ ಹತ್ತಿ (Clinical cotton)', en: 'Clinical cotton swab' } },
  'ಗಾಜ್': { cat: 'infectious', score: 7, role: { ta: 'காஸ்', hi: 'गॉज', te: 'గాజ్', ml: 'ഗാസ്', kn: 'ಗಾಜ್ ಪಟ್ಟಿ (Gauze dressing)', en: 'Gauze dressing' } },
  'ಬ್ಯಾಂಡೇಜ್': { cat: 'infectious', score: 7, role: { ta: 'பேண்டேஜ்', hi: 'बैंडेज', te: 'బ్యాండేజ్', ml: 'ബാൻഡേജ്', kn: 'ಬ್ಯಾಂಡೇಜ್ (Bandage)', en: 'Bandage' } },
  'ಪಟ್ಟಿ': { cat: 'infectious', score: 7, role: { ta: 'கட்டு', hi: 'पट्टी', te: 'పట్టీ', ml: 'കെട്ട്', kn: 'ಗಾಯದ ಪಟ್ಟಿ (Wound dressing)', en: 'Wound dressing' } },

  // Human Anatomical, Placenta, Tissues
  'நஞ்சுக்கொடி': { cat: 'infectious', score: 10, role: { ta: 'நஞ்சுக்கொடி', hi: 'प्लेसेंटा', te: 'మాయ', ml: 'മറുപിള്ള', kn: 'ಮಾಸು', en: 'Placenta anatomical waste' } },
  'நச்சுக்கொடி': { cat: 'infectious', score: 10, role: { ta: 'நஞ்சுக்கொடி', hi: 'प्लेसेंटा', te: 'మాయ', ml: 'മറുപിള്ള', kn: 'ಮಾಸು', en: 'Placenta anatomical waste' } },
  'placenta': { cat: 'infectious', score: 10, role: { ta: 'நஞ்சுக்கொடி', hi: 'प्लेसेंटा', te: 'మాయ', ml: 'മറുപിള്ള', kn: 'ಮಾಸು', en: 'Human placenta anatomical waste' } },
  'tissue': { cat: 'infectious', score: 9, role: { ta: 'மனித திசு', hi: 'मानव ऊतक', te: 'కణజాలం', ml: 'കോശം', kn: 'ಅಂಗಾಂಶ', en: 'Human biological tissue' } },
  'प्लेसेंटा': { cat: 'infectious', score: 10, role: { ta: 'நஞ்சுக்கொடி', hi: 'प्लेसेंटा / अपरा (Placenta)', te: 'మాయ', ml: 'മറുപിള്ള', kn: 'ಮಾಸು', en: 'Placenta anatomical waste' } },
  'गर्भनाल': { cat: 'infectious', score: 10, role: { ta: 'நஞ்சுக்கொடி', hi: 'गर्भनाल (Umbilical cord)', te: 'మాయ', ml: 'മറുപിള്ള', kn: 'ಮಾಸು', en: 'Anatomical cord' } },
  'ऊतक': { cat: 'infectious', score: 9, role: { ta: 'திசு', hi: 'मानव ऊतक (Human tissue)', te: 'కణజాలం', ml: 'കോശം', kn: 'ಅಂಗಾಂಶ', en: 'Human tissue' } },
  'మాయ': { cat: 'infectious', score: 10, role: { ta: 'நஞ்சுக்கொடி', hi: 'प्लेसेंटा', te: 'మాయ (Placenta anatomical waste)', ml: 'മറുപിള്ള', kn: 'ಮಾಸು', en: 'Placenta anatomical waste' } },
  'కణజాలం': { cat: 'infectious', score: 9, role: { ta: 'திசு', hi: 'ऊतक', te: 'మానవ కణజాలం (Human tissue)', ml: 'കോശം', kn: 'ಅಂಗಾಂಶ', en: 'Human tissue' } },
  'മറുപിള്ള': { cat: 'infectious', score: 10, role: { ta: 'நஞ்சுக்கொடி', hi: 'प्लेसेंटा', te: 'మాయ', ml: 'മറുപിള്ള (Placenta anatomical waste)', kn: 'ಮಾಸು', en: 'Placenta anatomical waste' } },
  'കോശം': { cat: 'infectious', score: 9, role: { ta: 'திசு', hi: 'ऊतक', te: 'కణజాలం', ml: 'ശരീര കോശം (Human tissue)', kn: 'ಅಂಗಾಂಶ', en: 'Human tissue' } },
  'ಮಾಸು': { cat: 'infectious', score: 10, role: { ta: 'நஞ்சுக்கொடி', hi: 'प्लेसेंटा', te: 'మాయ', ml: 'മറുപിള്ള', kn: 'ಮಾಸು (Placenta anatomical waste)', en: 'Placenta anatomical waste' } },
  'ಅಂಗಾಂಶ': { cat: 'infectious', score: 9, role: { ta: 'திசு', hi: 'ऊतक', te: 'కణజాలం', ml: 'കോശം', kn: 'ಮಾನವ ಅಂಗಾಂಶ (Human tissue)', en: 'Human tissue' } },

  // Expired Medicines / Tablets / Cytotoxic
  'மாத்திரை': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரை', hi: 'दवा की गोली', te: 'మాత్ర', ml: 'ഗുളിക', kn: 'ಮಾತ್ರೆ', en: 'Expired medicine tablet' } },
  'மாத்திரைகள்': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரைகள்', hi: 'गोलियां', te: 'మాత్రలు', ml: 'ഗുളികകൾ', kn: 'ಮಾತ್ರೆಗಳು', en: 'Medicine tablets' } },
  'மருந்து': { cat: 'infectious', score: 7, role: { ta: 'மருந்து', hi: 'दवा', te: 'మందు', ml: 'മരുന്ന്', kn: 'ಔಷಧಿ', en: 'Expired medicine' } },
  'மருந்துகள்': { cat: 'infectious', score: 7, role: { ta: 'மருந்துகள்', hi: 'दवाइयां', te: 'మందులు', ml: 'മരുന്നുകൾ', kn: 'ಔಷಧಗಳು', en: 'Expired medicines' } },
  'marunthu': { cat: 'infectious', score: 7, role: { ta: 'மருந்து', hi: 'दवा', te: 'మందు', ml: 'മരുന്ന്', kn: 'ಔಷಧಿ', en: 'Medicine' } },
  'tablet': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரை', hi: 'गोली', te: 'మాత్ర', ml: 'ഗുളിക', kn: 'ಮಾತ್ರೆ', en: 'Medicine tablet' } },
  'tablets': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரைகள்', hi: 'गोलियां', te: 'మాత్రలు', ml: 'ഗുളികകൾ', kn: 'ಮಾತ್ರೆಗಳು', en: 'Medicine tablets' } },
  'medicine': { cat: 'infectious', score: 7, role: { ta: 'மருந்து', hi: 'दवा', te: 'మందు', ml: 'മരുന്ന്', kn: 'ಔಷಧಿ', en: 'Medicine drug' } },
  'medicines': { cat: 'infectious', score: 7, role: { ta: 'மருந்துகள்', hi: 'दवाइयां', te: 'మందులు', ml: 'മരുന്നുകൾ', kn: 'ಔಷಧಗಳು', en: 'Medicines' } },
  'दवा': { cat: 'infectious', score: 7, role: { ta: 'மருந்து', hi: 'एक्सपायर्ड दवा (Expired medicine)', te: 'మందు', ml: 'മരുന്ന്', kn: 'ಔಷಧಿ', en: 'Expired medicine' } },
  'दवाइयां': { cat: 'infectious', score: 7, role: { ta: 'மருந்துகள்', hi: 'दवाइयां (Expired medicines)', te: 'మందులు', ml: 'മരുന്നുകൾ', kn: 'ಔಷಧಗಳು', en: 'Expired medicines' } },
  'गोली': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரை', hi: 'दवा की गोली (Tablet)', te: 'మాత్ర', ml: 'ഗുളിക', kn: 'ಮಾತ್ರೆ', en: 'Medicine tablet' } },
  'गोलियां': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரைகள்', hi: 'दवा की गोलियां (Tablets)', te: 'మాత్రలు', ml: 'ഗുളികകൾ', kn: 'ಮಾತ್ರೆಗಳು', en: 'Medicine tablets' } },
  'మందులు': { cat: 'infectious', score: 7, role: { ta: 'மருந்துகள்', hi: 'दवाइयां', te: 'గడువు ముగిసిన మందులు (Expired medicines)', ml: 'മരുന്നുകൾ', kn: 'ಔಷಧಗಳು', en: 'Expired medicines' } },
  'మందు': { cat: 'infectious', score: 7, role: { ta: 'மருந்து', hi: 'दवा', te: 'మందు (Medicine)', ml: 'മരുന്ന്', kn: 'ಔಷಧಿ', en: 'Medicine' } },
  'మాత్రలు': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரைகள்', hi: 'गोलियां', te: 'మాత్రలు (Medicine tablets)', ml: 'ഗുളികകൾ', kn: 'ಮಾತ್ರೆಗಳು', en: 'Medicine tablets' } },
  'మాత్ర': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரை', hi: 'गोली', te: 'మాత్ర (Medicine tablet)', ml: 'ഗുളിക', kn: 'ಮಾತ್ರೆ', en: 'Medicine tablet' } },
  'മരുന്ന്': { cat: 'infectious', score: 7, role: { ta: 'மருந்து', hi: 'दवा', te: 'మందు', ml: 'കാലഹരണപ്പെട്ട മരുന്ന് (Expired medicine)', kn: 'ಔಷಧಿ', en: 'Expired medicine' } },
  'മരുന്നുകൾ': { cat: 'infectious', score: 7, role: { ta: 'மருந்துகள்', hi: 'दवाइयां', te: 'మందులు', ml: 'മരുന്നുകൾ (Expired medicines)', kn: 'ಔಷಧಗಳು', en: 'Expired medicines' } },
  'ഗുളിക': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரை', hi: 'गोली', te: 'మాత్ర', ml: 'ഗുളിക (Medicine tablet)', kn: 'ಮಾತ್ರೆ', en: 'Medicine tablet' } },
  'ഗുളികകൾ': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரைகள்', hi: 'गोलियां', te: 'మాత్రలు', ml: 'ഗുളികകൾ (Medicine tablets)', kn: 'ಮಾತ್ರೆಗಳು', en: 'Medicine tablets' } },
  'ಔಷಧಿ': { cat: 'infectious', score: 7, role: { ta: 'மருந்து', hi: 'दवा', te: 'మందు', ml: 'മരുന്ന്', kn: 'ಅವಧಿ ಮುಗಿದ ಔಷಧಿ (Expired medicine)', en: 'Expired medicine' } },
  'ಔಷಧಗಳು': { cat: 'infectious', score: 7, role: { ta: 'மருந்துகள்', hi: 'दवाइयां', te: 'మందులు', ml: 'മരുന്നുകൾ', kn: 'ಔಷಧಗಳು (Expired medicines)', en: 'Expired medicines' } },
  'ಮಾತ್ರೆ': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரை', hi: 'गोली', te: 'మాత్ర', ml: 'ഗുളിക', kn: 'ಮಾತ್ರೆ (Medicine tablet)', en: 'Medicine tablet' } },
  'ಮಾತ್ರೆಗಳು': { cat: 'infectious', score: 8, role: { ta: 'மாத்திரைகள்', hi: 'गोलियां', te: 'మాత్రలు', ml: 'ഗുളികകൾ', kn: 'ಮಾತ್ರೆಗಳು (Medicine tablets)', en: 'Medicine tablets' } },

  // ── 2. SHARPS & CUTTERS (White Bin) ───────────────────────────────────────
  'ஊசி': { cat: 'sharps', score: 10, role: { ta: 'கூர்மையான உலோக ஊசி', hi: 'नुकीली सुई', te: 'పదునైన సూది', ml: 'മൂർച്ചയുള്ള സൂചി', kn: 'ಹರಿತವಾದ ಸೂಜಿ', en: 'Sharp metal needle' } },
  'ஊசிகள்': { cat: 'sharps', score: 10, role: { ta: 'கூர்மையான ஊசிகள்', hi: 'नुकीली सुइयां', te: 'సూదులు', ml: 'സൂചികൾ', kn: 'ಸೂಜಿಗಳು', en: 'Metal needles' } },
  'oosi': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'సూది', ml: 'സൂചി', kn: 'ಸೂಜಿ', en: 'Needle' } },
  'needle': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'సూది', ml: 'സൂചി', kn: 'ಸೂಜಿ', en: 'Sharp puncture needle' } },
  'needles': { cat: 'sharps', score: 10, role: { ta: 'ஊசிகள்', hi: 'सुइयां', te: 'సూదులు', ml: 'സൂചികൾ', kn: 'ಸೂಜಿಗಳು', en: 'Sharp puncture needles' } },
  'sui': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'సూది', ml: 'സൂചി', kn: 'ಸೂಜಿ', en: 'Needle' } },
  'सुई': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'नुकीली धातु की सुई (Sharp metal needle)', te: 'సూది', ml: 'സൂചി', kn: 'ಸೂಜಿ', en: 'Sharp metal needle' } },
  'सुइयां': { cat: 'sharps', score: 10, role: { ta: 'ஊசிகள்', hi: 'नुकीली सुइयां (Needles)', te: 'సూదులు', ml: 'സൂചികൾ', kn: 'ಸೂಜಿಗಳು', en: 'Needles' } },
  'సూది': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'పదునైన లోహపు సూది (Sharp metal needle)', ml: 'സൂചി', kn: 'ಸೂಜಿ', en: 'Sharp metal needle' } },
  'సూదులు': { cat: 'sharps', score: 10, role: { ta: 'ஊசிகள்', hi: 'सुइयां', te: 'పదునైన సూదులు (Metal needles)', ml: 'സൂചികൾ', kn: 'ಸೂಜಿಗಳು', en: 'Metal needles' } },
  'soodi': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'సూది', ml: 'സൂചി', kn: 'ಸೂಜಿ', en: 'Needle' } },
  'സൂചി': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'సూది', ml: 'മൂർച്ചയുള്ള സൂചി (Sharp needle)', kn: 'ಸೂಜಿ', en: 'Sharp metal needle' } },
  'സൂചികൾ': { cat: 'sharps', score: 10, role: { ta: 'ஊசிகள்', hi: 'सुइयां', te: 'సూదులు', ml: 'സൂചികൾ (Needles)', kn: 'ಸೂಜಿಗಳು', en: 'Metal needles' } },
  'soochi': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'సూది', ml: 'സൂചി', kn: 'ಸೂಜಿ', en: 'Needle' } },
  'ಸೂಜಿ': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'సూది', ml: 'സൂചി', kn: 'ಹರಿತವಾದ ಲೋಹದ ಸೂಜಿ (Sharp metal needle)', en: 'Sharp metal needle' } },
  'ಸೂಜಿಗಳು': { cat: 'sharps', score: 10, role: { ta: 'ஊசிகள்', hi: 'सुइयां', te: 'సూదులు', ml: 'സൂചികൾ', kn: 'ಸೂಜಿಗಳು (Needles)', en: 'Metal needles' } },
  'sooji': { cat: 'sharps', score: 10, role: { ta: 'ஊசி', hi: 'सुई', te: 'సూది', ml: 'സൂചി', kn: 'ಸೂಜಿ', en: 'Needle' } },

  // Injection / Syringe (with needle)
  'இன்ஜெக்ஷன்': { cat: 'sharps', score: 8, role: { ta: 'பயன்படுத்திய இன்ஜெக்ஷன்', hi: 'इंजेक्शन', te: 'ఇంజెక్షన్', ml: 'ഇൻജക്ഷൻ', kn: 'ಇಂಜೆಕ್ಷನ್', en: 'Used injection' } },
  'injection': { cat: 'sharps', score: 8, role: { ta: 'இன்ஜெக்ஷன்', hi: 'इंजेक्शन', te: 'ఇంజెక్షన్', ml: 'ഇൻജക്ഷൻ', kn: 'ಇಂಜೆಕ್ಷನ್', en: 'Used injection' } },
  'சிரிஞ்ச்': { cat: 'sharps', score: 7, role: { ta: 'சிரிஞ்ச் ஊசி', hi: 'सिरिंज', te: 'సిరంజి', ml: 'സിറിഞ്ച്', kn: 'ಸಿರಿಂಜ್', en: 'Syringe' } },
  'syringe': { cat: 'sharps', score: 7, role: { ta: 'சிரிஞ்ச்', hi: 'सिरिंज', te: 'సిరంజి', ml: 'സിറിഞ്ച്', kn: 'ಸಿರಿಂಜ್', en: 'Syringe with needle' } },
  'इंजेक्शन': { cat: 'sharps', score: 8, role: { ta: 'இன்ஜெக்ஷன்', hi: 'उपयोग किया गया इंजेक्शन (Used injection)', te: 'ఇంజెక్షన్', ml: 'ഇൻജക്ഷൻ', kn: 'ಇಂಜೆಕ್ಷನ್', en: 'Used injection' } },
  'सिरिंज': { cat: 'sharps', score: 7, role: { ta: 'சிரிஞ்ச்', hi: 'सुई सहित सिरिंज (Syringe)', te: 'సిరంజి', ml: 'സിറിഞ്ച്', kn: 'ಸಿರಿಂಜ್', en: 'Syringe with needle' } },
  'ఇంజెక్షన్': { cat: 'sharps', score: 8, role: { ta: 'இன்ஜெக்ஷன்', hi: 'इंजेक्शन', te: 'ఉపయోగించిన ఇంజెక్షన్ (Injection)', ml: 'ഇൻജക്ഷൻ', kn: 'ಇಂಜೆಕ್ಷನ್', en: 'Used injection' } },
  'సిరంజి': { cat: 'sharps', score: 7, role: { ta: 'சிரிஞ்ச்', hi: 'सिरिंज', te: 'సిరంజి (Syringe)', ml: 'സിറിഞ്ച്', kn: 'ಸಿರಿಂಜ್', en: 'Syringe' } },
  'ഇൻജക്ഷൻ': { cat: 'sharps', score: 8, role: { ta: 'இன்ஜெக்ஷன்', hi: 'इंजेक्शन', te: 'ఇంజెక్షన్', ml: 'ഇൻജക്ഷൻ (Injection)', kn: 'ಇಂಜೆಕ್ಷನ್', en: 'Used injection' } },
  'സിറിഞ്ച്': { cat: 'sharps', score: 7, role: { ta: 'சிரிஞ்ச்', hi: 'सिरिंज', te: 'సిరంజి', ml: 'സിറിഞ്ച് (Syringe)', kn: 'ಸಿರಿಂಜ್', en: 'Syringe' } },
  'ಇಂಜೆಕ್ಷನ್': { cat: 'sharps', score: 8, role: { ta: 'இன்ஜெக்ஷன்', hi: 'इंजेक्शन', te: 'ఇంజెక్షన్', ml: 'ഇൻജക്ഷൻ', kn: 'ಬಳಸಿದ ಇಂಜೆಕ್ಷನ್ (Injection)', en: 'Used injection' } },
  'ಸಿರಿಂಜ್': { cat: 'sharps', score: 7, role: { ta: 'சிரிஞ்ச்', hi: 'सिरिंज', te: 'సిరంజి', ml: 'സിറിഞ്ച്', kn: 'ಸಿರಿಂಜ್ (Syringe)', en: 'Syringe' } },

  // Scalpel, blade, scissors, stitch cutter, lancet
  'கத்தி': { cat: 'sharps', score: 9, role: { ta: 'அறுவை சிகிச்சை கத்தி', hi: 'सर्जिकल ब्लेड', te: 'శస్త్రచికిత్స కత్తి', ml: 'ശസ്ത്രക്രിയാ കത്തി', kn: 'ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯ ಚಾಕು', en: 'Surgical scalpel/blade' } },
  'ஸ்கால்பெல்': { cat: 'sharps', score: 10, role: { ta: 'ஸ்கால்பெல் கத்தி', hi: 'स्कैल्पेल', te: 'స్కాల్పెల్', ml: 'സ്കാൽപെൽ', kn: 'ಸ್ಕಾಲ್ಪೆಲ್', en: 'Surgical scalpel' } },
  'scalpel': { cat: 'sharps', score: 10, role: { ta: 'ஸ்கால்பெல்', hi: 'स्कैल्पेल', te: 'స్కాల్పెల్', ml: 'സ്കാൽപെൽ', kn: 'ಸ್ಕಾಲ್ಪೆಲ್', en: 'Surgical scalpel blade' } },
  'பிளேடு': { cat: 'sharps', score: 9, role: { ta: 'அறுவை பிளேடு', hi: 'ब्लेड', te: 'బ్లేడు', ml: 'ബ്ലേഡ്', kn: 'ಬ್ಲೇಡ್', en: 'Surgical blade' } },
  'blade': { cat: 'sharps', score: 9, role: { ta: 'பிளேடு', hi: 'ब्लेड', te: 'బ్లేడు', ml: 'ബ്ലേഡ്', kn: 'ಬ್ಲೇಡ್', en: 'Sharp metal blade' } },
  'ब्लेड': { cat: 'sharps', score: 9, role: { ta: 'பிளேடு', hi: 'ब्लेड (Surgical blade)', te: 'బ్లేడు', ml: 'ബ്ലേഡ്', kn: 'ಬ್ಲೇಡ್', en: 'Surgical blade' } },
  'स्कैल्पेल': { cat: 'sharps', score: 10, role: { ta: 'ஸ்கால்பெல்', hi: 'स्कैल्पेल (Surgical scalpel)', te: 'స్కాల్పెల్', ml: 'സ്കാൽപെൽ', kn: 'ಸ್ಕಾಲ್ಪೆಲ್', en: 'Surgical scalpel' } },
  'கத்தரிக்கோல்': { cat: 'sharps', score: 9, role: { ta: 'தையல் கத்தரிக்கோல்', hi: 'कैंची', te: 'కత్తెర', ml: 'കത്രിക', kn: 'ಕತ್ತರಿ', en: 'Stitch cutting scissors' } },
  'scissors': { cat: 'sharps', score: 9, role: { ta: 'கத்தரிக்கோல்', hi: 'कैंची', te: 'కత్తెర', ml: 'കത്രിക', kn: 'ಕತ್ತರಿ', en: 'Surgical scissors' } },
  'कैंची': { cat: 'sharps', score: 9, role: { ta: 'கத்தரிக்கோல்', hi: 'कैंची (Surgical scissors)', te: 'కత్తెర', ml: 'കത്രിക', kn: 'ಕತ್ತರಿ', en: 'Surgical scissors' } },
  'కత్తెర': { cat: 'sharps', score: 9, role: { ta: 'கத்தரிக்கோல்', hi: 'कैंची', te: 'కత్తెర (Surgical scissors)', ml: 'കത്രിക', kn: 'ಕತ್ತರಿ', en: 'Surgical scissors' } },
  'బ్లేడు': { cat: 'sharps', score: 9, role: { ta: 'பிளேடு', hi: 'ब्लेड', te: 'బ్లేడు (Surgical blade)', ml: 'ബ്ലേഡ്', kn: 'ಬ್ಲೇಡ್', en: 'Surgical blade' } },
  'స్కాల్పెల్': { cat: 'sharps', score: 10, role: { ta: 'ஸ்கால்பெல்', hi: 'स्कैल्पेल', te: 'స్కాల్పెల్ (Scalpel blade)', ml: 'സ്കാൽപെൽ', kn: 'ಸ್ಕಾಲ್ಪೆಲ್', en: 'Scalpel blade' } },
  'കത്രിക': { cat: 'sharps', score: 9, role: { ta: 'கத்தரிக்கோல்', hi: 'कैंची', te: 'కత్తెర', ml: 'കത്രിക (Surgical scissors)', kn: 'ಕತ್ತರಿ', en: 'Surgical scissors' } },
  'ബ്ലേഡ്': { cat: 'sharps', score: 9, role: { ta: 'பிளேடு', hi: 'ब्लेड', te: 'బ్లేడు', ml: 'ബ്ലേഡ് (Surgical blade)', kn: 'ಬ್ಲೇಡ್', en: 'Surgical blade' } },
  'സ്കാൽപെൽ': { cat: 'sharps', score: 10, role: { ta: 'ஸ்கால்பெல்', hi: 'स्कैल्पेल', te: 'స్కాల్పెల్', ml: 'സ്കാൽപെൽ (Scalpel blade)', kn: 'ಸ್ಕಾಲ್ಪೆಲ್', en: 'Scalpel blade' } },
  'ಕತ್ತರಿ': { cat: 'sharps', score: 9, role: { ta: 'கத்தரிக்கோல்', hi: 'कैंची', te: 'కత్తెర', ml: 'കത്രിക', kn: 'ಕತ್ತರಿ (Surgical scissors)', en: 'Surgical scissors' } },
  'ಬ್ಲೇಡ್': { cat: 'sharps', score: 9, role: { ta: 'பிளேடு', hi: 'ब्लेड', te: 'బ్లేడు', ml: 'ബ്ലേഡ്', kn: 'ಬ್ಲೇಡ್ (Surgical blade)', en: 'Surgical blade' } },
  'ಸ್ಕಾಲ್ಪೆಲ್': { cat: 'sharps', score: 10, role: { ta: 'ஸ்கால்பெல்', hi: 'स्कैल्पेल', te: 'స్కాల్పెల్', ml: 'സ്കാൽപെൽ', kn: 'ಸ್ಕಾಲ್ಪೆಲ್ (Scalpel blade)', en: 'Scalpel blade' } },
  'lancet': { cat: 'sharps', score: 9, role: { ta: 'லான்செட்', hi: 'लैंसट', te: 'లాన్సెట్', ml: 'ലാൻസെറ്റ്', kn: 'ಲ್ಯಾನ್ಸೆಟ್', en: 'Capillary blood lancet' } },

  // ── 3. CONTAMINATED RECYCLABLE PLASTICS (Red Bin) ─────────────────────────
  'கையுறை': { cat: 'plastics', score: 9, role: { ta: 'மருத்துவ கையுறை', hi: 'दस्ताने', te: 'చేతి తొడుగులు', ml: 'കയ്യുറ', kn: 'ಕೈಗವಸು', en: 'Contaminated surgical glove' } },
  'கையுறைகள்': { cat: 'plastics', score: 9, role: { ta: 'கையுறைகள்', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'കയ്യുറകൾ', kn: 'ಕೈಗವಸುಗಳು', en: 'Contaminated gloves' } },
  'kaiyurai': { cat: 'plastics', score: 9, role: { ta: 'கையுறை', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'കയ്യുറ', kn: 'ಕೈಗವಸು', en: 'Gloves' } },
  'glove': { cat: 'plastics', score: 9, role: { ta: 'கையுறை', hi: 'दस्ताने', te: 'గ్లౌజ్', ml: 'കയ്യുറ', kn: 'ಕೈಗವಸು', en: 'Disposable glove' } },
  'gloves': { cat: 'plastics', score: 9, role: { ta: 'கையுறைகள்', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'കയ്യുറകൾ', kn: 'ಕೈಗವಸುಗಳು', en: 'Disposable gloves' } },
  'दस्ताने': { cat: 'plastics', score: 9, role: { ta: 'கையுறை', hi: 'उपयोग किए गए दस्ताने (Contaminated gloves)', te: 'గ్లౌజులు', ml: 'കയ്യുറ', kn: 'ಕೈಗವಸು', en: 'Contaminated gloves' } },
  'dastane': { cat: 'plastics', score: 9, role: { ta: 'கையுறை', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'കയ്യുറ', kn: 'ಕೈಗವಸು', en: 'Gloves' } },
  'చేతి': { cat: 'plastics', score: 7, role: { ta: 'கையுறை', hi: 'दस्ताने', te: 'చేతి తొడుగులు (Gloves)', ml: 'കയ്യുറ', kn: 'ಕೈಗವಸು', en: 'Gloves' } },
  'తొడుగులు': { cat: 'plastics', score: 9, role: { ta: 'கையுறை', hi: 'दस्ताने', te: 'చేతి తొడుగులు (Surgical gloves)', ml: 'കയ്യുറ', kn: 'ಕೈಗವಸು', en: 'Surgical gloves' } },
  'గ్లౌజులు': { cat: 'plastics', score: 9, role: { ta: 'கையுறைகள்', hi: 'दस्ताने', te: 'గ్లౌజులు (Disposable gloves)', ml: 'കയ്യുറകൾ', kn: 'ಕೈಗವಸುಗಳು', en: 'Disposable gloves' } },
  'കയ്യുറ': { cat: 'plastics', score: 9, role: { ta: 'கையுறை', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'ഉപയോഗിച്ച കയ്യുറ (Contaminated glove)', kn: 'ಕೈಗವಸು', en: 'Contaminated glove' } },
  'കയ്യുറകൾ': { cat: 'plastics', score: 9, role: { ta: 'கையுறைகள்', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'കയ്യുറകൾ (Contaminated gloves)', kn: 'ಕೈಗವಸುಗಳು', en: 'Contaminated gloves' } },
  'kayyura': { cat: 'plastics', score: 9, role: { ta: 'கையுறை', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'കയ്യുറ', kn: 'ಕೈಗವಸು', en: 'Gloves' } },
  'ಕೈಗವಸು': { cat: 'plastics', score: 9, role: { ta: 'கையுறை', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'കയ്യുറ', kn: 'ಬಳಸಿದ ಕೈಗವಸು (Contaminated glove)', en: 'Contaminated glove' } },
  'ಕೈಗವಸುಗಳು': { cat: 'plastics', score: 9, role: { ta: 'கையுறைகள்', hi: 'दस्ताने', te: 'గ్లౌజులు', ml: 'കയ്യുറകൾ', kn: 'ಕೈಗವಸುಗಳು (Contaminated gloves)', en: 'Contaminated gloves' } },

  // Medical plastics: IV set, drip bottle, catheter, tubing, urine bag
  'பிளாஸ்டிக்': { cat: 'plastics', score: 7, role: { ta: 'மருத்துவ பிளாஸ்டிக்', hi: 'प्लास्टिक', te: 'ప్లాస్టిక్', ml: 'പ്ലാസ്റ്റിക്', kn: 'ಪ್ಲಾಸ್ಟಿಕ್', en: 'Clinical recyclable plastic' } },
  'plastic': { cat: 'plastics', score: 7, role: { ta: 'பிளாஸ்டிக்', hi: 'प्लास्टिक', te: 'ప్లాస్టిక్', ml: 'പ്ലാസ്റ്റിക്', kn: 'ಪ್ಲಾಸ್ಟಿಕ್', en: 'Recyclable contaminated plastic' } },
  'प्लास्टिक': { cat: 'plastics', score: 7, role: { ta: 'பிளாஸ்டிக்', hi: 'चिकित्सा प्लास्टिक (Clinical plastic)', te: 'ప్లాస్టిక్', ml: 'പ്ലാസ്റ്റിക്', kn: 'ಪ್ಲಾಸ್ಟಿಕ್', en: 'Clinical plastic' } },
  'ప్లాస్టిక్': { cat: 'plastics', score: 7, role: { ta: 'பிளாஸ்டிக்', hi: 'प्लास्टिक', te: 'ప్లాస్టిక్ వ్యర్థం (Medical plastic)', ml: 'പ്ലാസ്റ്റിക്', kn: 'ಪ್ಲಾಸ್ಟಿಕ್', en: 'Medical plastic' } },
  'പ്ലാസ്റ്റിക്': { cat: 'plastics', score: 7, role: { ta: 'பிளாஸ்டிக்', hi: 'प्लास्टिक', te: 'ప్లాస్టిక్', ml: 'മെഡിക്കൽ പ്ലാസ്റ്റിക് (Clinical plastic)', kn: 'ಪ್ಲಾಸ್ಟಿಕ್', en: 'Clinical plastic' } },
  'ಪ್ಲಾಸ್ಟಿಕ್': { cat: 'plastics', score: 7, role: { ta: 'பிளாஸ்டிக்', hi: 'प्लास्टिक', te: 'ప్లాస్ಟಿక్', ml: 'പ്ലാസ്റ്റിക്', kn: 'ವೈದ್ಯಕೀಯ ಪ್ಲಾಸ್ಟಿಕ್ (Clinical plastic)', en: 'Clinical plastic' } },
  'catheter': { cat: 'plastics', score: 9, role: { ta: 'வடிகுழாய்', hi: 'कैथेटर', te: 'కాథెటర్', ml: 'കത്തീറ്റർ', kn: 'ಕ್ಯಾತಿಟರ್', en: 'Catheter tube' } },
  'कैथेटर': { cat: 'plastics', score: 9, role: { ta: 'வடிகுழாய்', hi: 'कैथेटर (Catheter tube)', te: 'కాథెటర్', ml: 'കത്തീറ്റർ', kn: 'ಕ್ಯಾತಿಟರ್', en: 'Catheter tube' } },
  'కాథెటర్': { cat: 'plastics', score: 9, role: { ta: 'வடிகுழாய்', hi: 'कैथेटर', te: 'కాథెటర్ (Catheter tube)', ml: 'കത്തീറ്റർ', kn: 'ಕ್ಯಾತಿಟರ್', en: 'Catheter tube' } },
  'കത്തീറ്റർ': { cat: 'plastics', score: 9, role: { ta: 'வடிகுழாய்', hi: 'कैथेटर', te: 'కాథెటర్', ml: 'കത്തീറ്റർ (Catheter tube)', kn: 'ಕ್ಯಾತಿಟರ್', en: 'Catheter tube' } },
  'ಕ್ಯಾತಿಟರ್': { cat: 'plastics', score: 9, role: { ta: 'வடிகுழாய்', hi: 'कैथेटर', te: 'కాథెటర్', ml: 'കത്തീറ്റർ', kn: 'ಕ್ಯಾತಿಟರ್ (Catheter tube)', en: 'Catheter tube' } },
  'iv': { cat: 'plastics', score: 8, role: { ta: 'ஐவி செட்', hi: 'आईवी सेट', te: 'ఐవీ సెట్', ml: 'ഐവി സെറ്റ്', kn: 'ಐವಿ ಸೆಟ್', en: 'IV infusion set / bottle' } },
  'டிரிப்ஸ்': { cat: 'plastics', score: 8, role: { ta: 'டிரிப்ஸ் பாட்டில்', hi: 'ड्रिप बोतल', te: 'డ్రిప్ బాటిల్', ml: 'ഡ്രിപ്പ് ബോട്ടിൽ', kn: 'ಡ್ರಿಪ್ ಬಾಟಲಿ', en: 'IV drip bottle' } },
  'డ్రిప్': { cat: 'plastics', score: 8, role: { ta: 'டிரிப்ஸ் பாட்டில்', hi: 'ड्रिप बोतल', te: 'డ్రిప్ బాటిల్ (IV drip bottle)', ml: 'ഡ്രിപ്പ് ബോട്ടിൽ', kn: 'ಡ್ರಿಪ್ ಬಾಟಲಿ', en: 'IV drip bottle' } },
  'ഡ്രിപ്പ്': { cat: 'plastics', score: 8, role: { ta: 'டிரிப்ஸ் பாட்டில்', hi: 'ड्रिप बोतल', te: 'డ్రిప్ బాటిల్', ml: 'ഡ്രിപ്പ് ബോട്ടിൽ (IV drip bottle)', kn: 'ಡ್ರಿಪ್ ಬಾಟಲಿ', en: 'IV drip bottle' } },
  'ಡ್ರಿಪ್': { cat: 'plastics', score: 8, role: { ta: 'டிரிப்ஸ் பாட்டில்', hi: 'ड्रिप बोतल', te: 'డ్రిప్ బాటిల్', ml: 'ഡ്രിപ്പ് ബോട്ടിൽ', kn: 'ಡ್ರಿಪ್ ಬಾಟಲಿ (IV drip bottle)', en: 'IV drip bottle' } },
  'tubing': { cat: 'plastics', score: 8, role: { ta: 'மருத்துவ குழாய்', hi: 'प्लास्टिक नली', te: 'గొట్టం', ml: 'ട്യൂബ്', kn: 'ಟ್ಯೂಬ್', en: 'Plastic medical tubing' } },

  // ── 4. GLASSWARE & METALLIC IMPLANTS (Blue Bin) ───────────────────────────
  'கண்ணாடி': { cat: 'glassware', score: 8, role: { ta: 'மருத்துவ கண்ணாடி பொருள்', hi: 'कांच', te: 'గాజు', ml: 'ഗ്ലാസ്', kn: 'ಗಾಜು', en: 'Clinical glassware' } },
  'kannadi': { cat: 'glassware', score: 8, role: { ta: 'கண்ணாடி', hi: 'कांच', te: 'గాజు', ml: 'ഗ്ലാസ്', kn: 'ಗಾಜು', en: 'Glassware' } },
  'glass': { cat: 'glassware', score: 8, role: { ta: 'கண்ணாடி', hi: 'कांच', te: 'గాజు', ml: 'ഗ്ലാസ്', kn: 'ಗಾಜು', en: 'Disinfected recyclable glassware' } },
  'कांच': { cat: 'glassware', score: 8, role: { ta: 'கண்ணாடி', hi: 'चिकित्सा कांच (Clinical glassware)', te: 'గాజు', ml: 'ഗ്ലാസ്', kn: 'ಗಾಜು', en: 'Clinical glassware' } },
  'గాజు': { cat: 'glassware', score: 8, role: { ta: 'கண்ணாடி', hi: 'कांच', te: 'వైద్య గాజు వస్తువు (Clinical glassware)', ml: 'ഗ്ലാസ്', kn: 'ಗಾಜು', en: 'Clinical glassware' } },
  'gaju': { cat: 'glassware', score: 8, role: { ta: 'கண்ணாடி', hi: 'कांच', te: 'గాజు', ml: 'ഗ്ലാസ്', kn: 'ಗಾಜು', en: 'Glass' } },
  'ഗ്ലാസ്': { cat: 'glassware', score: 8, role: { ta: 'கண்ணாடி', hi: 'कांच', te: 'గాజు', ml: 'മെഡിക്കൽ ഗ്ലാസ് (Clinical glassware)', kn: 'ಗಾಜು', en: 'Clinical glassware' } },
  'ಗಾಜು': { cat: 'glassware', score: 8, role: { ta: 'கண்ணாடி', hi: 'कांच', te: 'గాజు', ml: 'ഗ്ലാസ്', kn: 'ವೈದ್ಯಕೀಯ ಗಾಜು (Clinical glassware)', en: 'Clinical glassware' } },
  'vial': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பி', hi: 'वायल', te: 'వయల్', ml: 'വയൽ', kn: 'ವಯಲ್', en: 'Medicine glass vial' } },
  'vials': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பிகள்', hi: 'शीशियां', te: 'వయల్స్', ml: 'വയലുകൾ', kn: 'ವಯಲ್ಸ್', en: 'Medicine glass vials' } },
  'कुप्पी': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பி', hi: 'दवा की शीशी / वायल (Glass vial)', te: 'మందు సీసా', ml: 'മരുന്ന് കുപ്പി', kn: 'ಔಷಧಿ ಬಾಟಲಿ', en: 'Glass vial' } },
  'शीशी': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பி', hi: 'कांच की शीशी (Glass vial)', te: 'మందు సీసా', ml: 'കുപ്പി', kn: 'ಬಾಟಲಿ', en: 'Glass vial' } },
  'குப்பி': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பி (Medicine glass vial)', hi: 'शीशी', te: 'సీసా', ml: 'കുപ്പി', kn: 'ಬಾಟಲಿ', en: 'Medicine glass vial' } },
  'சீஸா': { cat: 'glassware', score: 9, role: { ta: 'மருந்து பாட்டில்', hi: 'शीशी', te: 'గాజు సీసా (Glass bottle)', ml: 'കുപ്പി', kn: 'ಬಾಟಲಿ', en: 'Glass bottle' } },
  'సీసా': { cat: 'glassware', score: 9, role: { ta: 'மருந்து பாட்டில்', hi: 'शीशी', te: 'గాజు సీసా (Glass bottle)', ml: 'കുപ്പി', kn: 'ಬಾಟಲಿ', en: 'Glass bottle' } },
  'వయల్': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பி', hi: 'वायल', te: 'మందు వయల్ (Glass vial)', ml: 'വയൽ', kn: 'ವಯಲ್', en: 'Medicine vial' } },
  'കുപ്പി': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பி', hi: 'शीशी', te: 'సీసా', ml: 'മരുന്ന് കുപ്പി (Glass vial)', kn: 'ಬಾಟಲಿ', en: 'Medicine glass vial' } },
  'വയൽ': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பி', hi: 'वायल', te: 'వయల్', ml: 'വയൽ (Medicine vial)', kn: 'ವಯಲ್', en: 'Medicine vial' } },
  'ಬಾಟಲಿ': { cat: 'glassware', score: 8, role: { ta: 'பாட்டில்', hi: 'बोतल', te: 'సీసా', ml: 'കുപ്പി', kn: 'ಗಾಜಿನ ಬಾಟಲಿ (Glass bottle)', en: 'Glass bottle' } },
  'ವಯಲ್': { cat: 'glassware', score: 9, role: { ta: 'மருந்து குப்பி', hi: 'वायल', te: 'వయల్', ml: 'വയൽ', kn: 'ಔಷಧಿ ವಯಲ್ (Glass vial)', en: 'Glass vial' } },
  'ampoule': { cat: 'glassware', score: 9, role: { ta: 'ஆம்பூல்', hi: 'एम्पूल', te: 'యాంపూల్', ml: 'ആംപ്യൂൾ', kn: 'ಆಂಪೂಲ್', en: 'Glass injection ampoule' } },
  'एम्पूल': { cat: 'glassware', score: 9, role: { ta: 'ஆம்பூல்', hi: 'कांच का एम्पूल (Glass ampoule)', te: 'యాంపూల్', ml: 'ആംപ്യൂൾ', kn: 'ಆಂಪೂಲ್', en: 'Glass ampoule' } },
  'యాంపూల్': { cat: 'glassware', score: 9, role: { ta: 'ஆம்பூல்', hi: 'एम्पूल', te: 'గాజు యాంపూల్ (Glass ampoule)', ml: 'ആംപ്യൂൾ', kn: 'ಆಂಪೂಲ್', en: 'Glass ampoule' } },
  'ആംപ്യൂൾ': { cat: 'glassware', score: 9, role: { ta: 'ஆம்பூல்', hi: 'एम्पूल', te: 'యాంపూల్', ml: 'ഗ്ലാസ് ആംപ്യൂൾ (Glass ampoule)', kn: 'ಆಂಪೂಲ್', en: 'Glass ampoule' } },
  'ಆಂಪೂಲ್': { cat: 'glassware', score: 9, role: { ta: 'ஆம்பூல்', hi: 'एम्पूल', te: 'యాంపూల్', ml: 'ആംപ്യൂൾ', kn: 'ಗಾಜಿನ ಆಂಪೂಲ್ (Glass ampoule)', en: 'Glass ampoule' } },
  'implant': { cat: 'glassware', score: 9, role: { ta: 'உலோக இம்ப்ளான்ட்', hi: 'मेटल इम्प्लांट', te: 'మెటల్ ఇంప్లాంట్', ml: 'മെറ്റൽ ഇംപ്ലാന്റ്', kn: 'ಲೋಹದ ಇಂಪ್ಲಾಂಟ್', en: 'Orthopedic metallic body implant' } },

  // ── 5. GENERAL MUNICIPAL WASTE (Green Bin) ────────────────────────────────
  'சாப்பாடு': { cat: 'general', score: 9, role: { ta: 'உணவு கழிவு', hi: 'भोजन अपशिष्ट', te: 'ఆహార వ్యర్థాలు', ml: 'ഭക്ഷണാവശിഷ്ടങ്ങൾ', kn: 'ಆಹಾರ ತ್ಯಾಜ್ಯ', en: 'Organic food waste' } },
  'saapadu': { cat: 'general', score: 9, role: { ta: 'சாப்பாடு', hi: 'खाना', te: 'ఆహారం', ml: 'ഭക്ഷണം', kn: 'ಊಟ', en: 'Food waste' } },
  'food': { cat: 'general', score: 9, role: { ta: 'உணவு', hi: 'खाना', te: 'ఆహారం', ml: 'ഭക്ഷണം', kn: 'ಆಹಾರ', en: 'Municipal food leftovers' } },
  'खाना': { cat: 'general', score: 9, role: { ta: 'சாப்பாடு', hi: 'भोजन / खाना (Food waste)', te: 'ఆహారం', ml: 'ഭക്ഷണം', kn: 'ಊಟ', en: 'Food leftovers' } },
  'भोजन': { cat: 'general', score: 9, role: { ta: 'உணவு', hi: 'भोजन (Food waste)', te: 'ఆహారం', ml: 'ഭക്ഷണം', kn: 'ಆಹಾರ', en: 'Food waste' } },
  'khana': { cat: 'general', score: 9, role: { ta: 'சாப்பாடு', hi: 'खाना', te: 'ఆహారం', ml: 'ഭക്ഷണം', kn: 'ಊಟ', en: 'Food waste' } },
  'ఆహారం': { cat: 'general', score: 9, role: { ta: 'உணவு', hi: 'खाना', te: 'ఆహార వ్యర్థం (Food waste)', ml: 'ഭക്ഷണം', kn: 'ಆಹಾರ', en: 'Food waste' } },
  'భోజనం': { cat: 'general', score: 9, role: { ta: 'சாப்பாடு', hi: 'भोजन', te: 'భోజన వ్యర్థాలు (Food leftovers)', ml: 'ഭക്ഷണം', kn: 'ಊಟ', en: 'Food leftovers' } },
  'ഭക്ഷണം': { cat: 'general', score: 9, role: { ta: 'உணவு', hi: 'खाना', te: 'ఆహారం', ml: 'ഭക്ഷണാവശിഷ്ടങ്ങൾ (Food waste)', kn: 'ಆಹಾರ', en: 'Food waste' } },
  'ಆಹಾರ': { cat: 'general', score: 9, role: { ta: 'உணவு', hi: 'खाना', te: 'ఆహారం', ml: 'ഭക്ഷണം', kn: 'ಆಹಾರ ತ್ಯಾಜ್ಯ (Food waste)', en: 'Food waste' } },
  'ಊಟ': { cat: 'general', score: 9, role: { ta: 'சாப்பாடு', hi: 'भोजन', te: 'భోజనం', ml: 'ഭക്ഷണം', kn: 'ಊಟದ ಉಳಿಕೆ (Food leftovers)', en: 'Food leftovers' } },
  'காகிதம்': { cat: 'general', score: 8, role: { ta: 'காகிதம்', hi: 'कागज', te: 'కాగితం', ml: 'കടലാസ്', kn: 'ಕಾಗದ', en: 'Dry paper wrapper' } },
  'paper': { cat: 'general', score: 8, role: { ta: 'பேப்பர்', hi: 'कागज', te: 'కాగితం', ml: 'പേപ്പർ', kn: 'ಪೇಪರ್', en: 'Clean paper / wrapper' } },
  'कागज': { cat: 'general', score: 8, role: { ta: 'காகிதம்', hi: 'कागज / रद्दी (Paper)', te: 'కాగితం', ml: 'കടലാസ്', kn: 'ಕಾಗದ', en: 'Clean paper' } },
  'కాగితం': { cat: 'general', score: 8, role: { ta: 'காகிதம்', hi: 'कागज', te: 'కాగితం (Paper wrapper)', ml: 'കടലാസ്', kn: 'ಕಾಗದ', en: 'Paper wrapper' } },
  'കടലാസ്': { cat: 'general', score: 8, role: { ta: 'காகிதம்', hi: 'कागज', te: 'కాగితం', ml: 'കടലാസ് (Paper)', kn: 'ಕಾಗದ', en: 'Paper' } },
  'ಕಾಗದ': { cat: 'general', score: 8, role: { ta: 'காகிதம்', hi: 'कागज', te: 'కాగితం', ml: 'കടലാസ്', kn: 'ಕಾಗದ (Paper)', en: 'Paper' } },
  'குப்பை': { cat: 'general', score: 6, role: { ta: 'பொது குப்பை', hi: 'कचरा', te: 'చెత్త', ml: 'മാലിന്യം', kn: 'ಕಸ', en: 'General municipal waste' } },
  'kuppai': { cat: 'general', score: 6, role: { ta: 'குப்பை', hi: 'कचरा', te: 'చెత్త', ml: 'മാലിന്യം', kn: 'ಕಸ', en: 'General waste' } },
  'कचरा': { cat: 'general', score: 6, role: { ta: 'குப்பை', hi: 'सामान्य नगरपालिका कचरा (General waste)', te: 'చెత్త', ml: 'മാലിന്യം', kn: 'ಕಸ', en: 'General municipal waste' } },
  'kachra': { cat: 'general', score: 6, role: { ta: 'குப்பை', hi: 'कचरा', te: 'చెత్త', ml: 'മാലിന്യം', kn: 'ಕಸ', en: 'General waste' } },
  'చెత్త': { cat: 'general', score: 6, role: { ta: 'குப்பை', hi: 'कचरा', te: 'సాధారణ మున్సిపల్ చెత్త (General waste)', ml: 'മാലിന്യം', kn: 'ಕಸ', en: 'General waste' } },
  'chettha': { cat: 'general', score: 6, role: { ta: 'குப்பை', hi: 'कचरा', te: 'చెత్త', ml: 'മാലിന്യം', kn: 'ಕಸ', en: 'General waste' } },
  'മാലിന്യം': { cat: 'general', score: 6, role: { ta: 'குப்பை', hi: 'कचरा', te: 'చెత్త', ml: 'സാധാരണ മുനിസിപ്പൽ മാലിന്യം (General waste)', kn: 'ಕಸ', en: 'General waste' } },
  'ಕಸ': { cat: 'general', score: 6, role: { ta: 'குப்பை', hi: 'कचरा', te: 'చెత్త', ml: 'മാലിന്യം', kn: 'ಸಾಮಾನ್ಯ ಪುರಸಭೆ ಕಸ (General municipal waste)', en: 'General waste' } },
  'kasa': { cat: 'general', score: 6, role: { ta: 'குப்பை', hi: 'कचरा', te: 'చెత్త', ml: 'മാലിന്യം', kn: 'ಕಸ', en: 'General waste' } }
};

/**
 * Multi-lingual Modifiers (Soiled, Without Needle, Broken, Expired)
 */
const MODIFIER_LEXICON = {
  // Soiled / Stained -> strongly reinforces Yellow Bin
  'படிந்த': { type: 'soiled', multiplier: 1.6, desc: { ta: 'கறைபட்ட நிலை', hi: 'दागदार स्थिति', te: 'అంటిన స్థితి', ml: 'പുരണ്ട അവസ്ഥ', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ', en: 'Soiled / stained state' } },
  'padintha': { type: 'soiled', multiplier: 1.6, desc: { ta: 'கறைபட்ட நிலை', hi: 'दागदार स्थिति', te: 'అంటిన స్థితి', ml: 'പുരണ്ട അവസ്ഥ', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ', en: 'Soiled state' } },
  'stained': { type: 'soiled', multiplier: 1.6, desc: { ta: 'கறைபட்ட நிலை', hi: 'सना हुआ', te: 'అంటిన స్థితి', ml: 'പുരണ്ട അവസ്ഥ', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ', en: 'Stained / contaminated state' } },
  'soaked': { type: 'soiled', multiplier: 1.7, desc: { ta: 'தோய்ந்த நிலை', hi: 'भीगा हुआ', te: 'తడిసిన స్థితి', ml: 'നനഞ്ഞ അവസ്ഥ', kn: 'ನೆನೆದ ಸ್ಥಿತಿ', en: 'Soaked state' } },
  'தோய்ந்த': { type: 'soiled', multiplier: 1.7, desc: { ta: 'தோய்ந்த நிலை', hi: 'भीगा हुआ', te: 'తడిసిన స్థితి', ml: 'നനഞ്ഞ അവസ്ഥ', kn: 'ನೆನೆದ ಸ್ಥಿತಿ', en: 'Soaked state' } },
  'கறை': { type: 'soiled', multiplier: 1.5, desc: { ta: 'கறை நிலை', hi: 'दाग', te: 'మరక', ml: 'കറ', kn: 'ಕಲೆ', en: 'Stained state' } },
  'लगी': { type: 'soiled', multiplier: 1.6, desc: { ta: 'கறைபட்ட நிலை', hi: 'लगी हुई स्थिति (Stained / soiled)', te: 'అంటిన స్థితి', ml: 'പുരണ്ട അവസ്ഥ', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ', en: 'Stained / soiled state' } },
  'लगा': { type: 'soiled', multiplier: 1.6, desc: { ta: 'கறைபட்ட நிலை', hi: 'लगा हुआ (Soiled)', te: 'అంటిన స్థితి', ml: 'പുരണ്ട അവസ്ഥ', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ', en: 'Soiled state' } },
  'सना': { type: 'soiled', multiplier: 1.6, desc: { ta: 'தோய்ந்த நிலை', hi: 'सना हुआ (Blood-soaked)', te: 'అంటిన స్థితి', ml: 'പുരണ്ട അവസ്ഥ', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ', en: 'Soaked / soiled state' } },
  'अంటిన': { type: 'soiled', multiplier: 1.6, desc: { ta: 'கறைபட்ட நிலை', hi: 'लगा हुआ', te: 'అంటిన స్థితి (Soiled / stained)', ml: 'പുരണ്ട അവസ്ഥ', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ', en: 'Soiled / stained state' } },
  'తడిసిన': { type: 'soiled', multiplier: 1.6, desc: { ta: 'தோய்ந்த நிலை', hi: 'भीगा हुआ', te: 'తడిసిన స్థితి (Soaked)', ml: 'നനഞ്ഞ അവസ്ഥ', kn: 'ನೆನೆದ ಸ್ಥಿತಿ', en: 'Soaked state' } },
  'പുരണ്ട': { type: 'soiled', multiplier: 1.6, desc: { ta: 'கறைபட்ட நிலை', hi: 'लगा हुआ', te: 'అంటిన స్థితి', ml: 'പുരണ്ട അവസ്ഥ (Soiled / stained)', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ', en: 'Soiled / stained state' } },
  'നനഞ്ഞ': { type: 'soiled', multiplier: 1.6, desc: { ta: 'தோய்ந்த நிலை', hi: 'भीगा हुआ', te: 'తడిసిన స్థితి', ml: 'നനഞ്ഞ അവസ്ഥ (Soaked)', kn: 'ನೆನೆದ ಸ್ಥಿತಿ', en: 'Soaked state' } },
  'ಅಂಟಿದ': { type: 'soiled', multiplier: 1.6, desc: { ta: 'கறைபட்ட நிலை', hi: 'लगा हुआ', te: 'అంటిన స్థితి', ml: 'പുരണ്ട അവസ്ഥ', kn: 'ಅಂಟಿದ ಸ್ಥಿತಿ (Soiled / stained)', en: 'Soiled / stained state' } },
  'ನೆನೆದ': { type: 'soiled', multiplier: 1.6, desc: { ta: 'தோய்ந்த நிலை', hi: 'भीगा हुआ', te: 'తడిసిన స్థితి', ml: 'നനഞ്ഞ അവസ്ഥ', kn: 'ನೆನೆದ ಸ್ಥಿತಿ (Soaked)', en: 'Soaked state' } },

  // Negation of needle (Without needle) -> Shifts Syringe from White Bin to Red Bin!
  'இல்லாத': { type: 'without_needle', desc: { ta: 'ஊசி நீக்கப்பட்ட நிலை', hi: 'बिना सुई की स्थिति', te: 'సూది లేని స్థితి', ml: 'സൂചിയില്ലാത്ത അവസ്ഥ', kn: 'ಸೂಜಿ ಇಲ್ಲದ ಸ್ಥಿತಿ', en: 'Needle-free / removed' } },
  'அற்ற': { type: 'without_needle', desc: { ta: 'ஊசி அற்ற நிலை', hi: 'सुई रहित', te: 'సూది లేని', ml: 'സൂചിയില്ലാത്ത', kn: 'ಸೂಜಿ ರಹಿತ', en: 'Needle-free' } },
  'நீக்கப்பட்ட': { type: 'without_needle', desc: { ta: 'ஊசி அகற்றப்பட்ட நிலை', hi: 'सुई हटाई गई', te: 'సూది తీసివేసిన', ml: 'സൂചി മാറ്റിയ', kn: 'ಸೂಜಿ ತೆಗೆದ', en: 'Needle removed' } },
  'बिना': { type: 'without_needle', desc: { ta: 'இல்லாத', hi: 'बिना सुई की स्थिति (Needle-free)', te: 'లేని', ml: 'ഇല്ലാത്ത', kn: 'ಇಲ್ಲದ', en: 'Needle-free' } },
  'లేని': { type: 'without_needle', desc: { ta: 'இல்லாத', hi: 'बिना', te: 'సూది లేని స్థితి (Needle-free)', ml: 'ഇല്ലാത്ത', kn: 'ಇಲ್ಲದ', en: 'Needle-free' } },
  'సూదిలేని': { type: 'without_needle', desc: { ta: 'ஊசி இல்லாத', hi: 'बिना सुई', te: 'సూది లేని స్థితి (Needle-free)', ml: 'സൂചിയില്ലാത്ത', kn: 'ಸೂಜಿ ಇಲ್ಲದ', en: 'Needle-free' } },
  'സൂചിയില്ലാത്ത': { type: 'without_needle', desc: { ta: 'ஊசி இல்லாத', hi: 'बिना सुई', te: 'సూది లేని', ml: 'സൂചിയില്ലാത്ത അവസ്ഥ (Needle-free)', kn: 'ಸೂಜಿ ಇಲ್ಲದ', en: 'Needle-free' } },
  'ഇല്ലാത്ത': { type: 'without_needle', desc: { ta: 'இல்லாத', hi: 'बिना', te: 'లేని', ml: 'ഇല്ലാത്ത അവസ്ഥ (Needle-free)', kn: 'ಇಲ್ಲದ', en: 'Needle-free' } },
  'ಇಲ್ಲದ': { type: 'without_needle', desc: { ta: 'இல்லாத', hi: 'बिना', te: 'లేని', ml: 'ഇല്ലാത്ത', kn: 'ಸೂಜಿ ಇಲ್ಲದ ಸ್ಥಿತಿ (Needle-free)', en: 'Needle-free' } },
  'without': { type: 'without_needle', desc: { ta: 'இல்லாத', hi: 'बिना', te: 'లేని', ml: 'ഇല്ലാത്ത', kn: 'ಇಲ್ಲದ', en: 'Needle removed' } },
  'needleless': { type: 'without_needle', desc: { ta: 'ஊசியற்ற', hi: 'सुई रहित', te: 'సూది లేని', ml: 'സൂചിയില്ലാത്ത', kn: 'ಸೂಜಿ ಇಲ್ಲದ', en: 'Needle-free' } },

  // Broken glass
  'உடைந்த': { type: 'broken', desc: { ta: 'உடைந்த நிலை', hi: 'टूटी हुई स्थिति', te: 'పగిలిన స్థితి', ml: 'പൊട്ടിയ അവസ്ഥ', kn: 'ಒಡೆದ ಸ್ಥಿತಿ', en: 'Broken condition' } },
  'टूटा': { type: 'broken', desc: { ta: 'உடைந்த', hi: 'टूटा हुआ (Broken)', te: 'పగిలిన', ml: 'പൊട്ടിയ', kn: 'ಒಡೆದ', en: 'Broken condition' } },
  'टूटी': { type: 'broken', desc: { ta: 'உடைந்த', hi: 'टूटी हुई (Broken)', te: 'పగిలిన', ml: 'പൊട്ടിയ', kn: 'ಒಡೆದ', en: 'Broken condition' } },
  'పగిలిన': { type: 'broken', desc: { ta: 'உடைந்த', hi: 'टूटा', te: 'పగిలిన స్థితి (Broken condition)', ml: 'പൊട്ടിയ', kn: 'ಒಡೆದ', en: 'Broken condition' } },
  'പൊട്ടിയ': { type: 'broken', desc: { ta: 'உடைந்த', hi: 'टूटा', te: 'పగిలిన', ml: 'പൊട്ടിയ അവസ്ഥ (Broken condition)', kn: 'ಒಡೆದ', en: 'Broken condition' } },
  'ಒಡೆದ': { type: 'broken', desc: { ta: 'உடைந்த', hi: 'टूटा', te: 'పగిలిన', ml: 'പൊട്ടിയ', kn: 'ಒಡೆದ ಸ್ಥಿತಿ (Broken condition)', en: 'Broken condition' } },
  'broken': { type: 'broken', desc: { ta: 'உடைந்த', hi: 'टूटा हुआ', te: 'పగిలిన', ml: 'പൊട്ടിയ', kn: 'ಒಡೆದ', en: 'Broken condition' } },

  // Expired medicine
  'காலாவதியான': { type: 'expired', multiplier: 1.5, desc: { ta: 'காலாவதியான நிலை', hi: 'एक्सपायर्ड', te: 'గడువు ముగిసిన', ml: 'കാലഹരണപ്പെട്ട', kn: 'ಅವಧಿ ಮುಗಿದ', en: 'Expired state' } },
  'एक्सपायर्ड': { type: 'expired', multiplier: 1.5, desc: { ta: 'காலாவதியான', hi: 'एक्सपायर्ड (Expired)', te: 'గడువు ముగిసిన', ml: 'കാലഹരണപ്പെട്ട', kn: 'ಅವಧಿ ಮುಗಿದ', en: 'Expired state' } },
  'గడువు': { type: 'expired', multiplier: 1.5, desc: { ta: 'காலாவதியான', hi: 'एक्सपायर्ड', te: 'గడువు ముగిసిన స్థితి (Expired)', ml: 'കാലഹരണപ്പെട്ട', kn: 'ಅವಧಿ ಮುಗಿದ', en: 'Expired state' } },
  'കാലഹരണപ്പെട്ട': { type: 'expired', multiplier: 1.5, desc: { ta: 'காலாவதியான', hi: 'एक्सपायर्ड', te: 'గడువు ముగిసిన', ml: 'കാലഹരണപ്പെട്ട അവസ്ഥ (Expired)', kn: 'ಅವಧಿ ಮುಗಿದ', en: 'Expired state' } },
  'ಅವಧಿ': { type: 'expired', multiplier: 1.5, desc: { ta: 'காலாவதியான', hi: 'एक्सपायर्ड', te: 'గడువు ముగిసిన', ml: 'കാലഹരണപ്പെട്ട', kn: 'ಅವಧಿ ಮುಗಿದ ಸ್ಥಿತಿ (Expired)', en: 'Expired state' } },
  'expired': { type: 'expired', multiplier: 1.5, desc: { ta: 'காலாவதியான', hi: 'एक्सपायर्ड', te: 'గడువు ముగిసిన', ml: 'കാലഹരണപ്പെട്ട', kn: 'ಅವಧಿ ಮುಗಿದ', en: 'Expired state' } }
};

/**
 * Multi-lingual Deep Word-by-Word NLP Semantic Analysis
 */
export function analyzeWordsWithNLP(userInput = '', lang = 'en') {
  if (!userInput) return null;

  const rawText = userInput.trim();
  const normalized = rawText
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return null;

  const categoryScores = {
    infectious: 0,
    sharps: 0,
    plastics: 0,
    glassware: 0,
    general: 0
  };

  const identifiedTokens = [];
  let hasWithoutNeedleModifier = false;
  let hasSoiledModifier = false;
  let soilMultiplier = 1.0;

  // 1. Detect Modifiers
  for (const token of rawTokens) {
    const mod = MODIFIER_LEXICON[token];
    if (mod) {
      if (mod.type === 'without_needle') hasWithoutNeedleModifier = true;
      if (mod.type === 'soiled') {
        hasSoiledModifier = true;
        soilMultiplier = Math.max(soilMultiplier, mod.multiplier || 1.6);
      }
      const descObj = mod.desc || {};
      const desc = descObj[lang] || descObj.en || descObj.ta || 'Modifier';
      identifiedTokens.push({
        word: token,
        role: desc,
        isModifier: true
      });
    }
  }

  // 2. Multi-word Phrases (Bigrams & Trigrams)
  for (let i = 0; i < rawTokens.length - 1; i++) {
    const bigram = `${rawTokens[i]} ${rawTokens[i + 1]}`;
    // Soiled phrases across languages
    if (/^(ரத்தம் படிந்த|இரத்தம் படிந்த|खून लगी|खून लगा|रक्त लगा|రక్తం అంటిన|రక్తం తడిసిన|രക്തം പുരണ്ട|രക്തം നനഞ്ഞ|ರಕ್ತ ಅಂಟಿದ|ರಕ್ತ ನೆನೆದ|blood soaked|blood stained)$/i.test(bigram)) {
      hasSoiledModifier = true;
      soilMultiplier = Math.max(soilMultiplier, 1.8);
      categoryScores.infectious += 12;
    }
    // Without needle phrases across languages
    if (/^(ஊசி இல்லாத|बिना सुई|सुई बिना|సూది లేని|సూచి ഇല്ലാത്ത|സൂചിയില്ലാത്ത|ಸೂಜಿ ಇಲ್ಲದ|without needle|no needle|needle cut)$/i.test(bigram)) {
      hasWithoutNeedleModifier = true;
    }
    // Broken glass phrases
    if (/^(உடைந்த கண்ணாடி|टूटा कांच|कांच टूटा|పగిలిన గాజు|പൊട്ടിയ കുപ്പി|ಒಡೆದ ಗಾಜು|broken glass)$/i.test(bigram)) {
      categoryScores.glassware += 10;
    }
    // Expired medicine phrases
    if (/^(காலாவதியான மாத்திரை|एक्सपायर्ड दवा|గడువు ముగిసిన|കാലഹരണപ്പെട്ട മരുന്ന്|ಅವಧಿ ಮುಗಿದ|expired medicine)$/i.test(bigram)) {
      categoryScores.infectious += 12;
    }
  }

  // 3. Token Stemming & Semantic Scoring
  for (const token of rawTokens) {
    if (MODIFIER_LEXICON[token]) continue;

    let match = SEMANTIC_LEXICON[token];
    if (!match) {
      const stem = stemIndianWord(token, lang);
      match = SEMANTIC_LEXICON[stem];
    }

    if (match) {
      let score = match.score;

      if (match.cat === 'infectious' && hasSoiledModifier) {
        score = Math.round(score * soilMultiplier);
      }

      // Check if syringe with "without needle" modifier -> redirect to Red Bin!
      const isSyringeWord = /(syringe|சிரிஞ்ச்|सिरिंज|సిరంజి|സിറിഞ്ച്|ಸಿರಿಂಜ್|injection|இன்ஜெக்ஷன்|इंजेक्शन)/i.test(token);
      if (isSyringeWord && hasWithoutNeedleModifier) {
        categoryScores.plastics += 12;
        const needleFreeLabel = {
          ta: 'ஊசி வெட்டப்பட்ட சிரிஞ்ச் ➔ மறுசுழற்சி பிளாஸ்டிக்',
          hi: 'बिना सुई की सिरिंज ➔ रिसाइकिल करने योग्य प्लास्टिक',
          te: 'సూది లేని సిరంజి ➔ రీసైకిల్ ప్లాస్టిక్',
          ml: 'സൂചിയില്ലാത്ത സിറിഞ്ച് ➔ പുനരുപയോഗ പ്ലാസ്റ്റിക്',
          kn: 'ಸೂಜಿ ಇಲ್ಲದ ಸಿರಿಂಜ್ ➔ ಮರುಬಳಕೆ ಪ್ಲಾಸ್ಟಿಕ್',
          en: 'Needle-free syringe ➔ Contaminated recyclable plastic'
        };
        identifiedTokens.push({
          word: token,
          role: needleFreeLabel[lang] || needleFreeLabel.en,
          category: 'plastics'
        });
        continue;
      }

      categoryScores[match.cat] += score;

      const roleObj = match.role || {};
      const roleStr = typeof roleObj === 'string' ? roleObj : (roleObj[lang] || roleObj.en || roleObj.ta || 'Biohazard');

      identifiedTokens.push({
        word: token,
        role: roleStr,
        category: match.cat
      });
    }
  }

  // Pick top category
  let maxCat = null;
  let maxScore = 0;
  for (const [cat, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      maxCat = cat;
    }
  }

  if (!maxCat || maxScore < 5) return null;

  const baseRecord = WASTE_KNOWLEDGE_BASE.find(c => c.id === maxCat) || WASTE_KNOWLEDGE_BASE[0];
  const calculatedConfidence = Math.min(99.0, (baseRecord.confidenceBase + Math.min(2.0, maxScore * 0.1))).toFixed(1);

  return {
    categoryKey: maxCat,
    score: maxScore,
    record: baseRecord,
    confidence: calculatedConfidence,
    tokens: identifiedTokens,
    rawText
  };
}

/**
 * Advanced Natural Language Intent Classifier & Conversational Agent
 * Evaluates intents and provides structured answers in Tamil, Hindi, Telugu, Malayalam, Kannada & English.
 */
export function processChatMessage(userInput, hasImage = false, langPreference = 'en') {
  const clean = (userInput || '').trim();
  const lower = clean.toLowerCase();
  const detectedLang = detectLanguage(clean);
  const lang = (langPreference && langPreference !== 'en') ? langPreference : detectedLang;

  // 1. GREETING INTENT
  const greetingRegex = /(?:^|\s)(hi|hello|hey|good\s*(?:morning|afternoon|evening)|vanakkam|வணக்கம்|namaste|नमस्ते|నమస్కారం|namaskaram|നമസ്കാരം|ನಮಸ್ಕಾರ|namaskara|hai|holla|greetings)(?:\s|$|[.,!?])/i;
  if (greetingRegex.test(lower) && lower.split(/\s+/).length <= 4 && !hasImage) {
    if (lang === 'ta') {
      return {
        type: 'conversation',
        text: 'வணக்கம்! நான் உங்கள் KMCH AI மருத்துவ கழிவு உதவியாளர்.\n\nமருத்துவமனையில் எந்த கழிவை எந்த தொட்டியில் போட வேண்டும் என்ற சந்தேகம் உள்ளதா? அல்லது பாதுகாப்பு விதிமுறைகள் பற்றி கேட்க வேண்டுமா? என்னிடம் தமிழில் தட்டச்சு செய்து கேளுங்கள்! (எ.கா: "ரத்தம் படிந்த துணி", "ஊசி எங்கு போட வேண்டும்", "மஞ்சள் தொட்டி விதிமுறைகள்").'
      };
    } else if (lang === 'hi') {
      return {
        type: 'conversation',
        text: 'नमस्ते! मैं आपका KMCH बायोमेडिकल वेस्ट AI असिस्टेंट हूँ।\n\nअस्पताल में कौन सा कचरा किस डिब्बे (Bin) में डालना है? या सुरक्षा प्रोटोकॉल से जुड़े किसी भी सवाल के लिए आप मुझसे पूछ सकते हैं। (उदा: "खून लगा कपड़ा", "सुई कहाँ डालें", "पीले डिब्बे के नियम")।'
      };
    } else if (lang === 'te') {
      return {
        type: 'conversation',
        text: 'నమస్కారం! నేను మీ KMCH AI బయోమెడికల్ వేస్ట్ అసిస్టెంట్‌ని.\n\nఏ ఆసుపత్రి వ్యర్థాన్ని ఏ రంగు తొట్టిలో (Bin) వేయాలో సందేహం ఉందా? లేదా భద్రతా నిబంధనల గురించి తెలుసుకోవాలా? నన్ను అడగండి! (ఉదా: "రక్తం అంటిన బట్ట", "సూది ఎక్కడ వేయాలి", "పసుపు తొట్టి నియమాలు").'
      };
    } else if (lang === 'ml') {
      return {
        type: 'conversation',
        text: 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ KMCH AI ബയോമെഡിക്കൽ വേസ്റ്റ് അസിസ്റ്റന്റ് ആണ്.\n\nആശുപത്രി മാലിന്യങ്ങൾ ഏത് ബിന്നിൽ നിക്ഷേപിക്കണം എന്നതിൽ സംശയമുണ്ടോ? അല്ലെങ്കിൽ സുരക്ഷാ മാർഗ്ഗനിർദ്ദേശങ്ങൾ അറിയണമെങ്കിൽ എന്നോട് ചോദിക്കാം! (ഉദാ: "രക്തം പുരണ്ട തുണി", "സൂചി എവിടെ നിക്ഷേപിക്കണം", "മഞ്ഞ ബിൻ നിയമങ്ങൾ").'
      };
    } else if (lang === 'kn') {
      return {
        type: 'conversation',
        text: 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ KMCH AI ಬಯೋಮೆಡಿಕಲ್ ವೇಸ್ಟ್ ಸಹಾಯಕ.\n\nಆಸ್ಪತ್ರೆಯ ಯಾವ ತ್ಯಾಜ್ಯವನ್ನು ಯಾವ ತೊಟ್ಟಿಯಲ್ಲಿ (Bin) ಹಾಕಬೇಕು ಎಂಬ ಸಂದೇಹವಿದೆಯೇ? ಅಥವಾ ಸುರಕ್ಷತಾ ನಿಯಮಗಳ ಬಗ್ಗೆ ತಿಳಿಯಬೇಕೇ? ನನ್ನನ್ನು ಕೇಳಿ! (ಉದಾ: "ರಕ್ತ ಅಂಟಿದ ಬಟ್ಟೆ", "ಸೂಜಿ ಎಲ್ಲಿ ಹಾಕಬೇಕು", "ಹಳದಿ ತೊಟ್ಟಿಯ ನಿಯಮಗಳು").'
      };
    }
    return {
      type: 'conversation',
      text: "Hello! I am your KMCH AI Waste Assistant. You can describe any biomedical waste item, ask doubts about hospital protocols, or learn correct bin color coding (Yellow, Red, White, Blue, Green). How can I assist you today?"
    };
  }

  // 2. DOUBT / HELP INQUIRY INTENT
  const doubtRegex = /(?:^|\s)(doubt|doubts|help|question|clarify|clarification|confused|sandeham|சந்தேகம்|உதவி|madad|मदद|सवाल|సందేహం|సాయం|సంశയം|സഹായം|ಸಂದೇಹ|ಸಹಾಯ)(?:\s|$|[.,!?])/i;
  const isPlainDoubt = doubtRegex.test(lower) && !hasSpecificWasteKeywords(lower, clean) && !hasImage;
  if (isPlainDoubt) {
    if (lang === 'ta') {
      return {
        type: 'conversation',
        text: 'நிச்சயமாக! உங்கள் சந்தேகத்தை தயங்காமல் கேளுங்கள்:\n• ஒரு கழிவுப் பொருளைக் குறிப்பிட்டால் (எ.கா: "ரத்தம் படிந்த துணி", "பயன்படுத்திய ஊசி", "அறுவை சிகிச்சை கையுறை", "மருந்து பாட்டில்") சரியான தொட்டியையும் விதிகளையும் கூறுவேன்.\n• ஊசி குத்தினால் (Needle-stick injury) உடனடி முதலுதவி நெறிமுறையை கேட்கலாம்.\n• பாதுகாப்பு கவசங்கள் (PPE) மற்றும் KMCH விதிகளை அறியலாம்.'
      };
    } else if (lang === 'hi') {
      return {
        type: 'conversation',
        text: 'हाँ बिल्कुल! आपका क्या संदेह है, बेझिझक पूछिए:\n• किसी भी कचरे का नाम बताइए (उदा: "खून लगा कपड़ा", "उपयोग की गई सुई", "दस्ताने", "दवा की शीशी"), मैं सही डिब्बा और नियम बताऊँगा।\n• सुई चुभने (Needle prick) पर प्राथमिक उपचार पूछें।\n• PPE और सुरक्षा नियमों की जानकारी लें।'
      };
    } else if (lang === 'te') {
      return {
        type: 'conversation',
        text: 'తప్పకుండా! మీ సందేహాన్ని అడగండి:\n• ఏదైనా వ్యర్థం పేరు చెప్పండి (ఉదా: "రక్తం అంటిన బట్ట", "సూది", "చేతి తొడుగులు", "మందు సీసా"), సరైన తొట్టి మరియు నిబంధనలను చెప్తాను.\n• సూది గుచ్చుకుంటే (Needle prick) తీసుకోవాల్సిన ప్రథమ చికిత్స అడగండి.\n• PPE మరియు ఆసుపత్రి భద్రతా నిబంధనలను తెలుసుకోండి.'
      };
    } else if (lang === 'ml') {
      return {
        type: 'conversation',
        text: 'തീർച്ചയായും! നിങ്ങളുടെ സംശയം ചോദിക്കൂ:\n• ഏതെങ്കിലും മാലിന്യത്തിന്റെ പേര് പറയൂ (ഉദാ: "രക്തം പുരണ്ട തുണി", "സൂചി", "കയ്യുറകൾ", "മരുന്ന് കുപ്പി"), ശരിയായ ബിന്നും രീതിയും ഞാൻ പറഞ്ഞുതരാം.\n• സൂചി കുത്തിയാൽ (Needle prick) ചെയ്യേണ്ട അടിയന്തര പ്രഥമശുശ്രൂഷ ചോദിക്കാം.\n• PPE ഉപകരണങ്ങളും സുരക്ഷാ നിയമങ്ങളും അറിയാം.'
      };
    } else if (lang === 'kn') {
      return {
        type: 'conversation',
        text: 'ಖಂಡಿತ! ನಿಮ್ಮ ಸಂದೇಹವನ್ನು ಕೇಳಿ:\n• ಯಾವುದೇ ತ್ಯಾಜ್ಯದ ಹೆಸರು ತಿಳಿಸಿ (ಉದಾ: "ರಕ್ತ ಅಂಟಿದ ಬಟ್ಟೆ", "ಬಳಸಿದ ಸೂಜಿ", "ಕೈಗವಸು", "ಔಷಧಿ ಬಾಟಲಿ"), ಸರಿಯಾದ ತೊಟ್ಟಿ ಮತ್ತು ನಿಯಮಗಳನ್ನು ಹೇಳುತ್ತೇನೆ.\n• ಸೂಜಿ ಚುಚ್ಚಿದರೆ (Needle prick) ಮಾಡಬೇಕಾದ ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಕೇಳಿ.\n• PPE ಮತ್ತು ಆಸ್ಪತ್ರೆಯ ಸುರಕ್ಷತಾ ನಿಯಮಗಳನ್ನು ತಿಳಿಯಿರಿ.'
      };
    }
    return {
      type: 'conversation',
      text: "Yes, absolutely! Please state your doubt. Describe any waste item and I'll analyze every word using NLP to assign the exact bin & protocol per BMW Rules 2016."
    };
  }

  // 3. GRATITUDE / FAREWELL INTENT
  const thanksRegex = /(?:^|\s)(thank\s*you|thanks|nandri|நன்றி|shukriya|शुक्रिया|dhanyavad|धन्यवाद|ధన్యవాదాలు|నంది|നന്ദി|ಧನ್ಯವಾದಗಳು|bye|goodbye)(?:\s|$|[.,!?])/i;
  if (thanksRegex.test(lower) && lower.split(/\s+/).length <= 4) {
    if (lang === 'ta') {
      return { type: 'conversation', text: 'மிக்க மகிழ்ச்சி! KMCH மருத்துவமனை நோய்த்தொற்று தடுப்பு விதிமுறைகளை எப்போதும் பின்பற்றுங்கள். பாதுகாப்பாக இருங்கள்!' };
    } else if (lang === 'hi') {
      return { type: 'conversation', text: 'आपका स्वागत है! अस्पताल में बायोमेडिकल वेस्ट नियमों का पालन करें और सुरक्षित रहें।' };
    } else if (lang === 'te') {
      return { type: 'conversation', text: 'చాలా సంతోషం! KMCH ఆసుపత్రి వ్యర్థాల నిర్వహణ నిబంధనలను పాటించండి. సురక్షితంగా ఉండండి!' };
    } else if (lang === 'ml') {
      return { type: 'conversation', text: 'വളരെ സന്തോഷം! KMCH ബയോമെഡിക്കൽ വേസ്റ്റ് മാർഗ്ഗനിർദ്ദേശങ്ങൾ പാലിക്കുക. സുരക്ഷിതരായിരിക്കുക!' };
    } else if (lang === 'kn') {
      return { type: 'conversation', text: 'ತುಂಬಾ ಸಂತೋಷ! KMCH ಬಯೋಮೆಡಿಕಲ್ ತ್ಯಾಜ್ಯ ನಿಯಮಗಳನ್ನು ಪಾಲಿಸಿ. ಸುರಕ್ಷಿತವಾಗಿರಿ!' };
    }
    return { type: 'conversation', text: "You're very welcome! Always adhere to KMCH Biomedical Waste protocols to keep our hospital safe and compliant." };
  }

  // 4. PROTOCOL & FAQ QUESTIONS:
  // 4A. Needle-stick injury / sharps prick
  if (/(?:^|\s)(needle\s*prick|needle\s*stick|sharps\s*injury|prick)(?:\s|$|[.,!?])/i.test(lower) ||
      clean.includes('ஊசி குத்தி') || clean.includes('सुई चुभ') || clean.includes('సూది గుచ్చు') ||
      clean.includes('സൂചി കുത്തി') || clean.includes('ಸೂಜಿ ಚುಚ್ಚಿ')) {
    if (lang === 'ta') {
      return {
        type: 'conversation',
        text: '⚠️ **ஊசி குத்தினால் (Needle-Stick Injury) உடனடி முதலுதவி நெறிமுறை:**\n\n1. **உடனடி கழுவுதல்:** குத்திய இடத்தை ஓடும் குழாய் நீரில் சோப்பு போட்டு குறைந்தது 1-2 நிமிடங்கள் கழுவவும்.\n2. **அழுத்தக் கூடாது:** காயத்தை அழுத்தவோ, கசக்கவோ, அல்லது ரத்தத்தை வாயால் உறிஞ்சவோ கூடாது!\n3. **கிருமிநாசினி வேண்டாம்:** ஆல்கஹால் அல்லது அயோடினை நேரடியாக திறந்த காயத்தில் ஊற்ற வேண்டாம்.\n4. **மேற்பார்வையாளரிடம் தகவல்:** உடனடியாக உங்கள் துறை தலைமை செவிலியர் / மேற்பார்வையாளரிடம் தெரிவிக்கவும்.\n5. **அவசர சிகிச்சை (PEP):** 2 மணி நேரத்திற்குள் எச்.ஐ.வி தடுப்பு (PEP) பரிசோதனைக்காக KMCH அவசர சிகிச்சைப் பிரிவை அணுகவும்.'
      };
    } else if (lang === 'hi') {
      return {
        type: 'conversation',
        text: '⚠️ **सुई चुभने पर (Needle-Stick Injury) तत्काल आपातकालीन प्रोटोकॉल:**\n\n1. **तुरंत धोएं:** प्रभावित हिस्से को बहते नल के पानी और साबुन से कम से कम 1-2 मिनट तक धोएं।\n2. **दबाएं नहीं:** घाव को कभी भी दबाएं, रगड़ें या मुंह से चूसें नहीं!\n3. **तेज़ रसायन न लगाएं:** खुले घाव पर सीधे स्प्रिट या आयोडीन न डालें।\n4. **तुरंत सूचित करें:** अपने विभाग के इंचार्ज या सुपरवाइजर को तुरंत रिपोर्ट करें।\n5. **PEP उपचार:** हेपेटाइटिस और एचआईवी से बचाव के लिए 2 घंटे के भीतर KMCH इमरजेंसी में जाकर पोस्ट-एक्सपोजर प्रोफिलैक्सिस (PEP) जांच करवाएं।'
      };
    } else if (lang === 'te') {
      return {
        type: 'conversation',
        text: '⚠️ **సూది గుచ్చుకున్నప్పుడు (Needle-Stick Injury) తక్షణ ప్రథమ చికిత్స:**\n\n1. **వెంటనే కడగాలి:** గాయమైన భాగాన్ని ప్రవహించే కొళాయి నీరు మరియు సబ్బుతో కనీసం 1-2 నిమిషాలు కడగాలి.\n2. **నొక్కకూడదు:** గాయాన్ని గట్టిగా నొక్కడం, రుద్దడం లేదా నోటితో పీల్చడం చేయకూడదు!\n3. **రసాయనాలు వద్దు:** గాయంపై నేరుగా ఆల్కహాల్ లేదా అయోడిన్ పోయకూడదు.\n4. **సమాచారం ఇవ్వండి:** వెంటనే మీ విభాగపు హెడ్ నర్సు లేదా సూపర్‌వైజర్‌కు తెలియజేయండి.\n5. **PEP చికిత్స:** హెపటైటిస్, HIV నివారణకు 2 గంటల్లోగా KMCH ఎమర్జెన్సీ విభాగాన్ని సంప్రదించి PEP చికిత్స ప్రారంభించాలి.'
      };
    } else if (lang === 'ml') {
      return {
        type: 'conversation',
        text: '⚠️ **സൂചി കുത്തിയാൽ (Needle-Stick Injury) ചെയ്യേണ്ട അടിയന്തര കാര്യങ്ങൾ:**\n\n1. **ഉടൻ കഴുകുക:** മുറിവേറ്റ ഭാഗം പൈപ്പ് വെള്ളത്തിലും സോപ്പിലും 1-2 മിനിറ്റ് നന്നായി കഴുകുക.\n2. **അമർത്തരുത്:** മുറിവ് അമർത്തുകയോ, തിരുമ്മുകയോ, രക്തം വായ് കൊണ്ട് വലിച്ചെടുക്കുകയോ ചെയ്യരുത്!\n3. **ആൽക്കഹോൾ ഒഴിക്കരുത്:** തുറന്ന മുറിവിൽ സ്ട്രോംഗ് ആന്റിസെപ്റ്റിക് നേരിട്ട് ഒഴിക്കരുത്.\n4. **ഉടൻ റിപ്പോർട്ട് ചെയ്യുക:** നിങ്ങളുടെ ഇൻ-ചാർജ്ജ് സൂപ്പർവൈസറെ ഉടൻ അറിയിക്കുക.\n5. **PEP ചികിത്സ:** ഹെപ്പറ്റൈറ്റിസ്, HIV പ്രതിരോധത്തിനായി 2 മണിക്കൂറിനകം KMCH അത്യാഹിത വിഭാഗത്തിൽ പോയി PEP പരിശോധന നടത്തുക.'
      };
    } else if (lang === 'kn') {
      return {
        type: 'conversation',
        text: '⚠️ **ಸೂಜಿ ಚುಚ್ಚಿದಾಗ (Needle-Stick Injury) ತಕ್ಷಣದ ಪ್ರಥಮ ಚಿಕಿತ್ಸಾ ನಿಯಮ:**\n\n1. **ತಕ್ಷಣ ತೊಳೆಯಿರಿ:** ಚುಚ್ಚಿದ ಸ್ಥಳವನ್ನು ಹರಿಯುವ ನಲ್ಲಿಯ ನೀರಿನಲ್ಲಿ ಸಾಬೂನಿನೊಂದಿಗೆ ಕನಿಷ್ಠ 1-2 ನಿಮಿಷ ತೊಳೆಯಿರಿ.\n2. **ಒತ್ತಬೇಡಿ:** ಗಾಯವನ್ನು ಒತ್ತಬಾರದು, ಉಜ್ಜಬಾರದು ಅಥವಾ ಬಾಯಿಯಿಂದ ಹೀರಿ ರಕ್ತ ತೆಗೆಯಬಾರದು!\n3. **ತೀವ್ರ ರಾಸಾಯನಿಕ ಬೇಡ:** ಗಾಯಕ್ಕೆ ನೇರವಾಗಿ ಸ್ಪಿರಿಟ್ ಅಥವಾ ಅಯೋಡಿನ್ ಹಾಕಬೇಡಿ.\n4. **ವರದಿ ಮಾಡಿ:** ತಕ್ಷಣ ನಿಮ್ಮ ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರಿಗೆ ಅಥವಾ ಸೂಪರ್‌ವೈಸರ್‌ಗೆ ತಿಳಿಸಿ.\n5. **PEP ಚಿಕಿತ್ಸೆ:** ಹೆಪಟೈಟಿಸ್ ಮತ್ತು HIV ತಡೆಗಟ್ಟಲು 2 ಗಂಟೆಯೊಳಗೆ KMCH ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗಕ್ಕೆ ತೆರಳಿ PEP ತಪಾಸಣೆ ಮಾಡಿಸಿಕೊಳ್ಳಿ.'
      };
    }
    return {
      type: 'conversation',
      text: "⚠️ **Immediate Needle-Stick / Sharps Injury Protocol:**\n\n1. Wash immediately under running tap water with soap for 1-2 minutes.\n2. DO NOT squeeze or scrub the wound.\n3. Report immediately to your Infection Control Nurse or Supervisor.\n4. Report to KMCH Emergency within 2 hours for PEP evaluation."
    };
  }

  // 4B. PPE / Worker Safety Gear Question
  if ((/(?:^|\s)(ppe|protective|safety\s*gear|what\s*to\s*wear|suraksha)(?:\s|$|[.,!?])/i.test(lower) ||
       clean.includes('கவசம்') || clean.includes('सुरक्षा उपकरण') || clean.includes('రక్షణ దుస్తులు') ||
       clean.includes('സുരക്ഷാ വസ്ത്രങ്ങൾ') || clean.includes('ರಕ್ಷಣಾ ಸಾಧನ')) &&
      !/(?:^|\s)(dispose|bin|throw|put)(?:\s|$|[.,!?])/i.test(lower) && !clean.includes('தொட்டி') && !clean.includes('डिब्बा') && !clean.includes('తొట్టి') && !clean.includes('ബിൻ') && !clean.includes('ತೊಟ್ಟಿ')) {
    if (lang === 'ta') {
      return {
        type: 'conversation',
        text: '🛡️ **KMCH கழிவு சேகரிப்பு பணியாளர்களுக்கான கட்டாய PPE கவசங்கள்:**\n\n• **கனரக நைட்ரைல் கையுறைகள் (Heavy Nitrile Gloves):** ஊசி மற்றும் கூர்மையான பொருட்களிலிருந்து கைகளைப் பாதுகாக்க.\n• **நீர்ப்புகா ஏப்ரன் (Waterproof Apron):** ரத்தம்/திரவங்கள் உடலில் தெறிப்பதைத் தடுக்க.\n• **கம் பூட்ஸ் (Gum Boots):** வழுக்காத, துளைக்க முடியாத பாதணிகள்.\n• **N95 முகக்கவசம் & கண் கண்ணாடி (Eye Goggles):** சுவாச மற்றும் கண் பாதுகாப்பு.'
      };
    } else if (lang === 'hi') {
      return {
        type: 'conversation',
        text: '🛡️ **सफाई कर्मचारियों के लिए अनिवार्य PPE सुरक्षा उपकरण:**\n\n• **मजबूत नाइट्राइल दस्ताने (Heavy-duty Nitrile Gloves):** नुकीली सुई और संक्रमण से बचाव के लिए।\n• **वॉटरप्रूफ एप्रन (Waterproof Apron):** जैविक तरल पदार्थों के छींटों से बचने के लिए।\n• **गम बूट्स (Gum Boots):** फिसलन और पंचर-प्रतिरोधी जूते।\n• **N95 मास्क और सुरक्षा चश्मा (Goggles):** सांस और आंखों की सुरक्षा के लिए।'
      };
    } else if (lang === 'te') {
      return {
        type: 'conversation',
        text: '🛡️ **వ్యర్థాల సేకరణ సిబ్బందికి తప్పనిసరి PPE రక్షణ సామగ్రి:**\n\n• **హెవీ-డ్యూటీ నైట్రైల్ గ్లౌజులు:** సూదులు మరియు పదునైన వస్తువుల నుండి రక్షణకు.\n• **వాటర్‌ప్రూఫ్ ఆప్రాన్:** రక్తం మరియు ద్రవాలు పడకుండా ఉండటానికి.\n• **గమ్ బూట్లు (Gum boots):** జారకుండా, గుచ్చుకోకుండా ఉండే బూట్లు.\n• **N95 మాస్క్ & కంటి అద్దాలు (Eye Goggles):** కళ్ళు మరియు శ్వాస రక్షణకు.'
      };
    } else if (lang === 'ml') {
      return {
        type: 'conversation',
        text: '🛡️ **മാലിന്യ ശേഖരണ തൊഴിലാളികൾക്കുള്ള നിർബന്ധിത PPE ഉപകരണങ്ങൾ:**\n\n• **നൈട്രൈൽ കയ്യുറകൾ (Heavy Nitrile Gloves):** സൂചികളും മൂർച്ചയുള്ള വസ്തുക്കളും കൊള്ളാതിരിക്കാൻ.\n• **വാട്ടർപ്രൂഫ് ആപ്രണുകൾ:** രക്തവും ദ്രവങ്ങളും തെറിക്കാതിരിക്കാൻ.\n• **ഗം ബൂട്ടുകൾ (Gum Boots):** തുളച്ചുകയറാത്ത സുരക്ഷാ പാദരക്ഷകൾ.\n• **N95 മാസ്ക് & സുരക്ഷാ കണ്ണടകൾ (Goggles):** ശ്വാസകോശ, നേത്ര സംരക്ഷണത്തിന്.'
      };
    } else if (lang === 'kn') {
      return {
        type: 'conversation',
        text: '🛡️ **ತ್ಯಾಜ್ಯ ವಿಲೇವಾರಿ ಸಿಬ್ಬಂದಿಗೆ ಕಡ್ಡಾಯ PPE ರಕ್ಷಣಾ ಸಾಧನಗಳು:**\n\n• **ಹೆವಿ-ಡ್ಯೂಟಿ ನೈಟ್ರೈಲ್ ಕೈಗವಸುಗಳು:** ಹರಿತವಾದ ವಸ್ತುಗಳಿಂದ ರಕ್ಷಣೆಗೆ.\n• **ವಾಟರ್‌ಪ್ರೂಫ್ ಏಪ್ರನ್:** ರಕ್ತ ಮತ್ತು ದ್ರವಗಳು ಬೀಳದಂತೆ ತಡೆಯಲು.\n• **ಗಮ್ ಬೂಟುಗಳು (Gum Boots):** ಜಾರದ ಮತ್ತು ಚುಚ್ಚಲಾಗದ ಸುರಕ್ಷಿತ ಪಾದರಕ್ಷೆಗಳು.\n• **N95 ಮಾಸ್ಕ್ & ರಕ್ಷಣಾ ಕಣ್ಣಿನ ಗ್ಲಾಸ್ (Goggles):** ಕಣ್ಣು ಮತ್ತು ಉಸಿರಾಟದ ರಕ್ಷಣೆಗೆ.'
      };
    }
  }

  // 4C. Questions about Bin Colors
  const binInquiry = checkMultiLingualBinInquiry(lower, clean, lang);
  if (binInquiry) return binInquiry;

  // 5. WORD-BY-WORD NLP ANALYSIS & BIOMEDICAL WASTE CLASSIFICATION
  const nlpAnalysis = analyzeWordsWithNLP(clean, lang);
  if (nlpAnalysis) {
    const classification = buildClassificationResponse(nlpAnalysis, lang);
    return {
      type: 'classification',
      text: classification.conversationalText,
      result: classification.result
    };
  }

  // Fallback direct matching
  const fallbackClassification = identifyWasteItem(lower, hasImage);
  if (fallbackClassification) {
    const conversationalIntro = buildConversationalIntro(clean, fallbackClassification, lang);
    return {
      type: 'classification',
      text: conversationalIntro,
      result: fallbackClassification
    };
  }

  // 6. GUIDED FALLBACK IN DETECTED LANGUAGE
  return getGuidedFallback(clean, lang);
}

/**
 * Builds the structured response containing word-by-word NLP breakdown and clinical guidance
 */
function buildClassificationResponse(nlp, lang) {
  const rec = nlp.record;
  const tokens = nlp.tokens || [];

  // Localized Headers for NLP Word Breakdown
  const nlpHeaderByLang = {
    ta: '🔬 **வார்த்தை பகுப்பாய்வு (NLP Word Analysis):**\n',
    hi: '🔬 **शब्द-दर-शब्द विश्लेषण (NLP Word Analysis):**\n',
    te: '🔬 **పదం-వారీగా విశ్లేషణ (NLP Word Analysis):**\n',
    ml: '🔬 **വാക്ക് തിരിച്ച് വിശകലനം (NLP Word Analysis):**\n',
    kn: '🔬 **ಪದ-ವಾರಿಯಾಗಿ ವಿಶ್ಲೇಷಣೆ (NLP Word Analysis):**\n',
    en: '🔬 **NLP Word-by-Word Analysis:**\n'
  };

  let nlpBreakdown = '';
  if (tokens.length > 0) {
    const header = nlpHeaderByLang[lang] || nlpHeaderByLang.en;
    nlpBreakdown = header + tokens.map(t => `• **"${t.word}"** ➔ ${t.role}`).join('\n') + `\n\n`;
  }

  // Localized Bin Names
  const binNames = {
    White: {
      ta: 'வெள்ளை தொட்டி (White Bin - Puncture-proof container)',
      hi: 'सफेद डिब्बा (White Bin - नुकीले कचरे का पंचर-प्रूफ कंटेनर)',
      te: 'తెలుపు తొట్టి (White Bin - పంక్చర్ ప్రూఫ్ కంటైనర్)',
      ml: 'വെള്ള ബിൻ (White Bin - പഞ്ചർ പ്രൂഫ് കണ്ടെയ്നർ)',
      kn: 'ಬಿಳಿ ತೊಟ್ಟಿ (White Bin - ಪಂಕ್ಚರ್ ಪ್ರೂಫ್ ಕಂಟೈನರ್)',
      en: 'White Bin (Puncture-proof translucent container)'
    },
    Yellow: {
      ta: 'மஞ்சள் தொட்டி (Yellow Bin - Non-chlorinated incineration bag)',
      hi: 'पीला डिब्बा (Yellow Bin - भस्मीकरण / Incineration बैग)',
      te: 'పసుపు తొట్టి (Yellow Bin - ఇన్సినరేషన్ బ్యాగ్)',
      ml: 'മഞ്ഞ ബിൻ (Yellow Bin - ഇൻസിനറേഷൻ ബാഗ്)',
      kn: 'ಹಳದಿ ತೊಟ್ಟಿ (Yellow Bin - ಇನ್ಸಿನರೇಶನ್ ಬ್ಯಾಗ್)',
      en: 'Yellow Bin (Non-chlorinated plastic bag)'
    },
    Red: {
      ta: 'சிவப்பு தொட்டி (Red Bin - Autoclave & plastic recycling)',
      hi: 'लाल डिब्बा (Red Bin - ऑटोक्लेव और प्लास्टिक रीसाइक्लिंग)',
      te: 'ఎరుపు తొట్టి (Red Bin - ఆటోక్లేవ్ & రీసైక్లింగ్)',
      ml: 'ചുവപ്പ് ബിൻ (Red Bin - ഓട്ടോക്ലേവ് & റീസൈക്ലിംഗ്)',
      kn: 'ಕೆಂಪು ತೊಟ್ಟಿ (Red Bin - ಆಟೋಕ್ಲೇವ್ & ಮರುಬಳಕೆ)',
      en: 'Red Bin (Autoclaving & plastic recycling)'
    },
    Blue: {
      ta: 'நீல தொட்டி (Blue Bin - Glassware & metallic implants box)',
      hi: 'नीला डिब्बा (Blue Bin - कांच और धातु रीसाइक्लिंग)',
      te: 'నీలం తొట్టి (Blue Bin - గాజు & మెటల్ రీసైక్లింగ్)',
      ml: 'നീല ബിൻ (Blue Bin - ഗ്ലാസ് & മെറ്റൽ റീസൈക്ലിംഗ്)',
      kn: 'ನೀಲಿ ತೊಟ್ಟಿ (Blue Bin - ಗಾಜು & ಲೋಹದ ಮರುಬಳಕೆ)',
      en: 'Blue Bin (Disinfection & glass/metal recycling)'
    },
    Green: {
      ta: 'பச்சை தொட்டி (Green Bin - Municipal container)',
      hi: 'हरा डिब्बा (Green Bin - सामान्य नगरपालिका कचरा)',
      te: 'ఆకుపచ్చ తొట్టి (Green Bin - సాధారణ మున్సిపల్ చెత్త)',
      ml: 'പച്ച ബിൻ (Green Bin - സാധാരണ മുനിസിപ്പൽ മാലിന്യം)',
      kn: 'ಹಸಿರು ತೊಟ್ಟಿ (Green Bin - ಸಾಮಾನ್ಯ ಪುರಸಭೆ ಕಸ)',
      en: 'Green Bin (General municipal non-hazardous waste)'
    }
  };

  // Localized Guidance & Safety
  const guidanceByLang = {
    White: {
      ta: 'துளைக்க முடியாத வெள்ளை கொள்கலனில் உடனடியாக போடவும். ஆட்டோகிளேவ் அல்லது உலர் வெப்ப கிருமிநீக்கம் செய்யப்பட்டு நொறுக்கப்படும்.',
      hi: 'पंचर-प्रूफ सफेद कंटेनर में तुरंत जमा करें। ऑटोक्लेव या शुष्क ताप से कीटाणुरहित करने के बाद नष्ट किया जाएगा।',
      te: 'పంక్చర్ ప్రూఫ్ కంటైనర్‌లో వెంటనే వేయాలి. ఆటోక్లేవ్ చేసి ముక్కలు చేస్తారు.',
      ml: 'പഞ്ചർ പ്രൂഫ് വെള്ള കണ്ടെയ്നറിൽ ഉടൻ നിക്ഷേപിക്കുക. ഓട്ടോക്ലേവ് ചെയ്ത ശേഷം നശിപ്പിക്കും.',
      kn: 'ಪಂಕ್ಚರ್ ಪ್ರೂಫ್ ಬಿಳಿ ಕಂಟೈನರ್‌ನಲ್ಲಿ ತಕ್ಷಣ ಹಾಕಿ. ಆಟೋಕ್ಲೇವ್ ಮಾಡಿ ಚೂರು ಮಾಡಲಾಗುತ್ತದೆ.',
      en: rec.guidance
    },
    Yellow: {
      ta: 'குளோரினேற்றம் செய்யப்படாத மஞ்சள் பையில் சேகரித்து, 1100°C-க்கு மேல் அதிக வெப்பநிலையில் இரட்டை அறை எரியூட்டல் (Incineration) மூலம் எரிக்கப்பட வேண்டும்.',
      hi: 'नॉन-क्लोरिनेटेड पीले बैग में एकत्र करें और 1100°C से अधिक तापमान पर दोहरे कक्ष वाले इंसिनरेटर (Incineration) में भस्म करें।',
      te: 'పసుపు సంచిలో సేకరించి, 1100°C కంటే ఎక్కువ ఉష్ణోగ్రత వద్ద ఇన్సినరేషన్ (Incineration) ద్వారా కాల్చివేయాలి.',
      ml: 'ക്ലോറിനേറ്റ് ചെയ്യാത്ത മഞ്ഞ ബാഗിൽ ശേഖരിച്ച് 1100°C-ൽ കൂടുതൽ ഉയർന്ന താപനിലയിൽ ഇൻസിനറേറ്ററിൽ ദഹിപ്പിക്കണം.',
      kn: 'ಕ್ಲೋರಿನೇಟ್ ಮಾಡದ ಹಳದಿ ಬ್ಯಾಗ್‌ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಿ 1100°C ಗಿಂತ ಹೆಚ್ಚಿನ ತಾಪಮಾನದಲ್ಲಿ ಸುಟ್ಟುಹಾಕಬೇಕು (Incineration).',
      en: rec.guidance
    },
    Red: {
      ta: 'சிவப்பு பையில் சேகரித்து, ஆட்டோகிளேவ் முறையில் கிருமிநீக்கம் செய்த பிறகு அங்கீகரிக்கப்பட்ட பிளாஸ்டிக் மறுசுழற்சிக்கு அனுப்ப வேண்டும்.',
      hi: 'लाल बैग में डालें, ऑटोक्लेव या माइक्रोवेव से कीटाणुरहित करने के बाद पंजीकृत प्लास्टिक रिसाइकिलर को भेजें।',
      te: 'ఎరుపు సంచిలో వేసి, ఆటోక్లేవ్ ద్వారా క్రిమిరహితం చేసి అధీకృత ప్లాస్టిక్ రీసైక్లింగ్‌కు పంపాలి.',
      ml: 'ചുവപ്പ് ബാഗിൽ നിക്ഷേപിച്ച്, ഓട്ടോക്ലേവ് ചെയ്ത ശേഷം അംഗീകൃത പ്ലാസ്റ്റിക് റീസൈക്ലിംഗിന് അയക്കണം.',
      kn: 'ಕೆಂಪು ಬ್ಯಾಗ್‌ನಲ್ಲಿ ಹಾಕಿ, ಆಟೋಕ್ಲೇವ್ ಮೂಲಕ ಕ್ರಿಮಿಮುಕ್ತಗೊಳಿಸಿ ಅಧಿಕೃತ ಪ್ಲಾಸ್ಟಿಕ್ ಮರುಬಳಕೆಗೆ ಕಳುಹಿಸಬೇಕು.',
      en: rec.guidance
    },
    Blue: {
      ta: '1-2% சோடியம் ஹைப்போகுளோரைட் கரைசலில் ஊறவைத்து கிருமிநீக்கம் செய்து மறுசுழற்சிக்கு அனுப்ப வேண்டும்.',
      hi: '1-2% सोडियम हाइपोक्लोराइट घोल में कीटाणुरहित करें और कांच/धातु रीसाइक्लिंग के लिए भेजें।',
      te: '1-2% సోడియం హైపోక్లోరైట్ ద్రావణంలో శుభ్రపరచి గాజు లేదా మెటల్ రీసైక్లింగ్‌కు పంపాలి.',
      ml: '1-2% സോഡിയം ഹൈപ്പോക്ലോറൈറ്റ് ലായനിയിൽ അണുവിമുക്തമാക്കി ഗ്ലാസ് റീസൈക്ലിംഗിന് അയക്കണം.',
      kn: '1-2% ಸೋಡಿಯಂ ಹೈಪೋಕ್ಲೋರೈಟ್ ದ್ರಾವಣದಲ್ಲಿ ಕ್ರಿಮಿಮುಕ್ತಗೊಳಿಸಿ ಗಾಜು/ಲೋಹ ಮರುಬಳಕೆಗೆ ಕಳುಹಿಸಿ.',
      en: rec.guidance
    },
    Green: {
      ta: 'நகராட்சி பொது கழிவு அல்லது மக்கும் உரமாக்கலுக்கு அனுப்ப வேண்டும்.',
      hi: 'सामान्य नगरपालिका ठोस अपशिष्ट या जैविक खाद बनाने के लिए भेजें।',
      te: 'సాధారణ మున్సిపల్ చెత్త లేదా సేంద్రీయ ఎరువుగా పంపాలి.',
      ml: 'മുനിസിപ്പൽ ഖരമാലിന്യ സംസ്കരണത്തിനോ കമ്പോസ്റ്റിംഗിനോ അയക്കുക.',
      kn: 'ಪುರಸಭೆಯ ಸಾಮಾನ್ಯ ತ್ಯಾಜ್ಯ ಅಥವಾ ಗೊಬ್ಬರ ತಯಾರಿಕೆಗೆ ಕಳುಹಿಸಬೇಕು.',
      en: rec.guidance
    }
  };

  const labelCategory = { ta: 'வகைப்பாடு', hi: 'श्रेणी (Category)', te: 'వర్గీకరణ', ml: 'വർഗ്ഗീകരണം', kn: 'ವರ್ಗೀಕರಣ', en: 'Classification' };
  const labelBin = { ta: 'பரிந்துரைக்கப்பட்ட தொட்டி', hi: 'निर्धारित डिब्बा (Bin)', te: 'కేటాయించిన తొట్టి', ml: 'നിർദ്ദേശിച്ച ബിൻ', kn: 'ನಿಯೋಜಿತ ತೊಟ್ಟಿ', en: 'Assigned Bin' };
  const labelProtocol = { ta: 'அகற்றும் நெறிமுறை', hi: 'निपटान प्रोटोकॉल', te: 'విಲೇವారి విధానం', ml: 'സംസ്കരണ രീതി', kn: 'ವಿಲೇವಾರಿ ನಿಯಮ', en: 'Disposal Protocol' };
  const labelSafety = { ta: 'பாதுகாப்பு எச்சரிக்கை', hi: 'सुरक्षा चेतावनी', te: 'భద్రతా హెచ్చరిక', ml: 'സുരക്ഷാ മുന്നറിയിപ്പ്', kn: 'ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆ', en: 'Safety Guidance' };

  const currentBinName = (binNames[rec.bin] && binNames[rec.bin][lang]) || rec.binFullName;
  const currentGuidance = (guidanceByLang[rec.bin] && guidanceByLang[rec.bin][lang]) || rec.guidance;

  const conversationalText = `${nlpBreakdown}` +
    `📋 **${labelCategory[lang] || labelCategory.en}:** ${rec.displayName}\n` +
    `🗑️ **${labelBin[lang] || labelBin.en}:** **${currentBinName}** (${nlp.confidence}% Match)\n\n` +
    `💡 **${labelProtocol[lang] || labelProtocol.en}:** ${currentGuidance}\n\n` +
    `⚠️ **${labelSafety[lang] || labelSafety.en}:** ${rec.safetyWarning}`;

  const resultObj = {
    id: rec.id,
    type: rec.displayName,
    category: rec.category,
    bin: rec.bin,
    binFullName: rec.binFullName,
    confidence: nlp.confidence,
    guidance: rec.guidance,
    safetyWarning: rec.safetyWarning,
    nlpTokens: tokens
  };

  return { conversationalText, result: resultObj };
}

function checkMultiLingualBinInquiry(lower, clean, lang) {
  // Yellow Bin Inquiry
  if (clean.includes('மஞ்சள் தொட்டி') || clean.includes('पीला डिब्बा') || clean.includes('పసుపు తొట్టి') || clean.includes('മഞ്ഞ ബിൻ') || clean.includes('ಹಳದಿ ತೊಟ್ಟಿ') || /yellow\s*bin/i.test(lower)) {
    if (lang === 'hi') {
      return { type: 'conversation', text: "🟡 **पीला डिब्बा (Yellow Bin - भस्मीकरण):**\n• रक्त से सनी रुई, गॉज, पट्टियां, मानव ऊतक, अपरा (प्लेसेंटा), एक्सपायर्ड दवाइयां और कीमोथेरेपी कचरा।\n• बैग: नॉन-क्लोरिनेटेड पीला प्लास्टिक बैग।\n• तापमान: 1100°C से अधिक पर उच्च ताप भस्मीकरण।" };
    } else if (lang === 'te') {
      return { type: 'conversation', text: "🟡 **పసుపు తొట్టి (Yellow Bin - ఇన్సినరేషన్):**\n• రక్తం అంటిన దూది, గాజ్, కట్టు గుడ్డలు, మానవ అవయవాలు, ప్లాసెంటా, గడువు ముగిసిన మందులు, కెమికల్ వ్యర్థాలు.\n• సంచి: క్లోరిన్ లేని పసుపు ప్లాస్టిక్ సంచి.\n• పద్ధతి: 1100°C వద్ద అధిక ఉష్ణోగ్రత ఇన్సినరేషన్." };
    } else if (lang === 'ml') {
      return { type: 'conversation', text: "🟡 **മഞ്ഞ ബിൻ (Yellow Bin - ഇൻസിനറേഷൻ):**\n• രക്തം പുരണ്ട പഞ്ഞി, തുണി, ബാൻഡേജുകൾ, ശരീര ഭാഗങ്ങൾ, മറുപിള്ള, കാലഹരണപ്പെട്ട മരുന്നുകൾ.\n• ബാഗ്: ക്ലോറിനേറ്റ് ചെയ്യാത്ത മഞ്ഞ പ്ലാസ്റ്റിക് ബാഗ്.\n• നിർമാർജ്ജനം: 1100°C-ൽ കൂടുതൽ താപനിലയിൽ ഇൻസിനറേഷൻ." };
    } else if (lang === 'kn') {
      return { type: 'conversation', text: "🟡 **ಹಳದಿ ತೊಟ್ಟಿ (Yellow Bin - ಇನ್ಸಿನರೇಶನ್):**\n• ರಕ್ತ ಅಂಟಿದ ಹತ್ತಿ, ಬಟ್ಟೆ, ಬ್ಯಾಂಡೇಜ್, ದೇಹದ ಅಂಗಾಂಶ, ಮಾಸು, ಅವಧಿ ಮುಗಿದ ಔಷಧಿಗಳು.\n• ಬ್ಯಾಗ್: ಕ್ಲೋರಿನ್ ರಹಿತ ಹಳದಿ ಪ್ಲಾಸ್ಟಿಕ್ ಬ್ಯಾಗ್.\n• ವಿಲೇವಾರಿ: 1100°C ತಾಪಮಾನದಲ್ಲಿ ಎಕ್ಸ್‌ಟ್ರೀಮ್ ಇನ್ಸಿನರೇಶನ್." };
    }
  }

  // Red Bin Inquiry
  if (clean.includes('சிவப்பு தொட்டி') || clean.includes('लाल डिब्बा') || clean.includes('ఎరుపు తొట్టి') || clean.includes('ചുവപ്പ് ബിൻ') || clean.includes('ಕೆಂಪು ತೊಟ್ಟಿ') || /red\s*bin/i.test(lower)) {
    if (lang === 'hi') {
      return { type: 'conversation', text: "🔴 **लाल डिब्बा (Red Bin - ऑटोक्लेव और रिसाइक्लिंग):**\n• दूषित रिसाइकिल प्लास्टिक — बिना सुई की सिरिंज, आईवी सेट और बोतलें, कैथेटर, दस्ताने, यूरिन बैग।\n• निपटान: ऑटोक्लेव/माइक्रोवेव स्टरलाइजेशन और प्लास्टिक रीसाइक्लिंग।" };
    } else if (lang === 'te') {
      return { type: 'conversation', text: "🔴 **ఎరుపు తొట్టి (Red Bin - ఆటోక్లేవ్ & రీసైక్లింగ్):**\n• ప్లాస్టిక్ వ్యర్థాలు — సూది లేని సిరంజి, ఐవీ సెట్లు, కాథెటర్, చేతి తొడుగులు, మూత్రం సంచులు.\n• పద్ధతి: ఆటోక్లేవ్ ద్వారా క్రిమిరహితం చేసి ప్లాస్టిక్ రీసైక్లింగ్." };
    } else if (lang === 'ml') {
      return { type: 'conversation', text: "🔴 **ചുവപ്പ് ബിൻ (Red Bin - റീസൈക്ലിംഗ്):**\n• റീസൈക്കിൾ ചെയ്യാവുന്ന പ്ലാസ്റ്റിക് — സൂചിയില്ലാത്ത സിറിഞ്ചുകൾ, ഐവി സെറ്റുകൾ, കത്തീറ്റർ, കയ്യുറകൾ, യൂറിൻ ബാഗുകൾ.\n• സംസ്കരണം: ഓട്ടോക്ലേവ് ചെയ്ത് പ്ലാസ്റ്റിക് റീസൈക്ലിംഗ്." };
    } else if (lang === 'kn') {
      return { type: 'conversation', text: "🔴 **ಕೆಂಪು ತೊಟ್ಟಿ (Red Bin - ಮರುಬಳಕೆ):**\n• ಮರುಬಳಕೆ ಪ್ಲಾಸ್ಟಿಕ್ — ಸೂಜಿ ಇಲ್ಲದ ಸಿರಿಂಜ್, ಐವಿ ಸೆಟ್, ಕ್ಯಾತಿಟರ್, ಕೈಗವಸು, ಮೂತ್ರದ ಚೀಲ.\n• ವಿಲೇವಾರಿ: ಆಟೋಕ್ಲೇವ್ ಕ್ರಿಮಿಮುಕ್ತಗೊಳಿಸಿ ಪ್ಲಾಸ್ಟಿಕ್ ಮರುಬಳಕೆ." };
    }
  }

  // White Bin Inquiry
  if (clean.includes('வெள்ளை தொட்டி') || clean.includes('सफेद डिब्बा') || clean.includes('తెలుపు తొట్టి') || clean.includes('വെള്ള ബിൻ') || clean.includes('ಬಿಳಿ ತೊಟ್ಟಿ') || /white\s*bin|sharps\s*bin/i.test(lower)) {
    if (lang === 'hi') {
      return { type: 'conversation', text: "⚪ **सफेद डिब्बा (White Bin - पंचर-प्रूफ कंटेनर):**\n• उपयोग की गई सुइयां, फिक्स्ड सुई वाली सिरिंज, सर्जिकल ब्लेड, स्कैल्पेल, टांके काटने वाले कटर, लैंसट।\n• निपटान: ऑटोक्लेव और श्रेडिंग (टुकड़े करना)।" };
    } else if (lang === 'te') {
      return { type: 'conversation', text: "⚪ **తెలుపు తొట్టి (White Bin - పంక్చర్ ప్రూఫ్ కంటైనర్):**\n• సూదులు, ఫిక్స్‌డ్ సూది సిరంజి, సర్జికల్ బ్లేడ్లు, స్కాల్పెల్, కుట్లు కత్తెర, లాన్సెట్.\n• పద్ధతి: ఆటోక్లేవ్ చేసి ముక్కలు చేయడం." };
    } else if (lang === 'ml') {
      return { type: 'conversation', text: "⚪ **വെള്ള ബിൻ (White Bin - പഞ്ചർ പ്രൂഫ് കണ്ടെയ്നർ):**\n• സൂചികൾ, ഫിക്സഡ് സൂചി സിറിഞ്ചുകൾ, സർജിക്കൽ ബ്ലേഡുകൾ, സ്കാൽപെൽ, ലാൻസെറ്റുകൾ.\n• സംസ്കരണം: ഓട്ടോക്ലേവ് ചെയ്ത് നശിപ്പിക്കൽ." };
    } else if (lang === 'kn') {
      return { type: 'conversation', text: "⚪ **ಬಿಳಿ ತೊಟ್ಟಿ (White Bin - ಪಂಕ್ಚರ್ ಪ್ರೂಫ್ ಕಂಟೈನರ್):**\n• ಸೂಜಿಗಳು, ಸಿರಿಂಜ್ ಸೂಜಿ, ಸರ್ಜಿಕಲ್ ಬ್ಲೇಡ್, ಸ್ಕಾಲ್ಪೆಲ್, ಹೊಲಿಗೆ ಕತ್ತರಿ, ಲ್ಯಾನ್ಸೆಟ್.\n• ವಿಲೇವಾರಿ: ಆಟೋಕ್ಲೇವ್ ಮತ್ತು ಚೂರು ಮಾಡುವುದು." };
    }
  }

  return null;
}

function getGuidedFallback(clean, lang) {
  if (lang === 'ta') {
    return {
      type: 'conversation',
      text: `நான் "${clean}" என்ற வினவலை ஆய்வு செய்தேன். தயவுசெய்து கழிவுப் பொருளை தெளிவாக விவரிக்கவும்:\n• ரத்தம்/திரவம் படிந்த பஞ்சு/துணி? ➔ 🟡 மஞ்சள் தொட்டி\n• ஊசி, கத்தி, பிளேடு? ➔ ⚪ வெள்ளை தொட்டி\n• ஊசி இல்லாத சிரிஞ்ச், கையுறை, ஐவி பாட்டில்? ➔ 🔴 சிவப்பு தொட்டி\n• மருந்து குப்பி, ஆம்பூல், கண்ணாடி? ➔ 🔵 நீல தொட்டி\n• உணவு, காகிதம்? ➔ 🟢 பச்சை தொட்டி`
    };
  } else if (lang === 'hi') {
    return {
      type: 'conversation',
      text: `मैंने "${clean}" का विश्लेषण किया। कृपया अपशिष्ट का प्रकार स्पष्ट करें:\n• रक्त से सनी रुई या कपड़ा? ➔ 🟡 पीला डिब्बा (Yellow Bin)\n• नुकीली सुई या ब्लेड? ➔ ⚪ सफेद डिब्बा (White Bin)\n• बिना सुई की सिरिंज या दस्ताने? ➔ 🔴 लाल डिब्बा (Red Bin)\n• दवा की शीशी या कांच? ➔ 🔵 नीला डिब्बा (Blue Bin)\n• भोजन या कागज? ➔ 🟢 हरा डिब्बा (Green Bin)`
    };
  } else if (lang === 'te') {
    return {
      type: 'conversation',
      text: `నేను "${clean}" ను విశ్లేషించాను. దయచేసి వ్యర్థం రకాన్ని స్పష్టంగా వివరించండి:\n• రక్తం అంటిన దూది లేదా బట్ట? ➔ 🟡 పసుపు తొట్టి (Yellow Bin)\n• పదునైన సూది లేదా బ్లేడు? ➔ ⚪ తెలుపు తొట్టి (White Bin)\n• సూది లేని సిరంజి లేదా చేతి తొడుగులు? ➔ 🔴 ఎరుపు తొట్టి (Red Bin)\n• మందు సీసా లేదా గాజు? ➔ 🔵 నీలం తొట్టి (Blue Bin)\n• ఆహారం లేదా కాగితం? ➔ 🟢 ఆకుపచ్చ తొట్టి (Green Bin)`
    };
  } else if (lang === 'ml') {
    return {
      type: 'conversation',
      text: `ഞാൻ "${clean}" വിശകലനം ചെയ്തു. ദയവായി മാലിന്യത്തിന്റെ സ്വഭാവം വ്യക്തമാക്കൂ:\n• രക്തം പുരണ്ട തുണി അല്ലെങ്കിൽ പഞ്ഞി? ➔ 🟡 മഞ്ഞ ബിൻ (Yellow Bin)\n• മൂർച്ചയുള്ള സൂചി അല്ലെങ്കിൽ ബ്ലേഡ്? ➔ ⚪ വെള്ള ബിൻ (White Bin)\n• സൂചിയില്ലാത്ത സിറിഞ്ച് അല്ലെങ്കിൽ കയ്യുറ? ➔ 🔴 ചുവപ്പ് ബിൻ (Red Bin)\n• മരുന്ന് കുപ്പി അല്ലെങ്കിൽ ഗ്ലാസ്? ➔ 🔵 നീല ബിൻ (Blue Bin)\n• ഭക്ഷണം അല്ലെങ്കിൽ പേപ്പർ? ➔ 🟢 പച്ച ബിൻ (Green Bin)`
    };
  } else if (lang === 'kn') {
    return {
      type: 'conversation',
      text: `ನಾನು "${clean}" ಅನ್ನು ವಿಶ್ಲೇಷಿಸಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ತ್ಯಾಜ್ಯದ ಸ್ವರೂಪವನ್ನು ಸ್ಪಷ್ಟಪಡಿಸಿ:\n• ರಕ್ತ ಅಂಟಿದ ಬಟ್ಟೆ ಅಥವಾ ಹತ್ತಿ? ➔ 🟡 ಹಳದಿ ತೊಟ್ಟಿ (Yellow Bin)\n• ಹರಿತವಾದ ಸೂಜಿ ಅಥವಾ ಬ್ಲೇಡ್? ➔ ⚪ ಬಿಳಿ ತೊಟ್ಟಿ (White Bin)\n• ಸೂಜಿ ಇಲ್ಲದ ಸಿರಿಂಜ್ ಅಥವಾ ಕೈಗವಸು? ➔ 🔴 ಕೆಂಪು ತೊಟ್ಟಿ (Red Bin)\n• ಔಷಧಿ ಬಾಟಲಿ ಅಥವಾ ಗಾಜು? ➔ 🔵 ನೀಲಿ ತೊಟ್ಟಿ (Blue Bin)\n• ಆಹಾರ ಅಥವಾ ಕಾಗದ? ➔ 🟢 ಹಸಿರು ತೊಟ್ಟಿ (Green Bin)`
    };
  }

  return {
    type: 'conversation',
    text: `I analyzed your query "${clean}". Please specify the material:\n• Soiled with blood, body fluid, or tissue? ➔ 🟡 Yellow Bin\n• Sharp metal needle or blade? ➔ ⚪ White Bin\n• Recyclable plastic tubing or gloves? ➔ 🔴 Red Bin\n• Medicine vial, ampoule, or broken glass? ➔ 🔵 Blue Bin\n• Municipal food or paper packaging? ➔ 🟢 Green Bin`
  };
}

function hasSpecificWasteKeywords(lower, clean) {
  const allKeywords = [
    'blood', 'needle', 'syringe', 'cotton', 'gauze', 'cloth', 'vial', 'glove',
    'ரத்தம்', 'இரத்தம்', 'ஊசி', 'துணி', 'பஞ்சு', 'கையுறை', 'பாட்டில்', 'கண்ணாடி',
    'खून', 'सुई', 'सिरिंज', 'दवा', 'दस्ताने', 'पट्टी', 'कांच',
    'రక్తం', 'సూది', 'సిరంజి', 'మందులు', 'చేతి తొడుగులు', 'గాజు',
    'രക്തം', 'സൂചി', 'സിറിഞ്ച്', 'മരുന്ന്', 'കയ്യുറ', 'കുപ്പി',
    'ರಕ್ತ', 'ಸೂಜಿ', 'ಸಿರಿಂಜ್', 'ಔಷಧಿ', 'ಕೈಗವಸು', 'ಗಾಜು'
  ];
  return allKeywords.some(kw => lower.includes(kw) || clean.includes(kw));
}

export function identifyWasteItem(lowerQuery, hasImage = false) {
  if (/(injection|syringe|oosi|ஊசி|सुई|సూది|സൂചി|ಸೂಜಿ)/i.test(lowerQuery) &&
      !/(without|no needle|இல்லாத|बिना|లేని|ഇല്ലാത്ത|ಇಲ್ಲದ)/i.test(lowerQuery)) {
    const sharps = WASTE_KNOWLEDGE_BASE.find(c => c.id === 'sharps');
    return { ...sharps, type: 'Sharps', confidence: '98.5' };
  }

  if (/(blood|cotton|gauze|ரத்தம்|இரத்தம்|खून|रक्त|రక్తం|രക്തം|ರಕ್ತ|துணி|कपड़ा|బట్ట|തുണി|ಬಟ್ಟೆ)/i.test(lowerQuery)) {
    const infectious = WASTE_KNOWLEDGE_BASE.find(c => c.id === 'infectious');
    return { ...infectious, type: 'Infectious Waste', confidence: '98.0' };
  }

  // Never invent a classification from a photo alone — the vision model (backend) is the only
  // component that can see the image. Without a text description we return null so the UI can
  // ask the user to describe the item instead of guessing.
  void hasImage;
  return null;
}

function buildConversationalIntro(userInput, result, lang) {
  if (lang === 'ta') return `நான் "${userInput}" ஐ ஆய்வு செய்து, இதை "${result.displayName || result.type}" என்று வகைப்படுத்தியுள்ளேன். பரிந்துரைக்கப்பட்ட தொட்டி: ${result.binFullName}.`;
  if (lang === 'hi') return `मैंने "${userInput}" की पहचान "${result.displayName || result.type}" के रूप में की है। सही डिब्बा: ${result.binFullName}.`;
  if (lang === 'te') return `నేను "${userInput}" ను "${result.displayName || result.type}" గా గుర్తించాను. కేటాయించిన తొట్టి: ${result.binFullName}.`;
  if (lang === 'ml') return `ഞാൻ "${userInput}" എന്നത് "${result.displayName || result.type}" എന്ന് കണ്ടെത്തി. ശരിയായ ബിൻ: ${result.binFullName}.`;
  if (lang === 'kn') return `ನಾನು "${userInput}" ಅನ್ನು "${result.displayName || result.type}" ಎಂದು ಗುರುತಿಸಿದ್ದೇನೆ. ಸರಿಯಾದ ತೊಟ್ಟಿ: ${result.binFullName}.`;
  return `I identified "${userInput}" as ${result.displayName || result.type}. Assigned Bin: ${result.binFullName}.`;
}

export function speakAloud(text, langCode = 'en-IN') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#•]/g, '').slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = langCode || 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith((langCode || 'en').slice(0, 2)));
    if (matchingVoice) utterance.voice = matchingVoice;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis error:', err);
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
