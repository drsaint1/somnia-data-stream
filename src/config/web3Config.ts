import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { mainnet, sepolia } from "wagmi/chains";

export const somniaMainnet = {
  id: 50312,
  name: "Somnia Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "STT",
    symbol: "STT",
  },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network/"],
      webSocket: [] as string[],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://shannon-explorer.somnia.network/",
    },
  },
} as const;

export const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "STT",
    symbol: "STT",
  },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network/"],
      webSocket: [] as string[],
      // WebSocket not supported by Somnia RPC - Data Streams may have separate WS endpoint
      // webSocket: ["wss://dream-rpc.somnia.network/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://shannon-explorer.somnia.network/",
    },
  },
  testnet: true,
} as const;

export const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "your_project_id_here";

if (!projectId) throw new Error("Project ID is not defined");

const metadata = {
  name: "Car Race Game",
  description: "A thrilling 3D car racing game on Somnia",
  url: "https://your-domain.com",
  icons: ["https://your-domain.com/icon.png"],
};

const chains = [somniaMainnet, somniaTestnet, mainnet, sepolia] as const;
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});
