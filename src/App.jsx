import { useGameStore, GAME_PHASES } from './store/gameStore';
import Lobby from './components/Lobby/Lobby';
import Courtroom from './components/Courtroom/Courtroom';
import Verdict from './components/Verdict/Verdict';

function App() {
  const { phase } = useGameStore();

  return (
    <>
      {phase === GAME_PHASES.LOBBY && <Lobby />}
      {phase === GAME_PHASES.CASE_SELECT && <Lobby />}
      {phase === GAME_PHASES.COURTROOM && <Courtroom />}
      {phase === GAME_PHASES.VERDICT && <Verdict />}
    </>
  );
}

export default App;
