import { useWalletConnection } from "@solana/react-hooks";
import { useIdentity } from "./hooks/useIdentity";
import { theme } from "./styles/theme";
import { useAlert } from "./hooks/useAlert";
import { Modal } from "./components/ui/Modal";
import { Button } from "./components/ui/Button";

export function IdentityPage() {
  const { wallet } = useWalletConnection();
  const {
    identity,
    loading,
    verifyIdentity,
    verifying,
    unverifyIdentity,
    unverifying,
    deleteIdentity,
    deleting,
    showDeleteModal,
    setShowDeleteModal,
    showUnverifyModal,
    setShowUnverifyModal,
  } = useIdentity();
  const { showAlert } = useAlert();

  if (!wallet) return <div>Please connect your wallet.</div>;
  if (loading) return <div>Loading identity...</div>;
  if (!identity) return <div>No identity found. Please create one.</div>;

  const handleDeleteIdentity = async () => {
    try {
      await deleteIdentity();
      showAlert(
        "Identity Deleted",
        "Your identity has been successfully deleted.",
        { variant: "success" }
      );
    } catch (error) {
      console.error("Failed to delete identity:", error);
      showAlert(
        "Deletion Failed",
        "Failed to delete identity. Please try again.",
        { variant: "error" }
      );
    }
  };

  const handleUnverifyIdentity = async () => {
    try {
      await unverifyIdentity();
      showAlert(
        "Identity Unverified",
        "Your identity has been successfully unverified.",
        { variant: "success" }
      );
    } catch (error) {
      console.error("Failed to unverify identity:", error);
      showAlert(
        "Unverify Failed",
        "Failed to unverify identity. Please try again.",
        { variant: "error" }
      );
    }
  };

  return (
    <div className={theme.layout.pageContainer}>
      <div className={theme.layout.card}>
        <h2 className={`${theme.typography.h3} mb-4`}>Identity Profile</h2>
        <div className="space-y-4">
          <div>
            <label className={theme.typography.label}>Owner</label>
            <p className={theme.typography.mono}>{identity.owner.toString()}</p>
          </div>
          <div>
            <label className={theme.typography.label}>Created At</label>
            <p>
              {new Date(Number(identity.createdAt) * 1000).toLocaleString()}
            </p>
          </div>
          <div>
            <label className={theme.typography.label}>Status</label>
            <div className="flex items-center gap-2">
              <span
                className={`${theme.status.badge} ${identity.verified ? theme.status.verified : theme.status.unverified}`}
              ></span>
              <span>{identity.verified ? "Verified" : "Unverified"}</span>
            </div>
          </div>
          {identity.verified && identity.verifiedAt && (
            <div>
              <label className={theme.typography.label}>Verified At</label>
              <p>
                {new Date(Number(identity.verifiedAt) * 1000).toLocaleString()}
              </p>
            </div>
          )}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            {!identity.verified ? (
              <button
                className={`${theme.button.base} ${theme.button.variants.primary}`}
                onClick={() => verifyIdentity()}
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify Identity"}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  className={`${theme.button.base} ${theme.button.variants.secondary}`}
                  onClick={() => setShowUnverifyModal(true)}
                  disabled={unverifying}
                >
                  {unverifying ? "Unverifying..." : "Unverify Identity"}
                </button>
                <p className="text-sm text-muted">
                  You can unverify or delete your identity at any time.
                </p>
              </div>
            )}
            <button
              className={`${theme.button.base} ${theme.button.variants.danger}`}
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Identity"}
            </button>
          </div>
        </div>

        <Modal
          isOpen={showDeleteModal}
          title="Delete Identity"
          onClose={() => setShowDeleteModal(false)}
          variant="default"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteIdentity}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={theme.typography.label}>Owner</label>
              <p className={theme.typography.mono}>
                {wallet?.account.address.toString() || "Not connected"}
              </p>
            </div>
            <p className="text-sm text-muted">
              Are you sure you want to delete your identity? This action cannot
              be undone.
            </p>
          </div>
        </Modal>

        <Modal
          isOpen={showUnverifyModal}
          title="Unverify Identity"
          onClose={() => setShowUnverifyModal(false)}
          variant="default"
          actions={
            <>
              <button
                className={`${theme.button.base} ${theme.button.variants.secondary}`}
                onClick={() => setShowUnverifyModal(false)}
              >
                Cancel
              </button>
              <button
                className={`${theme.button.base} ${theme.button.variants.primary}`}
                onClick={handleUnverifyIdentity}
                disabled={unverifying}
              >
                {unverifying ? "Unverifying..." : "Unverify"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={theme.typography.label}>Owner</label>
              <p className={theme.typography.mono}>
                {wallet?.account.address.toString() || "Not connected"}
              </p>
            </div>
            <p className="text-sm text-muted">
              Are you sure you want to unverify your identity?
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
}
