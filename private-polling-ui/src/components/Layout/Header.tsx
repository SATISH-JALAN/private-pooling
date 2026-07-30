import React from 'react';
import { AppBar, Box, Chip, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/VerifiedUser';
import { WalletConnectButton } from '../WalletConnectButton';
import { type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

const networkId: NetworkId = import.meta.env.VITE_NETWORK_ID || 'preprod';

/**
 * Application header — branding, ZK badge, and wallet connect/disconnect button.
 */
export const Header: React.FC = () => (
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
    {/* Brand */}
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

    {/* Right side: ZK badge + wallet */}
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
      <WalletConnectButton networkId={networkId} />
    </Box>
  </AppBar>
);
