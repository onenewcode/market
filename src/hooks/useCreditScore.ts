import {
  useWalletConnection,
  useTransactionPool,
  useWalletSession,
} from "@solana/react-hooks";
import { useState, useCallback, useEffect } from "react";
import { type Address } from "@solana/kit";
import {
  IDENTITY_SCORE_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  rpc,
} from "../config";
import { getCalculateScoreInstructionDataEncoder } from "../generated/instructions/calculateScore";
import { getCreateIdentityInstructionDataEncoder } from "../generated/instructions/createIdentity";
import { getDeleteScoreInstructionDataEncoder } from "../generated/instructions/deleteScore";
import {
  fetchMaybeCreditScoreAccount,
  type CreditScoreAccount,
} from "../generated/accounts/creditScoreAccount";
import { fetchMaybeIdentityAccount } from "../generated/accounts/identityAccount";
import { client } from "../solanaClient";
import { usePda } from "./usePda";
import { useTransactionHelper } from "./useTransactionHelper";

/**
 * 信用分管理 Hook
 * 提供信用分计算、删除等功能，支持自动创建未验证的身份
 */
export function useCreditScore() {
  const { wallet } = useWalletConnection();
  const { sendTransaction } = useTransactionHelper();
  const pool = useTransactionPool();
  const session = useWalletSession();
  const { getIdentityPda, getScorePda } = usePda();

  const [scoreData, setScoreData] = useState<CreditScoreAccount | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cachedScorePda, setCachedScorePda] = useState<Address | null>(null);
  const [cachedIdentityPda, setCachedIdentityPda] = useState<Address | null>(
    null
  );

  /**
   * 计算信用分
   * 根据钱包活动计算信用分，如果身份未验证则自动创建并验证身份
   */
  const calculateScore = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setCalculating(true);
    try {
      const logStyle =
        "background:#fff3cd;color:#664d03;font-weight:600;padding:2px 6px;border-radius:4px;border:1px solid #ffeeba";
      const walletAddress = wallet.account.address;
      const [scorePda, identityPda] = await Promise.all([
        cachedScorePda ?? getScorePda(walletAddress),
        cachedIdentityPda ?? getIdentityPda(walletAddress),
      ]);

      const instructions: {
        programAddress: Address;
        accounts: { address: Address; role: number }[];
        data: Uint8Array | Buffer | Readonly<Uint8Array>;
      }[] = [];

      const identityAccount = await fetchMaybeIdentityAccount(rpc, identityPda);
      if (!identityAccount.exists) {
        instructions.push({
          programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
          accounts: [
            { address: identityPda, role: 1 },
            { address: walletAddress, role: 3 },
            { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
          ],
          data: new Uint8Array(
            getCreateIdentityInstructionDataEncoder().encode({})
          ),
        });
        console.log(
          "%c[CreditScore] Adding createIdentity instruction",
          logStyle
        );
      } else if (!identityAccount.data.verified) {
        throw new Error(
          "Identity not verified. Please verify your identity first."
        );
      }

      instructions.push({
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: scorePda, role: 1 },
          { address: identityPda, role: 0 },
          { address: walletAddress, role: 3 },
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
        ],
        data: new Uint8Array(
          getCalculateScoreInstructionDataEncoder().encode({})
        ),
      });

      const tSendStart = performance.now();
      const sendOnce = async () => {
        if (session) {
          pool.replaceInstructions(instructions);
          await pool.prepareAndSend({ authority: session, version: "legacy" });
        } else {
          await sendTransaction(instructions);
        }
      };
      try {
        await sendOnce();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Blockhash not found")) {
          await sendOnce();
        } else {
          throw e;
        }
      }

      console.log(
        "%c[CreditScore] 交易发送耗时: " +
          (performance.now() - tSendStart).toFixed(0) +
          "ms",
        logStyle
      );
      return true;
    } catch (error) {
      console.error("Failed to calculate score:", error);
      throw error;
    } finally {
      setCalculating(false);
    }
  }, [
    wallet,
    getScorePda,
    getIdentityPda,
    cachedScorePda,
    cachedIdentityPda,
    pool,
    session,
    sendTransaction,
  ]);

  /**
   * 删除信用分账户
   * 删除当前钱包的信用分账户并回收租金
   */
  const deleteScore = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setDeleting(true);
    try {
      const walletAddress = wallet.account.address;
      const scorePda = await getScorePda(walletAddress);
      const identityPda = await getIdentityPda(walletAddress);

      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: scorePda, role: 1 },
          { address: identityPda, role: 0 },
          { address: walletAddress, role: 3 },
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
        ],
        data: new Uint8Array(getDeleteScoreInstructionDataEncoder().encode({})),
      };

      await sendTransaction(instruction, {
        onConfirm: async () => {
          const maybe = await fetchMaybeCreditScoreAccount(rpc, scorePda);
          if (maybe.exists) {
            setScoreData(maybe.data);
          } else {
            setScoreData(null);
          }
        },
      });
      return true;
    } catch (error) {
      console.error("Failed to delete score:", error);
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [wallet, getScorePda, getIdentityPda, sendTransaction]);

  useEffect(() => {
    const run = async () => {
      if (!wallet) return;
      const addr = wallet.account.address;
      const score = await getScorePda(addr);
      const identity = await getIdentityPda(addr);
      setCachedScorePda(score);
      setCachedIdentityPda(identity);
    };
    run();
  }, [wallet, getScorePda, getIdentityPda]);

  useEffect(() => {
    if (!wallet || !cachedScorePda) return;
    let active = true;
    const watcher = client.watchers.watchAccount(
      { address: cachedScorePda },
      async () => {
        if (!active) return;
        try {
          const maybe = await fetchMaybeCreditScoreAccount(rpc, cachedScorePda);
          if (maybe.exists) {
            setScoreData(maybe.data);
          }
        } catch (e) {
          void e;
        }
      }
    );
    (async () => {
      try {
        const maybe = await fetchMaybeCreditScoreAccount(rpc, cachedScorePda);
        if (maybe.exists) setScoreData(maybe.data);
      } catch (e) {
        void e;
      }
    })();
    return () => {
      active = false;
      watcher.abort();
    };
  }, [wallet, cachedScorePda]);

  return {
    scoreData,
    calculating,
    deleting,
    calculateScore,
    deleteScore,
  };
}
