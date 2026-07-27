# Private Polling — Privacy-Preserving Voting DApp on Midnight Network 🗳️

A zero-knowledge, privacy-preserving polling application built on the Midnight Network using Compact smart contracts. Users can create polls, cast votes, and view aggregate results without ever exposing their individual vote choices or identity.

---

## Contract Address

| Network | Contract Address |
|---------|------------------|
| Preprod | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

```env
CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

---

## Features

- 🗳️ **Private Voting**: Cast Yes, No, or Abstain votes protected by Zero-Knowledge proofs.
- 🔒 **Identity Protection**: Voters prove secret key ownership without revealing their identity or key.
- 📊 **Transparent Tallies**: Public ledger tracks aggregate vote counts (Yes, No, Abstain) in real time.
- 👑 **Creator Controls**: Only the poll creator can open/close polls, verified securely via ZK proof.
- 💻 **Multi-Interface**: Supports both interactive CLI (`private-polling-cli`) and modern web UI (`private-polling-ui`).

---

## What This Project Does

Private Polling allows users to conduct decentralized, transparent polls while preserving total vote privacy. 

In traditional voting systems, voters either trust a centralized server or make their votes public on a blockchain. Private Polling solves this using Midnight's ZK-proof architecture:
1. A user deploys the contract and creates a poll with a question.
2. Participants cast votes (Yes / No / Abstain).
3. The Midnight circuit generates a ZK proof locally on the voter's device.
4. The proof proves to the ledger that a valid vote was cast without linking the voter's identity to the specific choice.
5. Aggregate vote totals update on-chain for everyone to see.

---

## Privacy Model

### Public Information (Ledger State)
- `pollQuestion`: The question text being voted on.
- `pollState`: Poll status (`OPEN` or `CLOSED`).
- `yesVotes`: Aggregate counter of "Yes" votes.
- `noVotes`: Aggregate counter of "No" votes.
- `abstainVotes`: Aggregate counter of "Abstain" votes.
- `owner`: Hashed public key of the poll creator.
- `sequence`: Monotonic sequence counter.

### Private Information (Stays Local)
- `localSecretKey`: The voter's and creator's 32-byte secret key. It **never** leaves the local device or browser.

### ZK Proof Guarantees
- Voters prove they possess a valid secret key using `localSecretKey()` witness without disclosing it.
- Poll creators prove ownership via `derivedPublicKey()` inside ZK circuits without revealing the underlying secret key.
- Only public inputs/outputs are disclosed using Compact's explicit `disclose()` operator.

---

## Tech Stack

- **Smart Contract Language**: Compact `v0.23` (Midnight Network ZK Smart Contract language)
- **Runtime & SDKs**: `@midnight-ntwrk/midnight-js-contracts`, `@midnight-ntwrk/midnight-js-protocol`
- **Proof Server**: `midnightnetwork/proof-server:latest`
- **Frontend Framework**: React 19, TypeScript, Material-UI (MUI), Vite
- **Wallet Connector**: Midnight Lace Wallet (`@midnight-ntwrk/dapp-connector-api`)
- **CLI Interface**: Node.js, RxJS, Pino Logger, LevelDB private state provider

---

## Folder Structure

```
c:\Projects\midnightt lvl 1\
├── contract/                       # Compact smart contract code
│   ├── src/
│   │   ├── private-polling.compact # Core ZK smart contract
│   │   ├── witnesses.ts            # Private state witnesses
│   │   └── index.ts                # Contract exports & metadata
│   └── package.json
├── api/                            # Shared DApp contract API library
│   ├── src/
│   │   ├── common-types.ts         # TypeScript types & derived state
│   │   └── index.ts                # PrivatePollingAPI class
│   └── package.json
├── private-polling-cli/            # Command Line Interface
│   ├── src/
│   │   ├── index.ts                # Interactive CLI loops
│   │   └── config.ts               # Standalone / Preview / Preprod configs
│   └── package.json
├── private-polling-ui/             # React Web Application
│   ├── src/
│   │   ├── components/             # Polling UI components & cards
│   │   ├── contexts/               # Lace Wallet & deployment manager
│   │   └── App.tsx                 # Main application page
│   └── package.json
├── README.md                       # Comprehensive documentation
└── package.json                    # Workspace root package configuration
```

---

## Prerequisites

Before running or building this project locally:

1. **Node.js**: v22 or higher (`node -v`)
2. **Docker Desktop**: Installed and running (`docker info`)
3. **Midnight Lace Wallet**: Installed as browser extension
4. **Proof Server**:
   ```bash
   docker run -p 6300:6300 midnightnetwork/proof-server
   ```

---

## Installation

Install dependencies across all workspace packages:

```bash
npm install
cd api && npm install && cd ..
cd contract && npm install && cd ..
cd private-polling-cli && npm install && cd ..
cd private-polling-ui && npm install && cd ..
```

---

## Compile Compact Contract

To compile the `private-polling.compact` contract into ZK circuits and TypeScript bindings:

```bash
npm run compact
```

---

## Build

To build all sub-packages (contract, api, cli, ui):

```bash
npm run build
```

Build CLI specifically:

```bash
cd private-polling-cli
npm run build
cd ..
```

---

## Manual Deployment

Deployment is intentionally skipped in this submission. To deploy the contract to the Midnight Preprod testnet, execute:

```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preprod
```

---

## After Deployment

After deploying the contract:

1. Deploy the Compact contract using the command above.
2. Copy the deployed contract address from the deployment output.
3. Replace every occurrence of:
   ```
   <YOUR_DEPLOYED_CONTRACT_ADDRESS>
   ```
   in `README.md`, environment files, and frontend configuration with your actual contract address.

No additional code modifications are required!

---

## Environment Variables

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `VITE_NETWORK_ID` | Midnight network identifier | `preprod` |
| `CONTRACT_ADDRESS` | Deployed smart contract address | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

---

## Screenshots

*(Place screenshots of the CLI and React Web UI here after manual deployment)*

- `![Private Polling UI](https://via.placeholder.com/800x450?text=Private+Polling+UI+Screenshot)`
- `![Private Polling CLI](https://via.placeholder.com/800x450?text=Private+Polling+CLI+Screenshot)`

---

## Initial Idea

Selected Idea **#11 — Private Polling** from the Level 1 Challenge list. The goal is to allow anonymous voting on-chain where individual votes are confidential via ZK proofs, while aggregate tallies remain transparent and verifiable on the Midnight ledger.

---

## Troubleshooting

- **Proof Server Connection Failed**: Ensure Docker is running and proof server container is active on port 6300 (`docker run -p 6300:6300 midnightnetwork/proof-server`).
- **Lace Wallet Not Detected**: Ensure the Midnight Lace extension is enabled in your browser and connected to the Preprod network.
- **OutOfMemory Error during compilation**: Pass `NODE_OPTIONS="--max-old-space-size=12288"` to increase Node memory limits.
