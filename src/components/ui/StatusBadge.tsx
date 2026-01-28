import { statusColors, type StatusColor } from "../../styles/constants";

interface StatusBadgeProps {
  status: StatusColor | string;
  label?: string;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  className = "",
}: StatusBadgeProps) {
  const colorClass =
    statusColors[status as StatusColor] || statusColors.pending;
  const displayLabel =
    label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
