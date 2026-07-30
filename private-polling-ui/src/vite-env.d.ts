/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Midnight network identifier: "preprod" | "preview" */
  readonly VITE_NETWORK_ID: string;
  /** Pino logger level */
  readonly VITE_LOGGING_LEVEL: string;
  /** Deployed Private Polling smart contract address on the selected network */
  readonly VITE_CONTRACT_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
