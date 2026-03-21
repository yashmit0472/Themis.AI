import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CASES } from '../../data/cases';
import './Lobby.css';

export default function Lobby() {
  const { setPetitionerName, setRespondentName, petitionerName, respondentName, setSelectedCase, startGame } = useGameStore();
  const [step, setStep] = useState(0); // 0=welcome, 1=names, 2=case-select
  const [localCase, setLocalCase] = useState(null);

  const handleBegin = () => {
    if (!localCase) return;
    setSelectedCase(localCase);
    startGame();
  };

  return (
    <div className="lobby-bg">
      <div className="lobby-stars" />
      <div className="lobby-overlay" />

      {/* Header */}
      <header className="lobby-header">
        <div className="lobby-seal">⚖</div>
        <div>
          <h1 className="lobby-title">Moot Court</h1>
          <p className="lobby-subtitle">Hon'ble Supreme Court of India — Simulator</p>
        </div>
        <div className="lobby-seal">⚖</div>
      </header>

      <main className="lobby-main">
        {step === 0 && (
          <div className="lobby-card fade-in">
            <div className="lobby-emblem">🏛️</div>
            <h2 className="lobby-card-title">IN THE SUPREME COURT OF INDIA</h2>
            <p className="lobby-card-subtitle">Constitutional & Civil Appellate Jurisdiction</p>
            <div className="lobby-divider" />
            <p className="lobby-desc">
              Enter the digital courtroom. Present your strongest legal arguments before the Hon'ble Bench.
              The AI Judge will evaluate your logic, clarity, and legal reasoning in real time.
            </p>
            <div className="lobby-features">
              <div className="feature-pill">⚖️ AI Judge</div>
              <div className="feature-pill">📊 Live Scoring</div>
              <div className="feature-pill">🔔 Interruptions</div>
              <div className="feature-pill">📜 Final Verdict</div>
            </div>
            <button className="btn-primary" onClick={() => setStep(1)}>
              Enter the Courtroom
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="lobby-card fade-in">
            <h2 className="lobby-card-title">Identify Counsel</h2>
            <p className="lobby-card-subtitle">Enter the names for both sides</p>
            <div className="lobby-divider" />
            <div className="names-grid">
              <div className="name-field petitioner-field">
                <label>⚖️ Petitioner / Appellant</label>
                <input
                  className="name-input"
                  value={petitionerName}
                  onChange={e => setPetitionerName(e.target.value)}
                  placeholder="Counsel for Petitioner"
                  maxLength={30}
                />
                <span className="field-tag petitioner-tag">BLUE SIDE</span>
              </div>
              <div className="vs-divider">VS</div>
              <div className="name-field respondent-field">
                <label>⚖️ Respondent / Appellee</label>
                <input
                  className="name-input"
                  value={respondentName}
                  onChange={e => setRespondentName(e.target.value)}
                  placeholder="Counsel for Respondent"
                  maxLength={30}
                />
                <span className="field-tag respondent-tag">RED SIDE</span>
              </div>
            </div>
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(0)}>Back</button>
              <button className="btn-primary" onClick={() => setStep(2)}
                disabled={!petitionerName.trim() || !respondentName.trim()}>
                Select Case →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="lobby-card wide-card fade-in">
            <h2 className="lobby-card-title">Select Case</h2>
            <p className="lobby-card-subtitle">Choose a moot court problem to argue</p>
            <div className="lobby-divider" />
            <div className="cases-grid">
              {CASES.map(c => (
                <div
                  key={c.id}
                  className={`case-card ${localCase?.id === c.id ? 'case-selected' : ''}`}
                  onClick={() => setLocalCase(c)}
                >
                  <div className="case-cat">{c.category}</div>
                  <h3 className="case-title">{c.title}</h3>
                  <p className="case-subtitle">{c.subtitle}</p>
                  <div className="case-issues-count">{c.issues.length} Issues • {c.precedents.length} Precedents</div>
                  {localCase?.id === c.id && (
                    <div className="case-selected-badge">✓ Selected</div>
                  )}
                </div>
              ))}
            </div>
            {localCase && (
              <div className="case-preview fade-in">
                <h4>Case Summary</h4>
                <p>{localCase.facts.substring(0, 200)}...</p>
              </div>
            )}
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" onClick={handleBegin} disabled={!localCase}>
                🔔 Call to Order
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Ticket tape */}
      <div className="ticker-wrap">
        <div className="ticker-content">
          {['Article 21 — Right to Life & Liberty', 'Article 14 — Equality before Law',
            'Article 19 — Freedom of Speech', 'Basic Structure Doctrine', 'Judicial Review',
            'Res Judicata', 'Stare Decisis', 'Audi Alteram Partem', 'Habeas Corpus', 'Article 32 — Constitutional Remedies',
            'Article 21 — Right to Life & Liberty', 'Article 14 — Equality before Law',
            'Article 19 — Freedom of Speech', 'Basic Structure Doctrine', 'Judicial Review',
            'Res Judicata', 'Stare Decisis', 'Audi Alteram Partem', 'Habeas Corpus', 'Article 32 — Constitutional Remedies'
          ].map((item, i) => (
            <span key={i} className="ticker-item">{item} <span className="ticker-sep">•</span></span>
          ))}
        </div>
      </div>
    </div>
  );
}
