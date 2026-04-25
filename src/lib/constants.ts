import type { BadgeProps } from "@/ui/Badge"

// ============================================
// Status → Badge Variant Mappings
// ============================================

/** Inventory item statuses */
export const ITEM_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  AVAILABLE: "success",
  BORROWED: "warning",
  DEFECTIVE: "orange",
  LOST: "danger",
  REPLACED: "info",
  DISPOSED: "default",
} as const

/** Ticket statuses */
export const TICKET_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "default",
  REJECTED: "danger",
} as const

/** Booking statuses */
export const BOOKING_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
} as const

/** Borrowing statuses */
export const BORROW_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "warning",
  APPROVED: "success",
  RETURNED: "info",
  REJECTED: "danger",
  OVERDUE: "orange",
  CANCELLED: "default",
} as const

/** Form statuses */
export const FORM_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  REVIEWED: "info",
} as const

/** Computer statuses */
export const COMPUTER_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  AVAILABLE: "success",
  IN_USE: "info",
  MAINTENANCE: "orange",
  DECOMMISSIONED: "default",
} as const

/** Room statuses */
export const ROOM_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  AVAILABLE: "success",
  IN_USE: "info",
  RESERVED: "warning",
  MAINTENANCE: "orange",
  CLOSED: "default",
} as const

/** Report statuses */
export const REPORT_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  REVIEWED: "info",
} as const

// ============================================
// Variant → dot indicator background
// ============================================

/** Solid dot colors that pair with each Badge variant */
export const VARIANT_DOT_CLASS: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-gray-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  orange: "bg-orange-500",
  indigo: "bg-indigo-500",
} as const

// ============================================
// Status label helpers
// ============================================

/** Capitalize first letter, lowercase rest */
export function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ")
}

// ============================================
// Responsive breakpoints (desktop-first)
// ============================================
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const
