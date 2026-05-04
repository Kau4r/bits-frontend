import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Words that should stay all-caps in display (acronyms, abbreviations).
const ITEM_TYPE_ACRONYMS = new Set([
  'HDMI', 'VGA', 'DVI', 'USB', 'CCTV', 'ACU', 'PC', 'CPU', 'GPU',
  'TV', 'AC', 'DC', 'LED', 'LCD', 'OLED', 'AV', 'IT', 'ID',
  'SSD', 'HDD', 'RAM', 'IP', 'IO', 'UPS', 'PSU', 'NIC',
]);

/**
 * Converts an ENUM_VALUE string like "SYSTEM_UNIT" to title case "System Unit",
 * preserving known acronyms ("CCTV_SWITCH" -> "CCTV Switch", "HDMI" -> "HDMI").
 * Handles empty, null, and already-normalized values.
 */
export const formatItemType = (raw?: string | null): string => {
  if (!raw) return '';
  const resolved = resolveItemType(raw);
  return resolved
    .toString()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => {
      const upper = word.toUpperCase();
      if (ITEM_TYPE_ACRONYMS.has(upper)) return upper;
      return upper.charAt(0) + upper.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Resolve legacy item-type sentinels ("-", "GENERAL", empty) to "OTHER"
 * so the UI presents a single canonical bucket.
 */
export const resolveItemType = (raw?: string | null): string => {
  if (!raw) return 'OTHER';
  const trimmed = raw.toString().trim();
  if (!trimmed || trimmed === '-' || trimmed.toUpperCase() === 'GENERAL') return 'OTHER';
  const normalized = trimmed.toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'SYSTEM_UNIT') return 'MINI_PC';
  return normalized;
};

/**
 * Brand sentinel values that mean "no real brand" — the data-entry person used
 * the cell to scribble a note instead of an actual brand. Treated as blank.
 */
const BRAND_SENTINELS = new Set([
  '-', '--', '---', 'N/A', 'NA', 'NO S/N', 'NO SN', 'NO/SN',
  'NONE', 'NO BRAND', 'OLD', 'UNKNOWN', 'GENERAL', 'TBD',
]);

export const isBrandPlaceholder = (raw?: string | null): boolean => {
  if (!raw) return true;
  return BRAND_SENTINELS.has(String(raw).trim().toUpperCase());
};

/**
 * Display helper for the Brand field. Returns "None" when the brand is blank
 * or one of the known sentinel values (N/A, None, No Brand, -, TBD, ...).
 */
export const formatBrand = (raw?: string | null, fallback = 'None'): string => {
  if (isBrandPlaceholder(raw)) return fallback;
  return String(raw).trim();
};

/**
 * True if the serial code is one we generated internally (no real S/N on the
 * item itself). UI can show a small "internal" badge for these.
 */
export const isSyntheticSerial = (serial?: string | null): boolean =>
  Boolean(serial && /^INT-[A-Z0-9_]+-\d+$/i.test(serial.trim()));
