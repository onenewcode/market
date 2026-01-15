import { useWalletConnection } from "@solana/react-hooks";
import { useIdentity } from "./hooks/useIdentity";

export function IdentityPage() {
    const { wallet } = useWalletConnection();
    const { identity, loading } = useIdentity();

    if (!wallet) return <div>Please connect your wallet.</div>;
    if (loading) return <div>Loading identity...</div>;
    if (!identity) return <div>No identity found. Please create one.</div>;

    return (
        <div className="space-y-6">
             <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Identity Profile</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-muted">Owner</label>
                        <p className="font-mono text-sm break-all">{identity.owner.toString()}</p>
                    </div>
                    <div>
                        <label className="text-sm text-muted">Created At</label>
                        <p>{new Date(Number(identity.createdAt) * 1000).toLocaleString()}</p>
                    </div>
                    <div>
                        <label className="text-sm text-muted">Status</label>
                        <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${identity.verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                            <span>{identity.verified ? 'Verified' : 'Unverified'}</span>
                        </div>
                    </div>
                    {identity.verified && identity.verifiedAt && (
                        <div>
                            <label className="text-sm text-muted">Verified At</label>
                            <p>{new Date(Number(identity.verifiedAt) * 1000).toLocaleString()}</p>
                        </div>
                    )}
                </div>
             </div>
        </div>
    );
}
