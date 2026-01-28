import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { useIdentity } from "./hooks/useIdentity";
import { useTransfer } from "./hooks/useTransfer";
import { useAlert } from "./hooks/useAlert";
import { theme } from "./styles/theme";
import { Modal } from "./components/ui/Modal";
import { address } from "@solana/kit";

export function TransferPage() {
  const { wallet } = useWalletConnection();
  const { identity } = useIdentity();
  const {
    initiating,
    claiming,
    cancelling,
    loading,
    transferRequests,
    showCancelModal,
    selectedTransfer,
    initiateTransfer,
    claimTransfer,
    cancelTransfer,
    refresh,
    handleCancelModal,
    setShowCancelModal,
  } = useTransfer();
  const { showAlert } = useAlert();

  const [recipientAddress, setRecipientAddress] = useState("");

  if (!wallet) {
    return (
      <div className={theme.layout.pageContainer}>
        <div className={theme.layout.card}>
          <p>Please connect your wallet to access transfer functions.</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className={theme.layout.pageContainer}>
        <div className={theme.layout.card}>
          <p>No identity found. Please create an identity first.</p>
        </div>
      </div>
    );
  }

  const handleInitiateTransfer = async () => {
    if (!recipientAddress) {
      showAlert(
        "Invalid Input",
        "Please enter a recipient address.",
        { variant: "error" }
      );
      return;
    }

    try {
      const recipientAddr = address(recipientAddress);
      await initiateTransfer(recipientAddr);
      showAlert(
        "Transfer Initiated",
        "Your identity transfer request has been created successfully.",
        { variant: "success" }
      );
      setRecipientAddress("");
    } catch (error) {
      console.error("Failed to initiate transfer:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showAlert(
        "Transfer Failed",
        `Failed to initiate transfer: ${errorMsg}`,
        { variant: "error" }
      );
    }
  };

  const handleClaimTransfer = async (transfer: typeof transferRequests[0]) => {
    try {
      await claimTransfer(transfer);
      showAlert(
        "Transfer Claimed",
        "You have successfully claimed the identity transfer. Your identity and credit score have been transferred.",
        { variant: "success" }
      );
    } catch (error) {
      console.error("Failed to claim transfer:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showAlert(
        "Claim Failed",
        `Failed to claim transfer: ${errorMsg}`,
        { variant: "error" }
      );
    }
  };

  const handleCancelTransfer = async () => {
    if (!selectedTransfer) return;

    try {
      await cancelTransfer(selectedTransfer);
      showAlert(
        "Transfer Cancelled",
        "Your identity transfer request has been cancelled successfully.",
        { variant: "success" }
      );
      setShowCancelModal(false);
    } catch (error) {
      console.error("Failed to cancel transfer:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showAlert(
        "Cancellation Failed",
        `Failed to cancel transfer: ${errorMsg}`,
        { variant: "error" }
      );
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const getTimeRemaining = (expiresAt: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Number(expiresAt) - now;
    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""} remaining`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const pendingTransfers = transferRequests.filter((t) => t.status === "pending");
  const expiredTransfers = transferRequests.filter((t) => t.status === "expired");

  return (
    <div className={theme.layout.pageContainer}>
      <h2 className={theme.typography.h2}>Identity Transfer</h2>

      <div className={`${theme.layout.card} space-y-4`}>
        <h3 className={theme.typography.h3}>Initiate Transfer</h3>
        <p className="text-sm text-content-secondary">
          Transfer your identity to another wallet address. The recipient must
          claim the transfer before it expires.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter recipient wallet address"
            className={`${theme.input.base} flex-1 focus:border-primary`}
          />
          <button
            onClick={handleInitiateTransfer}
            disabled={initiating || !recipientAddress}
            className={`${theme.button.variants.primary} text-sm`}
          >
            {initiating ? "Initiating..." : "Initiate Transfer"}
          </button>
        </div>
      </div>

      <div className={`${theme.layout.card} space-y-4`}>
        <div className={`${theme.layout.flexBetween}`}>
          <h3 className={theme.typography.h3}>Pending Transfers</h3>
          <button
            onClick={refresh}
            disabled={loading}
            className={`${theme.button.variants.secondary} text-sm`}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {pendingTransfers.length === 0 ? (
          <div className="text-center py-8 text-muted">
            No pending transfers found.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTransfers.map((transfer, index) => (
              <div
                key={index}
                className={`${theme.layout.cardCompact} space-y-3 bg-background/50`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {transfer.isInitiator ? "Initiated by You" : "Sent to You"}
                      </span>
                      <span className="text-xs text-muted">
                        Created: {formatTime(transfer.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={theme.typography.label}>From</span>
                        <span className="font-mono">
                          {formatAddress(transfer.fromOwner.toString())}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme.typography.label}>To</span>
                        <span className="font-mono">
                          {formatAddress(transfer.toOwner.toString())}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={theme.typography.label}>Expires</span>
                        <span className="font-mono text-yellow-600">
                          {getTimeRemaining(transfer.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border-low">
                  {transfer.isRecipient ? (
                    <button
                      onClick={() => handleClaimTransfer(transfer)}
                      disabled={claiming}
                      className={`${theme.button.base} ${theme.button.variants.primary} flex-1 text-sm`}
                    >
                      {claiming ? "Claiming..." : "Claim Transfer"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCancelModal(transfer)}
                      disabled={cancelling}
                      className={`${theme.button.base} ${theme.button.variants.danger} flex-1 text-sm`}
                    >
                      {cancelling ? "Cancelling..." : "Cancel Transfer"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {expiredTransfers.length > 0 && (
        <div className={`${theme.layout.card} space-y-4`}>
          <h3 className={theme.typography.h3}>Expired Transfers</h3>
          <div className="space-y-3">
            {expiredTransfers.map((transfer, index) => (
              <div
                key={index}
                className={`${theme.layout.cardCompact} space-y-2 bg-background/50 opacity-60`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Expired
                  </span>
                  <span className="text-xs text-muted">
                    Created: {formatTime(transfer.createdAt)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={theme.typography.label}>From</span>
                    <span className="font-mono">
                      {formatAddress(transfer.fromOwner.toString())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.typography.label}>To</span>
                    <span className="font-mono">
                      {formatAddress(transfer.toOwner.toString())}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showCancelModal}
        title="Cancel Transfer"
        onClose={() => setShowCancelModal(false)}
        variant="default"
        actions={
          <>
            <button
              className={`${theme.button.base} ${theme.button.variants.secondary}`}
              onClick={() => setShowCancelModal(false)}
            >
              Keep Transfer
            </button>
            <button
              className={`${theme.button.base} ${theme.button.variants.danger}`}
              onClick={handleCancelTransfer}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel Transfer"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedTransfer && (
            <div>
              <label className={theme.typography.label}>Transfer Details</label>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">From:</span>
                  <span className="font-mono">
                    {formatAddress(selectedTransfer.fromOwner.toString())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">To:</span>
                  <span className="font-mono">
                    {formatAddress(selectedTransfer.toOwner.toString())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Expires:</span>
                  <span className="font-mono">
                    {formatTime(selectedTransfer.expiresAt)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-muted">
            Are you sure you want to cancel this transfer request? The
            recipient will no longer be able to claim it.
          </p>
        </div>
      </Modal>
    </div>
  );
}
