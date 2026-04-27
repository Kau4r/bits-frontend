import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { getInventory } from '@/services/inventory';
import { getRooms } from '@/services/room';
import { getComputers, type Computer } from '@/services/computers';
import type { Item } from '@/types/inventory';
import type { Room } from '@/types/room';
import { formatItemType, resolveItemType, formatBrand } from '@/lib/utils';

/**
 * Print sheet of QR codes for a single room. Designed for short bondpaper
 * (8.5 × 11 in) at small print: 4 cards across, repeating down the page.
 *
 * Routes:
 *   /labtech/room/:roomId/print-qr               (default — items only)
 *   /labtech/room/:roomId/print-qr?kind=pcs      (PCs only)
 *   /labtech/room/:roomId/print-qr?kind=all      (items + PCs, two sections)
 *
 * Each card encodes its identifier (Item_Code or PC name) and shows the
 * label fields familiar from the inventory list.
 */
type PrintCard = {
  key: string;
  qrValue: string;
  primary: string;
  secondary: string;
  tertiary: string;
};

export default function RoomQRPrintPage() {
  const { roomId: roomIdParam } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const kind = (searchParams.get('kind') ?? 'items') as 'items' | 'pcs' | 'all';
  const roomId = roomIdParam ? parseInt(roomIdParam, 10) : NaN;

  const [room, setRoom] = useState<Room | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(roomId)) {
      setError('Invalid room ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const wantItems = kind === 'items' || kind === 'all';
        const wantPcs = kind === 'pcs' || kind === 'all';

        const [allInventory, allRooms, computerList] = await Promise.all([
          wantItems ? getInventory() : Promise.resolve([] as Item[]),
          getRooms(),
          wantPcs ? getComputers(roomId) : Promise.resolve([] as Computer[]),
        ]);
        if (cancelled) return;

        const matchedRoom = allRooms.find(r => r.Room_ID === roomId) || null;
        const roomItems = wantItems
          ? (allInventory as Item[]).filter((x): x is Item => 'Item_Type' in x && x.Room_ID === roomId)
          : [];

        setRoom(matchedRoom);
        setItems(roomItems);
        setComputers(computerList);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load room data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, kind]);

  const itemCards: PrintCard[] = useMemo(() => items.map(item => ({
    key: `item-${item.Item_ID}`,
    qrValue: item.Item_Code || `item-${item.Item_ID}`,
    primary: item.Item_Code || `#${item.Item_ID}`,
    secondary: formatItemType(resolveItemType(item.Item_Type)),
    tertiary: formatBrand(item.Brand),
  })), [items]);

  const pcCards: PrintCard[] = useMemo(() => computers.map(pc => ({
    key: `pc-${pc.Computer_ID}`,
    qrValue: pc.Name || `pc-${pc.Computer_ID}`,
    primary: pc.Display_Name || pc.Name || `PC #${pc.Computer_ID}`,
    secondary: 'Computer',
    tertiary: pc.Status,
  })), [computers]);

  const totalCards = itemCards.length + pcCards.length;

  // Auto-open print dialog once content is ready.
  useEffect(() => {
    if (!loading && !error && totalCards > 0) {
      const id = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(id);
    }
  }, [loading, error, totalCards]);

  const heading = useMemo(() => {
    const base = room?.Name || (roomIdParam ? `Room ${roomIdParam}` : 'Room');
    if (kind === 'pcs') return `${base} — PCs`;
    if (kind === 'all') return `${base} — Items + PCs`;
    return base;
  }, [room, roomIdParam, kind]);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading…</div>;
  }
  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  const renderGrid = (cards: PrintCard[]) => (
    <div className="grid grid-cols-4 gap-3 print:gap-2">
      {cards.map(card => (
        <div
          key={card.key}
          className="qr-print-card flex flex-col items-center rounded border border-gray-300 p-2 text-center print:border-gray-400"
        >
          <QRCode
            value={card.qrValue}
            size={96}
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          />
          <div className="mt-1 w-full overflow-hidden">
            <div className="truncate text-[10px] font-bold leading-tight">{card.primary}</div>
            <div className="truncate text-[9px] text-gray-700 leading-tight">{card.secondary}</div>
            <div className="truncate text-[9px] text-gray-500 leading-tight">{card.tertiary}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="qr-print-root min-h-screen bg-white p-6 print:p-0">
      <style>{`
        @page {
          size: 8.5in 11in;
          margin: 0.4in;
        }
        @media print {
          html, body { background: white !important; }
          .qr-print-noprint { display: none !important; }
          .qr-print-root { padding: 0 !important; }
          .qr-print-card { break-inside: avoid; page-break-inside: avoid; }
          .qr-print-section { break-before: page; page-break-before: page; }
          .qr-print-section:first-of-type { break-before: auto; page-break-before: auto; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="qr-print-noprint mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{heading} — QR Sheet</h1>
          <p className="text-sm text-gray-500">{totalCards} card{totalCards === 1 ? '' : 's'}. Use Ctrl/⌘ + P or the button →</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Print
        </button>
      </div>

      {totalCards === 0 ? (
        <div className="text-center text-gray-500 py-10">No {kind === 'pcs' ? 'computers' : kind === 'all' ? 'items or computers' : 'items'} found in this room.</div>
      ) : (
        <div className="space-y-6">
          {itemCards.length > 0 && (
            <section className="qr-print-section">
              {kind === 'all' && <h2 className="qr-print-noprint mb-2 text-sm font-semibold text-gray-700">Items ({itemCards.length})</h2>}
              {renderGrid(itemCards)}
            </section>
          )}
          {pcCards.length > 0 && (
            <section className="qr-print-section">
              {kind === 'all' && <h2 className="qr-print-noprint mb-2 text-sm font-semibold text-gray-700">Computers ({pcCards.length})</h2>}
              {renderGrid(pcCards)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
