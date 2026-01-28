import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { useIdentity } from "./hooks/useIdentity";
import { useTransfer } from "./hooks/useTransfer";
import { useAlert } from "./hooks/useAlert";
import { theme } from "./styles/theme";
import { Input } from "./components/ui/Input";
import { ActionButton } from "./components/ui/ActionButton";
import { TransferCard } from "./components/ui/TransferCard";
import { EmptyState } from "./components/ui/EmptyState";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import { address } from "@solana/kit";
import { getErrorMessage } from "./utils/error";
import { useAsyncOperation } from "./hooks/useAsyncOperation";
import { useConfirmModal } from "./hooks/useConfirmModal";

export function TransferPage() {
  const { wallet } = useWalletConnection();
  const { identity } = useIdentity();
  const {
    initiating,
    claiming,
    cancelling,
    loading,
    transferRequests,
    initiateTransfer,
    claimTransfer,
    cancelTransfer,
    refresh,
  } = useTransfer();
  const { showAlert } = useAlert();
  const { execute } = useAsyncOperation();
  const { modalState, openModal, closeModal, setLoading } = useConfirmModal();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [selectedTransfer, setSelectedTransfer] =
    useState<(typeof transferRequests)[0] | null>(null);

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
      showAlert("Invalid Input", "Please enter a recipient address.", {
        variant: "error",
      });
      return;
    }

    const recipientAddr = address(recipientAddress);
    await execute(
      () => initiateTransfer(recipientAddr),
      {
        successMessage: "Transfer initiated successfully",
        errorMessage: "Failed to initiate transfer",
        suppressUserCancelAlert: true,
      }
    );
    setRecipientAddress("");
  };

  const handleClaimTransfer = async (
    transfer: (typeof transferRequests)[0]
  ) => {
    await execute(
      () => claimTransfer(transfer),
      {
        successMessage: "You have successfully claimed the identity transfer. Your identity and credit score have been transferred.",
        errorMessage: "Failed to claim transfer",
        suppressUserCancelAlert: true,
      }
    );
  };

  const handleCancelTransfer = async () => {
    if (!selectedTransfer) return;

    openModal({
      title: "Cancel Transfer",
      message: "Are you sure you want to cancel this transfer request? This action cannot be undone.",
      confirmLabel: "Cancel Transfer",
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        const result = await execute(
          () => cancelTransfer(selectedTransfer),
          {
            successMessage: "Transfer cancelled successfully",
            errorMessage: "Failed to cancel transfer",
            suppressUserCancelAlert: true,
          }
        );
        setLoading(false);
        if (result !== null) {
          closeModal();
        }
      },
    });
  };

  const pendingTransfers = transferRequests.filter(
    (t) => t.status === "pending"
  );
  const expiredTransfers = transferRequests.filter(
    (t) => t.status === "expired"
  );

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
          <Input
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter recipient wallet address"
            className="flex-1"
          />
          <ActionButton
            label="Initiate Transfer"
            loading={initiating}
            loadingLabel="Initiating..."
            disabled={!recipientAddress}
            onClick={handleInitiateTransfer}
          />
        </div>
      </div>

      <div className={`${theme.layout.card} space-y-4`}>
        <div className={`${theme.layout.flexBetween}`}>
          <h3 className={theme.typography.h3}>Pending Transfers</h3>
          <ActionButton
            label="Refresh"
            loading={loading}
            loadingLabel="Refreshing..."
            variant="secondary"
            onClick={refresh}
          />
        </div>

        {pendingTransfers.length === 0 ? (
          <EmptyState
            title="No pending transfers"
            message="You don't have any pending transfer requests."
          />
        ) : (
          <div className="space-y-3">
            {pendingTransfers.map((transfer, index) => (
              <TransferCard
                key={index}
                transfer={transfer}
                onClaim={
                  transfer.isRecipient
                    ? () => handleClaimTransfer(transfer)
                    : undefined
                }
                onCancel={
                  transfer.isInitiator
                    ? () => {
                        setSelectedTransfer(transfer);
                        handleCancelTransfer();
                      }
                    : undefined
                }
                claiming={claiming}
                cancelling={cancelling}
              />
            ))}
          </div>
        )}
      </div>

      {expiredTransfers.length > 0 && (
        <div className={`${theme.layout.card} space-y-4`}>
          <h3 className={theme.typography.h3}>Expired Transfers</h3>
          <div className="space-y-3">
            {expiredTransfers.map((transfer, index) => (
              <TransferCard key={index} transfer={transfer} />
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmLabel={modalState.confirmLabel}
        cancelLabel={modalState.cancelLabel}
        variant={modalState.variant}
        onConfirm={modalState.onConfirm}
        onCancel={closeModal}
        loading={modalState.loading}
      />
    </div>
  );
}
