import { useWalletConnection, useBalance } from "@solana/react-hooks";
import { useState, useEffect } from "react";
import { useIdentity } from "./hooks/useIdentity";
import { rpc } from "./config";

export function AuthPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { connectors, connect, disconnect, status, wallet } = useWalletConnection();
  const balance = useBalance(wallet?.account.address);
  const { createIdentity, exists, loading: identityLoading, creating } = useIdentity();
  
  const [rpcConnectionStatus, setRpcConnectionStatus] = useState<"ok" | "error" | "checking">("checking");

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
          alert("Identity already exists! Redirecting...");
          onNavigate("identity");
      } else {
          alert("Failed to create identity: " + msg);
      }
    }
  };

  if (status === "connected") {
    const solBalance = balance ? Number(balance.lamports) / 1_000_000_000 : 0;
    
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold">Welcome</h2>
        <div className="bg-card border border-border rounded-lg p-4 max-w-md mx-auto space-y-2 text-left">
            <div>
                <span className="text-xs text-muted uppercase tracking-wider">Wallet Address</span>
                <p className="font-mono text-sm break-all">{wallet?.account.address}</p>
            </div>
            <div>
                <span className="text-xs text-muted uppercase tracking-wider">Balance</span>
                <p className="font-mono text-xl font-semibold">{solBalance.toFixed(4)} SOL</p>
            </div>
            {solBalance < 0.01 && (
                <div className="text-sm text-yellow-500 bg-yellow-500/10 p-2 rounded">
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
                    className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer w-full max-w-xs"
                >
                    Go to Profile
                </button>
            ) : (
                <button
                    onClick={handleCreateIdentity}
                    disabled={creating || identityLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer w-full max-w-xs"
                >
                    {creating ? "Creating..." : identityLoading ? "Checking..." : "Create Identity"}
                </button>
            )}
        </div>
        
        {!exists && (
            <div>
                <button onClick={() => onNavigate("identity")} className="text-sm underline text-muted hover:text-foreground cursor-pointer">
                    I believe I have an identity, check anyway
                </button>
            </div>
        )}

        <div className="pt-8">
            <button onClick={() => disconnect()} className="text-sm text-red-500 hover:text-red-600 cursor-pointer">
                Disconnect Wallet
            </button>
        </div>
        
        <div className="text-xs text-muted pt-4 border-t border-border-low mt-4 flex flex-col gap-2 items-center">
            <p>Make sure your wallet is connected to <strong>Localnet</strong> (localhost:8899).</p>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${rpcConnectionStatus === 'ok' ? 'bg-green-500' : rpcConnectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                <span>RPC Connection: {rpcConnectionStatus === 'ok' ? 'Connected (8899)' : rpcConnectionStatus === 'error' ? 'Failed (Is validator running?)' : 'Checking...'}</span>
            </div>
            <div className="text-[10px] text-muted/60">
                Frontend Port: {window.location.port} (Correct)
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Connect Wallet</h2>
        <p className="text-muted">Connect your Solana wallet to access the system.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 max-w-md mx-auto">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect(connector.id)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5"
          >
            <img src={connector.icon} alt={connector.name} className="h-6 w-6" />
            <span className="font-medium">{connector.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
