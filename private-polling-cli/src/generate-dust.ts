import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { createKeystore, UnshieldedWalletState } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { Logger } from 'pino';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as rx from 'rxjs';

export const getUnshieldedSeed = (seed: string): Uint8Array<ArrayBufferLike> => {
  const seedBuffer = Buffer.from(seed, 'hex');
  const hdWalletResult = HDWallet.fromSeed(seedBuffer);

  const { hdWallet } = hdWalletResult as {
    type: 'seedOk';
    hdWallet: HDWallet;
  };

  const derivationResult = hdWallet.selectAccount(0).selectRole(Roles.NightExternal).deriveKeyAt(0);

  if (derivationResult.type === 'keyOutOfBounds') {
    throw new Error('Key derivation out of bounds');
  }

  return derivationResult.key;
};

export const generateDust = async (
  logger: Logger,
  walletSeed: string,
  unshieldedState: UnshieldedWalletState,
  walletFacade: WalletFacade,
) => {
  // Get dust wallet address with a 30s timeout — preprod can be slow to sync
  logger.info('Waiting for dust wallet sync (timeout: 30s)...');
  let dustState: Awaited<ReturnType<typeof walletFacade.dust.waitForSyncedState>>;
  try {
    dustState = await Promise.race([
      walletFacade.dust.waitForSyncedState(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Dust sync timeout after 30s')), 30_000),
      ),
    ]);
  } catch (err) {
    // If sync times out, try getting the state directly from the observable
    logger.warn(`Dust sync timed out or failed: ${err}. Attempting to get dust state from observable...`);
    dustState = await rx.firstValueFrom(
      walletFacade.state().pipe(
        rx.map((s) => s.dust),
        rx.timeout(15_000),
      ),
    ) as any;
  }

  const networkId = getNetworkId();
  const unshieldedKeystore = createKeystore(getUnshieldedSeed(walletSeed), networkId);
  const utxos = unshieldedState.availableCoins.filter((coin) => !coin.meta.registeredForDustGeneration);

  if (utxos.length === 0) {
    logger.info('No unregistered UTXOs found for dust generation — already registered or no coins.');
    return;
  }

  logger.info(`Generating dust with ${utxos.length} UTXOs...`);

  const recipe = await walletFacade.registerNightUtxosForDustGeneration(
    utxos,
    unshieldedKeystore.getPublicKey(),
    (payload) => unshieldedKeystore.signData(payload),
    (dustState as any).address,
  );
  const transaction = await walletFacade.finalizeRecipe(recipe);
  const txId = await walletFacade.submitTransaction(transaction);
  logger.info(`Dust generation transaction submitted with txId: ${txId}`);

  // Wait up to 60s for dust balance to appear — don't block forever
  logger.info('Waiting for dust balance to appear (timeout: 60s)...');
  try {
    const dustBalance = await rx.firstValueFrom(
      walletFacade.state().pipe(
        rx.filter((s) => s.dust.balance(new Date()) > 0n),
        rx.map((s) => s.dust.balance(new Date())),
        rx.timeout(60_000),
      ),
    );
    logger.info(`Dust balance after generation: ${dustBalance}`);
  } catch {
    logger.warn('Dust balance not yet visible after 60s — continuing anyway. It may appear on-chain shortly.');
  }

  return txId;
};
