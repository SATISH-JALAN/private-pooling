import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BalanceIcon from '@mui/icons-material/Balance';
import { Header } from './Header';

const PrivacyFeature: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', maxWidth: 220 }}>
    <Box sx={{ color: '#a8a8a8', mt: 0.3, flexShrink: 0 }}>{icon}</Box>
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: '#e0e0e0', mb: 0.3 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: '#888', lineHeight: 1.4 }}>
        {desc}
      </Typography>
    </Box>
  </Box>
);

/**
 * Root layout for the Private Polling dApp.
 */
export const MainLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a12 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Header />

      {/* Hero section */}
      <Box
        sx={{
          textAlign: 'center',
          pt: { xs: 5, md: 8 },
          pb: { xs: 4, md: 6 },
          px: 2,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            color: '#fff',
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            mb: 1.5,
          }}
        >
          Vote Privately.{' '}
          <Box component="span" sx={{ color: '#a8a8a8' }}>
            Prove Honestly.
          </Box>
        </Typography>
        <Typography variant="body1" sx={{ color: '#888', maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}>
          Deploy a poll, cast your vote with a zero-knowledge proof, and tally results — without ever revealing who
          voted for what.
        </Typography>
      </Box>

      {/* Privacy model strip */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: { xs: 3, md: 6 },
          flexWrap: 'wrap',
          px: 4,
          pb: 5,
        }}
      >
        <PrivacyFeature
          icon={<VisibilityOffIcon fontSize="small" />}
          title="Hidden Votes"
          desc="Your individual vote is never recorded on-chain. Only the aggregate tally is public."
        />
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: 'rgba(168,168,168,0.1)', display: { xs: 'none', md: 'block' } }}
        />
        <PrivacyFeature
          icon={<LockIcon fontSize="small" />}
          title="ZK-Proven Eligibility"
          desc="You prove you're eligible to vote without revealing your identity."
        />
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: 'rgba(168,168,168,0.1)', display: { xs: 'none', md: 'block' } }}
        />
        <PrivacyFeature
          icon={<BalanceIcon fontSize="small" />}
          title="Verifiable Results"
          desc="Final vote counts are public and cryptographically verifiable by anyone."
        />
      </Box>

      {/* Card area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 3,
          px: { xs: 2, md: 6 },
          pb: 8,
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          py: 3,
          borderTop: '1px solid rgba(168,168,168,0.1)',
        }}
      >
        <Typography variant="caption" sx={{ color: '#555' }}>
          Built on{' '}
          <Box
            component="a"
            href="https://midnight.network"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: '#777', textDecoration: 'none', '&:hover': { color: '#a8a8a8' } }}
          >
            Midnight Network
          </Box>{' '}
          · Zero-knowledge privacy infrastructure
        </Typography>
      </Box>
    </Box>
  );
};
