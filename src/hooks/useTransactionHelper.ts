import { useSendTransaction } from "@solana/react-hooks";
import { useWalletConnection } from "@solana/react-hooks";
import { useCallback } from "react";
import { type Address } from "@solana/kit";

export interface TransactionInstruction {
  programAddress: Address;
  accounts: { address: Address; role: number }[];
  data: Uint8Array | Buffer | Readonly<Uint8Array> | any;
}

export interface TransactionOptions {
  delayAfterSend?: number;
  onConfirm?: () => void | Promise<void>;
}

function isUserCancelledError(error: unknown): boolean {
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const userCancelPatterns = [
    "user rejected",
    "user cancelled",
    "transaction cancelled",
    "transaction plan failed to execute",
  ];
  return userCancelPatterns.some((pattern) => errorMsg.includes(pattern));
}

export function useTransactionHelper() {
  const { wallet } = useWalletConnection();
  const { send } = useSendTransaction();

  const sendTransaction = useCallback(
    async (
      instructions: TransactionInstruction | TransactionInstruction[],
      options: TransactionOptions = {}
    ): Promise<boolean> => {
      if (!wallet) {
        throw new Error("Wallet not connected");
      }

      const { delayAfterSend = 1000, onConfirm } = options;
      const instructionArray = Array.isArray(instructions)
        ? instructions
        : [instructions];

      try {
        await send({ instructions: instructionArray });

        if (delayAfterSend > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayAfterSend)
          );
        }

        if (onConfirm) {
          await onConfirm();
        }

        return true;
      } catch (error) {
        if (isUserCancelledError(error)) {
          console.warn("User cancelled transaction");
        } else {
          console.error("Transaction failed:", error);
        }
        throw error;
      }
    },
    [wallet, send]
  );

  return { sendTransaction };
}
