import React, { useCallback, useEffect, useState } from 'react';
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
import TextField from '@mui/material/TextField';
import { type PrivatePollingDerivedState, type DeployedPrivatePollingAPI } from '../../../api/src/index';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { PollState } from '../../../contract/src/managed/private-polling/contract/index.js';
import { EmptyCardContent } from './Board.EmptyCardContent';

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

const CONTRACT_ADDRESS_PLACEHOLDER = '<YOUR_DEPLOYED_CONTRACT_ADDRESS>';

/** Compute percentage safely */
const pct = (part: bigint, total: bigint): number =>
  total === 0n ? 0 : Math.round(Number((part * 100n) / total));

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedPrivatePollingAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [pollState, setPollState] = useState<PrivatePollingDerivedState>();
  const [questionPrompt, setQuestionPrompt] = useState<string>('');
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);
  const [copied, setCopied] = useState(false);

  const onCreateBoard = useCallback(
    () => boardApiProvider.resolve(),
    [boardApiProvider],
  );

  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => {
      boardApiProvider.resolve(contractAddress || CONTRACT_ADDRESS_PLACEHOLDER);
    },
    [boardApiProvider],
  );

  const onCreatePoll = useCallback(async () => {
    if (!questionPrompt.trim()) return;
    try {
      setIsWorking(true);
      await deployedBoardAPI?.createPoll(questionPrompt);
      setQuestionPrompt('');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, questionPrompt]);

  const onCastVote = useCallback(
    async (choice: number) => {
      try {
        setIsWorking(true);
        await deployedBoardAPI?.castVote(choice);
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setIsWorking(false);
      }
    },
    [deployedBoardAPI],
  );

  const onClosePoll = useCallback(async () => {
    try {
      setIsWorking(true);
      await deployedBoardAPI?.closePoll();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI]);

  const onCopyContractAddress = useCallback(async () => {
    const addr = deployedBoardAPI?.deployedContractAddress ?? CONTRACT_ADDRESS_PLACEHOLDER;
    await navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [deployedBoardAPI]);

  useEffect(() => {
    if (!boardDeployment$) return;
    const sub = boardDeployment$.subscribe(setBoardDeployment);
    return () => sub.unsubscribe();
  }, [boardDeployment$]);

  useEffect(() => {
    if (!boardDeployment || boardDeployment.status === 'in-progress') return;
    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message.length
          ? boardDeployment.error.message
          : 'Encountered an unexpected error.',
      );
      return;
    }

    setDeployedBoardAPI(boardDeployment.api);
    const sub = boardDeployment.api.state$.subscribe(setPollState);
    return () => sub.unsubscribe();
  }, [boardDeployment]);

  /* ───── rendering helpers ───── */

  const renderVoteBar = (label: string, icon: React.ReactNode, count: bigint, total: bigint, color: string) => {
    const percentage = pct(count, total);
    return (
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {icon}
            <Typography variant="caption" sx={{ color: '#bbb', fontWeight: 600 }}>
              {label}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#bbb' }}>
            {count.toString()} ({percentage}%)
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 3 },
          }}
        />
      </Box>
    );
  };

  const renderOpenPoll = (state: PrivatePollingDerivedState) => {
    const total = state.yesVotes + state.noVotes + state.abstainVotes;
    return (
      <Box>
        <Chip
          icon={<LockOpenIcon sx={{ fontSize: '14px !important', color: '#4caf50 !important' }} />}
          label="Poll Open · Voting Live"
          size="small"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(76,175,80,0.1)',
            border: '1px solid rgba(76,175,80,0.3)',
            color: '#4caf50',
            fontSize: 11,
          }}
        />

        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.4, mb: 2.5, wordBreak: 'break-word' }}
        >
          {state.pollQuestion || 'Loading question…'}
        </Typography>

        {/* Current tally */}
        {total > 0n && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
              Current tally ({total.toString()} vote{total !== 1n ? 's' : ''})
            </Typography>
            {renderVoteBar('Yes', <CheckIcon sx={{ fontSize: 12, color: '#4caf50' }} />, state.yesVotes, total, '#4caf50')}
            {renderVoteBar('No', <CloseIcon sx={{ fontSize: 12, color: '#f44336' }} />, state.noVotes, total, '#f44336')}
            {renderVoteBar('Abstain', <RemoveIcon sx={{ fontSize: 12, color: '#9e9e9e' }} />, state.abstainVotes, total, '#9e9e9e')}
          </Box>
        )}

        <Divider sx={{ borderColor: 'rgba(168,168,168,0.1)', mb: 2 }} />

        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1.5 }}>
          Cast your private ZK vote:
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            size="small"
            fullWidth
            startIcon={<CheckIcon />}
            onClick={() => void onCastVote(0)}
            sx={{
              backgroundColor: 'rgba(76,175,80,0.2)',
              border: '1px solid rgba(76,175,80,0.5)',
              color: '#4caf50',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'rgba(76,175,80,0.35)' },
            }}
          >
            Yes
          </Button>
          <Button
            variant="contained"
            size="small"
            fullWidth
            startIcon={<CloseIcon />}
            onClick={() => void onCastVote(1)}
            sx={{
              backgroundColor: 'rgba(244,67,54,0.2)',
              border: '1px solid rgba(244,67,54,0.5)',
              color: '#f44336',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'rgba(244,67,54,0.35)' },
            }}
          >
            No
          </Button>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<RemoveIcon />}
            onClick={() => void onCastVote(2)}
            sx={{
              borderColor: 'rgba(158,158,158,0.4)',
              color: '#9e9e9e',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'rgba(158,158,158,0.1)' },
            }}
          >
            Abstain
          </Button>
        </Box>

        {state.isOwner && (
          <Button
            variant="text"
            size="small"
            fullWidth
            startIcon={<CancelIcon />}
            onClick={() => void onClosePoll()}
            sx={{
              color: '#666',
              textTransform: 'none',
              fontSize: 12,
              '&:hover': { color: '#f44336', backgroundColor: 'rgba(244,67,54,0.05)' },
            }}
          >
            Close Poll (you're the creator)
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
          sx={{
            mb: 2,
            backgroundColor: 'rgba(168,168,168,0.08)',
            border: '1px solid rgba(168,168,168,0.2)',
            color: '#888',
            fontSize: 11,
          }}
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
                {renderVoteBar('Yes', <CheckIcon sx={{ fontSize: 12, color: '#4caf50' }} />, state.yesVotes, total, '#4caf50')}
                {renderVoteBar('No', <CloseIcon sx={{ fontSize: 12, color: '#f44336' }} />, state.noVotes, total, '#f44336')}
                {renderVoteBar('Abstain', <RemoveIcon sx={{ fontSize: 12, color: '#9e9e9e' }} />, state.abstainVotes, total, '#9e9e9e')}
              </>
            )}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            No poll has been created yet.
          </Typography>
        )}

        <Divider sx={{ borderColor: 'rgba(168,168,168,0.1)', mb: 2 }} />

        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
          Start a new poll:
        </Typography>

        <TextField
          variant="outlined"
          fullWidth
          multiline
          rows={2}
          placeholder="Type your poll question…"
          size="small"
          value={questionPrompt}
          onChange={(e) => setQuestionPrompt(e.target.value)}
          sx={{
            mb: 1.5,
            '& .MuiOutlinedInput-root': {
              color: '#e0e0e0',
              '& fieldset': { borderColor: 'rgba(168,168,168,0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(168,168,168,0.4)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(168,168,168,0.6)' },
            },
            '& .MuiInputBase-input::placeholder': { color: '#555' },
          }}
        />

        <Button
          variant="contained"
          fullWidth
          startIcon={<HowToVoteIcon />}
          disabled={!questionPrompt.trim()}
          onClick={() => void onCreatePoll()}
          sx={{
            backgroundColor: 'rgba(168,168,168,0.15)',
            color: '#e0e0e0',
            border: '1px solid rgba(168,168,168,0.3)',
            textTransform: 'none',
            fontWeight: 700,
            '&:hover': { backgroundColor: 'rgba(168,168,168,0.25)' },
            '&:disabled': { color: '#444', borderColor: 'rgba(168,168,168,0.1)' },
          }}
        >
          Start Poll
        </Button>
      </Box>
    );
  };

  /* ───── main render ───── */

  return (
    <Card
      sx={{
        position: 'relative',
        width: { xs: '100%', sm: 400 },
        minHeight: 420,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(168,168,168,0.15)',
        borderRadius: 2,
        backdropFilter: 'blur(8px)',
        p: 0,
      }}
    >
      {/* Empty state — deploy or join */}
      {!boardDeployment$ && (
        <EmptyCardContent
          onCreateBoardCallback={onCreateBoard}
          onJoinBoardCallback={onJoinBoard}
        />
      )}

      {/* Active deployment state */}
      {boardDeployment$ && (
        <>
          {/* Loading overlay */}
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: 10, borderRadius: 2, flexDirection: 'column', gap: 2 }}
            open={isWorking}
          >
            <CircularProgress data-testid="board-working-indicator" size={36} sx={{ color: '#a8a8a8' }} />
            <Typography variant="caption" sx={{ color: '#888' }}>
              Generating ZK proof…
            </Typography>
          </Backdrop>

          {/* Error overlay */}
          <Backdrop
            sx={{ position: 'absolute', zIndex: 11, borderRadius: 2, p: 3 }}
            open={!!errorMessage}
            onClick={() => setErrorMessage(undefined)}
          >
            <Box
              sx={{
                background: 'rgba(10,10,15,0.95)',
                border: '1px solid rgba(244,67,54,0.4)',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                maxWidth: 320,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 36, color: '#f44336', mb: 1 }} />
              <Typography variant="body2" data-testid="board-error-message" sx={{ color: '#f44336', mb: 1 }}>
                {errorMessage}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Tap to dismiss
              </Typography>
            </Box>
          </Backdrop>

          {/* Card header: address + lock icon */}
          <CardHeader
            sx={{ borderBottom: '1px solid rgba(168,168,168,0.1)', pb: 1.5 }}
            avatar={
              pollState ? (
                pollState.pollState === PollState.OPEN ? (
                  <LockOpenIcon sx={{ color: '#4caf50' }} data-testid="post-unlocked-icon" />
                ) : (
                  <LockIcon sx={{ color: '#666' }} data-testid="post-locked-icon" />
                )
              ) : (
                <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              )
            }
            title={
              <Typography
                variant="caption"
                sx={{ fontFamily: 'monospace', color: '#a8a8a8', fontSize: 11 }}
                data-testid="board-address"
              >
                {shortAddress(deployedBoardAPI?.deployedContractAddress)}
              </Typography>
            }
            subheader={
              <Typography variant="caption" sx={{ color: '#555', fontSize: 10 }}>
                {boardDeployment?.status === 'in-progress' ? 'Deploying contract…' : 'Contract deployed'}
              </Typography>
            }
            action={
              <Tooltip title={copied ? 'Copied!' : 'Copy contract address'}>
                <IconButton size="small" onClick={() => void onCopyContractAddress()} sx={{ color: copied ? '#4caf50' : '#666' }}>
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

const shortAddress = (addr: ContractAddress | undefined): string => {
  if (!addr) return 'Deploying…';
  if (addr.length <= 16) return `0x${addr}`;
  return `0x${addr.slice(0, 8)}…${addr.slice(-8)}`;
};
