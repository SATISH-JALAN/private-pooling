import React, { useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Box, Button, CardContent, Divider, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import LinkIcon from '@mui/icons-material/Link';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { TextPromptDialog } from './TextPromptDialog';

export interface EmptyCardContentProps {
  onCreateBoardCallback: () => void;
  onJoinBoardCallback: (contractAddress: ContractAddress) => void;
}

export const EmptyCardContent: React.FC<Readonly<EmptyCardContentProps>> = ({
  onCreateBoardCallback,
  onJoinBoardCallback,
}) => {
  const [textPromptOpen, setTextPromptOpen] = useState(false);

  return (
    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Icon + title */}
      <Box sx={{ textAlign: 'center', pt: 1 }}>
        <HowToVoteIcon sx={{ fontSize: 48, color: 'rgba(168,168,168,0.5)', mb: 1 }} />
        <Typography variant="body1" sx={{ fontWeight: 700, color: '#e0e0e0' }}>
          Private Poll
        </Typography>
        <Typography
          data-testid="board-posted-message"
          variant="caption"
          sx={{ color: '#888', display: 'block', mt: 0.5 }}
        >
          Deploy a new poll contract or join one that already exists.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(168,168,168,0.1)' }} />

      {/* Action buttons */}
      <Button
        data-testid="board-deploy-btn"
        variant="contained"
        fullWidth
        startIcon={<AddCircleOutlineIcon />}
        onClick={onCreateBoardCallback}
        sx={{
          backgroundColor: 'rgba(168,168,168,0.15)',
          color: '#e0e0e0',
          border: '1px solid rgba(168,168,168,0.3)',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': {
            backgroundColor: 'rgba(168,168,168,0.25)',
          },
        }}
      >
        Deploy New Poll
      </Button>

      <Button
        data-testid="board-join-btn"
        variant="outlined"
        fullWidth
        startIcon={<LinkIcon />}
        onClick={() => setTextPromptOpen(true)}
        sx={{
          borderColor: 'rgba(168,168,168,0.3)',
          color: '#a8a8a8',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': {
            borderColor: 'rgba(168,168,168,0.6)',
            backgroundColor: 'rgba(168,168,168,0.05)',
          },
        }}
      >
        Join Existing Poll
      </Button>

      {/* Hint */}
      <Typography variant="caption" sx={{ color: '#555', textAlign: 'center' }}>
        Requires Midnight Lace or 1AM wallet extension
      </Typography>
      <Typography variant="caption" sx={{ color: '#555', textAlign: 'center', display: 'block' }}>
        Once your wallet is connected, deploying opens a fresh poll you control; joining lets you vote on one that
        already exists — every choice stays private via ZK proofs.
      </Typography>

      <TextPromptDialog
        prompt="Enter Poll Contract Address"
        isOpen={textPromptOpen}
        onCancel={() => setTextPromptOpen(false)}
        onSubmit={(text) => {
          setTextPromptOpen(false);
          onJoinBoardCallback(text);
        }}
      />
    </CardContent>
  );
};
