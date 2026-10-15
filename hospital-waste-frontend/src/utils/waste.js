// Mirrors hospital-waste-backend/utils/compliance.js — BMW Rules 2016 category → statutory bin colour
export const CATEGORY_BIN_MAP = {
  'Infectious Waste': 'Yellow',
  'Chemical Waste': 'Yellow',
  'Sharps': 'White',
  'Contaminated Recyclable': 'Red',
  'Glassware & Metallic Implants': 'Blue',
  'General Waste': 'Green'
};

export const CATEGORIES = Object.keys(CATEGORY_BIN_MAP);
export const BINS = ['Yellow', 'Red', 'White', 'Blue', 'Green'];
export const BIN_COLORS = { Yellow: '#F59E0B', Red: '#EF4444', White: '#94A3B8', Blue: '#3B82F6', Green: '#22C55E' };

export const ACTIVE_STATUSES = ['Pending', 'Assigned'];
export const DONE_STATUSES = ['Completed', 'Disposed'];

export const isActive = (r) => ACTIVE_STATUSES.includes(r.status);
export const isDone = (r) => DONE_STATUSES.includes(r.status);
export const isCancelled = (r) => r.status === 'Cancelled';

export const isCompliant = (category, assignedBin) => {
  const expected = CATEGORY_BIN_MAP[category];
  return !expected || expected === assignedBin;
};

// binVerified defaults to false until disposal, so only an explicit note or a completed
// record verified as false counts as a reported mismatch
export const hasMismatch = (r) => Boolean(r.binMismatchNote) || (r.binVerified === false && isDone(r));

export const statusBadgeClass = (status) => {
  if (DONE_STATUSES.includes(status)) return 'badge-success';
  if (status === 'Collected') return 'badge-info';
  if (status === 'Cancelled') return 'badge-neutral';
  return 'badge-warning';
};

export const binClass = (bin) => `bin-tag bin-${(bin || '').toLowerCase()}`;

// Export rows to a CSV download (handles commas/quotes/newlines safely)
export const downloadCsv = (filename, headers, rows) => {
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatMinutes = (mins) => {
  if (mins === null || mins === undefined) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};
