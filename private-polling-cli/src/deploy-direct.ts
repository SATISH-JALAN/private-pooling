// Private Polling CLI — Direct Non-interactive Preprod Deployment

import axios from 'axios';
import { WebSocket } from 'ws';
import { createLogger } from './logger-utils.js';
import { PreprodRemoteConfig } from './config.js';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils.js';
import { generateDust } from './generate-dust.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { PrivatePollingAPI, privatePollingPrivateStateKey, type PrivatePollingProviders, type PrivateStateId } from '../../api/src/index.js';
import { PrivatePollingPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: Needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

axios.interceptors.request.use((config) => {
  if (config.timeout && config.timeout <= 2000) {
    config.timeout = 15000;
  }
  return config;
});

const SEED = '12e9aa9d5dd5f0e228e20369f471881806b17a5baeecdf766d5ef3eb84b16635';

function encodeVerifierKey(raw: Uint8Array): Uint8Array {
  const header = Buffer.from('midnight:verifier-key[v6]:', 'utf-8');
  const keyBuf = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
  if (keyBuf.subarray(0, header.length).equals(header)) {
    return raw;
  }
  const len = keyBuf.length;
  const scaleLen = len < 64
    ? Buffer.from([len << 2])
    : Buffer.from([(len << 2 | 1) & 0xff, (len << 2 | 1) >> 8]);
  return new Uint8Array(Buffer.concat([header, scaleLen, keyBuf]));
}

class TaggedNodeZkConfigProvider extends NodeZkConfigProvider<'createPoll' | 'castVote' | 'closePoll'> {
  override async getVerifierKey(circuitId: 'createPoll' | 'castVote' | 'closePoll') {
    const key = await super.getVerifierKey(circuitId);
    return encodeVerifierKey(key) as any;
  }
}

async function main() {
  const config = new PreprodRemoteConfig();
  const logger = await createLogger(config.logDir);
  const testEnv = config.getEnvironment(logger);

  let walletProvider: MidnightWalletProvider | undefined;
  try {
    logger.info('Starting test environment...');
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);

    logger.info('Building wallet provider...');
    walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, SEED);
    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletProvider.wallet, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw] ?? 0n;
    logger.info(`Wallet NIGHT balance: ${nightBalance}`);

    logger.info('Checking / registering UTXOs for dust generation...');
    const dustGeneration = await generateDust(logger, SEED, unshieldedState, walletProvider.wallet);
    if (dustGeneration) {
      logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
      await syncWallet(logger, walletProvider.wallet);
    }

    const zkConfigProvider = new TaggedNodeZkConfigProvider(config.zkConfigPath);
    const providers: PrivatePollingProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, PrivatePollingPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => 'Polling-Test-2026!',
        accountId: SEED,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };

    logger.info('Deploying Private Polling contract to Midnight Preprod testnet...');
    const api = await PrivatePollingAPI.deploy(providers, logger);
    console.log(`\n==================================================`);
    console.log(`DEPLOYMENT SUCCESSFUL!`);
    console.log(`Deployed Contract Address: ${api.deployedContractAddress}`);
    console.log(`==================================================\n`);
    logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
  } catch (err) {
    logger.error(`Deployment failed: ${err}`);
    console.error('Deployment error:', err);
    process.exitCode = 1;
  } finally {
    if (walletProvider) {
      await walletProvider.stop();
    }
    await testEnv.shutdown();
  }
}

main().catch((err) => {
  console.error('Fatal error during deployment:', err);
  process.exit(1);
});
