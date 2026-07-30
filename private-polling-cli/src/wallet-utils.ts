/*
 * Private Polling CLI — Wallet Utilities
 */

import { UnshieldedTokenType } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type FacadeState, type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { type ShieldedWalletAPI, type ShieldedWalletState } from '@midnight-ntwrk/wallet-sdk-shielded';
import { type UnshieldedWalletAPI, type UnshieldedWalletState } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import * as Rx from 'rxjs';

import { FaucetClient, type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { Logger } from 'pino';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

export const getInitialShieldedState = async (
  logger: Logger,
  wallet: ShieldedWalletAPI,
): Promise<ShieldedWalletState> => {
  logger.info('Getting initial state of wallet...');
  return Rx.firstValueFrom(wallet.state);
};

export const getInitialUnshieldedState = async (
  logger: Logger,
  wallet: UnshieldedWalletAPI,
): Promise<UnshieldedWalletState> => {
  logger.info('Getting initial state of wallet...');
  return Rx.firstValueFrom(wallet.state);
};

const isProgressStrictlyComplete = (progress: unknown): boolean => {
  if (!progress || typeof progress !== 'object') {
    return false;
  }
  const candidate = progress as { isStrictlyComplete?: unknown };
  if (typeof candidate.isStrictlyComplete === 'function') {
    return (candidate.isStrictlyComplete as () => boolean)();
  }
  if (typeof candidate.isStrictlyComplete === 'boolean') {
    return candidate.isStrictlyComplete;
  }
  return false;
};

const isFacadeStateSynced = (state: FacadeState): boolean => isProgressStrictlyComplete(state.unshielded.progress);

export const syncWallet = (logger: Logger, wallet: WalletFacade, throttleTime = 2_000) => {
  logger.info('Syncing wallet...');

  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state: FacadeState) => {
        const shieldedSynced = isProgressStrictlyComplete(state.shielded.state.progress);
        const unshieldedSynced = isProgressStrictlyComplete(state.unshielded.progress);
        const dustSynced = isProgressStrictlyComplete(state.dust.state.progress);
        logger.debug(
          `Wallet synced state emission: { shielded=${shieldedSynced}, unshielded=${unshieldedSynced}, dust=${dustSynced} }`,
        );
      }),
      Rx.throttleTime(throttleTime),
      Rx.tap((state: FacadeState) => {
        const shieldedSynced = isProgressStrictlyComplete(state.shielded.state.progress);
        const unshieldedSynced = isProgressStrictlyComplete(state.unshielded.progress);
        const dustSynced = isProgressStrictlyComplete(state.dust.state.progress);
        const isSynced = shieldedSynced && dustSynced && unshieldedSynced;

        logger.debug(
          `Wallet synced state emission (synced=${isSynced}): { shielded=${shieldedSynced}, unshielded=${unshieldedSynced}, dust=${dustSynced} }`,
        );
      }),
      Rx.filter((state: FacadeState) => isFacadeStateSynced(state)),
      Rx.tap(() => logger.info('Sync complete')),
      Rx.tap((state: FacadeState) => {
        const shieldedBalances = state.shielded.balances || {};
        const unshieldedBalances = state.unshielded.balances || {};
        const dustBalances = state.dust.balance(new Date(Date.now())) || 0n;

        logger.info(
          `Wallet balances after sync - Shielded: ${JSON.stringify(shieldedBalances)}, Unshielded: ${JSON.stringify(unshieldedBalances)}, Dust: ${dustBalances}`,
        );
      }),
    ),
  );
};

export const waitForUnshieldedFunds = async (
  logger: Logger,
  wallet: WalletFacade,
  env: EnvironmentConfiguration,
  tokenType: UnshieldedTokenType,
  fundFromFaucet = false,
  throttleTime = 2_000,
): Promise<UnshieldedWalletState> => {
  const initialState = await getInitialUnshieldedState(logger, wallet.unshielded);
  const unshieldedAddress = UnshieldedAddress.codec.encode(getNetworkId(), initialState.address);
  logger.info(`Using unshielded address: ${unshieldedAddress.toString()} waiting for funds...`);
  if (fundFromFaucet && env.faucet) {
    logger.info('Requesting tokens from faucet...');
    await new FaucetClient(env.faucet, logger).requestTokens(unshieldedAddress.toString());
  }
  let emissionsCount = 0;
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state: FacadeState) => {
        emissionsCount++;
        const balance = state.unshielded.balances[tokenType.raw] ?? 0n;
        logger.info(
          `Wallet funds state emission #${emissionsCount}: balances=${JSON.stringify(state.unshielded.balances, (k, v) => (typeof v === 'bigint' ? v.toString() : v))}, balance=${balance.toString()}, synced=${isFacadeStateSynced(state)}`,
        );
      }),
      Rx.throttleTime(throttleTime),
      Rx.filter((state: FacadeState) => {
        const balance = state.unshielded.balances[tokenType.raw] ?? 0n;
        const hasAny = Object.values(state.unshielded.balances || {}).some((b) => b > 0n);
        return balance > 0n || hasAny || isFacadeStateSynced(state) || emissionsCount >= 2;
      }),
      Rx.tap(() => logger.info('Sync complete')),
      Rx.tap((state: FacadeState) => {
        const shieldedBalances = state.shielded.balances || {};
        const unshieldedBalances = state.unshielded.balances || {};
        const dustBalances = state.dust.balance(new Date(Date.now())) || 0n;

        logger.info(
          `Wallet balances after sync - Shielded: ${JSON.stringify(shieldedBalances)}, Unshielded: ${JSON.stringify(unshieldedBalances)}, Dust: ${dustBalances}`,
        );
      }),
      Rx.map((state: FacadeState) => state.unshielded),
    ),
  );
};
