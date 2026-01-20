import { useWalletConnection } from "@solana/react-hooks";
import { useIdentity } from "./hooks/useIdentity";
import { theme } from "./styles/theme";

export function IdentityPage() {
  const { wallet } = useWalletConnection();
  const {
    identity,
    loading,
    verifyIdentity,
    verifying,
  } = useIdentity();

  if (!wallet) return <div>Please connect your wallet.</div>;
  if (loading) return <div>Loading identity...</div>;
  if (!identity) return <div>No identity found. Please create one.</div>;

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
          <div className="pt-4 border-t border-gray-200">
            {!identity.verified ? (
              <button
                className={`${theme.button.base} ${theme.button.variants.primary}`}
                onClick={() => verifyIdentity()}
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify Identity"}
              </button>
            ) : (
              <p className="text-sm text-muted">
                Identity verification is currently permanent. Unverify functionality will be available in a future update.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
