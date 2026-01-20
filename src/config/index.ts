import { createSolanaRpc, type Address } from "@solana/kit";
import { IDENTITY_SCORE_PROGRAM_ADDRESS as ID_PROGRAM_ADDRESS } from "../generated/programs/identityScore";

export const RPC_ENDPOINT = "http://localhost:8899";
export const rpc = createSolanaRpc(RPC_ENDPOINT);
export const RPC_WEBSOCKET_ENDPOINT = "ws://localhost:8900";

export const SYSTEM_PROGRAM_ADDRESS =
  "11111111111111111111111111111111" as Address;
export const IDENTITY_SCORE_PROGRAM_ADDRESS = ID_PROGRAM_ADDRESS;

export const SEEDS = {
  IDENTITY: "identity",
  SCORE: "score",
};
