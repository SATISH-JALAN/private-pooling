import React from 'react';
import { AppBar, Box, Typography, Chip, Button, CircularProgress, Tooltip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/VerifiedUser';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { useWalletStatus } from '../../hooks';

const networkId = (import.meta.env.VITE_NETWORK_ID as string) || 'preprod';

export const Header: React.FC = () => {
  const wallet = useWalletStatus(networkId);

  const renderWalletButton = () => {
    switch (wallet.status) {
      case 'checking':
        return (
          <Button
            disabled
            size="small"
            startIcon={<CircularProgress size={12} sx={{ color: '#666' }} />}
            sx={btnBase}
          >
            Detecting wallet…
          </Button>
        );

      case 'not_found':
        return (
          <Tooltip title="Install Midnight Lace or 1AM wallet extension">
            <Button
              size="small"
              startIcon={<ErrorOutlineIcon sx={{ fontSize: 16 }} />}
              href="https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ ...btnBase, borderColor: 'rgba(244,67,54,0.4)', color: '#f44336' }}
            >
              Install Wallet
            </Button>
          </Tooltip>
        );

      case 'found':
        return (
          <Button
            size="small"
            startIcon={<AccountBalanceWalletIcon sx={{ fontSize: 16 }} />}
            onClick={wallet.connect}
            sx={{
              ...btnBase, borderColor: 'rgba(168,168,168,0.4)', color: '#e0e0e0',
              '&:hover': { borderColor: '#a8a8a8', backgroundColor: 'rgba(168,168,168,0.1)' }
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
            sx={btnBase}
          >
            Connecting…
          </Button>
        );

      case 'connected':
        return (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#4caf50 !important' }} />}
            label={`Connected · ${wallet.address}`}
            size="small"
            sx={{
              backgroundColor: 'rgba(76,175,80,0.1)',
              border: '1px solid rgba(76,175,80,0.4)',
              color: '#4caf50',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          />
        );

      case 'error':
        return (
          <Tooltip title={wallet.message}>
            <Chip
              icon={<ErrorOutlineIcon sx={{ fontSize: '14px !important', color: '#f44336 !important' }} />}
              label="Connection failed"
              size="small"
              sx={{
                backgroundColor: 'rgba(244,67,54,0.1)',
                border: '1px solid rgba(244,67,54,0.4)',
                color: '#f44336',
                fontSize: 11,
              }}
            />
          </Tooltip>
        );
    }
  };

  return (
    <AppBar
      position="static"
      data-testid="header"
      sx={{
        backgroundColor: '#0a0a0f',
        borderBottom: '1px solid rgba(168,168,168,0.15)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 5 },
        py: 1.5,
      }}
    >
      {/* Left: Brand */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <LockIcon sx={{ color: '#a8a8a8', fontSize: 28 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1, color: '#fff', lineHeight: 1 }}>
            Private Polling
          </Typography>
          <Typography variant="caption" sx={{ color: '#a8a8a8', fontSize: 10, letterSpacing: 0.5 }}>
            Zero-Knowledge Voting on Midnight
          </Typography>
        </Box>
      </Box>

      {/* Right: ZK badge + wallet button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          icon={<ShieldIcon sx={{ fontSize: 14, color: '#4caf50 !important' }} />}
          label="ZK-Proven Privacy"
          size="small"
          sx={{
            backgroundColor: 'rgba(76,175,80,0.1)',
            border: '1px solid rgba(76,175,80,0.4)',
            color: '#4caf50',
            fontSize: 11,
            fontWeight: 600,
            display: { xs: 'none', sm: 'flex' },
          }}
        />
        {renderWalletButton()}
      </Box>
    </AppBar>
  );
};

const btnBase = {
  border: '1px solid',
  textTransform: 'none',
  fontSize: 12,
  fontWeight: 600,
  px: 1.5,
  py: 0.5,
  borderRadius: 1.5,
  minWidth: 0,
} as const;
