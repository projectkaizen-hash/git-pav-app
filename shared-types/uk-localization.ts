/**
 * UK Localization Utilities
 * 
 * Provides UK-specific formatting and validation for:
 * - Date and time with BST handling
 * - Currency (GBP)
 * - Postcode validation
 * - Phone number validation
 */

/**
 * Format date in UK format (DD/MM/YYYY)
 */
export function formatDateUK(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date and time in UK format with BST handling
 * Returns: "DD/MM/YYYY HH:mm (BST or GMT)"
 */
export function formatDateTimeUK(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  // Check if BST (British Summer Time) - last Sunday in March to last Sunday in October
  const isBST = isBritishSummerTime(d);
  const timezone = isBST ? 'BST' : 'GMT';
  
  return `${day}/${month}/${year} ${hours}:${minutes} (${timezone})`;
}

/**
 * Check if a date falls within British Summer Time (BST)
 * BST: Last Sunday in March to last Sunday in October
 */
export function isBritishSummerTime(date: Date): boolean {
  const year = date.getFullYear();
  
  // Find last Sunday in March
  const marchLastSunday = getLastSundayInMonth(year, 2); // Month is 0-indexed (March = 2)
  marchLastSunday.setHours(1, 0, 0, 0); // BST starts at 1:00 GMT
  
  // Find last Sunday in October
  const octoberLastSunday = getLastSundayInMonth(year, 9); // October = 9
  octoberLastSunday.setHours(1, 0, 0, 0); // BST ends at 1:00 GMT
  
  return date >= marchLastSunday && date < octoberLastSunday;
}

/**
 * Get the last Sunday of a given month
 */
function getLastSundayInMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const dayOfWeek = lastDay.getDay();
  const lastSunday = new Date(lastDay);
  lastSunday.setDate(lastDay.getDate() - dayOfWeek);
  return lastSunday;
}

/**
 * Format currency in GBP (UK format)
 * Examples: £1,234.56, £1,000.00
 */
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate UK postcode
 * Format: AA9A 9AA, A9A 9AA, A9 9AA, A99 9AA, AA9 9AA, AA99 9AA
 */
export function isValidUKPostcode(postcode: string): boolean {
  // Remove spaces and convert to uppercase
  const cleaned = postcode.replace(/\s/g, '').toUpperCase();
  
  // UK postcode regex (simplified but covers most formats)
  const pattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;
  return pattern.test(cleaned);
}

/**
 * Format UK postcode with space (AA9A 9AA)
 */
export function formatUKPostcode(postcode: string): string {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase();
  if (cleaned.length < 5) return cleaned;
  
  // Insert space before last 3 characters
  const outward = cleaned.slice(0, -3);
  const inward = cleaned.slice(-3);
  return `${outward} ${inward}`;
}

/**
 * Validate UK phone number
 * Formats: +44 7XXX XXXXXX, 07XXX XXXXXX
 */
export function isValidUKPhone(phone: string): boolean {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // UK mobile: +44 followed by 10 digits starting with 7
  const withCountryCode = /^\+44\d{10}$/.test(cleaned);
  // UK mobile without country code: 11 digits starting with 07
  const withoutCountryCode = /^07\d{9}$/.test(cleaned);
  
  return withCountryCode || withoutCountryCode;
}

/**
 * Format UK phone number to standard format (+44 7XXX XXXXXX)
 */
export function formatUKPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If already has +44
  if (cleaned.startsWith('+44') && cleaned.length === 13) {
    const areaCode = cleaned.slice(3, 4);
    const firstPart = cleaned.slice(4, 7);
    const secondPart = cleaned.slice(7);
    return `+44 ${areaCode} ${firstPart} ${secondPart}`;
  }
  
  // If starts with 07 (UK mobile without country code)
  if (cleaned.startsWith('07') && cleaned.length === 11) {
    const areaCode = cleaned.slice(0, 2);
    const firstPart = cleaned.slice(2, 6);
    const secondPart = cleaned.slice(6);
    return `${areaCode} ${firstPart} ${secondPart}`;
  }
  
  return phone;
}

/**
 * Get UK date format for input fields (DD/MM/YYYY)
 */
export const UK_DATE_FORMAT = 'dd/MM/yyyy';

/**
 * Get UK currency code
 */
export const UK_CURRENCY = 'GBP';

/**
 * Get UK locale code
 */
export const UK_LOCALE = 'en-GB';
