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
import { getInitiateTransferInstructionDataEncoder } from "../generated/instructions/initiateTransfer";
import { getClaimTransferInstructionDataEncoder } from "../generated/instructions/claimTransfer";
import { getCancelTransferInstructionDataEncoder } from "../generated/instructions/cancelTransfer";
import {
  fetchMaybeTransferRequest,
  type TransferRequest,
  TRANSFER_REQUEST_DISCRIMINATOR,
} from "../generated/accounts/transferRequest";

export type TransferStatus = "pending" | "expired" | "claimed" | "cancelled";

export interface TransferRequestWithStatus extends TransferRequest {
  status: TransferStatus;
  transferRequestAddress: Address;
  isInitiator: boolean;
  isRecipient: boolean;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function useTransfer() {
  const { wallet, status } = useWalletConnection();
  const { send } = useSendTransaction();

  const [initiating, setInitiating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferRequests, setTransferRequests] = useState<
    TransferRequestWithStatus[]
  >([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] =
    useState<TransferRequestWithStatus | null>(null);

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

  const getTransferRequestPda = useCallback(
    async (fromOwner: Address, toOwner: Address) => {
      const encoder = new TextEncoder();
      const [pda] = await getProgramDerivedAddress({
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        seeds: [
          getBytesEncoder().encode(encoder.encode(SEEDS.TRANSFER_REQUEST)),
          getAddressEncoder().encode(fromOwner),
          getAddressEncoder().encode(toOwner),
        ],
      });
      return pda;
    },
    []
  );

  const getTransferStatus = useCallback(
    (transferRequest: TransferRequest): TransferStatus => {
      const now = Math.floor(Date.now() / 1000);
      if (now > Number(transferRequest.expiresAt)) {
        return "expired";
      }
      return "pending";
    },
    []
  );

  const fetchTransferRequests = useCallback(async () => {
    if (!wallet || status !== "connected") {
      setTransferRequests([]);
      return;
    }

    setLoading(true);
    try {
      const walletAddress = wallet.account.address;
      const walletAddressStr = walletAddress.toString();

      const transfers: TransferRequestWithStatus[] = [];

      const accounts = await rpc
        .getProgramAccounts(IDENTITY_SCORE_PROGRAM_ADDRESS, {
          encoding: "base64",
        })
        .send();

      for (const account of accounts) {
        try {
          if (!account.account || !account.account.data) {
            console.log("Account data is undefined, skipping");
            continue;
          }
          const accountData = base64ToUint8Array(account.account.data[0]);
          const discriminator = accountData.slice(0, 8);

          if (
            discriminator[0] === TRANSFER_REQUEST_DISCRIMINATOR[0] &&
            discriminator[1] === TRANSFER_REQUEST_DISCRIMINATOR[1] &&
            discriminator[2] === TRANSFER_REQUEST_DISCRIMINATOR[2] &&
            discriminator[3] === TRANSFER_REQUEST_DISCRIMINATOR[3] &&
            discriminator[4] === TRANSFER_REQUEST_DISCRIMINATOR[4] &&
            discriminator[5] === TRANSFER_REQUEST_DISCRIMINATOR[5] &&
            discriminator[6] === TRANSFER_REQUEST_DISCRIMINATOR[6] &&
            discriminator[7] === TRANSFER_REQUEST_DISCRIMINATOR[7]
          ) {
            const maybe = await fetchMaybeTransferRequest(
              rpc,
              account.pubkey as Address
            );

            if (maybe.exists) {
              const fromOwnerStr = maybe.data.fromOwner.toString();
              const toOwnerStr = maybe.data.toOwner.toString();

              const isInitiator = fromOwnerStr === walletAddressStr;
              const isRecipient = toOwnerStr === walletAddressStr;

              if (isInitiator || isRecipient) {
                transfers.push({
                  ...maybe.data,
                  status: getTransferStatus(maybe.data),
                  transferRequestAddress: account.pubkey as Address,
                  isInitiator,
                  isRecipient,
                });
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse account:", e);
        }
      }

      setTransferRequests(transfers);
    } catch (e) {
      console.error("Failed to fetch transfer requests:", e);
      setTransferRequests([]);
    } finally {
      setLoading(false);
    }
  }, [wallet, status, getTransferStatus]);

  useEffect(() => {
    fetchTransferRequests();
  }, [fetchTransferRequests]);

  const initiateTransfer = useCallback(
    async (recipientAddress: Address) => {
      if (!wallet) throw new Error("Wallet not connected");

      setInitiating(true);
      try {
        const walletAddress = wallet.account.address;
        const identityPda = await getIdentityPda(walletAddress);
        const transferRequestPda = await getTransferRequestPda(
          walletAddress,
          recipientAddress
        );

        const instruction = {
          programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
          accounts: [
            { address: identityPda, role: 1 },
            { address: transferRequestPda, role: 1 },
            { address: walletAddress, role: 3 },
            { address: recipientAddress, role: 0 },
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          ],
          data: getInitiateTransferInstructionDataEncoder().encode({}),
        };

        await send({ instructions: [instruction] });

        await fetchTransferRequests();
        return true;
      } catch (error) {
        console.error("Failed to initiate transfer:", error);
        throw error;
      } finally {
        setInitiating(false);
      }
    },
    [wallet, getIdentityPda, getTransferRequestPda, send, fetchTransferRequests]
  );

  const claimTransfer = useCallback(
    async (transferRequest: TransferRequestWithStatus) => {
      if (!wallet) throw new Error("Wallet not connected");

      setClaiming(true);
      try {
        const walletAddress = wallet.account.address;
        const oldOwner = transferRequest.fromOwner;
        const newOwner = walletAddress;

        const oldIdentityPda = await getIdentityPda(oldOwner);
        const newIdentityPda = await getIdentityPda(newOwner);
        const oldScorePda = await getScorePda(oldOwner);
        const newScorePda = await getScorePda(newOwner);

        const instruction = {
          programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
          accounts: [
            { address: oldIdentityPda, role: 1 },
            { address: newIdentityPda, role: 1 },
            { address: transferRequest.transferRequestAddress, role: 1 },
            { address: oldScorePda, role: 1 },
            { address: newScorePda, role: 1 },
            { address: oldOwner, role: 3 },
            { address: walletAddress, role: 3 },
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          ],
          data: getClaimTransferInstructionDataEncoder().encode({}),
        };

        await send({ instructions: [instruction] });

        await fetchTransferRequests();
        return true;
      } catch (error) {
        console.error("Failed to claim transfer:", error);
        throw error;
      } finally {
        setClaiming(false);
      }
    },
    [wallet, getIdentityPda, getScorePda, send, fetchTransferRequests]
  );

  const cancelTransfer = useCallback(
    async (transferRequest: TransferRequestWithStatus) => {
      if (!wallet) throw new Error("Wallet not connected");

      setCancelling(true);
      try {
        const instruction = {
          programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
          accounts: [
            { address: transferRequest.transferRequestAddress, role: 1 },
            { address: wallet.account.address, role: 3 },
          ],
          data: getCancelTransferInstructionDataEncoder().encode({}),
        };

        await send({ instructions: [instruction] });

        await fetchTransferRequests();
        return true;
      } catch (error) {
        console.error("Failed to cancel transfer:", error);
        throw error;
      } finally {
        setCancelling(false);
      }
    },
    [wallet, send, fetchTransferRequests]
  );

  const handleCancelModal = useCallback(
    (transfer: TransferRequestWithStatus | null) => {
      setSelectedTransfer(transfer);
      setShowCancelModal(transfer !== null);
    },
    []
  );

  return {
    initiating,
    claiming,
    cancelling,
    loading,
    transferRequests,
    showCancelModal,
    selectedTransfer,
    initiateTransfer,
    claimTransfer,
    cancelTransfer,
    refresh: fetchTransferRequests,
    handleCancelModal,
    setShowCancelModal,
  };
}
