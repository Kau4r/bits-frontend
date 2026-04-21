import type { InventoryStatus, Item } from '@/types/inventory'
import InventoryStatCards from './InventoryStatCards'
import InventorySidePanel from './InventorySidePanel'

interface InventoryDashboardProps {
  inventory: Item[]
  onFilterByStatus: (status: InventoryStatus | null) => void
  activeStatusFilter: string
}

const InventoryDashboard = ({
  inventory,
  onFilterByStatus,
  activeStatusFilter,
}: InventoryDashboardProps) => {
  return (
    <div className="mb-6 flex flex-col gap-6">
      <InventoryStatCards
        inventory={inventory}
        activeStatusFilter={activeStatusFilter}
        onFilterByStatus={onFilterByStatus}
      />
      <InventorySidePanel inventory={inventory} />
    </div>
  )
}

export default InventoryDashboard
