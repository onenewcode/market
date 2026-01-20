import {
  useWalletConnection,
  useSendTransaction,
  useTransactionPool,
  useWalletSession,
} from "@solana/react-hooks";
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
import { getCalculateScoreInstructionDataEncoder } from "../generated/instructions/calculateScore";
import { getCreateIdentityInstructionDataEncoder } from "../generated/instructions/createIdentity";
import {
  fetchMaybeCreditScoreAccount,
  type CreditScoreAccount,
} from "../generated/accounts/creditScoreAccount";
import { fetchMaybeIdentityAccount } from "../generated/accounts/identityAccount";
import { client } from "../solanaClient";

export function useCreditScore() {
  const { wallet } = useWalletConnection();
  const { send } = useSendTransaction();
  const pool = useTransactionPool();
  const session = useWalletSession();

  const [scoreData, setScoreData] = useState<CreditScoreAccount | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [cachedScorePda, setCachedScorePda] = useState<Address | null>(null);
  const [cachedIdentityPda, setCachedIdentityPda] = useState<Address | null>(
    null
  );

  const getPda = useCallback(async (seed: string, walletAddress: Address) => {
    const encoder = new TextEncoder();
    const [pda] = await getProgramDerivedAddress({
      programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
      seeds: [
        getBytesEncoder().encode(encoder.encode(seed)),
        getAddressEncoder().encode(walletAddress),
      ],
    });
    return pda;
  }, []);

  const calculateScore = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setCalculating(true);
    try {
      const logStyle =
        "background:#fff3cd;color:#664d03;font-weight:600;padding:2px 6px;border-radius:4px;border:1px solid #ffeeba";
      const walletAddress = wallet.account.address;
      const [scorePda, identityPda] = await Promise.all([
        cachedScorePda ?? getPda(SEEDS.SCORE, walletAddress),
        cachedIdentityPda ?? getPda(SEEDS.IDENTITY, walletAddress),
      ]);

      const instructions: {
        programAddress: Address;
        accounts: { address: Address; role: number }[];
        data: Uint8Array;
      }[] = [];

      // Check if identity exists and is verified
      const identityAccount = await fetchMaybeIdentityAccount(rpc, identityPda);
      if (!identityAccount.exists) {
        instructions.push({
          programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
          accounts: [
            { address: identityPda, role: 1 }, // Writable
            { address: walletAddress, role: 3 }, // WritableSigner
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
          await send({ instructions });
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
  }, [wallet, getPda, send, cachedScorePda, cachedIdentityPda, pool, session]);

  useEffect(() => {
    const run = async () => {
      if (!wallet) return;
      const addr = wallet.account.address;
      const score = await getPda(SEEDS.SCORE, addr);
      const identity = await getPda(SEEDS.IDENTITY, addr);
      setCachedScorePda(score);
      setCachedIdentityPda(identity);
    };
    run();
  }, [wallet, getPda]);

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
    calculateScore,
  };
}
