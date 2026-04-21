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
  return raw
    .toString()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
