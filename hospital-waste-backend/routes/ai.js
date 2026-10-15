/**
 * POST /api/ai/classify-image
 * Accepts a jpg/png/webp image (max 5 MB), sends it to a Gemini vision model and returns a
 * structured biomedical waste classification using Bio-Medical Waste Management Rules 2016.
 *
 * GET /api/ai/status
 * Tells the frontend whether photo classification is configured (no key is ever exposed).
 */
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { CATEGORY_BIN_MAP, CATEGORIES, BINS } = require('../utils/compliance');

const router = express.Router();
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const hasApiKey = () => Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');

// Multer: memory storage, 5 MB limit, image MIME validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('INVALID_MIME: Only JPEG, PNG, and WebP images are accepted.'));
  }
});

// Map the many labels a model may produce onto the system's canonical categories
const CATEGORY_ALIASES = [
  [/sharp|needle|scalpel|blade|lancet|suture needle/i, 'Sharps'],
  [/glass|vial|ampoule|slide|implant|metallic/i, 'Glassware & Metallic Implants'],
  [/chemical|pharma|medicine|drug|expired|cytotoxic|disinfectant|reagent/i, 'Chemical Waste'],
  [/infectious|anatomical|soiled|pathological|biolog|microbiolog|blood|tissue|cotton|gauze|dressing|bandage|swab|linen/i, 'Infectious Waste'],
  [/plastic|recyclable|syringe|catheter|tubing|iv set|gloves?|urine bag|bottle/i, 'Contaminated Recyclable'],
  [/general|municipal|packaging|paper|food|kitchen/i, 'General Waste']
];

function normaliseCategory(raw) {
  if (CATEGORIES.includes(raw)) return raw;
  const hit = CATEGORY_ALIASES.find(([re]) => re.test(String(raw || '')));
  return hit ? hit[1] : null;
}

const SYSTEM_PROMPT = `You are an expert biomedical waste classification assistant for an Indian hospital, strictly following the Bio-Medical Waste Management Rules 2016 (BMW Rules 2016).

Look at the photo and identify every distinct waste item. For EACH item decide its category and statutory bin colour:

CATEGORY → BIN (use these exact category strings):
- "Infectious Waste" → "Yellow": blood-soaked or body-fluid-soaked COTTON, GAUZE, SWABS, DRESSINGS, BANDAGES, soiled linen/cloth, plaster casts, human/animal tissue, organs, placenta, lab cultures. Soft absorbent material stained with blood is ALWAYS Infectious Waste — it is NEVER Sharps.
- "Chemical Waste" → "Yellow": expired/discarded medicines, tablets, chemical liquids, disinfectants, cytotoxic drugs.
- "Sharps" → "White": ONLY rigid objects that can puncture skin — needles, syringes with the needle still attached, scalpels, blades, lancets, suture needles, broken metal sharps.
- "Contaminated Recyclable" → "Red": plastics — syringes WITHOUT needle, IV sets/bottles, catheters, urine bags, gloves, plastic specimen containers, tubing.
- "Glassware & Metallic Implants" → "Blue": glass vials, ampoules, glass slides, broken glass bottles, metallic body implants, orthopaedic screws/pins.
- "General Waste" → "Green": non-hazardous paper, food packaging, fruit peels, uncontaminated wrappers.

Decision rules:
1. Judge by the MATERIAL and whether it can puncture skin. Red/brown staining on soft material means blood → Infectious Waste.
2. Cotton, gauze, cloth, swabs are soft and absorbent → Infectious Waste if stained, otherwise General Waste.
3. If a syringe is visible, look for the needle: needle attached → Sharps (White); no needle → Contaminated Recyclable (Red).
4. If several different items are present, return one object per item.
5. If the image is blurry, not medical waste, or you are not reasonably sure, set "uncertain": true and explain in "reason". Do not guess.

Respond ONLY with JSON in this exact shape (no markdown):
{"uncertain":false,"reason":"","items":[{"name":"Blood-soaked cotton swabs","category":"Infectious Waste","bin":"Yellow","confidence":0.96,"disposal":"Incineration or plasma pyrolysis in a yellow non-chlorinated bag.","hazard_warning":"Bloodborne pathogen exposure risk (HIV, Hepatitis B/C).","ppe":"Nitrile gloves, apron, face shield"}]}`;

