import { useWalletConnection } from "@solana/react-hooks";
import { useState, useCallback, useEffect } from "react";
import { rpc } from "../config";
import {
  fetchMaybeIdentityAccount,
  type IdentityAccount,
} from "../generated/accounts/identityAccount";
import { usePda } from "./usePda";
import { useTransactionHelper } from "./useTransactionHelper";
import { getCreateIdentityInstructionDataEncoder } from "../generated/instructions/createIdentity";
import { getVerifyIdentityInstructionDataEncoder } from "../generated/instructions/verifyIdentity";
import { getUnverifyIdentityInstructionDataEncoder } from "../generated/instructions/unverifyIdentity";
import { getDeleteIdentityInstructionDataEncoder } from "../generated/instructions/deleteIdentity";
import {
  IDENTITY_SCORE_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
} from "../config";

/**
 * 身份管理 Hook
 * 提供身份账户的创建、验证、取消验证、删除等核心业务功能
 */
export function useIdentity() {
  const { wallet, status } = useWalletConnection();
  const { sendTransaction } = useTransactionHelper();
  const { getIdentityPda, getScorePda } = usePda();

  // 身份账户数据
  const [identity, setIdentity] = useState<IdentityAccount | null>(null);
  // 加载状态
  const [loading, setLoading] = useState(false);
  // 创建操作状态
  const [creating, setCreating] = useState(false);
  // 验证操作状态
  const [verifying, setVerifying] = useState(false);
  // 取消验证操作状态
  const [unverifying, setUnverifying] = useState(false);
  // 删除操作状态
  const [deleting, setDeleting] = useState(false);
  // 身份账户是否存在
  const [exists, setExists] = useState(false);

  /**
   * 获取身份账户信息
   * 从链上查询当前钱包对应的身份账户数据
   */
  const fetchIdentity = useCallback(async () => {
    if (!wallet || status !== "connected") return;

    setLoading(true);
    try {
      const walletAddress = wallet.account.address;
      // 根据钱包地址计算身份账户的 PDA
      const pda = await getIdentityPda(walletAddress);
      // 从链上获取账户信息
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

  useEffect(() => {
    fetchIdentity();
  }, [fetchIdentity]);

  /**
   * 创建身份账户
   * 为当前钱包创建一个新的身份账户
   */
  const createIdentity = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setCreating(true);
    try {
      const walletAddress = wallet.account.address;
      const pda = await getIdentityPda(walletAddress);

      // 构建创建身份指令
      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: pda, role: 1 }, // 身份账户 (可写)
          { address: walletAddress, role: 3 }, // 签名者
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 }, // 系统程序
        ],
        data: getCreateIdentityInstructionDataEncoder().encode({}),
      };

      await sendTransaction(instruction, { onConfirm: fetchIdentity });
      return true;
    } catch (error) {
      console.error("Failed to create identity:", error);
      throw error;
    } finally {
      setCreating(false);
    }
  }, [wallet, getIdentityPda, sendTransaction, fetchIdentity]);

  /**
   * 验证身份
   * 将当前钱包的身份账户标记为已验证状态
   */
  const verifyIdentity = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setVerifying(true);
    try {
      const walletAddress = wallet.account.address;
      const pda = await getIdentityPda(walletAddress);

      // 构建验证身份指令
      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: pda, role: 1 }, // 身份账户 (可写)
          { address: walletAddress, role: 3 }, // 签名者
        ],
        data: getVerifyIdentityInstructionDataEncoder().encode({}),
      };

      await sendTransaction(instruction, { onConfirm: fetchIdentity });
      return true;
    } catch (error) {
      console.error("Failed to verify identity:", error);
      throw error;
    } finally {
      setVerifying(false);
    }
  }, [wallet, getIdentityPda, sendTransaction, fetchIdentity]);

  /**
   * 取消验证身份
   * 将当前钱包的身份账户标记为未验证状态
   */
  const unverifyIdentity = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");

    setUnverifying(true);
    try {
      const walletAddress = wallet.account.address;
      const pda = await getIdentityPda(walletAddress);

      // 构建取消验证身份指令
      const instruction = {
        programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
        accounts: [
          { address: pda, role: 1 }, // 身份账户 (可写)
          { address: walletAddress, role: 3 }, // 签名者
        ],
        data: getUnverifyIdentityInstructionDataEncoder().encode({}),
      };

      await sendTransaction(instruction, { onConfirm: fetchIdentity });
      return true;
    } catch (error) {
      console.error("Failed to unverify identity:", error);
      throw error;
    } finally {
      setUnverifying(false);
    }
  }, [wallet, getIdentityPda, sendTransaction, fetchIdentity]);

  /**
   * 删除身份账户
   * 删除当前钱包的身份账户及其关联的分数账户
   * 并回收账户租金
   */
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
          { address: identityPda, role: 1 },
          { address: scorePda, role: 1 },
          { address: walletAddress, role: 3 },
          { address: SYSTEM_PROGRAM_ADDRESS, role: 0 },
        ],
        data: getDeleteIdentityInstructionDataEncoder().encode({}),
      };

      await sendTransaction(instruction, { onConfirm: fetchIdentity });
      return true;
    } catch (error) {
      console.error("Failed to delete identity:", error);
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [wallet, getIdentityPda, getScorePda, sendTransaction, fetchIdentity]);

  return {
    identity,
    loading,
    creating,
    verifying,
    unverifying,
    deleting,
    exists,
    createIdentity,
    verifyIdentity,
    unverifyIdentity,
    deleteIdentity,
    refresh: fetchIdentity,
  };
}
