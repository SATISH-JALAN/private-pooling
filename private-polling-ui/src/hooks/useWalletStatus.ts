import { useEffect, useState } from 'react';
import semver from 'semver';
import { type InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

export type WalletState =
  | { status: 'checking' }
  | { status: 'not_found' }
  | { status: 'found'; connect: () => void }
  | { status: 'connecting' }
  | { status: 'connected'; address: string }
  | { status: 'error'; message: string };

const COMPATIBLE_VERSION = '4.x';

function getWallet(): InitialAPI | undefined {
  if (typeof window === 'undefined' || !window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (w): w is InitialAPI =>
      !!w &&
      typeof w === 'object' &&
      'apiVersion' in w &&
      semver.satisfies((w as InitialAPI).apiVersion, COMPATIBLE_VERSION),
  );
}

export function useWalletStatus(networkId: string): WalletState {
  const [state, setState] = useState<WalletState>({ status: 'checking' });

  useEffect(() => {
    // Poll for wallet presence for up to 5s
    let attempts = 0;
    const interval = setInterval(() => {
      const wallet = getWallet();
      attempts++;
      if (wallet) {
        clearInterval(interval);
        setState({
          status: 'found',
          connect: () => connectWallet(wallet, networkId, setState),
        });
      } else if (attempts >= 50) {
        clearInterval(interval);
        setState({ status: 'not_found' });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [networkId]);

  return state;
}

async function connectWallet(
  wallet: InitialAPI,
  networkId: string,
  setState: (s: WalletState) => void,
) {
  setState({ status: 'connecting' });
  try {
    const connected: ConnectedAPI = await wallet.connect(networkId as NetworkId);
    const addresses = await connected.getShieldedAddresses();
    const short = addresses.shieldedCoinPublicKey.slice(0, 8) + '...' + addresses.shieldedCoinPublicKey.slice(-6);
    setState({ status: 'connected', address: short });
  } catch (e) {
    setState({
      status: 'error',
      message: e instanceof Error ? e.message : 'Connection failed',
    });
  }
}
