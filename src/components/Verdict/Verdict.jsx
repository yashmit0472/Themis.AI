import { useGameStore } from '../../store/gameStore';
import './Verdict.css';

export default function Verdict() {
  const { verdict, scores, petitionerName, respondentName, resetGame, selectedCase } = useGameStore();

  if (!verdict) return null;

  const isPetitionerWinner = verdict.winner === petitionerName;

  return (
    <div className="verdict-bg">
      <div className="verdict-particles" />
      <div className="verdict-rays" />

      <div className="verdict-container fade-in">
        {/* Header */}
        <div className="verdict-header">
          <div className="court-seal">🏛️</div>
          <div className="verdict-header-text">
            <div className="verdict-court-name">In the Supreme Court of India</div>
            <div className="verdict-case-name">{selectedCase?.title}</div>
            <div className="verdict-case-sub">{selectedCase?.subtitle}</div>
          </div>
        </div>

        {/* Judgment stamp */}
        <div className="verdict-stamp-wrap">
          <div className={`verdict-stamp ${verdict.decision === 'ALLOWED' ? 'stamp-allowed' : 'stamp-dismissed'}`}>
            <div className="stamp-inner">
              <div className="stamp-decision">{verdict.decision}</div>
              <div className="stamp-sub">JUDGMENT PRONOUNCED</div>
            </div>
          </div>
        </div>

        {/* Winner */}
        <div className="verdict-winner-wrap">
          <div className="winner-icon">👑</div>
          <div className="winner-label">WINNER</div>
          <div className="winner-name">
            {verdict.winner}
          </div>
          <div className={`winner-side-badge ${isPetitionerWinner ? 'winner-petitioner' : 'winner-respondent'}`}>
            {isPetitionerWinner ? 'PETITIONER / APPELLANT' : 'RESPONDENT / APPELLEE'}
          </div>
        </div>

        {/* Score breakdown */}
        <div className="verdict-scores">
          <div className={`verdict-score-card ${isPetitionerWinner ? 'winner-card' : ''} petitioner-verdict-card`}>
            <div className="vsc-role">PETITIONER</div>
            <div className="vsc-name">{petitionerName}</div>
            <div className="vsc-total" style={{ color: '#4a90d9' }}>{verdict.petitionerScore}</div>
            <div className="vsc-label">/ 100</div>
            <div className="vsc-breakdown">
              <div className="vsc-item"><span>Logic</span><span>{scores.petitioner.logic}</span></div>
              <div className="vsc-item"><span>Clarity</span><span>{scores.petitioner.clarity}</span></div>
              <div className="vsc-item"><span>Confidence</span><span>{scores.petitioner.confidence}</span></div>
            </div>
            {isPetitionerWinner && <div className="vsc-winner-crown">👑</div>}
          </div>

          <div className="verdict-vs">VS</div>

          <div className={`verdict-score-card ${!isPetitionerWinner ? 'winner-card' : ''} respondent-verdict-card`}>
            <div className="vsc-role">RESPONDENT</div>
            <div className="vsc-name">{respondentName}</div>
            <div className="vsc-total" style={{ color: '#e05c5c' }}>{verdict.respondentScore}</div>
            <div className="vsc-label">/ 100</div>
            <div className="vsc-breakdown">
              <div className="vsc-item"><span>Logic</span><span>{scores.respondent.logic}</span></div>
              <div className="vsc-item"><span>Clarity</span><span>{scores.respondent.clarity}</span></div>
              <div className="vsc-item"><span>Confidence</span><span>{scores.respondent.confidence}</span></div>
            </div>
            {!isPetitionerWinner && <div className="vsc-winner-crown">👑</div>}
          </div>
        </div>

        {/* Reasoning */}
        <div className="verdict-reasoning">
          <div className="reasoning-label">JUDGMENT</div>
          <div className="reasoning-text">"{verdict.reasoning}"</div>
          <div className="reasoning-margin">Margin of victory: <strong>{verdict.margin} points</strong></div>
        </div>

        {/* Actions */}
        <div className="verdict-actions">
          <button className="verdict-reset-btn" onClick={resetGame}>
            ↩ New Session
          </button>
          <button className="verdict-share-btn" onClick={() => window.print()}>
            🖨️ Print Verdict
          </button>
        </div>

        {/* Footer */}
        <div className="verdict-footer">
          <div className="footer-seal">⚖</div>
          <div className="footer-text">This verdict was pronounced by the AI Hon'ble Bench of the Moot Court Simulator</div>
          <div className="footer-seal">⚖</div>
        </div>
      </div>
    </div>
  );
}
