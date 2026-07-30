import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { PollState } from '../../contract/src/managed/private-polling/contract/index.d.cts';
import type { PrivatePollingPrivateState } from '../../contract/src/index';

export const privatePollingPrivateStateKey = 'privatePollingPrivateState';
export type PrivateStateId = typeof privatePollingPrivateStateKey;

export type PrivateStates = {
  readonly privatePollingPrivateState: PrivatePollingPrivateState;
};

// The Compact-generated `Contract` class doesn't declare `provableCircuits`, which
// `midnight-js-contracts`'s `Contract.Any` constraint requires — `any` bridges that gap.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrivatePollingContract = any;

export type PrivatePollingCircuitKeys = 'createPoll' | 'castVote' | 'closePoll';

export type PrivatePollingProviders = MidnightProviders<
  PrivatePollingCircuitKeys,
  PrivateStateId,
  PrivatePollingPrivateState
>;

export type DeployedPrivatePollingContract = FoundContract<PrivatePollingContract>;

export type PrivatePollingDerivedState = {
  readonly pollState: PollState;
  readonly pollQuestion: string | undefined;
  readonly yesVotes: bigint;
  readonly noVotes: bigint;
  readonly abstainVotes: bigint;
  readonly sequence: bigint;
  readonly isOwner: boolean;
};
