import * as PrivatePolling from '../../contract/src/managed/private-polling/contract/index.js';

import { type ContractAddress, convertFieldToBytes } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type PrivatePollingDerivedState,
  type PrivatePollingContract,
  type PrivatePollingProviders,
  type DeployedPrivatePollingContract,
  privatePollingPrivateStateKey,
} from './common-types.js';
import { CompiledPrivatePollingContractContract } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { PrivatePollingPrivateState, createPrivatePollingPrivateState } from '../../contract/src/witnesses.js';

export interface DeployedPrivatePollingAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PrivatePollingDerivedState>;

  createPoll: (question: string) => Promise<void>;
  castVote: (choice: number) => Promise<void>;
  closePoll: () => Promise<void>;
}

export class PrivatePollingAPI implements DeployedPrivatePollingAPI {
  private constructor(
    public readonly deployedContract: DeployedPrivatePollingContract,
    providers: PrivatePollingProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => PrivatePolling.ledger(contractState.data.state)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  pollState: ledgerState.pollState === PrivatePolling.PollState.OPEN ? 'open' : 'closed',
                  owner: toHex(ledgerState.owner),
                },
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(privatePollingPrivateStateKey) as Promise<PrivatePollingPrivateState>),
      ],
      (ledgerState, privateState) => {
        const hashedSecretKey = PrivatePolling.pureCircuits.derivedPublicKey(
          privateState.secretKey,
          convertFieldToBytes(32, ledgerState.sequence, 'api/src/index.ts'),
        );

        return {
          pollState: ledgerState.pollState,
          pollQuestion: ledgerState.pollQuestion.value,
          yesVotes: ledgerState.yesVotes,
          noVotes: ledgerState.noVotes,
          abstainVotes: ledgerState.abstainVotes,
          sequence: ledgerState.sequence,
          isOwner: toHex(ledgerState.owner) === toHex(hashedSecretKey),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PrivatePollingDerivedState>;

  async createPoll(question: string): Promise<void> {
    this.logger?.info(`creatingPoll: ${question}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- callTx's circuit names need `provableCircuits`
    const txData = await (this.deployedContract.callTx as any).createPoll(question);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'createPoll',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async castVote(choice: number): Promise<void> {
    this.logger?.info(`castingVote: ${choice}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
    const txData = await (this.deployedContract.callTx as any).castVote(BigInt(choice));
    this.logger?.trace({
      transactionAdded: {
        circuit: 'castVote',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async closePoll(): Promise<void> {
    this.logger?.info('closingPoll');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
    const txData = await (this.deployedContract.callTx as any).closePoll();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'closePoll',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  static async deploy(providers: PrivatePollingProviders, logger?: Logger): Promise<PrivatePollingAPI> {
    logger?.info('deployContract');
    const deployedContract = await deployContract(providers, {
      compiledContract: CompiledPrivatePollingContractContract,
      privateStateId: privatePollingPrivateStateKey,
      initialPrivateState: createPrivatePollingPrivateState(utils.randomBytes(32)),
      args: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see common-types.ts for why
    } as any);

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedContract.deployTxData.public,
      },
    });

    return new PrivatePollingAPI(deployedContract, providers, logger);
  }

  static async join(
    providers: PrivatePollingProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<PrivatePollingAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedContract = await findDeployedContract<PrivatePollingContract>(providers, {
      contractAddress,
      compiledContract: CompiledPrivatePollingContractContract,
      privateStateId: privatePollingPrivateStateKey,
      initialPrivateState: await PrivatePollingAPI.getPrivateState(providers, contractAddress),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see deploy() above.
    } as any);

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedContract.deployTxData.public,
      },
    });

    return new PrivatePollingAPI(deployedContract, providers, logger);
  }

  private static async getPrivateState(
    providers: PrivatePollingProviders,
    contractAddress: ContractAddress,
  ): Promise<PrivatePollingPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(privatePollingPrivateStateKey);
    return existingPrivateState ?? createPrivatePollingPrivateState(utils.randomBytes(32));
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
