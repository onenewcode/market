import { useWalletConnection, useSendTransaction } from "@solana/react-hooks";
import { useState, useCallback, useEffect } from "react";
import {
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
  type Address,
} from "@solana/kit";
import {
  IDENTITY_SCORE_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  rpc,
  SEEDS,
} from "../config";
import { getCreateIdentityInstructionDataEncoder } from "../generated/instructions/createIdentity";
import { getVerifyIdentityInstructionDataEncoder } from "../generated/instructions/verifyIdentity";
import { getUnverifyIdentityInstructionDataEncoder } from "../generated/instructions/unverifyIdentity";
import { getDeleteIdentityInstructionDataEncoder } from "../generated/instructions/deleteIdentity";
import { getTransferIdentityInstructionDataEncoder } from "../generated/instructions/transferIdentity";
import {
  fetchMaybeIdentityAccount,
  type IdentityAccount,
} from "../generated/accounts/identityAccount";

export function useIdentity() {
  const { wallet, status } = useWalletConnection();
  const { send } = useSendTransaction();

  const [identity, setIdentity] = useState<IdentityAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [unverifying, setUnverifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exists, setExists] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnverifyModal, setShowUnverifyModal] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");

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

  const getScorePda = useCallback(async (walletAddress: Address) => {
    const encoder = new TextEncoder();
    const [pda] = await getProgramDerivedAddress({
      programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
      seeds: [
        getBytesEncoder().encode(encoder.encode(SEEDS.SCORE)),
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

  const verifyIdentity = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setVerifying(true);
    try {
      const walletAddress = wallet.account.address;
      const pda = await getIdentityPda(walletAddress);

      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: pda, role: 1 }, // Writable
          { address: walletAddress, role: 3 }, // WritableSigner
        ],
        data: getVerifyIdentityInstructionDataEncoder().encode({}),
      };

      await send({ instructions: [instruction] });

      // Refresh identity after verification
      await fetchIdentity();
      return true;
    } catch (error) {
      console.error("Failed to verify identity:", error);
      throw error;
    } finally {
      setVerifying(false);
    }
  }, [wallet, getIdentityPda, send, fetchIdentity]);

  const unverifyIdentity = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setUnverifying(true);
    try {
      const walletAddress = wallet.account.address;
      const pda = await getIdentityPda(walletAddress);

      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: pda, role: 1 }, // Writable
          { address: walletAddress, role: 3 }, // WritableSigner
        ],
        data: getUnverifyIdentityInstructionDataEncoder().encode({}),
      };

      await send({ instructions: [instruction] });

      // Refresh identity after unverification
      await fetchIdentity();
      return true;
    } catch (error) {
      console.error("Failed to unverify identity:", error);
      throw error;
    } finally {
      setUnverifying(false);
    }
  }, [wallet, getIdentityPda, send, fetchIdentity]);

  const deleteIdentity = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setDeleting(true);
    try {
      const walletAddress = wallet.account.address;
      const identityPda = await getIdentityPda(walletAddress);
      const scorePda = await getScorePda(walletAddress);

      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: identityPda, role: 1 }, // Writable
          { address: scorePda, role: 1 }, // Writable
          { address: walletAddress, role: 3 }, // WritableSigner
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 }, // Readonly
        ],
        data: getDeleteIdentityInstructionDataEncoder().encode({}),
      };

      await send({ instructions: [instruction] });

      // Refresh identity after deletion
      await fetchIdentity();
      return true;
    } catch (error) {
      console.error("Failed to delete identity:", error);
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [wallet, getIdentityPda, getScorePda, send, fetchIdentity]);

  const transferIdentity = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");
    if (!newOwnerAddress) throw new Error("Please enter a new owner address");

    setTransferring(true);
    try {
      const walletAddress = wallet.account.address;
      const oldIdentityPda = await getIdentityPda(walletAddress);
      const newIdentityPda = await getIdentityPda(newOwnerAddress as Address);
      const oldScorePda = await getScorePda(walletAddress);
      const newScorePda = await getScorePda(newOwnerAddress as Address);

      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: oldIdentityPda, role: 1 },
          { address: newIdentityPda, role: 1 },
          { address: oldScorePda, role: 1 },
          { address: newScorePda, role: 1 },
          { address: walletAddress, role: 3 },
          { address: newOwnerAddress as Address, role: 0 },
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
        ],
        data: getTransferIdentityInstructionDataEncoder().encode({}),
      };

      await send({ instructions: [instruction] });

      // Refresh identity after transfer
      await fetchIdentity();
      setShowTransferModal(false);
      setNewOwnerAddress("");
      return true;
    } catch (error) {
      console.error("Failed to transfer identity:", error);
      throw error;
    } finally {
      setTransferring(false);
    }
  }, [
    wallet,
    getIdentityPda,
    getScorePda,
    send,
    fetchIdentity,
    newOwnerAddress,
  ]);

  return {
    identity,
    loading,
    creating,
    verifying,
    unverifying,
    deleting,
    exists,
    transferring,
    showTransferModal,
    setShowTransferModal,
    showDeleteModal,
    setShowDeleteModal,
    showUnverifyModal,
    setShowUnverifyModal,
    newOwnerAddress,
    setNewOwnerAddress,
    createIdentity,
    verifyIdentity,
    unverifyIdentity,
    deleteIdentity,
    transferIdentity,
    refresh: fetchIdentity,
  };
}
