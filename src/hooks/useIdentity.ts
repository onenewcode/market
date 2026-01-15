import { useWalletConnection, useSendTransaction } from "@solana/react-hooks";
import { useState, useCallback, useEffect } from "react";
import { 
  getProgramDerivedAddress, 
  getBytesEncoder, 
  getAddressEncoder,
  type Address
} from "@solana/kit";
import { 
  IDENTITY_SCORE_PROGRAM_ADDRESS, 
  SYSTEM_PROGRAM_ADDRESS, 
  rpc, 
  SEEDS 
} from "../config";
import { 
  getCreateIdentityInstructionDataEncoder 
} from "../generated/instructions/createIdentity";
import { 
  fetchMaybeIdentityAccount,
  type IdentityAccount
} from "../generated/accounts/identityAccount";

export function useIdentity() {
    const { wallet, status } = useWalletConnection();
    const { send } = useSendTransaction();
    
    const [identity, setIdentity] = useState<IdentityAccount | null>(null);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [exists, setExists] = useState(false);

    const getIdentityPda = useCallback(async (walletAddress: Address) => {
        const encoder = new TextEncoder();
        const [pda] = await getProgramDerivedAddress({
            programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
            seeds: [
                getBytesEncoder().encode(encoder.encode(SEEDS.IDENTITY)),
                getAddressEncoder().encode(walletAddress),
            ],
        });
        return pda;
    }, []);

    const fetchIdentity = useCallback(async () => {
        if (!wallet || status !== "connected") return;
        
        setLoading(true);
        try {
            const walletAddress = wallet.account.address;
            const pda = await getIdentityPda(walletAddress);
            const account = await fetchMaybeIdentityAccount(rpc, pda);
            
            if (account.exists) {
                setIdentity(account.data);
                setExists(true);
            } else {
                setIdentity(null);
                setExists(false);
            }
        } catch (e) {
            console.error("Failed to fetch identity:", e);
            setIdentity(null);
            setExists(false);
        } finally {
            setLoading(false);
        }
    }, [wallet, status, getIdentityPda]);

    // Initial fetch
    useEffect(() => {
        fetchIdentity();
    }, [fetchIdentity]);

    const createIdentity = useCallback(async () => {
        if (!wallet) throw new Error("Wallet not connected");

        setCreating(true);
        try {
            const walletAddress = wallet.account.address;
            const pda = await getIdentityPda(walletAddress);

            const instruction = {
                programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
                accounts: [
                    { address: pda, role: 1 }, // Writable
                    { address: walletAddress, role: 3 }, // WritableSigner
                    { address: SYSTEM_PROGRAM_ADDRESS, role: 0 }, // Readonly
                ],
                data: getCreateIdentityInstructionDataEncoder().encode({}),
            };

            await send({ instructions: [instruction] });
            
            // Refresh identity after creation
            await fetchIdentity();
            return true;
        } catch (error) {
            console.error("Failed to create identity:", error);
            throw error;
        } finally {
            setCreating(false);
        }
    }, [wallet, getIdentityPda, send, fetchIdentity]);

    return {
        identity,
        loading,
        creating,
        exists,
        createIdentity,
        refresh: fetchIdentity,
    };
}
