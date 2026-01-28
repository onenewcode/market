import { type Address } from "@solana/kit";

export interface BaseAccount {
  address: Address;
  exists: boolean;
}

export interface IdentityData {
  owner: Address;
  createdAt: bigint;
  verified: boolean;
  verifiedAt?: { __option: "Some"; value: bigint } | { __option: "None" };
}

export interface CreditScoreData {
  owner: Address;
  score: number;
  scoreLevel: number;
  calculatedAt: bigint;
}

export interface TransferRequestData {
  fromOwner: Address;
  toOwner: Address;
  createdAt: bigint;
  expiresAt: bigint;
}

export interface AccountFetcher<T> {
  fetch(address: Address): Promise<T | null>;
  exists(address: Address): Promise<boolean>;
}

export interface TransactionBuilder {
  addInstruction(instruction: any): void;
  build(): any[];
}

export interface WalletAdapter {
  address: Address;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
}

export interface ProgramInterface {
  programAddress: Address;
  createIdentity(walletAddress: Address): Promise<void>;
  verifyIdentity(walletAddress: Address): Promise<void>;
  unverifyIdentity(walletAddress: Address): Promise<void>;
  deleteIdentity(walletAddress: Address): Promise<void>;
  calculateScore(walletAddress: Address): Promise<void>;
  deleteScore(walletAddress: Address): Promise<void>;
  initiateTransfer(from: Address, to: Address): Promise<void>;
  claimTransfer(transferAddress: Address): Promise<void>;
  cancelTransfer(transferAddress: Address): Promise<void>;
}

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface AnalyticsTracker {
  trackEvent(eventName: string, properties?: Record<string, any>): void;
  trackError(error: Error, context?: Record<string, any>): void;
  trackPageView(pageName: string): void;
}

export interface NotificationService {
  showNotification(message: string, type: "success" | "error" | "warning" | "info"): void;
  showError(message: string): void;
  showSuccess(message: string): void;
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
}
