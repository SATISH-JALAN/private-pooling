import React, { useEffect, useState } from 'react';
import { MainLayout, Board } from './components';
import { useDeployedBoardContext } from './hooks';
import { type BoardDeployment } from './contexts';
import { type Observable } from 'rxjs';

/**
 * Root component for the Private Polling dApp.
 *
 * Renders one Board card per active deployment plus a permanent
 * "start" card for deploying or joining new polls.
 */
const App: React.FC = () => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployments, setBoardDeployments] = useState<Array<Observable<BoardDeployment>>>([]);

  useEffect(() => {
    const subscription = boardApiProvider.boardDeployments$.subscribe(setBoardDeployments);
    return () => subscription.unsubscribe();
  }, [boardApiProvider]);

  return (
    <MainLayout>
      {boardDeployments.map((boardDeployment, idx) => (
        <div data-testid={`board-${idx}`} key={`board-${idx}`}>
          <Board boardDeployment$={boardDeployment} />
        </div>
      ))}
      <div data-testid="board-start">
        <Board />
      </div>
    </MainLayout>
  );
};

export default App;
