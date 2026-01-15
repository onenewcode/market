import { autoDiscover, createClient } from "@solana/client";
import { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "./config";

export const client = createClient({
  endpoint: RPC_ENDPOINT,
  websocketEndpoint: RPC_WEBSOCKET_ENDPOINT,
  walletConnectors: autoDiscover(),
});
