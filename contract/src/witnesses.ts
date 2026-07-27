/*
 * Private Polling contract private state and witnesses.
 */

import type { Ledger } from "./managed/private-polling/contract/index.d.cts";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type PrivatePollingPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createPrivatePollingPrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, PrivatePollingPrivateState>): [
    PrivatePollingPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
