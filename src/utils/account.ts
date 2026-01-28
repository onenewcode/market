import { rpc } from "../config";
import {
  fetchMaybeIdentityAccount,
  type IdentityAccount,
} from "../generated/accounts/identityAccount";
import {
  fetchMaybeCreditScoreAccount,
  type CreditScoreAccount,
} from "../generated/accounts/creditScoreAccount";
import { type Address } from "@solana/kit";

export interface AccountData<T> {
  exists: boolean;
  data: T | null;
}

export async function fetchIdentityAccount(
  address: Address
): Promise<AccountData<IdentityAccount>> {
  try {
    const result = await fetchMaybeIdentityAccount(rpc, address);
    return {
      exists: result.exists,
      data: result.exists ? result.data : null,
    };
  } catch (error) {
    console.error("Failed to fetch identity account:", error);
    return { exists: false, data: null };
  }
}

export async function fetchCreditScoreAccount(
  address: Address
): Promise<AccountData<CreditScoreAccount>> {
  try {
    const result = await fetchMaybeCreditScoreAccount(rpc, address);
    return {
      exists: result.exists,
      data: result.exists ? result.data : null,
    };
  } catch (error) {
    console.error("Failed to fetch credit score account:", error);
    return { exists: false, data: null };
  }
}

export function isIdentityVerified(identity: IdentityAccount | null): boolean {
  return identity?.verified ?? false;
}

export function getIdentityStatus(identity: IdentityAccount | null): string {
  if (!identity) return "not_found";
  return identity.verified ? "verified" : "unverified";
}

export function getScoreLevel(score: number): "high" | "medium" | "low" {
  if (score >= 700) return "high";
  if (score >= 500) return "medium";
  return "low";
}
