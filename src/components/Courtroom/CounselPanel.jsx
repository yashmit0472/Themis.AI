import { useState, useRef } from 'react';

export default function CounselPanel({ side, name, isActive, isDisabled, scores, onSubmit, onObjection, canObjection }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  const isPetitioner = side === 'petitioner';
  const color = isPetitioner ? '#4a90d9' : '#e05c5c';
  const glowColor = isPetitioner ? 'rgba(74,144,217,0.3)' : 'rgba(224,92,92,0.3)';
  const icon = isPetitioner ? '👔' : '⚖️';
  const title = isPetitioner ? 'PETITIONER' : 'RESPONDENT';

  const handleSubmit = async () => {
    if (!text.trim() || isDisabled) return;
    const t = text;
    setText('');
    setSubmitted(true);
    await onSubmit(t);
    setTimeout(() => setSubmitted(false), 1000);
  };

  const handleType = (e) => {
    setText(e.target.value);
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 200);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  const samplePrompts = isPetitioner
    ? ["Article 21 guarantees...", "The precedent in Puttaswamy clearly...", "This Court has held that..."]
    : ["The respondent respectfully submits...", "The petitioner's argument fails because...", "Distinction from precedent..."];

  return (
    <div
      className={`counsel-panel ${isActive ? 'counsel-active glow-border' : 'counsel-inactive'} ${isPetitioner ? 'counsel-petitioner' : 'counsel-respondent'}`}
      style={{ '--accent': color, '--glow': glowColor }}
    >
      {/* Active indicator bar */}
      {isActive && <div className="counsel-active-bar" style={{ background: color }} />}

      {/* Header */}
      <div className="counsel-header">
        <div className="counsel-avatar" style={{ borderColor: color, boxShadow: isActive ? `0 0 20px ${glowColor}` : 'none' }}>
          <span>{icon}</span>
        </div>
        <div className="counsel-info">
          <div className="counsel-role" style={{ color }}>{title}</div>
          <div className="counsel-name">{name}</div>
        </div>
        {isActive && <div className="counsel-speaking-dot" style={{ backgroundColor: color }} />}
      </div>

      {/* Mini score display */}
      <div className="counsel-mini-scores">
        <ScoreMini label="Logic" value={scores.logic} color={color} />
        <ScoreMini label="Clarity" value={scores.clarity} color={color} />
        <ScoreMini label="Confidence" value={scores.confidence} color={color} />
      </div>

      {/* Total score */}
      <div className="counsel-total-score" style={{ color }}>
        <span className="total-label">Total</span>
        <span className="total-value" style={{ textShadow: `0 0 20px ${color}` }}>{scores.total}</span>
        <span className="total-max">/100</span>
      </div>

      {/* Input area */}
      <div className={`counsel-input-wrap ${isActive ? 'input-active' : 'input-disabled'}`}>
        {isActive ? (
          <>
            <div className="input-prompt">Your argument to the Bench:</div>
            <textarea
              ref={textareaRef}
              className={`counsel-textarea ${isTyping ? 'typing-glow' : ''}`}
              style={{ borderColor: `${color}40`, boxShadow: `0 0 0 1px ${color}10` }}
              placeholder={`${name}, submit your argument...`}
              value={text}
              onChange={handleType}
              onKeyDown={handleKey}
              disabled={isDisabled}
              rows={4}
            />
            <div className="input-footer">
              <div className="word-count">{wordCount} words</div>
              <div className="input-hint">Enter to submit · Shift+Enter for new line</div>
            </div>

            {/* Quick prompts */}
            <div className="quick-prompts">
              {samplePrompts.map((p, i) => (
                <button key={i} className="quick-prompt-btn" style={{ borderColor: `${color}40`, color }}
                  onClick={() => setText(prev => prev + p)}>
                  {p.substring(0, 22)}...
                </button>
              ))}
            </div>

            <button
              className="counsel-submit-btn"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
              onClick={handleSubmit}
              disabled={!text.trim() || isDisabled}
            >
              {submitted ? '✓ Submitted' : '📣 Submit to Court'}
            </button>
          </>
        ) : (
          <div className="counsel-waiting">
            <div className="waiting-dots">
              <span /><span /><span />
            </div>
            <div className="waiting-text">
              {canObjection ? 'Can raise objection' : 'Awaiting turn...'}
            </div>
          </div>
        )}
      </div>

      {/* Objection button */}
      {canObjection && (
        <button className="objection-btn" style={{ borderColor: color, color }}
          onClick={onObjection}>
          🚫 OBJECTION!
        </button>
      )}
    </div>
  );
}

function ScoreMini({ label, value, color }) {
  const pct = (value / 10) * 100;
  return (
    <div className="score-mini">
      <div className="score-mini-header">
        <span className="score-mini-label">{label}</span>
        <span className="score-mini-val" style={{ color }}>{value || '—'}</span>
      </div>
      <div className="score-mini-bar">
        <div className="score-mini-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
