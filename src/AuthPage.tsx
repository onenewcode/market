import { useWalletConnection, useBalance } from "@solana/react-hooks";
import { useState, useEffect } from "react";
import { useIdentity } from "./hooks/useIdentity";
import { useAlert } from "./hooks/useAlert";
import { rpc } from "./config";
import { theme } from "./styles/theme";

export function AuthPage({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const { connectors, connect, disconnect, status, wallet } = useWalletConnection();
  const balance = useBalance(wallet?.account.address);
  const {
    createIdentity,
    exists,
    loading: identityLoading,
    creating,
  } = useIdentity();
  const { showAlert } = useAlert();

  const [rpcConnectionStatus, setRpcConnectionStatus] = useState<
    "ok" | "error" | "checking"
  >("checking");

  useEffect(() => {
    checkRpcConnection();
  }, []);

  const checkRpcConnection = async () => {
    try {
      await rpc.getBlockHeight().send();
      setRpcConnectionStatus("ok");
    } catch (e) {
      console.error("RPC Connection failed:", e);
      setRpcConnectionStatus("error");
    }
  };

  const handleCreateIdentity = async () => {
    try {
      await createIdentity();
      console.log("Identity created successfully");
      onNavigate("identity");
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("already in use")) {
        showAlert(
          "Identity Exists",
          "Identity already exists! Redirecting...",
          { variant: "warning" }
        );
        onNavigate("identity");
      } else {
        showAlert(
          "Creation Failed",
          `Failed to create identity: ${msg}`,
          { variant: "error" }
        );
      }
    }
  };

  if (status === "connected") {
    const solBalance = balance ? Number(balance.lamports) / 1_000_000_000 : 0;

    return (
      <div className={`${theme.layout.pageContainer} text-center`}>
        <h2 className={theme.typography.h2}>Welcome</h2>
        <div
          className={`${theme.layout.cardCompact} max-w-md mx-auto space-y-2 text-left`}
        >
          <div>
            <span className="text-xs text-muted uppercase tracking-wider">
              Wallet Address
            </span>
            <p className={theme.typography.mono}>{wallet?.account.address}</p>
          </div>
          <div>
            <span className="text-xs text-muted uppercase tracking-wider">
              Balance
            </span>
            <p className="font-mono text-xl font-semibold">
              {solBalance.toFixed(4)} SOL
            </p>
          </div>
          {solBalance < 0.01 && (
            <div className={`${theme.alert.base} ${theme.alert.warning}`}>
              ⚠️ Low balance. You need SOL to pay for transaction fees.
              <br />
              Run: <code>solana airdrop 1 {wallet?.account.address}</code>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-muted">
            {exists
              ? "You already have an identity."
              : "Create your on-chain identity to get started."}
          </p>

          {exists ? (
            <button
              onClick={() => onNavigate("identity")}
              className={`${theme.button.variants.primary} w-full max-w-xs bg-green-600 hover:bg-green-700`}
            >
              Go to Profile
            </button>
          ) : (
            <button
              onClick={handleCreateIdentity}
              disabled={creating || identityLoading}
              className={`${theme.button.variants.primary} w-full max-w-xs`}
            >
              {creating
                ? "Creating..."
                : identityLoading
                  ? "Checking..."
                  : "Create Identity"}
            </button>
          )}
        </div>

        {!exists && (
          <div>
            <button
              onClick={() => onNavigate("identity")}
              className={theme.typography.link}
            >
              I believe I have an identity, check anyway
            </button>
          </div>
        )}

        <div className="pt-8">
          <button
            onClick={() => disconnect()}
            className={`${theme.typography.error} cursor-pointer hover:text-red-600`}
          >
            Disconnect Wallet
          </button>
        </div>

        <div className="text-xs text-muted pt-4 border-t border-border-low mt-4 flex flex-col gap-2 items-center">
          <p>
            Make sure your wallet is connected to <strong>Localnet</strong>{
              " "
            }
            (localhost:8899).
          </p>
          <div className="flex items-center gap-2">
            <div
              className={`${theme.status.badge} ${rpcConnectionStatus === "ok" ? theme.status.verified : rpcConnectionStatus === "error" ? theme.status.error : theme.status.unverified}`}
            ></div>
            <span>
              RPC Connection:{
                " "
              }
              {rpcConnectionStatus === "ok"
                ? "Connected (8899)"
                : rpcConnectionStatus === "error"
                  ? "Failed (Is validator running?)"
                  : "Checking..."}
            </span>
          </div>
          <div className="text-[10px] text-muted/60">
            Frontend Port: {window.location.port} (Correct)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={theme.layout.pageContainer}>
      <div className="text-center space-y-2">
        <h2 className={theme.typography.h2}>Connect Wallet</h2>
        <p className="text-muted">
          Connect your Solana wallet to access the system.
        </p>
      </div>
      <div className={theme.layout.gridConnectors}>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect(connector.id)}
            className={theme.button.variants.connector}
          >
            <img
              src={connector.icon}
              alt={connector.name}
              className="h-6 w-6"
            />
            <span className="font-medium">{connector.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
