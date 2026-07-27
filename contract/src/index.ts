import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/private-polling/contract/index.js";
export * from "./witnesses";

import * as CompiledPrivatePollingContract from "./managed/private-polling/contract/index.js";
import * as Witnesses from "./witnesses";

export const CompiledPrivatePollingContractContract = (CompiledContract.make as any)(
  "PrivatePolling",
  CompiledPrivatePollingContract.Contract,
).pipe(
  (CompiledContract.withWitnesses as any)(Witnesses.witnesses),
  (CompiledContract.withCompiledFileAssets as any)("./managed/private-polling"),
);
