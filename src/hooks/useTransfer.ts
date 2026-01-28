import { useWalletConnection } from "@solana/react-hooks";
import { useState, useCallback, useEffect } from "react";
import { type Address } from "@solana/kit";
import {
  IDENTITY_SCORE_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  rpc,
} from "../config";
import { getInitiateTransferInstructionDataEncoder } from "../generated/instructions/initiateTransfer";
import { getClaimTransferInstructionDataEncoder } from "../generated/instructions/claimTransfer";
import { getCancelTransferInstructionDataEncoder } from "../generated/instructions/cancelTransfer";
import {
  fetchMaybeTransferRequest,
  type TransferRequest,
  TRANSFER_REQUEST_DISCRIMINATOR,
} from "../generated/accounts/transferRequest";
import { usePda } from "./usePda";
import { useTransactionHelper } from "./useTransactionHelper";
import { base64ToUint8Array } from "../utils/encoding";

export type TransferStatus = "pending" | "expired" | "claimed" | "cancelled";

export interface TransferRequestWithStatus extends TransferRequest {
  status: TransferStatus;
  transferRequestAddress: Address;
  isInitiator: boolean;
  isRecipient: boolean;
}

/**
 * 身份转移管理 Hook
 * 提供身份转移请求的发起、接收、取消等功能
 */
export function useTransfer() {
  const { wallet, status } = useWalletConnection();
  const { sendTransaction } = useTransactionHelper();
  const { getIdentityPda, getScorePda, getTransferRequestPda } = usePda();

  const [initiating, setInitiating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferRequests, setTransferRequests] = useState<
    TransferRequestWithStatus[]
  >([]);

  /**
   * 判断转移请求的状态
   * 根据过期时间判断请求是否已过期
   */
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

  /**
   * 获取所有与当前钱包相关的转移请求
   * 包括发起的和接收的请求
   */
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

  /**
   * 发起身份转移请求
   * 创建一个从当前钱包到目标钱包的转移请求
   */
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

        await sendTransaction(instruction, {
          onConfirm: fetchTransferRequests,
        });
        return true;
      } catch (error) {
        console.error("Failed to initiate transfer:", error);
        throw error;
      } finally {
        setInitiating(false);
      }
    },
    [
      wallet,
      getIdentityPda,
      getTransferRequestPda,
      sendTransaction,
      fetchTransferRequests,
    ]
  );

  /**
   * 接收身份转移请求
   * 将身份和信用分从发送方转移到接收方
   */
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

        await sendTransaction(instruction, {
          onConfirm: fetchTransferRequests,
        });
        return true;
      } catch (error) {
        console.error("Failed to claim transfer:", error);
        throw error;
      } finally {
        setClaiming(false);
      }
    },
    [
      wallet,
      getIdentityPda,
      getScorePda,
      sendTransaction,
      fetchTransferRequests,
    ]
  );

  /**
   * 取消身份转移请求
   * 取消当前钱包发起的转移请求
   */
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

        await sendTransaction(instruction, {
          onConfirm: fetchTransferRequests,
        });
        return true;
      } catch (error) {
        console.error("Failed to cancel transfer:", error);
        throw error;
      } finally {
        setCancelling(false);
      }
    },
    [wallet, sendTransaction, fetchTransferRequests]
  );

  return {
    initiating,
    claiming,
    cancelling,
    loading,
    transferRequests,
    initiateTransfer,
    claimTransfer,
    cancelTransfer,
    refresh: fetchTransferRequests,
  };
}
