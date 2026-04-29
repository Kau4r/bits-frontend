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

// Reporter-supplied equipment + PC info is folded into the description as a
// leading "[Equipment · PC <num>]" tag so it survives list-view truncation.
// This helper splits that tag back out for chip-style rendering.
export interface ParsedDescription {
  tag: string | null;
  body: string;
}

export const parseTicketDescriptionTag = (raw?: string | null): ParsedDescription => {
  if (!raw) return { tag: null, body: '' };
  const match = raw.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
  if (!match) return { tag: null, body: raw.trim() };
  return { tag: match[1].trim(), body: match[2].trim() };
};

// Public/auth submission flows fold equipment + PC into the description's tag
// prefix as "[Equipment · PC]". This helper splits a parsed tag back into the
// two semantic parts using the known equipment vocabulary; anything that
// isn't a known equipment label is treated as the PC identifier.
const KNOWN_EQUIPMENT = ['Monitor', 'Keyboard', 'Mouse', 'Mini PC', 'System Unit', 'Headset', 'Other'];

export const parseTicketTag = (tag?: string | null): { equipment: string | null; pcNumber: string | null } => {
  if (!tag) return { equipment: null, pcNumber: null };
  const parts = tag.split(/\s*·\s*/).map(s => s.trim()).filter(Boolean);
  let equipment: string | null = null;
  let pcNumber: string | null = null;
  for (const part of parts) {
    if (KNOWN_EQUIPMENT.some(e => e.toLowerCase() === part.toLowerCase())) {
      equipment = part;
    } else {
      pcNumber = part;
    }
  }
  return { equipment, pcNumber };
};

export const buildTicketDescription = (
  equipment: string | null,
  pcNumber: string | null,
  body: string,
): string => {
  const parts: string[] = [];
  if (equipment) parts.push(equipment);
  if (pcNumber) parts.push(pcNumber);
  const prefix = parts.length > 0 ? `[${parts.join(' · ')}] ` : '';
  return `${prefix}${body}`;
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
