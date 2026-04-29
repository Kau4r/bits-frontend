export type BookingColorVariant = 'own' | 'others' | 'scheduledClass';

export interface BookingColorClasses {
  variant: BookingColorVariant;
  container: string;
  dotRing: string;
  label: string;
}

const VARIANT_CLASSES: Record<BookingColorVariant, Omit<BookingColorClasses, 'variant'>> = {
  own: {
    // Blue (not green) so "your booking" doesn't read as APPROVED — APPROVED
    // already owns the green dot, and emerald containers were misleading
    // people into thinking pending blocks were approved.
    container:
      'bg-blue-50 text-blue-900 ring-1 ring-blue-200 ' +
      'dark:bg-blue-950/40 dark:text-blue-100 dark:ring-blue-800/60',
    dotRing: 'ring-1 ring-blue-300/80 dark:ring-blue-200/40',
    label: 'My booking',
  },
  others: {
    container:
      'bg-zinc-50 text-zinc-800 ring-1 ring-zinc-200 ' +
      'dark:bg-zinc-800/40 dark:text-zinc-100 dark:ring-zinc-700',
    dotRing: 'ring-1 ring-zinc-300/80 dark:ring-zinc-200/40',
    label: "Other user's booking",
  },
  scheduledClass: {
    container:
      'bg-rose-50 text-rose-900 ring-1 ring-rose-200 ' +
      'dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-800/60',
    dotRing: 'ring-1 ring-rose-300/80 dark:ring-rose-200/40',
    label: 'Scheduled class',
  },
};

export interface BookingColorInput {
  isScheduleEvent?: boolean;
  createdById?: number | null;
  viewerUserId: number;
}

export function pickBookingColorVariant(input: BookingColorInput): BookingColorVariant {
  if (input.isScheduleEvent) return 'scheduledClass';
  if (input.createdById != null && input.createdById === input.viewerUserId) return 'own';
  return 'others';
}

export function bookingDisplayColor(input: BookingColorInput): BookingColorClasses {
  const variant = pickBookingColorVariant(input);
  return { variant, ...VARIANT_CLASSES[variant] };
}
