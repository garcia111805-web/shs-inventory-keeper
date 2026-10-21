import { ItemStatus } from '../types';

interface StatusBadgeProps {
  status: ItemStatus;
}

const config: Record<ItemStatus, { label: string }> = {
  'in-stock': { label: 'In Stock' },
  'low-stock': { label: 'Low Stock' },
  'out-of-stock': { label: 'Out of Stock' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold font-body whitespace-nowrap shadow-sm"
      style={{
        fontSize: '12px',
        background: `var(--status-${status}-bg)`,
        color: `var(--status-${status}-text)`,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: 6, height: 6,
          background: `var(--status-${status}-dot)`,
        }}
      />
      {config[status].label}
    </span>
  );
}
