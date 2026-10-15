/**
 * POST /api/ai/classify-image
 * Accepts a jpg/png/webp image (max 5 MB), sends it to Gemini 1.5 Flash
 * vision model, and returns structured biomedical waste classification
 * using Bio-Medical Waste Management Rules 2016 bin mapping.
 *
 * API key is read from process.env.GEMINI_API_KEY — never exposed to frontend.
 */
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Multer: memory storage, 5 MB limit, image MIME validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_MIME: Only JPEG, PNG, and WebP images are accepted.'));
    }
  }
});

// BMW Rules 2016 - Authoritative bin mapping for server-side validation
const BMW_BIN_RULES = {
  'Sharps': 'White',
  'Sharps & Cutters': 'White',
  'Infectious/Anatomical': 'Yellow',
  'Infectious Waste': 'Yellow',
  'Anatomical Waste': 'Yellow',
  'Soiled Waste': 'Yellow',
  'Chemical': 'Yellow',
  'Chemical Waste': 'Yellow',
  'Expired Medicines': 'Yellow',
  'Contaminated Plastics': 'Red',
  'Contaminated Recyclable': 'Red',
  'Contaminated Recyclable Plastics': 'Red',
  'Glassware/Metallic': 'Blue',
  'Glassware': 'Blue',
  'Metallic Implants': 'Blue',
  'Glassware & Implants': 'Blue',
  'Glassware & Metallic Implants': 'Blue',
  'General': 'Green',
  'General Waste': 'Green',
};

const VALID_BINS = ['White', 'Yellow', 'Red', 'Blue', 'Green'];

const SYSTEM_PROMPT = `You are an expert biomedical waste classification AI strictly adhering to India's Bio-Medical Waste Management Rules 2016 (BMW Rules 2016).

STRICT BIN COLOR CODING (BMW RULES 2016):
1. WHITE BIN (Translucent, puncture-proof, leak-proof, tamper-proof container):
   - Items: Sharps — needles, syringes WITH fixed needles, used injection with needle, scalpels, blades, lancets, suture needles, contaminated sharp metal objects.
   - Treatment: Autoclave or dry heat, then shredding or encapsulation.

2. RED BIN (Non-chlorinated plastic bag):
   - Items: Contaminated recyclable plastics — syringes WITHOUT needles (needle cut off), IV sets, catheters, urine bags, disposable gloves, plastic specimen bottles, plastic IV bottles.
   - Treatment: Autoclave or microwave, then shredding, then sent to registered recyclers.

3. YELLOW BIN (Non-chlorinated plastic bag):
   - Items: Human and animal anatomical waste (tissues, organs, placenta); soiled waste (blood or fluid-soaked cotton, dressings, bandages, plaster casts, contaminated bedding); expired or discarded medicines (expired tablets/drugs); chemical waste; discarded linen and mattresses; microbiology and lab waste.
   - Treatment: Incineration, plasma pyrolysis or deep burial.

4. BLUE BIN (Cardboard box with blue marking):
   - Items: Broken or discarded contaminated glass — medicine vials, ampoules, glass slides; metallic body implants, orthopedic pins/screws.
   - Treatment: Disinfection (1-2% sodium hypochlorite solution) or autoclaving, then recycling.

5. GREEN BIN (Municipal container):
   - Items: General non-hazardous waste — food packaging, fruit peels, uncontaminated paper/cardboard wrapper.

IMPORTANT MULTI-ITEM & MULTI-COLOR RULES:
- Analyze the image thoroughly. If the photo contains MULTIPLE items (for example: blood-soaked cotton AND plastic gloves, or used injection with needle AND glass vial), detect EACH item separately and assign its respective bin color.
- A single photo CAN contain items for TWO OR MORE DIFFERENT BINS (e.g. Yellow + Red, or White + Blue).
- Produce a distinct item object in the items array for every detected waste item.

Instructions:
1. For EACH distinct item in the photo, output an object in the items array.
2. Each item MUST have:
   - name: concise description (e.g. "Used injection with needle", "Blood-soaked cotton", "Syringe without needle", "IV set", "Empty medicine vial", "Used gloves", "Expired tablets")
   - category: one of ["Sharps", "Infectious Waste", "Chemical Waste", "Contaminated Recyclable", "Glassware & Metallic Implants", "General Waste"]
   - bin: one of ["White", "Yellow", "Red", "Blue", "Green"]
   - confidence: float between 0.0 and 1.0 from real visual analysis
   - disposal: treatment method (one sentence, e.g. "Autoclave or dry heat, then shredding.")
   - hazard_warning: safety risk (e.g. "Needle-stick puncture risk - HIV & Hepatitis B/C transmission.")
   - ppe: required PPE (e.g. "Heavy nitrile gloves, eye goggles")
3. If image is blurry, unclear, or shows no medical waste, set uncertain=true and state reason.
4. Return ONLY valid JSON, no markdown formatting.

Format:
{"uncertain":false,"reason":"","items":[{"name":"Used injection with needle","category":"Sharps","bin":"White","confidence":0.97,"disposal":"Autoclave or dry heat, then shredding. Deposit in puncture-proof white container.","hazard_warning":"High risk of needle-stick injury & bloodborne pathogen transmission.","ppe":"Heavy nitrile gloves, face shield"}]}`;

