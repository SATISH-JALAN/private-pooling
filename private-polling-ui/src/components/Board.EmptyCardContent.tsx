import React, { useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CardActions, CardContent, IconButton, Tooltip, Typography } from '@mui/material';
import PollIcon from '@mui/icons-material/HowToVoteOutlined';
import CreatePollIcon from '@mui/icons-material/AddCircleOutlined';
import JoinPollIcon from '@mui/icons-material/AddLinkOutlined';
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
    <React.Fragment>
      <CardContent>
        <Typography align="center" variant="h1" color="primary.dark">
          <PollIcon fontSize="large" />
        </Typography>
        <Typography data-testid="board-posted-message" align="center" variant="body2" color="primary.dark">
          Create a new Private Poll, or join an existing one...
        </Typography>
      </CardContent>
      <CardActions disableSpacing sx={{ justifyContent: 'center' }}>
        <Tooltip title="Deploy a new Private Poll contract">
          <IconButton data-testid="board-deploy-btn" onClick={onCreateBoardCallback}>
            <CreatePollIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Join an existing Private Poll by Contract Address">
          <IconButton
            data-testid="board-join-btn"
            onClick={() => {
              setTextPromptOpen(true);
            }}
          >
            <JoinPollIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
      <TextPromptDialog
        prompt="Enter Poll Contract Address"
        isOpen={textPromptOpen}
        onCancel={() => {
          setTextPromptOpen(false);
        }}
        onSubmit={(text) => {
          setTextPromptOpen(false);
          onJoinBoardCallback(text);
        }}
      />
    </React.Fragment>
  );
};
