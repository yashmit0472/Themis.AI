import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { CASES } from '../../data/cases';
import './Lobby.css';

function TiltCard({ children, className }) {
  const x = useMotionValue(200);
  const y = useMotionValue(200);
  const rotateX = useTransform(y, [0, 400], [10, -10]);
  const rotateY = useTransform(x, [0, 400], [-10, 10]);

  function handleMouse(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }

  return (
    <motion.div
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(200); y.set(200); }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}

export default function Lobby() {
  const { 
    setPetitionerName, setRespondentName, setSelectedCase, startGame, 
    petitionerName, respondentName, selectedCase,
    theme, toggleTheme
  } = useGameStore();
  const [step, setStep] = useState(0); // 0=welcome, 1=names, 2=case-select
  const [localCase, setLocalCase] = useState(null);

  const handleBegin = () => {
    if (!localCase) return;
    setSelectedCase(localCase);
    startGame();
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleStart = () => {
    if (!localCase) return;
    setSelectedCase(localCase);
    startGame();
  };

  return (
    <div className="lobby-bg">
      <div className="lobby-stars" />
      <div className="lobby-orb" />
      <div className="lobby-overlay" />

      {/* Header */}
      <header className="lobby-header">
        <div className="lobby-logo">
          <span className="logo-icon">⚖️</span>
          <span className="logo-text">THEMIS.AI</span>
        </div>
        <div>
          <h1 className="lobby-title">Moot Court</h1>
          <p className="lobby-subtitle">Hon'ble Supreme Court of India — Simulator</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="lobby-main" style={{ paddingBottom: '60px' }}>
        {step === 0 && (
          <TiltCard className="lobby-card glow-border fade-in">
            <div className="lobby-emblem">🏛️</div>
            <h2 className="lobby-card-title">IN THE SUPREME COURT OF INDIA</h2>
            <p className="lobby-card-subtitle">Constitutional & Civil Appellate Jurisdiction</p>
            <div className="lobby-divider" />
            
            <p className="lobby-desc">
              Step into the highest court of the land. Our advanced AI Hon'ble Bench will evaluate your
              arguments, logical structuring, and application of constitutional precedents in real-time.
            </p>
            
            <button className="btn-primary" onClick={() => setStep(1)}>
              ENTER APPEARANCE ➔
            </button>
          </TiltCard>
        )}

        {step === 1 && (
          <TiltCard className="lobby-card glow-border fade-in">
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
            <div className="lobby-actions">
              <button className="btn-secondary" onClick={() => setStep(0)}>BACK</button>
              <button className="btn-primary" onClick={handleNext} disabled={!petitionerName.trim() || !respondentName.trim()}>
                PROCEED TO CASE ➔
              </button>
            </div>
          </TiltCard>
        )}

        {step === 2 && (
          <TiltCard className="lobby-card wide-card glow-border fade-in">
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
            <div className="lobby-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>BACK</button>
              <button className="btn-primary" onClick={handleStart} disabled={!selectedCase && !localCase}>
                APPROACH THE BENCH ➔
              </button>
            </div>
          </TiltCard>
        )}
      </main>

      <div className="lobby-ticker">
        <div className="ticker-content">
          {[
            "🏛️ SUPREME COURT CAUSE LIST • REHEARING ON ARTICLE 21 SCHEDULED • CONTEMPT MOTIONS FILED BY COUNSEL • AI HON'BLE BENCH PRESIDING TODAY • PENDING CASES: 4,021 • COURT IS IN SESSION"
          ].map((item, i) => (
            <span key={i} className="ticker-item">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
