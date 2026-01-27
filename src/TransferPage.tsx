import { useWalletConnection } from "@solana/react-hooks";
import { useTransfer } from "./hooks/useTransfer";
import { theme } from "./styles/theme";
import { useAlert } from "./hooks/useAlert";
import { useState } from "react";
import { Modal } from "./components/ui/Modal";
import { Input } from "./components/ui/Input";
import { Card } from "./components/ui/Card";
import { Button } from "./components/ui/Button";

export function TransferPage() {
  const { wallet } = useWalletConnection();
  const { showAlert } = useAlert();
  const {
    transferRequest,
    loading,
    initiateTransfer,
    initiating,
    claimTransfer,
    claiming,
    cancelTransfer,
    cancelling,
    refresh,
  } = useTransfer();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  if (!wallet) return <div>Please connect your wallet.</div>;
  if (loading) return <div>Loading transfer status...</div>;

  const handleInitiateTransfer = async () => {
    try {
      await initiateTransfer(recipientAddress);
      setShowInitiateModal(false);
      showAlert(
        "Transfer Initiated",
        "Transfer request has been created. The recipient can now claim it.",
        { variant: "success" }
      );
      await refresh();
    } catch (error) {
      console.error("Failed to initiate transfer:", error);
      showAlert(
        "Initiation Failed",
        "Failed to initiate transfer. Please try again.",
        { variant: "error" }
      );
    }
  };

  const handleClaimTransfer = async () => {
    try {
      await claimTransfer();
      showAlert(
        "Transfer Claimed",
        "Identity and credit score have been successfully transferred to you.",
        { variant: "success" }
      );
      await refresh();
    } catch (error) {
      console.error("Failed to claim transfer:", error);
      showAlert("Claim Failed", "Failed to claim transfer. Please try again.", {
        variant: "error",
      });
    }
  };

  const handleCancelTransfer = async () => {
    try {
      await cancelTransfer();
      setShowCancelModal(false);
      showAlert("Transfer Cancelled", "Transfer request has been cancelled.", {
        variant: "success",
      });
      await refresh();
    } catch (error) {
      console.error("Failed to cancel transfer:", error);
      showAlert(
        "Cancellation Failed",
        "Failed to cancel transfer. Please try again.",
        { variant: "error" }
      );
    }
  };

  const isInitiator = transferRequest
    ? transferRequest.fromOwner.toString() === wallet.account.address.toString()
    : false;
  const isRecipient = transferRequest
    ? transferRequest.toOwner.toString() === wallet.account.address.toString()
    : false;
  const isExpired = transferRequest
    ? Date.now() / 1000 > transferRequest.expiresAt
    : false;

  return (
    <div className={theme.layout.pageContainer}>
      <div className="space-y-6">
        <div>
          <h1 className={`${theme.typography.h2} mb-2`}>Identity Transfer</h1>
          <p className={theme.typography.body}>
            Transfer your identity and credit score to another wallet address.
          </p>
        </div>

        {transferRequest && (
          <Card>
            <h3 className={`${theme.typography.h3} mb-4`}>
              Active Transfer Request
            </h3>
            <div className="space-y-3">
              <div>
                <label className={theme.typography.label}>From Owner</label>
                <p className={theme.typography.mono}>
                  {transferRequest.fromOwner.toString()}
                </p>
              </div>
              <div>
                <label className={theme.typography.label}>To Owner</label>
                <p className={theme.typography.mono}>
                  {transferRequest.toOwner.toString()}
                </p>
              </div>
              <div>
                <label className={theme.typography.label}>Created At</label>
                <p>
                  {new Date(
                    Number(transferRequest.createdAt) * 1000
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <label className={theme.typography.label}>Expires At</label>
                <p>
                  {new Date(
                    Number(transferRequest.expiresAt) * 1000
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <label className={theme.typography.label}>Status</label>
                <div className="flex items-center gap-2">
                  {isExpired ? (
                    <>
                      <span
                        className={`${theme.status.badge} ${theme.status.error}`}
                      ></span>
                      <span>Expired</span>
                    </>
                  ) : (
                    <>
                      <span
                        className={`${theme.status.badge} ${theme.status.active}`}
                      ></span>
                      <span>Active</span>
                    </>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 space-y-3">
                {isRecipient && !isExpired && (
                  <Button
                    variant="primary"
                    onClick={handleClaimTransfer}
                    disabled={claiming}
                  >
                    {claiming ? "Claiming..." : "Claim Transfer"}
                  </Button>
                )}
                {isInitiator && !isExpired && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowCancelModal(true)}
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling..." : "Cancel Transfer"}
                  </Button>
                )}
                {isExpired && (
                  <p className="text-sm text-muted">
                    This transfer request has expired. Please initiate a new
                    transfer.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {!transferRequest && (
          <Card>
            <h3 className={`${theme.typography.h3} mb-4`}>
              Initiate New Transfer
            </h3>
            <div className="space-y-4">
              <div>
                <label className={theme.typography.label}>
                  Recipient Address
                </label>
                <Input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Enter recipient wallet address"
                  className="w-full"
                />
              </div>
              <Button
                variant="primary"
                onClick={() => setShowInitiateModal(true)}
                disabled={!recipientAddress}
              >
                Initiate Transfer
              </Button>
              <p className="text-sm text-muted">
                This will create a transfer request that the recipient can
                claim. You can cancel the transfer at any time before it's
                claimed.
              </p>
            </div>
          </Card>
        )}

        <Modal
          isOpen={showInitiateModal}
          title="Initiate Identity Transfer"
          onClose={() => setShowInitiateModal(false)}
          variant="default"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => setShowInitiateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleInitiateTransfer}
                disabled={initiating}
              >
                {initiating ? "Initiating..." : "Initiate"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={theme.typography.label}>From Owner</label>
              <p className={theme.typography.mono}>
                {wallet?.account.address.toString() || "Not connected"}
              </p>
            </div>
            <div>
              <label className={theme.typography.label}>To Owner</label>
              <p className={theme.typography.mono}>{recipientAddress}</p>
            </div>
            <p className="text-sm text-muted">
              This will create a transfer request. The recipient will need to
              claim it to complete the transfer. You can cancel the transfer at
              any time before it's claimed.
            </p>
          </div>
        </Modal>

        <Modal
          isOpen={showCancelModal}
          title="Cancel Transfer"
          onClose={() => setShowCancelModal(false)}
          variant="default"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => setShowCancelModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelTransfer}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Cancel Transfer"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={theme.typography.label}>From Owner</label>
              <p className={theme.typography.mono}>
                {wallet?.account.address.toString() || "Not connected"}
              </p>
            </div>
            <div>
              <label className={theme.typography.label}>To Owner</label>
              <p className={theme.typography.mono}>
                {transferRequest?.toOwner.toString() || "N/A"}
              </p>
            </div>
            <p className="text-sm text-muted">
              Are you sure you want to cancel this transfer? The recipient will
              not be able to claim it.
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
}
