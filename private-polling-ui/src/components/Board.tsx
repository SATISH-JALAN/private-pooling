/**
 * Board component
 *
 * Renders a single Private Poll card. Uses the `usePollingContract` hook
 * to drive all smart contract interactions (createPoll, castVote, closePoll).
 *
 * Two modes:
 *  - No `boardDeployment$` prop → shows the empty "Deploy / Join" card
 *  - With `boardDeployment$` prop → shows the active poll card with live state
 */

import React, { useCallback, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import { useDeployedBoardContext } from '../hooks';
import { usePollingContract } from '../hooks/usePollingContract';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { PollState } from '../../../contract/src/managed/private-polling/contract/index.js';
import { EmptyCardContent } from './Board.EmptyCardContent';
import { type PrivatePollingDerivedState } from '../../../api/src/index';

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

// Shown while contract address is pending
const CONTRACT_ADDRESS_PLACEHOLDER = import.meta.env.VITE_CONTRACT_ADDRESS as string
  || '0200dbf964f541e1950883f5b2f539b66fd6111e46ce8e6e9551fbdd180114d5dd5b';

// ── Helpers ───────────────────────────────────────────────────────────────────

const pct = (part: bigint, total: bigint): number =>
  total === 0n ? 0 : Math.round(Number((part * 100n) / total));

const shortAddress = (addr: ContractAddress | null): string => {
  if (!addr) return 'Deploying…';
  if (addr.length <= 16) return `0x${addr}`;
  return `0x${addr.slice(0, 8)}…${addr.slice(-8)}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const VoteBar: React.FC<{
  label: string;
  icon: React.ReactNode;
  count: bigint;
  total: bigint;
  color: string;
}> = ({ label, icon, count, total, color }) => {
  const percentage = pct(count, total);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {icon}
          <Typography variant="caption" sx={{ color: '#bbb', fontWeight: 600 }}>{label}</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#bbb' }}>
          {count.toString()} ({percentage}%)
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 6, borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.08)',
          '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // All contract interactions go through this hook
  const {
    pollState,
    contractAddress,
    isLoading,
    currentAction,
    error,
    createPoll,
    castVote,
    closePoll,
    clearError,
  } = usePollingContract(boardDeployment$);

  // ── Navigation callbacks ──────────────────────────────────────────────────

  const onCreateBoard = useCallback(
    () => boardApiProvider.resolve(),
    [boardApiProvider],
  );

  const onJoinBoard = useCallback(
    (addr: ContractAddress) => boardApiProvider.resolve(addr || CONTRACT_ADDRESS_PLACEHOLDER),
    [boardApiProvider],
  );

  // ── UI actions ────────────────────────────────────────────────────────────

  const onCreatePoll = useCallback(async () => {
    if (!questionPrompt.trim()) return;
    await createPoll(questionPrompt);
    setQuestionPrompt('');
  }, [createPoll, questionPrompt]);

  const onCopyAddress = useCallback(async () => {
    await navigator.clipboard.writeText(contractAddress ?? CONTRACT_ADDRESS_PLACEHOLDER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [contractAddress]);

  // ── Poll renderers ────────────────────────────────────────────────────────

  const renderOpenPoll = (state: PrivatePollingDerivedState) => {
    const total = state.yesVotes + state.noVotes + state.abstainVotes;
    return (
      <Box>
        <Chip
          icon={<LockOpenIcon sx={{ fontSize: '14px !important', color: '#4caf50 !important' }} />}
          label="Poll Open · Voting Live"
          size="small"
          sx={{ mb: 2, backgroundColor: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)', color: '#4caf50', fontSize: 11 }}
        />

        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.4, mb: 2.5, wordBreak: 'break-word' }}>
          {state.pollQuestion || 'Loading question…'}
        </Typography>

        {total > 0n && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
              Current tally ({total.toString()} vote{total !== 1n ? 's' : ''})
            </Typography>
            <VoteBar label="Yes" icon={<CheckIcon sx={{ fontSize: 12, color: '#4caf50' }} />} count={state.yesVotes} total={total} color="#4caf50" />
            <VoteBar label="No" icon={<CloseIcon sx={{ fontSize: 12, color: '#f44336' }} />} count={state.noVotes} total={total} color="#f44336" />
            <VoteBar label="Abstain" icon={<RemoveIcon sx={{ fontSize: 12, color: '#9e9e9e' }} />} count={state.abstainVotes} total={total} color="#9e9e9e" />
          </Box>
        )}

        <Divider sx={{ borderColor: 'rgba(168,168,168,0.1)', mb: 2 }} />

        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1.5 }}>
          Cast your private ZK vote:
        </Typography>

        {/* castVote circuit calls */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="contained" size="small" fullWidth
            startIcon={<CheckIcon />}
            disabled={isLoading}
            onClick={() => void castVote(0)}
            sx={{ backgroundColor: 'rgba(76,175,80,0.2)', border: '1px solid rgba(76,175,80,0.5)', color: '#4caf50', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: 'rgba(76,175,80,0.35)' } }}
          >
            Yes
          </Button>
          <Button
            variant="contained" size="small" fullWidth
            startIcon={<CloseIcon />}
            disabled={isLoading}
            onClick={() => void castVote(1)}
            sx={{ backgroundColor: 'rgba(244,67,54,0.2)', border: '1px solid rgba(244,67,54,0.5)', color: '#f44336', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: 'rgba(244,67,54,0.35)' } }}
          >
            No
          </Button>
          <Button
            variant="outlined" size="small" fullWidth
            startIcon={<RemoveIcon />}
            disabled={isLoading}
            onClick={() => void castVote(2)}
            sx={{ borderColor: 'rgba(158,158,158,0.4)', color: '#9e9e9e', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: 'rgba(158,158,158,0.1)' } }}
          >
            Abstain
          </Button>
        </Box>

        {/* closePoll circuit call — visible only to poll creator */}
        {state.isOwner && (
          <Button
            variant="text" size="small" fullWidth
            startIcon={<CancelIcon />}
            disabled={isLoading}
            onClick={() => void closePoll()}
            sx={{ color: '#666', textTransform: 'none', fontSize: 12, '&:hover': { color: '#f44336', backgroundColor: 'rgba(244,67,54,0.05)' } }}
          >
            Close Poll (you&apos;re the creator)
          </Button>
        )}
      </Box>
    );
  };

  const renderClosedPoll = (state: PrivatePollingDerivedState) => {
    const total = state.yesVotes + state.noVotes + state.abstainVotes;
    return (
      <Box>
        <Chip
          icon={<LockIcon sx={{ fontSize: '14px !important', color: '#888 !important' }} />}
          label="Poll Closed"
          size="small"
          sx={{ mb: 2, backgroundColor: 'rgba(168,168,168,0.08)', border: '1px solid rgba(168,168,168,0.2)', color: '#888', fontSize: 11 }}
        />

        {state.pollQuestion ? (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#bbb', mb: 2, wordBreak: 'break-word' }}>
              {state.pollQuestion}
            </Typography>
            {total > 0n && (
              <>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                  Final results ({total.toString()} vote{total !== 1n ? 's' : ''})
                </Typography>
                <VoteBar label="Yes" icon={<CheckIcon sx={{ fontSize: 12, color: '#4caf50' }} />} count={state.yesVotes} total={total} color="#4caf50" />
                <VoteBar label="No" icon={<CloseIcon sx={{ fontSize: 12, color: '#f44336' }} />} count={state.noVotes} total={total} color="#f44336" />
                <VoteBar label="Abstain" icon={<RemoveIcon sx={{ fontSize: 12, color: '#9e9e9e' }} />} count={state.abstainVotes} total={total} color="#9e9e9e" />
              </>
            )}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>No poll has been created yet.</Typography>
        )}

        <Divider sx={{ borderColor: 'rgba(168,168,168,0.1)', mb: 2 }} />

        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
          Start a new poll:
        </Typography>

        <TextField
          variant="outlined" fullWidth multiline rows={2}
          placeholder="Type your poll question…"
          size="small" value={questionPrompt}
          onChange={(e) => setQuestionPrompt(e.target.value)}
          sx={{
            mb: 1.5,
            '& .MuiOutlinedInput-root': {
              color: '#e0e0e0',
              '& fieldset': { borderColor: 'rgba(168,168,168,0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(168,168,168,0.4)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(168,168,168,0.6)' },
            },
          }}
        />

        {/* createPoll circuit call */}
        <Button
          variant="contained" fullWidth
          startIcon={<HowToVoteIcon />}
          disabled={!questionPrompt.trim() || isLoading}
          onClick={() => void onCreatePoll()}
          sx={{
            backgroundColor: 'rgba(168,168,168,0.15)', color: '#e0e0e0',
            border: '1px solid rgba(168,168,168,0.3)', textTransform: 'none', fontWeight: 700,
            '&:hover': { backgroundColor: 'rgba(168,168,168,0.25)' },
            '&:disabled': { color: '#444', borderColor: 'rgba(168,168,168,0.1)' },
          }}
        >
          Start Poll
        </Button>
      </Box>
    );
  };

  // ── Card render ───────────────────────────────────────────────────────────

  return (
    <Card
      sx={{
        position: 'relative', width: { xs: '100%', sm: 400 }, minHeight: 420,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,168,168,0.15)',
        borderRadius: 2, backdropFilter: 'blur(8px)', p: 0,
      }}
    >
      {/* Empty state */}
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}

      {/* Active deployment */}
      {boardDeployment$ && (
        <>
          {/* Loading overlay */}
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: 10, borderRadius: 2, flexDirection: 'column', gap: 2 }}
            open={isLoading}
          >
            <CircularProgress data-testid="board-working-indicator" size={36} sx={{ color: '#a8a8a8' }} />
            <Typography variant="caption" sx={{ color: '#888' }}>
              {currentAction === 'castVote' && 'Generating ZK vote proof…'}
              {currentAction === 'createPoll' && 'Creating poll on-chain…'}
              {currentAction === 'closePoll' && 'Closing poll on-chain…'}
              {currentAction === 'deploy' && 'Deploying contract…'}
              {!currentAction && 'Working…'}
            </Typography>
          </Backdrop>

          {/* Error overlay */}
          <Backdrop
            sx={{ position: 'absolute', zIndex: 11, borderRadius: 2, p: 3 }}
            open={!!error}
            onClick={clearError}
          >
            <Box sx={{ background: 'rgba(10,10,15,0.95)', border: '1px solid rgba(244,67,54,0.4)', borderRadius: 2, p: 3, textAlign: 'center', maxWidth: 320 }}>
              <ErrorOutlineIcon sx={{ fontSize: 36, color: '#f44336', mb: 1 }} />
              <Typography variant="body2" data-testid="board-error-message" sx={{ color: '#f44336', mb: 1 }}>
                {error}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>Tap to dismiss</Typography>
            </Box>
          </Backdrop>

          {/* Card header */}
          <CardHeader
            sx={{ borderBottom: '1px solid rgba(168,168,168,0.1)', pb: 1.5 }}
            avatar={
              pollState ? (
                pollState.pollState === PollState.OPEN
                  ? <LockOpenIcon sx={{ color: '#4caf50' }} data-testid="post-unlocked-icon" />
                  : <LockIcon sx={{ color: '#666' }} data-testid="post-locked-icon" />
              ) : (
                <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              )
            }
            title={
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#a8a8a8', fontSize: 11 }} data-testid="board-address">
                {shortAddress(contractAddress)}
              </Typography>
            }
            subheader={
              <Typography variant="caption" sx={{ color: '#555', fontSize: 10 }}>
                {isLoading && currentAction === 'deploy' ? 'Deploying contract…' : 'Contract deployed · Preprod'}
              </Typography>
            }
            action={
              <Tooltip title={copied ? 'Copied!' : 'Copy contract address'}>
                <IconButton size="small" onClick={() => void onCopyAddress()} sx={{ color: copied ? '#4caf50' : '#666' }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          />

          <CardContent sx={{ pt: 2 }}>
            {pollState ? (
              pollState.pollState === PollState.OPEN
                ? renderOpenPoll(pollState)
                : renderClosedPoll(pollState)
            ) : (
              <Box>
                <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 1 }} height={28} />
                <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 2 }} height={20} width="60%" />
                <Skeleton variant="rectangular" sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 1 }} height={80} />
              </Box>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
};
