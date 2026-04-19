const UNKNOWN_PATTERNS = [
  /^unknown$/i,
  /^unknown\s+room$/i,
  /^unknown\s+pc$/i,
  /^n\/?a$/i,
  /^none$/i,
  /^-+$/,
];

const NOT_DETECTED = 'Not detected';

const isUnknown = (value?: string | null): boolean => {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return UNKNOWN_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const labelOrNotDetected = (value?: string | null): string =>
  isUnknown(value) ? NOT_DETECTED : value!.trim();

export interface TicketLocationParts {
  equipment?: string | null;
  pcLabel?: string | null;
  roomName?: string | null;
}

export const buildTicketLocation = ({
  equipment,
  pcLabel,
  roomName,
}: TicketLocationParts): string => {
  const head = equipment?.trim() ?? '';
  const segments = [
    `PC: ${labelOrNotDetected(pcLabel)}`,
    `Room: ${labelOrNotDetected(roomName)}`,
  ];
  return `${head || 'Issue'} — ${segments.join(' | ')}`;
};

export const formatTicketLocationDisplay = (
  raw?: string | null,
  fallback = 'Location not specified'
): string => {
  if (!raw) return fallback;
  const dashSplit = raw.split(/\s[—-]\s/);
  const head = dashSplit[0]?.trim() ?? '';
  const tail = dashSplit.slice(1).join(' — ');

  if (!tail) return head || fallback;

  const normalizedSegments = tail
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const match = segment.match(/^(PC|Room):\s*(.+)$/i);
      if (!match) return segment;
      const label = match[1];
      return `${label}: ${labelOrNotDetected(match[2])}`;
    });

  if (normalizedSegments.length === 0) return head || fallback;
  return head ? `${head} — ${normalizedSegments.join(' | ')}` : normalizedSegments.join(' | ');
};
