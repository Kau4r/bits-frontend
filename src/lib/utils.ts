import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts an ENUM_VALUE string like "SYSTEM_UNIT" to title case "System Unit".
 * Handles empty, null, and already-normalized values.
 */
export const formatItemType = (raw?: string | null): string => {
  if (!raw) return '';
  const resolved = resolveItemType(raw);
  if (resolved === 'MINI_PC') return 'Mini PC';
  return resolved
    .toString()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