function validateAndCorrectItem(item) {
  const corrected = { ...item };
  const expectedBin = BMW_BIN_RULES[item.category];
  if (!VALID_BINS.includes(item.bin)) {
    corrected.bin = expectedBin || 'Green';
    corrected.binCorrected = true;
    corrected.binCorrectionReason = 'Bin "' + item.bin + '" not valid per BMW Rules 2016. Corrected to "' + corrected.bin + '" for category "' + item.category + '".';
  } else if (expectedBin && item.bin !== expectedBin) {
    corrected.bin = expectedBin;
    corrected.binCorrected = true;
    corrected.binCorrectionReason = 'Model suggested "' + item.bin + '" but BMW Rules 2016 maps "' + item.category + '" to "' + expectedBin + '". Auto-corrected.';
  }
  return corrected;
}

router.post('/classify-image', upload.single('image'), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({ error: 'MISSING_API_KEY', message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to the backend .env file and restart the server.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'NO_IMAGE', message: 'No image file provided. Please upload a JPEG, PNG, or WebP image.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    const imagePart = { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } };

    let rawText;
    try {
      const result = await model.generateContent([SYSTEM_PROMPT, imagePart]);
      rawText = result.response.text();
    } catch (geminiErr) {
      console.error('[Gemini API Error]', geminiErr.message);
      if (geminiErr.message && (geminiErr.message.includes('429') || geminiErr.message.toLowerCase().includes('quota'))) {
        return res.status(429).json({ error: 'RATE_LIMIT', message: 'AI service is temporarily busy (rate limit). Please wait a moment and try again.' });
      }
      if (geminiErr.message && (geminiErr.message.includes('400') || geminiErr.message.toLowerCase().includes('api_key'))) {
        return res.status(503).json({ error: 'INVALID_API_KEY', message: 'Gemini API key is invalid. Please check your .env GEMINI_API_KEY.' });
      }
      throw geminiErr;
    }

    let parsed;
    try {
      const clean = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('[Parse Error] Gemini raw:', rawText.slice(0, 300));
      return res.status(502).json({ error: 'PARSE_ERROR', message: 'AI returned an unexpected response. Please try again.' });
    }

    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
      parsed.uncertain = true;
      parsed.reason = parsed.reason || 'AI did not return identifiable waste items.';
    }

    parsed.items = parsed.items.map(validateAndCorrectItem);

    if (parsed.items.length > 0 && !parsed.uncertain) {
      const allLowConfidence = parsed.items.every(it => (it.confidence || 0) < 0.6);
      if (allLowConfidence) {
        parsed.uncertain = true;
        parsed.reason = parsed.reason || 'All detected items have confidence below 60%. Please confirm manually.';
      }
    }

    return res.json({ uncertain: !!parsed.uncertain, reason: parsed.reason || '', items: parsed.items });
  } catch (err) {
    console.error('[classify-image] Unexpected error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected server error occurred. Please try again.' });
  }
});

router.use((err, req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'Image must be 5 MB or smaller.' });
  }
  if (err.message && err.message.startsWith('INVALID_MIME')) {
    return res.status(400).json({ error: 'INVALID_MIME', message: 'Only JPEG, PNG, and WebP images are accepted.' });
  }
  return res.status(500).json({ error: 'UPLOAD_ERROR', message: err.message });
});

module.exports = router;
