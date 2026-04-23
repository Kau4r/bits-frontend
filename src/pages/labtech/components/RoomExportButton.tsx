import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Lock } from 'lucide-react';
import { getRoomAuditStatus } from '@/services/room';
import { getInventory } from '@/services/inventory';
import type { Room } from '@/types/room';
import type { Item } from '@/types/inventory';
import type { RoomAuditStatus } from '@/types/semester';
import { formatItemType, resolveItemType } from '@/lib/utils';

interface Props {
  room: Room;
  className?: string;
}

const safeFileName = (name: string) => name.replace(/[^a-z0-9_-]+/gi, '_');

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
};

export default function RoomExportButton({ room, className = '' }: Props) {
  const [status, setStatus] = useState<RoomAuditStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [exporting, setExporting] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!room?.Room_ID) return;
    setLoadingStatus(true);
    try {
      const data = await getRoomAuditStatus(room.Room_ID);
      setStatus(data);
    } catch (err) {
      console.error('Failed to load room audit status', err);
    } finally {
      setLoadingStatus(false);
    }
  }, [room?.Room_ID]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleExport = async () => {
    if (!status?.allChecked) return;
    setExporting(true);
    try {
      const all = await getInventory();
      const roomItems = all.filter(
        (x): x is Item => 'Item_Type' in x && x.Room_ID === room.Room_ID,
      );

      const rows = roomItems.map(item => ({
        'Asset Code': item.Item_Code || '',
        Brand: item.Brand || '',
        'Item Type': formatItemType(resolveItemType(item.Item_Type)),
        'Serial Number': item.Serial_Number || '',
        Status: item.Status,
        'Last Checked At': formatDateTime(item.Last_Checked_At),
        'Last Checked By': item.Last_Checked_By
          ? `${item.Last_Checked_By.First_Name} ${item.Last_Checked_By.Last_Name}`.trim()
          : '',
      }));

      const sheet = XLSX.utils.json_to_sheet(rows);
      // Rough column widths so the xlsx isn't a blob of tiny columns
      sheet['!cols'] = [
        { wch: 16 }, // Asset Code
        { wch: 18 }, // Brand
        { wch: 14 }, // Item Type
        { wch: 18 }, // Serial
        { wch: 12 }, // Status
        { wch: 22 }, // Last Checked At
        { wch: 22 }, // Last Checked By
      ];

      const book = XLSX.utils.book_new();
      const sheetName = safeFileName(room.Name || `Room_${room.Room_ID}`).slice(0, 28) || 'Room';
      XLSX.utils.book_append_sheet(book, sheet, sheetName);

      const semesterTag = status.semester ? `_${safeFileName(status.semester.name)}` : '';
      const fileName = `Room_${safeFileName(room.Name || String(room.Room_ID))}${semesterTag}.xlsx`;
      XLSX.writeFile(book, fileName);

      toast.success(`Exported ${roomItems.length} items from ${room.Name}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to export room';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  const total = status?.totalItems ?? 0;
  const checked = status?.checkedItems ?? 0;
  const allChecked = !!status?.allChecked && total > 0;
  const disabled = !allChecked || exporting || loadingStatus;

  const tooltip = !status
    ? 'Loading audit status...'
    : total === 0
      ? 'No items in this room yet'
      : allChecked
        ? 'Export all items as Excel'
        : `Audit incomplete (${checked}/${total}). Finish the mobile audit to enable export.`;

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
      title={tooltip}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition-colors
        ${allChecked
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-300'
          : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'}
        ${className}`}
    >
      {allChecked ? <FileSpreadsheet className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      <span>
        {exporting
          ? 'Exporting...'
          : allChecked
            ? `Export Room (${total})`
            : total === 0
              ? 'Export Room'
              : `Export Room (${checked}/${total})`}
      </span>
    </button>
  );
}
