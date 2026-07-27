# Level 1 Midnight Builder Challenge Checklist

- [x] Phase 1: Environment & Project Setup
  - [x] Clone official `midnightntwrk/example-bboard` scaffold
  - [x] Rename folders (`bboard-cli` -> `private-polling-cli`, `bboard-ui` -> `private-polling-ui`)
  - [x] Update root `package.json` with workspace configuration & Node >=22.0.0
  - [x] Update workspace package names (`@midnight-ntwrk/private-polling-*`)

- [x] Phase 2: Compact Smart Contract Development
  - [x] Write `contract/src/private-polling.compact` with ledger, witnesses, and circuits (`createPoll`, `castVote`, `closePoll`, `derivedPublicKey`)
  - [x] Implement privacy model (aggregate public vote tallies, ZK secret key proofs, zero identity disclosure)
  - [x] Implement local secret key witness in `contract/src/witnesses.ts`
  - [x] Compile Compact ZK contract into circuits and TypeScript bindings via Docker WSL

- [x] Phase 3: Contract API Layer
  - [x] Define polling types and derived state in `api/src/common-types.ts`
  - [x] Implement `PrivatePollingAPI` class in `api/src/index.ts` with observables & transaction circuits

- [x] Phase 4: CLI Interface
  - [x] Update `private-polling-cli/src/index.ts` for poll creation, private voting, and tallies
  - [x] Configure Standalone, Preview, and Preprod environments in `private-polling-cli/src/config.ts`

- [x] Phase 5: Modern React Web Application
  - [x] Wire Lace Wallet connector in `BrowserDeployedBoardManager.ts`
  - [x] Implement interactive voting card with Yes / No / Abstain ZK voting in `Board.tsx`
  - [x] Support `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` placeholder and one-click copy address

- [x] Phase 6: Build & Compilation Verification
  - [x] `contract` package build verified
  - [x] `api` package build verified
  - [x] `private-polling-cli` build verified
  - [x] `private-polling-ui` build verified

- [x] Phase 7: Documentation & Deliverables
  - [x] Create comprehensive `README.md` with contract address table, privacy model, folder structure, build & deployment guides, screenshots placeholder, and initial idea statement.