function validateAndCorrectItem(item) {
  const corrected = { ...item };
  const category = normaliseCategory(item.category) || normaliseCategory(item.name) || 'General Waste';
  if (category !== item.category) {
    corrected.category = category;
    corrected.categoryCorrected = true;
  }
  const expectedBin = CATEGORY_BIN_MAP[category];
  if (!BINS.includes(item.bin) || item.bin !== expectedBin) {
    corrected.binCorrected = corrected.binCorrected || item.bin !== expectedBin;
    corrected.binCorrectionReason = BINS.includes(item.bin)
      ? `Model suggested "${item.bin}" but BMW Rules 2016 map "${category}" to "${expectedBin}". Auto-corrected.`
      : `Bin "${item.bin}" is not valid. Corrected to "${expectedBin}" for "${category}".`;
    corrected.bin = expectedBin;
  }
  corrected.confidence = Math.max(0, Math.min(1, Number(item.confidence) || 0));
  return corrected;
}

router.get('/status', (req, res) => {
  res.json({ configured: hasApiKey(), model: MODEL() });
});

router.post('/classify-image', upload.single('image'), async (req, res) => {
  try {
    if (!hasApiKey()) {
      return res.status(503).json({ error: 'MISSING_API_KEY', message: 'Photo classification is not configured. Add GEMINI_API_KEY to the backend .env file and restart the server.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'NO_IMAGE', message: 'No image file provided. Please upload a JPEG, PNG, or WebP image.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL(),
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    });
    const imagePart = { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } };
    const userHint = (req.body && req.body.hint ? String(req.body.hint).slice(0, 200) : '').trim();
    const parts = [SYSTEM_PROMPT, imagePart];
    if (userHint) parts.push(`The user also wrote: "${userHint}". Use it only as a hint; the photo is the primary evidence.`);

    let rawText;
    try {
      const result = await model.generateContent(parts);
      rawText = result.response.text();
    } catch (geminiErr) {
      const msg = String(geminiErr.message || '');
      console.error('[Gemini API Error]', msg);
      if (/429|quota|rate/i.test(msg)) {
        return res.status(429).json({ error: 'RATE_LIMIT', message: 'AI service is temporarily busy (rate limit). Please wait a moment and try again.' });
      }
      if (/API key|api_key|401|403|PERMISSION_DENIED/i.test(msg)) {
        return res.status(503).json({ error: 'INVALID_API_KEY', message: 'Gemini API key is invalid or lacks access. Check GEMINI_API_KEY in the backend .env.' });
      }
      if (/404|not found|is not supported/i.test(msg)) {
        return res.status(503).json({ error: 'INVALID_MODEL', message: `Gemini model "${MODEL()}" is unavailable. Set GEMINI_MODEL in .env to a current model (e.g. gemini-2.5-flash).` });
      }
      return res.status(502).json({ error: 'AI_ERROR', message: 'The AI service could not process this image right now. Please try again.' });
    }

    let parsed;
    try {
      const clean = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error('[Parse Error] Gemini raw:', String(rawText).slice(0, 300));
      return res.status(502).json({ error: 'PARSE_ERROR', message: 'AI returned an unexpected response. Please try again.' });
    }

    const items = Array.isArray(parsed.items) ? parsed.items.filter(it => it && (it.name || it.category)).map(validateAndCorrectItem) : [];
    let uncertain = Boolean(parsed.uncertain) || items.length === 0;
    let reason = parsed.reason || '';
    if (!uncertain && items.every(it => it.confidence < 0.6)) {
      uncertain = true;
      reason = reason || 'All detected items have confidence below 60%. Please confirm manually.';
    }
    if (items.length === 0 && !reason) reason = 'No identifiable biomedical waste item was found in the photo.';

    return res.json({ uncertain, reason, items, model: MODEL() });
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
