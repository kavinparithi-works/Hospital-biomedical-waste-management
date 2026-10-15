// Bio-Medical Waste Management Rules 2016 — category to statutory bin colour
const CATEGORY_BIN_MAP = {
  'Infectious Waste': 'Yellow',
  'Chemical Waste': 'Yellow',
  'Sharps': 'White',
  'Contaminated Recyclable': 'Red',
  'Glassware & Metallic Implants': 'Blue',
  'General Waste': 'Green'
};

const CATEGORIES = Object.keys(CATEGORY_BIN_MAP);
const BINS = ['Yellow', 'Red', 'White', 'Blue', 'Green'];

function isCompliant(category, assignedBin) {
  const expected = CATEGORY_BIN_MAP[category];
  return !expected || expected === assignedBin;
}

// binVerified defaults to false until the worker verifies at disposal, so only treat
// an explicit mismatch note, or a completed record verified as false, as a mismatch.
function hasMismatch(record) {
  if (record.binMismatchNote) return true;
  return record.binVerified === false && ['Completed', 'Disposed'].includes(record.status);
}

module.exports = { CATEGORY_BIN_MAP, CATEGORIES, BINS, isCompliant, hasMismatch };
