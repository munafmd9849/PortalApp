const CRACK_PIECES = [
  { className: 'crack-piece crack-piece-1' },
  { className: 'crack-piece crack-piece-2' },
];

export default function CrackText({ text, className = '' }) {
  return (
    <span className={`crack-wrap ${className}`.trim()}>
      <span className="crack-title">
        {text.split('').map((char, i) => (
          <span
            key={i}
            className={`crack-letter${char === ' ' ? ' crack-letter--space' : ''}`}
          >
            <span className="crack-sizer" aria-hidden>
              {char}
            </span>
            <span className="crack-underlay" aria-hidden>
              {char}
            </span>
            {CRACK_PIECES.map(({ className: pieceClass }, p) => (
              <span key={p} className={pieceClass}>
                {char}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
