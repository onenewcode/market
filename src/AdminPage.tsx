import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { theme } from "./styles/theme";
import { address } from "@solana/kit";

export function AdminPage() {
  const { wallet } = useWalletConnection();
  const [targetAddress, setTargetAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [verifying, setVerifying] = useState(false);

  // Admin verification functionality not implemented yet
  const handleVerify = async () => {
    if (!targetAddress) return;
    try {
      setVerifying(true);
      setStatus("idle");
      // Validate address format
      const ownerAddr = address(targetAddress);
      // Admin verification functionality will be implemented here
      console.log(`Admin verification requested for ${ownerAddr}`);
      setStatus("success");
      setTargetAddress("");
    } catch (e) {
      console.error(e);
      setStatus("error");
    } finally {
      setVerifying(false);
    }
  };

  if (!wallet) {
    return (
      <div className={theme.layout.pageContainer}>
        <div className={theme.layout.card}>
          <p>Please connect your wallet to access admin functions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={theme.layout.pageContainer}>
      <div className={theme.layout.card}>
        <h2 className={`${theme.typography.h3} mb-4`}>Admin Dashboard</h2>

        <div className="space-y-6">
          <div>
            <h3 className={`${theme.typography.h3} mb-2`}>
              Verify User Identity
            </h3>
            <p className="text-sm text-content-secondary mb-4">
              Enter the wallet address of the user you want to verify. You must
              be the initialized Admin of the protocol.
            </p>

            <div className="flex gap-4">
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="User Wallet Address (e.g. 7X...)"
                className={theme.input.base}
              />
              <button
                onClick={handleVerify}
                disabled={verifying || !targetAddress}
                className={`${theme.button.base} ${theme.button.variants.primary}`}
              >
                {verifying ? "Verifying..." : "Verify User"}
              </button>
            </div>

            {status === "success" && (
              <p className="mt-2 text-green-500 text-sm">
                Successfully verified user identity!
              </p>
            )}
            {status === "error" && (
              <p className="mt-2 text-red-500 text-sm">
                Failed to verify. Check console or ensure you are Admin.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
