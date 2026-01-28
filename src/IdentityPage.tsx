import { useWalletConnection } from "@solana/react-hooks";
import { useIdentity } from "./hooks/useIdentity";
import { theme } from "./styles/theme";
import { useAlert } from "./hooks/useAlert";
import { ActionButton } from "./components/ui/ActionButton";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import { AddressDisplay } from "./components/ui/AddressDisplay";
import { StatusBadge } from "./components/ui/StatusBadge";
import { formatTimestamp } from "./utils/time";
import { useAsyncOperation } from "./hooks/useAsyncOperation";
import { useConfirmModal } from "./hooks/useConfirmModal";

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
    refresh,
  } = useIdentity();
  const { showAlert } = useAlert();
  const { execute } = useAsyncOperation();
  const { modalState, openModal, closeModal, setLoading } = useConfirmModal();

  if (!wallet) return <div>Please connect your wallet.</div>;
  if (loading) return <div>Loading identity...</div>;
  if (!identity) return <div>No identity found. Please create one.</div>;

  const handleVerifyIdentity = async () => {
    await execute(
      () => verifyIdentity(),
      {
        successMessage: "Identity verified successfully",
        errorMessage: "Failed to verify identity",
        suppressUserCancelAlert: true,
      }
    );
  };

  const handleUnverifyIdentity = async () => {
    openModal({
      title: "Unverify Identity",
      message: "Are you sure you want to unverify your identity?",
      confirmLabel: "Unverify",
      variant: "primary",
      onConfirm: async () => {
        setLoading(true);
        const result = await execute(
          () => unverifyIdentity(),
          {
            successMessage: "Identity unverified successfully",
            errorMessage: "Failed to unverify identity",
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

  const handleDeleteIdentity = async () => {
    openModal({
      title: "Delete Identity",
      message: "Are you sure you want to delete your identity? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        const result = await execute(
          () => deleteIdentity(),
          {
            successMessage: "Identity deleted successfully",
            errorMessage: "Failed to delete identity",
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

  return (
    <div className={theme.layout.pageContainer}>
      <div className={theme.layout.card}>
        <h2 className={`${theme.typography.h3} mb-4`}>Identity Profile</h2>
        <div className="space-y-4">
          <AddressDisplay address={identity.owner.toString()} label="Owner" />
          <div>
            <label className={theme.typography.label}>Created At</label>
            <p>{formatTimestamp(identity.createdAt)}</p>
          </div>
          <div>
            <label className={theme.typography.label}>Status</label>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={identity.verified ? "verified" : "unverified"}
              />
              <span>{identity.verified ? "Verified" : "Unverified"}</span>
            </div>
          </div>
          {identity.verified &&
            identity.verifiedAt &&
            identity.verifiedAt.__option === "Some" && (
              <div>
                <label className={theme.typography.label}>Verified At</label>
                <p>{formatTimestamp(identity.verifiedAt.value)}</p>
              </div>
            )}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            {!identity.verified ? (
              <ActionButton
                label="Verify Identity"
                loading={verifying}
                loadingLabel="Verifying..."
                onClick={handleVerifyIdentity}
              />
            ) : (
              <div className="space-y-3">
                <ActionButton
                  label="Unverify Identity"
                  loading={unverifying}
                  loadingLabel="Unverifying..."
                  variant="secondary"
                  onClick={handleUnverifyIdentity}
                />
                <p className="text-sm text-muted">
                  You can unverify or delete your identity at any time.
                </p>
              </div>
            )}
            <ActionButton
              label="Delete Identity"
              loading={deleting}
              loadingLabel="Deleting..."
              variant="danger"
              onClick={handleDeleteIdentity}
            />
          </div>
        </div>
      </div>

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
