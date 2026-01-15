import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren } from "react";
import { client } from "./solanaClient";

export function Providers({ children }: PropsWithChildren) {
  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
