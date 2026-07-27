// Private Polling CLI — Midnight DApp

import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  PrivatePollingAPI,
  type PrivatePollingDerivedState,
  privatePollingPrivateStateKey,
  type PrivatePollingProviders,
  type DeployedPrivatePollingContract,
  type PrivateStateId,
} from '../../api/src/index';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import type { Ledger, PollState } from '../../contract/src/managed/private-polling/contract/index.d.cts';
import { ledger } from '../../contract/src/managed/private-polling/contract/index.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider';
import { randomBytes } from '../../api/src/utils';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils';
import { generateDust } from './generate-dust';
import { PrivatePollingPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

export const getPollingLedgerState = async (
  providers: PrivatePollingProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data as any) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new private polling contract
  2. Join an existing private polling contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (providers: PrivatePollingProviders, rli: Interface, logger: Logger): Promise<PrivatePollingAPI | null> => {
  let api: PrivatePollingAPI | null = null;

  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        api = await PrivatePollingAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      case '2':
        api = await PrivatePollingAPI.join(providers, await rli.question('What is the contract address (in hex)? '), logger);
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const displayLedgerState = async (
  providers: PrivatePollingProviders,
  deployedContract: DeployedPrivatePollingContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedContract.deployTxData.public.contractAddress;
  const ledgerState = await getPollingLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`There is no private polling contract deployed at ${contractAddress}`);
  } else {
    const status = (ledgerState.pollState as number) === 1 ? 'OPEN' : 'CLOSED';
    const question = !ledgerState.pollQuestion.is_some ? 'none' : ledgerState.pollQuestion.value;
    logger.info(`Current poll status: '${status}'`);
    logger.info(`Poll question: '${question}'`);
    logger.info(`Votes: Yes = ${ledgerState.yesVotes}, No = ${ledgerState.noVotes}, Abstain = ${ledgerState.abstainVotes}`);
    logger.info(`Current owner is: '${toHex(ledgerState.owner)}'`);
  }
};

const displayPrivateState = async (providers: PrivatePollingProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(privatePollingPrivateStateKey);
  if (privateState === null) {
    logger.info(`There is no existing private polling private state`);
  } else {
    logger.info(`Current voter secret key is: ${toHex(privateState.secretKey)}`);
  }
};

const displayDerivedState = (state: PrivatePollingDerivedState | undefined, logger: Logger) => {
  if (state === undefined) {
    logger.info(`No polling state currently available`);
  } else {
    const status = (state.pollState as number) === 1 ? 'OPEN' : 'CLOSED';
    logger.info(`Current poll status: '${status}'`);
    logger.info(`Poll question: '${state.pollQuestion ?? 'none'}'`);
    logger.info(`Votes: Yes = ${state.yesVotes}, No = ${state.noVotes}, Abstain = ${state.abstainVotes}`);
    logger.info(`Am I the poll creator?: '${state.isOwner ? 'YES' : 'NO'}'`);
  }
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Create a new poll
  2. Cast a vote (0 = Yes, 1 = No, 2 = Abstain)
  3. Close the poll (Creator only)
  4. Display current ledger state (known by everyone)
  5. Display private secret key (known only to this node)
  6. Display derived poll state
  7. Exit
Which would you like to do? `;

const mainLoop = async (providers: PrivatePollingProviders, rli: Interface, logger: Logger): Promise<void> => {
  const pollingApi = await deployOrJoin(providers, rli, logger);
  if (pollingApi === null) {
    return;
  }
  let currentState: PrivatePollingDerivedState | undefined;
  const stateObserver = {
    next: (state: PrivatePollingDerivedState) => (currentState = state),
  };
  const subscription = pollingApi.state$.subscribe(stateObserver);
  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            const question = await rli.question(`Enter the poll question: `);
            await pollingApi.createPoll(question);
            break;
          }
          case '2': {
            const voteStr = await rli.question(`Vote choice (0 = Yes, 1 = No, 2 = Abstain): `);
            const vote = parseInt(voteStr, 10);
            if (isNaN(vote) || vote < 0 || vote > 2) {
              logger.error('Invalid vote choice. Must be 0, 1, or 2.');
            } else {
              await pollingApi.castVote(vote);
            }
            break;
          }
          case '3':
            await pollingApi.closePoll();
            break;
          case '4':
            await displayLedgerState(providers, pollingApi.deployedContract, logger);
            break;
          case '5':
            await displayPrivateState(providers, logger);
            break;
          case '6':
            displayDerivedState(currentState, logger);
            break;
          case '7':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw] ?? 1000n;
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'createPoll' | 'castVote' | 'closePoll'>(config.zkConfigPath);
    const providers: PrivatePollingProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, PrivatePollingPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'Polling-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
