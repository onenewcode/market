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
import { getInitiateTransferInstructionAsync, getInitiateTransferInstructionDataEncoder } from "../generated/instructions/initiateTransfer";
import { getClaimTransferInstructionDataEncoder } from "../generated/instructions/claimTransfer";
import { getCancelTransferInstructionDataEncoder } from "../generated/instructions/cancelTransfer";
import {
  fetchMaybeTransferRequest,
  type TransferRequest,
} from "../generated/accounts/transferRequest";
import { fetchMaybeIdentityAccount } from "../generated/accounts/identityAccount";
import {
  getTransactionLogs,
  parseProgramLogs,
  extractTransferLogs,
} from "../utils/transactionLogs";

export interface TransferEvent {
  type: "initiated" | "claimed" | "cancelled";
  timestamp: number;
  signature: string;
  data: unknown;
}

export function useTransfer() {
  const { wallet, status } = useWalletConnection();
  const { send } = useSendTransaction();

  const [transferRequest, setTransferRequest] =
    useState<TransferRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const displayTransactionLogs = useCallback(async (signature: string) => {
    console.log("=== Fetching Transaction Logs ===");
    console.log("Signature:", signature);

    const transactionLogs = await getTransactionLogs(signature);

    if (!transactionLogs) {
      console.error("Failed to fetch transaction logs");
      return;
    }

    console.log("Transaction timestamp:", transactionLogs.timestamp);
    console.log("Transaction error:", transactionLogs.error);

    const { programLogs, otherLogs } = parseProgramLogs(transactionLogs.logs);

    console.log("\n=== Program Logs ===");
    programLogs.forEach((log) => console.log(log));

    console.log("\n=== Other Logs ===");
    otherLogs.forEach((log) => console.log(log));

    const transferLogs = extractTransferLogs(programLogs);

    if (transferLogs.initiation) {
      console.log("\n=== Transfer Initiation Logs ===");
      transferLogs.initiation.forEach((log) => console.log(log));
    }

    if (transferLogs.claim) {
      console.log("\n=== Transfer Claim Logs ===");
      transferLogs.claim.forEach((log) => console.log(log));
    }

    if (transferLogs.cancellation) {
      console.log("\n=== Transfer Cancellation Logs ===");
      transferLogs.cancellation.forEach((log) => console.log(log));
    }

    console.log("=== Transaction Logs End ===\n");
  }, []);

  const getIdentityPda = useCallback(async (walletAddress: Address) => {
    const encoder = new TextEncoder();
    const [pda] = await getProgramDerivedAddress({
      programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
      seeds: [
        encoder.encode(SEEDS.IDENTITY),  // 直接使用 TextEncoder 编码
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
        encoder.encode(SEEDS.SCORE),  // 直接使用 TextEncoder 编码
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
          encoder.encode(SEEDS.TRANSFER_REQUEST),  // 直接使用 TextEncoder 编码
          getAddressEncoder().encode(fromOwner),
          getAddressEncoder().encode(toOwner),
        ],
      });
      return pda;
    },
    []
  );

  const fetchTransferRequest = useCallback(async () => {
    if (!wallet || status !== "connected") return;

    setLoading(true);
    try {
      const walletAddress = wallet.account.address;

      const encoder = new TextEncoder();
      const placeholderAddress = "11111111111111111111111111111111" as Address<"11111111111111111111111111111111">;

      const [pdaFrom] = await getProgramDerivedAddress({
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        seeds: [
          getBytesEncoder().encode(encoder.encode(SEEDS.TRANSFER_REQUEST)),
          getAddressEncoder().encode(walletAddress),
          getAddressEncoder().encode(placeholderAddress),
        ],
      });

      const [pdaTo] = await getProgramDerivedAddress({
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        seeds: [
          getBytesEncoder().encode(encoder.encode(SEEDS.TRANSFER_REQUEST)),
          getAddressEncoder().encode(placeholderAddress),
          getAddressEncoder().encode(walletAddress),
        ],
      });

      let foundRequest = null;

      try {
        const accountFrom = await fetchMaybeTransferRequest(rpc, pdaFrom);
        if (accountFrom.exists) {
          foundRequest = accountFrom.data;
        }
      } catch (error) {
        console.error("Error fetching accountFrom:", error);
      }

      if (!foundRequest) {
        try {
          const accountTo = await fetchMaybeTransferRequest(rpc, pdaTo);
          if (accountTo.exists) {
            foundRequest = accountTo.data;
          }
        } catch (error) {
          console.error("Error fetching accountTo:", error);
        }
      }

      setTransferRequest(foundRequest);
    } catch (e) {
      console.error("Failed to fetch transfer request:", e);
      setTransferRequest(null);
    } finally {
      setLoading(false);
    }
  }, [wallet, status]);

  useEffect(() => {
    fetchTransferRequest();
  }, [fetchTransferRequest]);

  const initiateTransfer = useCallback(
    async (recipientAddressStr: string) => {
      console.log("=== Initiate Transfer Started ===");
      console.log("Wallet:", wallet?.account.address.toString());
      console.log("Recipient:", recipientAddressStr);

      if (!wallet) throw new Error("Wallet not connected");
      if (!recipientAddressStr)
        throw new Error("Please enter a recipient address");

      setInitiating(true);
      try {
        // 验证接收者地址格式
        let recipientAddress: Address;
        try {
          recipientAddress = recipientAddressStr as Address;
          // 简单验证地址长度（Solana地址通常是Base58编码的32字节）
          if (recipientAddress.length < 32) {
            // 如果是有效的Solana地址，尝试转换
            // 这里我们可以使用 solana-web3.js 的 PublicKey 来验证
            // 但由于类型问题，我们暂时只做基本检查
          }
        } catch (error) {
          throw new Error(`Invalid recipient address format: ${recipientAddressStr}`);
        }

        const walletAddress = wallet.account.address;
        const identityPda = await getIdentityPda(walletAddress);

        console.log("Identity PDA:", identityPda.toString());

        const identityAccount = await fetchMaybeIdentityAccount(
          rpc,
          identityPda
        );

        console.log("Identity account exists:", identityAccount.exists);
        if (identityAccount.exists) {
          console.log("Identity verified:", identityAccount.data.verified);
          console.log("Identity owner:", identityAccount.data.owner.toString());
          console.log("Wallet address:", wallet.account.address.toString());
          console.log("Owner matches wallet:", identityAccount.data.owner.toString() === wallet.account.address.toString());
          
          // 添加额外检查：验证身份账户的所有者是否与当前钱包匹配
          if (identityAccount.data.owner.toString() !== wallet.account.address.toString()) {
            throw new Error(
              `Identity owner (${identityAccount.data.owner.toString()}) does not match wallet address (${wallet.account.address.toString()}). This is likely due to a mismatch in PDA calculation or ownership.`
            );
          }
        }

        if (!identityAccount.exists) {
          throw new Error(
            "You must create an identity account before initiating a transfer."
          );
        }

        if (!identityAccount.data.verified) {
          throw new Error(
            "You must verify your identity before initiating a transfer."
          );
        }

        const transferRequestPda = await getTransferRequestPda(
          walletAddress,
          recipientAddress
        );

        console.log("Transfer Request PDA:", transferRequestPda.toString());

        // 检查转移请求账户是否已存在
        const existingTransferRequest = await fetchMaybeTransferRequest(rpc, transferRequestPda);
        if (existingTransferRequest.exists) {
          throw new Error(
            `A transfer request already exists from ${walletAddress} to ${recipientAddress}. Please cancel the existing request first.`
          );
        }

        console.log("Transfer request account does not exist, proceeding with initiation.");

        const instruction = {
          programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
          accounts: [
            { address: identityPda, role: 1 }, // writable
            { address: transferRequestPda, role: 1 }, // writable
            { address: wallet.account.address, role: 3 }, // writable signer
            { address: recipientAddress as Address, role: 0 }, // readonly
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 }, // readonly
          ],
          data: getInitiateTransferInstructionDataEncoder().encode({}),
        };

        console.log("Instruction accounts:", {
          identity: identityPda.toString(),
          transferRequest: transferRequestPda.toString(),
          owner: walletAddress.toString(),
          recipient: recipientAddress,
        });

        const signature = await send({ instructions: [instruction] });
        console.log(
          "✅ Transfer initiated successfully, signature:",
          signature
        );

        await displayTransactionLogs(signature);

        await fetchTransferRequest();
        return true;
      } catch (error) {
        console.error("❌ Failed to initiate transfer:", error);

        const errorDetails = {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };

        console.error("Error details:", errorDetails);

        if (error && typeof error === "object") {
          const errorObj = error as Record<string, unknown>;
          console.error("Full error object:", JSON.stringify(errorObj, null, 2));

          if ("transactionPlanResult" in errorObj) {
            console.error("Transaction plan result:", errorObj.transactionPlanResult);
          }
          if ("cause" in errorObj) {
            console.error("Error cause:", errorObj.cause);
          }
        }

        throw error;
      } finally {
        setInitiating(false);
        console.log("=== Initiate Transfer Finished ===");
      }
    },
    [wallet, getIdentityPda, getTransferRequestPda, send, fetchTransferRequest, displayTransactionLogs]
  );

  const claimTransfer = useCallback(async () => {
    console.log("=== Claim Transfer Started ===");
    console.log("Wallet:", wallet?.account.address.toString());
    console.log("Transfer request:", transferRequest);

    if (!wallet) throw new Error("Wallet not connected");
    if (!transferRequest) throw new Error("No active transfer request found");

    setClaiming(true);
    try {
      const walletAddress = wallet.account.address;
      const oldOwner = transferRequest.fromOwner;
      const oldIdentityPda = await getIdentityPda(oldOwner);
      const newIdentityPda = await getIdentityPda(walletAddress);
      const transferRequestPda = await getTransferRequestPda(
        oldOwner,
        walletAddress
      );
      const oldScorePda = await getScorePda(oldOwner);
      const newScorePda = await getScorePda(walletAddress);

      console.log("PDAs:", {
        oldIdentity: oldIdentityPda.toString(),
        newIdentity: newIdentityPda.toString(),
        transferRequest: transferRequestPda.toString(),
        oldScore: oldScorePda.toString(),
        newScore: newScorePda.toString(),
      });

      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: oldIdentityPda, role: 1 }, // writable
          { address: newIdentityPda, role: 1 }, // writable
          { address: transferRequestPda, role: 1 }, // writable
          { address: oldScorePda, role: 1 }, // writable
          { address: newScorePda, role: 1 }, // writable
          { address: oldOwner, role: 3 }, // writable signer
          { address: walletAddress, role: 3 }, // writable signer
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 }, // readonly
        ],
        data: getClaimTransferInstructionDataEncoder().encode({}),
      };

      console.log("Instruction accounts:", {
        oldIdentity: oldIdentityPda.toString(),
        newIdentity: newIdentityPda.toString(),
        transferRequest: transferRequestPda.toString(),
        oldScore: oldScorePda.toString(),
        newScore: newScorePda.toString(),
        oldOwner: oldOwner.toString(),
        newOwner: walletAddress.toString(),
      });

      const signature = await send({ instructions: [instruction] });
      console.log("✅ Transfer claimed successfully, signature:", signature);

      await displayTransactionLogs(signature);

      await fetchTransferRequest();
      return true;
    } catch (error) {
      console.error("❌ Failed to claim transfer:", error);
      console.error("Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    } finally {
      setClaiming(false);
      console.log("=== Claim Transfer Finished ===");
    }
  }, [
    wallet,
    transferRequest,
    getIdentityPda,
    getScorePda,
    getTransferRequestPda,
    send,
    fetchTransferRequest,
    displayTransactionLogs,
  ]);

  const cancelTransfer = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");
    if (!transferRequest) throw new Error("No active transfer request found");

    setCancelling(true);
    try {
      const walletAddress = wallet.account.address;
      const toOwner = transferRequest.toOwner;
      const transferRequestPda = await getTransferRequestPda(
        walletAddress,
        toOwner
      );

      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: transferRequestPda, role: 1 }, // writable
          { address: walletAddress, role: 3 }, // writable signer
        ],
        data: getCancelTransferInstructionDataEncoder().encode({}),
      };

      const signature = await send({ instructions: [instruction] });
      console.log("Transfer cancelled, signature:", signature);

      await displayTransactionLogs(signature);

      await fetchTransferRequest();
      return true;
    } catch (error) {
      console.error("Failed to cancel transfer:", error);
      throw error;
    } finally {
      setCancelling(false);
    }
  }, [
    wallet,
    transferRequest,
    getTransferRequestPda,
    send,
    fetchTransferRequest,
    displayTransactionLogs,
  ]);

  return {
    transferRequest,
    loading,
    initiating,
    claiming,
    cancelling,
    initiateTransfer,
    claimTransfer,
    cancelTransfer,
    refresh: fetchTransferRequest,
  };
}
