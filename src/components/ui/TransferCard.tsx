import { formatTimestamp, getTimeRemaining } from "../../utils/time";
import { formatAddress } from "../../utils/format";
import { theme } from "../../styles/theme";

interface TransferCardProps {
  transfer: {
    fromOwner: { toString: () => string };
    toOwner: { toString: () => string };
    createdAt: bigint;
    expiresAt: bigint;
    status: string;
    isInitiator: boolean;
    isRecipient: boolean;
  };
  onClaim?: () => void;
  onCancel?: () => void;
  claiming?: boolean;
  cancelling?: boolean;
}

export function TransferCard({
  transfer,
  onClaim,
  onCancel,
  claiming = false,
  cancelling = false,
}: TransferCardProps) {
  const {
    fromOwner,
    toOwner,
    createdAt,
    expiresAt,
    status,
    isInitiator,
    isRecipient,
  } = transfer;

  const isExpired = status === "expired";

  return (
    <div
      className={`${theme.layout.cardCompact} space-y-3 bg-background/50 ${isExpired ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isExpired ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Expired
          </span>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isInitiator
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {isInitiator ? "Initiated by You" : "Sent to You"}
          </span>
        )}
        <span className="text-xs text-muted">
          Created: {formatTimestamp(createdAt)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className={theme.typography.label}>From</span>
          <span className="font-mono">
            {formatAddress(fromOwner.toString())}
          </span>
        </div>
        <div className="flex justify-between">
          <span className={theme.typography.label}>To</span>
          <span className="font-mono">{formatAddress(toOwner.toString())}</span>
        </div>
        <div className="flex justify-between">
          <span className={theme.typography.label}>Expires</span>
          <span className="font-mono text-yellow-600">
            {isExpired ? "Expired" : getTimeRemaining(expiresAt)}
          </span>
        </div>
      </div>

      {!isExpired && (
        <div className="flex gap-2 pt-2 border-t border-border-low">
          {isRecipient && onClaim ? (
            <button
              onClick={onClaim}
              disabled={claiming}
              className={`${theme.button.base} ${theme.button.variants.primary} flex-1 text-sm`}
            >
              {claiming ? "Claiming..." : "Claim Transfer"}
            </button>
          ) : isInitiator && onCancel ? (
            <button
              onClick={onCancel}
              disabled={cancelling}
              className={`${theme.button.base} ${theme.button.variants.danger} flex-1 text-sm`}
            >
              {cancelling ? "Cancelling..." : "Cancel Transfer"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
