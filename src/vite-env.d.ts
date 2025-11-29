/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_SOMNIA_RPC_URL: string
  readonly VITE_SOMNIA_CHAIN_ID: string
  readonly VITE_RACING_CONTRACT_ADDRESS: string
  readonly VITE_RACING_TOKEN_ADDRESS: string
  readonly VITE_TOURNAMENTS_CONTRACT_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
