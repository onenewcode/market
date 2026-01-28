import { type Address, type ReadonlyUint8Array } from "@solana/kit";
import {
  IDENTITY_SCORE_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  rpc,
} from "../config";
import { getCreateIdentityInstructionDataEncoder } from "../generated/instructions/createIdentity";
import { getVerifyIdentityInstructionDataEncoder } from "../generated/instructions/verifyIdentity";
import { getUnverifyIdentityInstructionDataEncoder } from "../generated/instructions/unverifyIdentity";
import { getDeleteIdentityInstructionDataEncoder } from "../generated/instructions/deleteIdentity";
import { getCalculateScoreInstructionDataEncoder } from "../generated/instructions/calculateScore";
import { getDeleteScoreInstructionDataEncoder } from "../generated/instructions/deleteScore";
import { getInitiateTransferInstructionDataEncoder } from "../generated/instructions/initiateTransfer";
import { getClaimTransferInstructionDataEncoder } from "../generated/instructions/claimTransfer";
import { getCancelTransferInstructionDataEncoder } from "../generated/instructions/cancelTransfer";
import {
  fetchMaybeIdentityAccount,
  type IdentityAccount,
} from "../generated/accounts/identityAccount";
import {
  fetchMaybeCreditScoreAccount,
  type CreditScoreAccount,
} from "../generated/accounts/creditScoreAccount";
import {
  fetchMaybeTransferRequest,
  type TransferRequest,
} from "../generated/accounts/transferRequest";

export interface Instruction {
  programAddress: Address;
  accounts: { address: Address; role: number }[];
  data: Uint8Array | Buffer | ReadonlyUint8Array;
}

export class IdentityScoreService {
  private programAddress: Address;
  private systemProgramAddress: Address;

  constructor() {
    this.programAddress = IDENTITY_SCORE_PROGRAM_ADDRESS;
    this.systemProgramAddress = SYSTEM_PROGRAM_ADDRESS;
  }

  async fetchIdentity(address: Address): Promise<IdentityAccount | null> {
    try {
      const result = await fetchMaybeIdentityAccount(rpc, address);
      return result.exists ? result.data : null;
    } catch (error) {
      console.error("Failed to fetch identity:", error);
      return null;
    }
  }

  async fetchCreditScore(address: Address): Promise<CreditScoreAccount | null> {
    try {
      const result = await fetchMaybeCreditScoreAccount(rpc, address);
      return result.exists ? result.data : null;
    } catch (error) {
      console.error("Failed to fetch credit score:", error);
      return null;
    }
  }

  async fetchTransferRequest(
    address: Address
  ): Promise<TransferRequest | null> {
    try {
      const result = await fetchMaybeTransferRequest(rpc, address);
      return result.exists ? result.data : null;
    } catch (error) {
      console.error("Failed to fetch transfer request:", error);
      return null;
    }
  }

  createIdentityInstruction(
    identityPda: Address,
    walletAddress: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: identityPda, role: 1 },
        { address: walletAddress, role: 3 },
        { address: this.systemProgramAddress, role: 0 },
      ],
      data: getCreateIdentityInstructionDataEncoder().encode({}),
    };
  }

  verifyIdentityInstruction(
    identityPda: Address,
    walletAddress: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: identityPda, role: 1 },
        { address: walletAddress, role: 3 },
      ],
      data: getVerifyIdentityInstructionDataEncoder().encode({}),
    };
  }

  unverifyIdentityInstruction(
    identityPda: Address,
    walletAddress: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: identityPda, role: 1 },
        { address: walletAddress, role: 3 },
      ],
      data: getUnverifyIdentityInstructionDataEncoder().encode({}),
    };
  }

  deleteIdentityInstruction(
    identityPda: Address,
    scorePda: Address,
    walletAddress: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: identityPda, role: 1 },
        { address: scorePda, role: 1 },
        { address: walletAddress, role: 3 },
        { address: this.systemProgramAddress, role: 0 },
      ],
      data: getDeleteIdentityInstructionDataEncoder().encode({}),
    };
  }

  calculateScoreInstruction(
    scorePda: Address,
    identityPda: Address,
    walletAddress: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: scorePda, role: 1 },
        { address: identityPda, role: 0 },
        { address: walletAddress, role: 3 },
        { address: this.systemProgramAddress, role: 0 },
      ],
      data: getCalculateScoreInstructionDataEncoder().encode({}),
    };
  }

  deleteScoreInstruction(
    scorePda: Address,
    identityPda: Address,
    walletAddress: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: scorePda, role: 1 },
        { address: identityPda, role: 0 },
        { address: walletAddress, role: 3 },
        { address: this.systemProgramAddress, role: 0 },
      ],
      data: getDeleteScoreInstructionDataEncoder().encode({}),
    };
  }

  initiateTransferInstruction(
    identityPda: Address,
    transferRequestPda: Address,
    walletAddress: Address,
    recipientAddress: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: identityPda, role: 1 },
        { address: transferRequestPda, role: 1 },
        { address: walletAddress, role: 3 },
        { address: recipientAddress, role: 0 },
        { address: this.systemProgramAddress, role: 0 },
      ],
      data: getInitiateTransferInstructionDataEncoder().encode({}),
    };
  }

  claimTransferInstruction(
    oldIdentityPda: Address,
    newIdentityPda: Address,
    transferRequestPda: Address,
    oldScorePda: Address,
    newScorePda: Address,
    oldOwner: Address,
    newOwner: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: oldIdentityPda, role: 1 },
        { address: newIdentityPda, role: 1 },
        { address: transferRequestPda, role: 1 },
        { address: oldScorePda, role: 1 },
        { address: newScorePda, role: 1 },
        { address: oldOwner, role: 3 },
        { address: newOwner, role: 3 },
        { address: this.systemProgramAddress, role: 0 },
      ],
      data: getClaimTransferInstructionDataEncoder().encode({}),
    };
  }

  cancelTransferInstruction(
    transferRequestPda: Address,
    walletAddress: Address
  ): Instruction {
    return {
      programAddress: this.programAddress,
      accounts: [
        { address: transferRequestPda, role: 1 },
        { address: walletAddress, role: 3 },
      ],
      data: getCancelTransferInstructionDataEncoder().encode({}),
    };
  }
}

export const identityScoreService = new IdentityScoreService();
