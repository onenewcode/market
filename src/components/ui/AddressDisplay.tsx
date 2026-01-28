import { formatAddress } from "../../utils/format";

interface AddressDisplayProps {
  address: string;
  label?: string;
  className?: string;
  showFull?: boolean;
}

export function AddressDisplay({
  address,
  label,
  className = "",
  showFull = false,
}: AddressDisplayProps) {
  return (
    <div className={className}>
      {label && <span className="text-sm text-muted">{label}</span>}
      <p className="font-mono text-sm break-all">
        {showFull ? address : formatAddress(address)}
      </p>
    </div>
  );
}
