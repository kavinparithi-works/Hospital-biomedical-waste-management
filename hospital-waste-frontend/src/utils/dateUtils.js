/**
 * Timezone and Date Utility for KMCH Hospital (Asia/Kolkata)
 */

export const HOSPITAL_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone
 */
export const getTodayISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOSPITAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date));
};

/**
 * Checks if a given timestamp falls on today's Asia/Kolkata calendar day
 */
export const isTodayInIST = (dateInput) => {
  if (!dateInput) return false;
  const inputDateStr = getTodayISTDateString(new Date(dateInput));
  const todayStr = getTodayISTDateString(new Date());
  return inputDateStr === todayStr;
};

/**
 * Format date in Asia/Kolkata (e.g. "11 Oct 2026")
 */
export const formatISTDate = (dateInput) => {
  if (!dateInput) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HOSPITAL_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateInput));
};

/**
 * Format time in Asia/Kolkata (e.g. "01:30 PM")
 */
export const formatISTTime = (dateInput) => {
  if (!dateInput) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: HOSPITAL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(dateInput));
};

/**
 * Format full date & time in Asia/Kolkata
 */
export const formatISTDateTime = (dateInput) => {
  if (!dateInput) return '—';
  return `${formatISTDate(dateInput)} ${formatISTTime(dateInput)}`;
};

/**
 * Calculate overdue status and elapsed duration
 * Default overdue threshold is 2 hours (120 minutes)
 */
export const calculateOverdueInfo = (referenceDate, thresholdMinutes = 120) => {
  if (!referenceDate) return { isOverdue: false, durationStr: '', elapsedMinutes: 0 };
  const refTime = new Date(referenceDate).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - refTime);
  const elapsedMinutes = Math.floor(diffMs / (1000 * 60));

  const isOverdue = elapsedMinutes >= thresholdMinutes;

  const days = Math.floor(elapsedMinutes / (60 * 24));
  const hours = Math.floor((elapsedMinutes % (60 * 24)) / 60);
  const mins = elapsedMinutes % 60;

  let durationStr = '';
  if (days > 0) {
    durationStr = `${days}d ${hours}h overdue`;
  } else if (hours > 0) {
    durationStr = `${hours}h ${mins}m overdue`;
  } else {
    durationStr = `${mins}m overdue`;
  }

  return { isOverdue, durationStr, elapsedMinutes };
};
