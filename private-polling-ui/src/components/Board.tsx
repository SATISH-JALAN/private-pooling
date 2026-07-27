import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Backdrop,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Skeleton,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import { type PrivatePollingDerivedState, type DeployedPrivatePollingAPI } from '../../../api/src/index';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { PollState } from '../../../contract/src/managed/private-polling/contract/index.js';
import { EmptyCardContent } from './Board.EmptyCardContent';

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

const CONTRACT_ADDRESS_PLACEHOLDER = "<YOUR_DEPLOYED_CONTRACT_ADDRESS>";

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedPrivatePollingAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [pollState, setPollState] = useState<PrivatePollingDerivedState>();
  const [questionPrompt, setQuestionPrompt] = useState<string>('');
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);

  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => {
      const addressToJoin = contractAddress || CONTRACT_ADDRESS_PLACEHOLDER;
      boardApiProvider.resolve(addressToJoin);
    },
    [boardApiProvider],
  );

  const onCreatePoll = useCallback(async () => {
    if (!questionPrompt) return;
    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.createPoll(questionPrompt);
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, questionPrompt]);

  const onCastVote = useCallback(
    async (choice: number) => {
      try {
        if (deployedBoardAPI) {
          setIsWorking(true);
          await deployedBoardAPI.castVote(choice);
        }
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
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.closePoll();
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI]);

  const onCopyContractAddress = useCallback(async () => {
    const addressToCopy = deployedBoardAPI?.deployedContractAddress || CONTRACT_ADDRESS_PLACEHOLDER;
    await navigator.clipboard.writeText(addressToCopy);
  }, [deployedBoardAPI]);

  useEffect(() => {
    if (!boardDeployment$) return;
    const subscription = boardDeployment$.subscribe(setBoardDeployment);
    return () => subscription.unsubscribe();
  }, [boardDeployment$]);

  useEffect(() => {
    if (!boardDeployment || boardDeployment.status === 'in-progress') return;
    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message.length ? boardDeployment.error.message : 'Encountered an unexpected error.',
      );
      return;
    }

    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe(setPollState);
    return () => subscription.unsubscribe();
  }, [boardDeployment]);

  return (
    <Card sx={{ position: 'relative', width: 340, minHeight: 380, p: 1 }} color="primary">
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}

      {boardDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={isWorking}
          >
            <CircularProgress data-testid="board-working-indicator" />
          </Backdrop>

          <Backdrop
            sx={{ position: 'absolute', color: '#ff0000', zIndex: (theme) => theme.zIndex.drawer + 1, p: 2 }}
            open={!!errorMessage}
            onClick={() => setErrorMessage(undefined)}
          >
            <Box sx={{ textAlign: 'center' }}>
              <StopIcon fontSize="large" />
              <Typography variant="body2" data-testid="board-error-message">
                {errorMessage}
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#aaa' }}>
                Click to dismiss
              </Typography>
            </Box>
          </Backdrop>

          <CardHeader
            avatar={
              pollState ? (
                pollState.pollState === PollState.OPEN ? (
                  <LockOpenIcon color="success" data-testid="post-unlocked-icon" />
                ) : (
                  <LockIcon color="action" data-testid="post-locked-icon" />
                )
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
            titleTypographyProps={{ color: 'primary', fontWeight: 'bold' }}
            title={toShortFormatContractAddress(deployedBoardAPI?.deployedContractAddress) ?? 'Deploying...'}
            action={
              <IconButton title="Copy contract address" onClick={onCopyContractAddress}>
                <CopyIcon fontSize="small" />
              </IconButton>
            }
          />

          <CardContent>
            {pollState ? (
              pollState.pollState === PollState.OPEN ? (
                <Box>
                  <Chip
                    label="Poll OPEN"
                    color="success"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="h6" sx={{ minHeight: 60, wordBreak: 'break-word', mb: 2 }}>
                    {pollState.pollQuestion}
                  </Typography>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Cast Private Vote (ZK-proven):
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button variant="contained" color="success" size="small" onClick={() => onCastVote(0)}>
                      Yes ({pollState.yesVotes.toString()})
                    </Button>
                    <Button variant="contained" color="error" size="small" onClick={() => onCastVote(1)}>
                      No ({pollState.noVotes.toString()})
                    </Button>
                    <Button variant="outlined" color="info" size="small" onClick={() => onCastVote(2)}>
                      Abstain ({pollState.abstainVotes.toString()})
                    </Button>
                  </Box>

                  {pollState.isOwner && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={onClosePoll}
                    >
                      Close Poll (Creator)
                    </Button>
                  )}
                </Box>
              ) : (
                <Box>
                  <Chip label="Poll CLOSED" color="default" size="small" sx={{ mb: 1 }} />
                  {pollState.pollQuestion ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {pollState.pollQuestion}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Final Tally:
                        <br />
                        ✅ Yes: {pollState.yesVotes.toString()} | ❌ No: {pollState.noVotes.toString()} | ⚪ Abstain: {pollState.abstainVotes.toString()}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No active poll. Create one below:
                    </Typography>
                  )}

                  <TextField
                    id="question-prompt"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Enter new poll question..."
                    size="small"
                    value={questionPrompt}
                    onChange={(e) => setQuestionPrompt(e.target.value)}
                    sx={{ mb: 1 }}
                  />

                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<HowToVoteIcon />}
                    disabled={!questionPrompt.trim()}
                    onClick={onCreatePoll}
                  >
                    Start New Poll
                  </Button>
                </Box>
              )
            ) : (
              <Skeleton variant="rectangular" width="100%" height={180} />
            )}
          </CardContent>
        </React.Fragment>
      )}
    </Card>
  );
};

const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): React.ReactElement => {
  const addr = contractAddress ?? CONTRACT_ADDRESS_PLACEHOLDER;
  if (addr === CONTRACT_ADDRESS_PLACEHOLDER) {
    return <span data-testid="board-address">&lt;YOUR_DEPLOYED_CONTRACT_ADDRESS&gt;</span>;
  }
  return (
    <span data-testid="board-address">
      0x{addr.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}
    </span>
  );
};
