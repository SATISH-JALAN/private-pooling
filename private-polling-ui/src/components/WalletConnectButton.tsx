/**
 * WalletConnectButton
 *
 * Standalone component that handles the full Midnight wallet lifecycle:
 *   - Detecting a compatible wallet extension (Lace / 1AM)
 *   - Connecting to the preprod network
 *   - Displaying the connected shielded address (truncated)
 *   - Disconnecting (clearing local session state)
 *
 * The component polls `window.midnight` for a compatible connector API
 * (semver range "4.x") and drives a simple state machine:
 *
 *   checking → not_found | found → connecting → connected ←→ (disconnect)
 *                                                          ↘ error
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Chip, CircularProgress, Tooltip, Box, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { type InitialAPI, type ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import semver from 'semver';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WalletConnectionStatus = 'checking' | 'not_found' | 'found' | 'connecting' | 'connected' | 'error';

export interface WalletConnectedInfo {
  /** Truncated shielded coin public key, e.g. "abc12345...xyz789" */
  shortAddress: string;
  /** Full shielded coin public key */
  fullAddress: string;
}

export interface WalletConnectButtonProps {
  /** Midnight network identifier — must match wallet's configured network */
  networkId: NetworkId;
  /** Called when the wallet successfully connects */
  onConnected?: (info: WalletConnectedInfo) => void;
  /** Called when the wallet disconnects */
  onDisconnected?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPATIBLE_API_VERSION = '4.x';
const WALLET_DETECT_INTERVAL_MS = 100;
const WALLET_DETECT_TIMEOUT_MS = 5_000;
const DISCONNECT_CONFIRM_WINDOW_MS = 3_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function findCompatibleWallet(): InitialAPI | undefined {
  if (typeof window === 'undefined' || !window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (w): w is InitialAPI =>
      !!w && typeof w === 'object' && 'apiVersion' in w && semver.satisfies(w.apiVersion, COMPATIBLE_API_VERSION),
  );
}

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ networkId, onConnected, onDisconnected }) => {
  const [status, setStatus] = useState<WalletConnectionStatus>('checking');
  const [walletInfo, setWalletInfo] = useState<WalletConnectedInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const walletRef = useRef<InitialAPI | null>(null);
  const disconnectConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detect wallet on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = WALLET_DETECT_TIMEOUT_MS / WALLET_DETECT_INTERVAL_MS;

    const interval = setInterval(() => {
      const wallet = findCompatibleWallet();
      attempts++;

      if (wallet) {
        clearInterval(interval);
        walletRef.current = wallet;
        setStatus('found');
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setStatus('not_found');
      }
    }, WALLET_DETECT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // ── Connect ─────────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    if (!walletRef.current) return;
    setStatus('connecting');
    setErrorMessage('');

    try {
      const connectedAPI: ConnectedAPI = await walletRef.current.connect(networkId);
      const addresses = await connectedAPI.getShieldedAddresses();
      const fullAddress = addresses.shieldedCoinPublicKey;
      const shortAddress = truncateAddress(fullAddress);

      setWalletInfo({ shortAddress, fullAddress });
      setStatus('connected');
      onConnected?.({ shortAddress, fullAddress });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(msg);
      setStatus('error');
    }
  }, [networkId, onConnected]);

  // ── Disconnect ──────────────────────────────────────────────────────────────
  // Requires two clicks within DISCONNECT_CONFIRM_WINDOW_MS so a stray click
  // doesn't drop the session; the button reverts on its own if not confirmed.
  const handleDisconnect = useCallback(() => {
    setWalletInfo(null);
    setStatus('found');
    setConfirmingDisconnect(false);
    onDisconnected?.();
  }, [onDisconnected]);

  const handleDisconnectClick = useCallback(() => {
    if (confirmingDisconnect) {
      if (disconnectConfirmTimer.current) clearTimeout(disconnectConfirmTimer.current);
      handleDisconnect();
      return;
    }
    setConfirmingDisconnect(true);
    disconnectConfirmTimer.current = setTimeout(() => {
      setConfirmingDisconnect(false);
    }, DISCONNECT_CONFIRM_WINDOW_MS);
  }, [confirmingDisconnect, handleDisconnect]);

  useEffect(() => {
    return () => {
      if (disconnectConfirmTimer.current) clearTimeout(disconnectConfirmTimer.current);
    };
  }, []);

  // ── Retry after error ────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setStatus('found');
    setErrorMessage('');
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  switch (status) {
    case 'checking':
      return (
        <Button disabled size="small" startIcon={<CircularProgress size={12} sx={{ color: '#555' }} />} sx={btnStyle}>
          Detecting wallet…
        </Button>
      );

    case 'not_found':
      return (
        <Tooltip title="Install Midnight Lace or 1AM wallet extension to use this dApp">
          <Button
            size="small"
            component="a"
            href="https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp"
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<AccountBalanceWalletIcon sx={{ fontSize: 15 }} />}
            sx={{
              ...btnStyle,
              borderColor: 'rgba(244,67,54,0.5)',
              color: '#f44336',
              '&:hover': { borderColor: '#f44336', backgroundColor: 'rgba(244,67,54,0.08)' },
            }}
          >
            Install Wallet
          </Button>
        </Tooltip>
      );

    case 'found':
      return (
        <Button
          size="small"
          onClick={() => void handleConnect()}
          startIcon={<AccountBalanceWalletIcon sx={{ fontSize: 15 }} />}
          sx={{
            ...btnStyle,
            borderColor: 'rgba(168,168,168,0.4)',
            color: '#e0e0e0',
            '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' },
          }}
        >
          Connect Wallet
        </Button>
      );

    case 'connecting':
      return (
        <Button
          disabled
          size="small"
          startIcon={<CircularProgress size={12} sx={{ color: '#a8a8a8' }} />}
          sx={btnStyle}
        >
          Connecting…
        </Button>
      );

    case 'connected':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            data-testid="wallet-address-chip"
            icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#4caf50 !important' }} />}
            label={
              <Tooltip title={walletInfo?.fullAddress ?? ''} placement="bottom">
                <Typography component="span" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                  {walletInfo?.shortAddress}
                </Typography>
              </Tooltip>
            }
            size="small"
            sx={{
              backgroundColor: 'rgba(76,175,80,0.12)',
              border: '1px solid rgba(76,175,80,0.5)',
              color: '#4caf50',
              px: 0.5,
            }}
          />
          <Tooltip title={confirmingDisconnect ? 'Click again to confirm disconnect' : 'Disconnect wallet'}>
            <Button
              size="small"
              onClick={handleDisconnectClick}
              startIcon={<LogoutIcon sx={{ fontSize: 13 }} />}
              sx={{
                ...btnStyle,
                minWidth: 0,
                px: 1,
                borderColor: confirmingDisconnect ? 'rgba(244,67,54,0.6)' : 'rgba(168,168,168,0.2)',
                color: confirmingDisconnect ? '#f44336' : '#666',
                backgroundColor: confirmingDisconnect ? 'rgba(244,67,54,0.08)' : 'transparent',
                '&:hover': {
                  borderColor: 'rgba(244,67,54,0.4)',
                  color: '#f44336',
                  backgroundColor: 'rgba(244,67,54,0.05)',
                },
              }}
            >
              {confirmingDisconnect ? 'Confirm?' : 'Disconnect'}
            </Button>
          </Tooltip>
        </Box>
      );

    case 'error':
      return (
        <Tooltip title={`${errorMessage} — click to retry`}>
          <Chip
            icon={<ErrorOutlineIcon sx={{ fontSize: '14px !important', color: '#f44336 !important' }} />}
            label="Connection failed"
            size="small"
            onClick={handleRetry}
            sx={{
              backgroundColor: 'rgba(244,67,54,0.1)',
              border: '1px solid rgba(244,67,54,0.4)',
              color: '#f44336',
              fontSize: 11,
              cursor: 'pointer',
            }}
          />
        </Tooltip>
      );
  }
};

// ── Styles ────────────────────────────────────────────────────────────────────

const btnStyle = {
  border: '1px solid',
  textTransform: 'none',
  fontSize: 12,
  fontWeight: 600,
  px: 1.5,
  py: 0.5,
  borderRadius: 1.5,
  minWidth: 0,
} as const;
