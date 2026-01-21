import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren } from "react";
import { client } from "./solanaClient";
import { AlertProvider } from "./hooks/useAlert";

export function Providers({ children }: PropsWithChildren) {
  return (
    <SolanaProvider client={client}>
      <AlertProvider>{children}</AlertProvider>
    </SolanaProvider>
  );
}
