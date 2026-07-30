import { describe, expect, it } from "vitest";
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
  type CircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  ledger,
  pureCircuits,
  PollState,
} from "../managed/private-polling/contract/index.js";
import {
  witnesses,
  createPrivatePollingPrivateState,
  type PrivatePollingPrivateState,
} from "../witnesses";

// A dummy coin public key — only used to seed the local Zswap state that circuit
// execution requires; it has no bearing on the poll/voting logic under test.
const COIN_PUBLIC_KEY = "0".repeat(64);
const ZERO_SEQUENCE = new Uint8Array(32);

const secretKey = (byte: number): Uint8Array => new Uint8Array(32).fill(byte);

const deploy = (
  secret: Uint8Array,
): CircuitContext<PrivatePollingPrivateState> => {
  const contract = new Contract(witnesses);
  const constructorResult = contract.initialState(
    createConstructorContext(
      createPrivatePollingPrivateState(secret),
      COIN_PUBLIC_KEY,
    ),
  );
  return createCircuitContext(
    sampleContractAddress(),
    COIN_PUBLIC_KEY,
    constructorResult.currentContractState,
    constructorResult.currentPrivateState,
  );
};

const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString("hex");

describe("private-polling contract", () => {
  const contract = new Contract(witnesses);

  it("derivedPublicKey is deterministic for a given secret key", () => {
    const a = pureCircuits.derivedPublicKey(secretKey(1), ZERO_SEQUENCE);
    const b = pureCircuits.derivedPublicKey(secretKey(1), ZERO_SEQUENCE);
    expect(hex(a)).toEqual(hex(b));
  });

  it("derivedPublicKey differs across secret keys, so no two voters share an identity hash", () => {
    const a = pureCircuits.derivedPublicKey(secretKey(1), ZERO_SEQUENCE);
    const b = pureCircuits.derivedPublicKey(secretKey(2), ZERO_SEQUENCE);
    expect(hex(a)).not.toEqual(hex(b));
  });

  it("deploys closed, with no question and zeroed tallies", () => {
    const context = deploy(secretKey(1));
    const state = ledger(context.currentQueryContext.state);
    expect(state.pollState).toEqual(PollState.CLOSED);
    expect(state.pollQuestion.is_some).toBe(false);
    expect(state.yesVotes).toEqual(0n);
    expect(state.noVotes).toEqual(0n);
    expect(state.abstainVotes).toEqual(0n);
  });

  it("createPoll opens the poll and discloses only a hashed owner (never the secret key)", () => {
    const context = deploy(secretKey(1));
    const { context: after } = contract.impureCircuits.createPoll(
      context,
      "Should we ship v2?",
    );
    const state = ledger(after.currentQueryContext.state);
    expect(state.pollState).toEqual(PollState.OPEN);
    expect(state.pollQuestion).toEqual({
      is_some: true,
      value: "Should we ship v2?",
    });
    // The disclosed owner is a 32-byte hash, not the raw secret key.
    expect(state.owner).toHaveLength(32);
    expect(hex(state.owner)).not.toEqual(hex(secretKey(1)));
  });

  it("createPoll derives the same owner hash for the same secret key, and a different one for another", () => {
    const ownerFor = (secret: Uint8Array): string => {
      const { context: after } = contract.impureCircuits.createPoll(
        deploy(secret),
        "Q",
      );
      return hex(ledger(after.currentQueryContext.state).owner);
    };
    expect(ownerFor(secretKey(1))).toEqual(ownerFor(secretKey(1)));
    expect(ownerFor(secretKey(1))).not.toEqual(ownerFor(secretKey(2)));
  });

  it("castVote tallies choices publicly without recording who cast which vote", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");
    const afterYes1 = contract.impureCircuits.castVote(afterCreate.context, 0n);
    const afterYes2 = contract.impureCircuits.castVote(afterYes1.context, 0n);
    const afterNo = contract.impureCircuits.castVote(afterYes2.context, 1n);
    const afterAbstain = contract.impureCircuits.castVote(afterNo.context, 2n);

    const state = ledger(afterAbstain.context.currentQueryContext.state);
    expect(state.yesVotes).toEqual(2n);
    expect(state.noVotes).toEqual(1n);
    expect(state.abstainVotes).toEqual(1n);
  });

  it("rejects an out-of-range vote choice", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");
    expect(() =>
      contract.impureCircuits.castVote(afterCreate.context, 3n),
    ).toThrow();
  });

  it("rejects votes once the poll is closed", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");
    const afterClose = contract.impureCircuits.closePoll(afterCreate.context);
    expect(() =>
      contract.impureCircuits.castVote(afterClose.context, 0n),
    ).toThrow();
  });

  it("rejects opening a second poll while one is already open", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q1");
    expect(() =>
      contract.impureCircuits.createPoll(afterCreate.context, "Q2"),
    ).toThrow();
  });

  it("only the creator holding the matching secret key can close the poll", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");

    const impostorContext: CircuitContext<PrivatePollingPrivateState> = {
      ...afterCreate.context,
      currentPrivateState: createPrivatePollingPrivateState(secretKey(2)),
    };
    expect(() => contract.impureCircuits.closePoll(impostorContext)).toThrow();

    const { context: closed } = contract.impureCircuits.closePoll(
      afterCreate.context,
    );
    expect(ledger(closed.currentQueryContext.state).pollState).toEqual(
      PollState.CLOSED,
    );
  });
});
