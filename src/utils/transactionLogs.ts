import { createSolanaRpc, type Signature } from "@solana/kit";
import { RPC_ENDPOINT } from "../config";

export interface TransactionLog {
  signature: string;
  logs: string[];
  timestamp?: number;
  error?: string;
}

export async function getTransactionLogs(
  signature: string | Signature
): Promise<TransactionLog | null> {
  try {
    const rpc = createSolanaRpc(RPC_ENDPOINT);

    const transaction = await rpc
      .getTransaction(signature as Signature, {
        encoding: "jsonParsed",
        commitment: "confirmed",
      })
      .send();

    if (!transaction) {
      console.error("Transaction not found:", signature);
      return null;
    }

    const logs = transaction.meta?.logMessages || [];
    const timestamp = transaction.blockTime
      ? Number(transaction.blockTime) * 1000
      : undefined;

    return {
      signature: String(signature),
      logs: [...logs],
      timestamp,
      error: transaction.meta?.err
        ? JSON.stringify(transaction.meta.err)
        : undefined,
    };
  } catch (error) {
    console.error("Failed to get transaction logs:", error);
    return null;
  }
}

export function parseProgramLogs(logs: string[]): {
  programLogs: string[];
  otherLogs: string[];
} {
  const programLogs: string[] = [];
  const otherLogs: string[] = [];

  for (const log of logs) {
    if (log.startsWith("Program log:")) {
      programLogs.push(log.substring("Program log:".length).trim());
    } else {
      otherLogs.push(log);
    }
  }

  return { programLogs, otherLogs };
}

export function formatTransactionLogs(logs: string[]): string {
  return logs.join("\n");
}

export function extractTransferLogs(logs: string[]): {
  initiation?: string[];
  claim?: string[];
  cancellation?: string[];
} {
  const result: {
    initiation?: string[];
    claim?: string[];
    cancellation?: string[];
  } = {};

  let currentSection: string[] | null = null;
  let sectionType: "initiation" | "claim" | "cancellation" | null = null;

  for (const log of logs) {
    if (log.includes("Transfer Initiation Started")) {
      currentSection = [];
      sectionType = "initiation";
    } else if (log.includes("Transfer Claim Started")) {
      currentSection = [];
      sectionType = "claim";
    } else if (log.includes("Transfer Cancellation Started")) {
      currentSection = [];
      sectionType = "cancellation";
    } else if (log.includes("Completed Successfully")) {
      if (currentSection && sectionType) {
        currentSection.push(log);
        result[sectionType] = [...currentSection];
      }
      currentSection = null;
      sectionType = null;
    } else if (currentSection) {
      currentSection.push(log);
    }
  }

  return result;
}
