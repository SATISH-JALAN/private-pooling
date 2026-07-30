/**
 * usePollingContract
 *
 * Custom React hook that exposes all smart contract interactions for the
 * Private Polling dApp. This is the single source of truth for every
 * circuit call made from the frontend.
 *
 * Circuit calls (ZK-proven on-chain transactions):
 *   - createPoll(question)  → calls the `createPoll` Compact circuit
 *   - castVote(choice)      → calls the `castVote` Compact circuit (0=Yes, 1=No, 2=Abstain)
 *   - closePoll()           → calls the `closePoll` Compact circuit (creator only)
 *
 * The hook manages:
 *   - Deploying a new poll contract
 *   - Joining an existing poll contract by address
 *   - Subscribing to live poll state via the indexer observable
 *   - Exposing loading and error states to the UI
 */

import { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Observable } from 'rxjs';
import { type DeployedPrivatePollingAPI, type PrivatePollingDerivedState } from '../../../api/src/index';
import { type BoardDeployment } from '../contexts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContractAction = 'createPoll' | 'castVote' | 'closePoll' | 'deploy' | 'join' | null;

export interface UsePollingContractResult {
  /** Current derived state from the on-chain ledger */
  pollState: PrivatePollingDerivedState | null;

  /** The deployed contract address, if available */
  contractAddress: ContractAddress | null;

  /** Whether any contract action is in progress */
  isLoading: boolean;

  /** The current action being performed, for granular UI feedback */
  currentAction: ContractAction;

  /** Last error message, if any */
  error: string | null;

  /**
   * Creates a new poll with the given question.
   * Calls the `createPoll` Compact circuit.
   * @param question - The poll question text
   */
  createPoll: (question: string) => Promise<void>;

  /**
   * Casts a vote on the current open poll.
   * Calls the `castVote` Compact circuit.
   * @param choice - 0 = Yes, 1 = No, 2 = Abstain
   */
  castVote: (choice: 0 | 1 | 2) => Promise<void>;

  /**
   * Closes the current open poll (creator only).
   * Calls the `closePoll` Compact circuit.
   */
  closePoll: () => Promise<void>;

  /** Clears the current error message */
  clearError: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param boardDeployment$ - Observable stream of the board deployment status.
 *   Provided by `BrowserDeployedBoardManager` via the `DeployedBoardContext`.
 *   Pass `undefined` for the "not yet deployed" empty state card.
 */
export function usePollingContract(
  boardDeployment$: Observable<BoardDeployment> | undefined,
): UsePollingContractResult {
  const [api, setApi] = useState<DeployedPrivatePollingAPI | null>(null);
  const [pollState, setPollState] = useState<PrivatePollingDerivedState | null>(null);
  const [contractAddress, setContractAddress] = useState<ContractAddress | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!boardDeployment$);
  const [currentAction, setCurrentAction] = useState<ContractAction>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to deployment observable
  useEffect(() => {
    if (!boardDeployment$) return;

    const sub = boardDeployment$.subscribe((deployment) => {
      if (deployment.status === 'in-progress') {
        setIsLoading(true);
        setCurrentAction('deploy');
        return;
      }

      setIsLoading(false);
      setCurrentAction(null);

      if (deployment.status === 'failed') {
        setError(
          deployment.error.message.length
            ? deployment.error.message
            : 'Encountered an unexpected error during deployment.',
        );
        return;
      }

      // Deployment succeeded
      const deployedApi = deployment.api;
      setApi(deployedApi);
      setContractAddress(deployedApi.deployedContractAddress);

      // Subscribe to live on-chain state
      const stateSub = deployedApi.state$.subscribe(setPollState);
      return () => stateSub.unsubscribe();
    });

    return () => sub.unsubscribe();
  }, [boardDeployment$]);

  // ── Circuit calls ──────────────────────────────────────────────────────────

  /**
   * createPoll — calls the `createPoll` Compact circuit.
   * Creates a new poll with the given question on the deployed contract.
   */
  const createPoll = useCallback(
    async (question: string): Promise<void> => {
      if (!api || !question.trim()) return;
      setIsLoading(true);
      setCurrentAction('createPoll');
      setError(null);
      try {
        await api.createPoll(question.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
        setCurrentAction(null);
      }
    },
    [api],
  );

  /**
   * castVote — calls the `castVote` Compact circuit.
   * Casts a ZK-proven private vote: 0 = Yes, 1 = No, 2 = Abstain.
   * The voter's choice is never recorded on-chain — only the aggregate tally updates.
   */
  const castVote = useCallback(
    async (choice: 0 | 1 | 2): Promise<void> => {
      if (!api) return;
      setIsLoading(true);
      setCurrentAction('castVote');
      setError(null);
      try {
        await api.castVote(choice);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
        setCurrentAction(null);
      }
    },
    [api],
  );

  /**
   * closePoll — calls the `closePoll` Compact circuit.
   * Only the poll creator can close a poll (verified by ZK proof of secret key ownership).
   */
  const closePoll = useCallback(async (): Promise<void> => {
    if (!api) return;
    setIsLoading(true);
    setCurrentAction('closePoll');
    setError(null);
    try {
      await api.closePoll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  }, [api]);

  const clearError = useCallback(() => setError(null), []);

  return {
    pollState,
    contractAddress,
    isLoading,
    currentAction,
    error,
    createPoll,
    castVote,
    closePoll,
    clearError,
  };
}
