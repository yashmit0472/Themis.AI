export default function ObjectionOverlay({ name }) {
  return (
    <div className="objection-overlay">
      <div className="objection-card">
        <div className="objection-icon">🚫</div>
        <div className="objection-text">OBJECTION!</div>
        <div className="objection-by">Raised by {name}</div>
      </div>
    </div>
  );
}
