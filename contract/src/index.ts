import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/private-polling/contract/index.js";
export * from "./witnesses";

import * as CompiledPrivatePollingContract from "./managed/private-polling/contract/index.js";
import * as Witnesses from "./witnesses";

// The Compact-generated `Contract` class doesn't declare `provableCircuits`, which the
// `compact-js` effect API's `Contract` type requires — casting through `any` here bridges
// that structural gap; the property is unused by anything this project calls at runtime.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const CompiledPrivatePollingContractContract = (
  CompiledContract.make as any
)("PrivatePolling", CompiledPrivatePollingContract.Contract).pipe(
  (CompiledContract.withWitnesses as any)(Witnesses.witnesses),
  (CompiledContract.withCompiledFileAssets as any)("./managed/private-polling"),
);
/* eslint-enable @typescript-eslint/no-explicit-any */
