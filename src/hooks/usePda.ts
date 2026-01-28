import { useCallback } from "react";
import {
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
  type Address,
} from "@solana/kit";
import { IDENTITY_SCORE_PROGRAM_ADDRESS, SEEDS } from "../config";

export function usePda() {
  const getIdentityPda = useCallback(async (walletAddress: Address) => {
    const encoder = new TextEncoder();
    const [pda] = await getProgramDerivedAddress({
      programAddress: IDENTITY_SCORE_PROGRAM_ADDRESS,
      seeds: [
        getBytesEncoder().encode(encoder.encode(SEEDS.IDENTITY)),
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
        getBytesEncoder().encode(encoder.encode(SEEDS.SCORE)),
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
          getBytesEncoder().encode(encoder.encode(SEEDS.TRANSFER_REQUEST)),
          getAddressEncoder().encode(fromOwner),
          getAddressEncoder().encode(toOwner),
        ],
      });
      return pda;
    },
    []
  );

  return {
    getIdentityPda,
    getScorePda,
    getTransferRequestPda,
  };
}
