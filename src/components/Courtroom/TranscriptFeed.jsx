import { useGameStore } from '../../store/gameStore';
import { useEffect, useRef } from 'react';

export default function TranscriptFeed() {
  const { transcript } = useGameStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const getIcon = (type) => {
    if (type === 'judge') return '⚖️';
    if (type === 'petitioner') return '🔵';
    if (type === 'respondent') return '🔴';
    if (type === 'objection') return '🚫';
    return '📝';
  };

  const getClass = (type) => {
    if (type === 'judge') return 'entry-judge';
    if (type === 'petitioner') return 'entry-petitioner';
    if (type === 'respondent') return 'entry-respondent';
    if (type === 'objection') return 'entry-objection';
    return '';
  };

  return (
    <div className="transcript-wrap">
      <div className="transcript-header">
        <span className="transcript-title">📜 LIVE TRANSCRIPT</span>
        <span className="transcript-count">{transcript.length} entries</span>
      </div>
      <div className="transcript-body">
        {transcript.length === 0 && (
          <div className="transcript-empty">Court proceedings will appear here...</div>
        )}
        {transcript.map((entry) => (
          <div key={entry.id} className={`transcript-entry ${getClass(entry.type)} fade-in`}>
            <div className="entry-icon">{getIcon(entry.type)}</div>
            <div className="entry-content">
              <div className="entry-label">
                {entry.type === 'judge' ? 'HON\'BLE BENCH' :
                 entry.type === 'petitioner' ? 'PETITIONER' :
                 entry.type === 'respondent' ? 'RESPONDENT' : 'OBJECTION'}
                <span className="entry-time">{entry.timestamp}</span>
              </div>
              <div className="entry-text">{entry.text}</div>
              {entry.scores && (
                <div className="entry-scores">
                  <span>Logic: {entry.scores.logic}</span>
                  <span>Clarity: {entry.scores.clarity}</span>
                  <span>Confidence: {entry.scores.confidence}</span>
                  {entry.scores.feedback && <span className="entry-feedback">{entry.scores.feedback}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
