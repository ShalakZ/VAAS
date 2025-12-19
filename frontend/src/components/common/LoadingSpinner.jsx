import PropTypes from 'prop-types';

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function GearAnimation() {
  return (
    <svg className="w-24 h-24" viewBox="0 0 100 100">
      {/* Large Gear - spins clockwise */}
      <g className="gear-spin" style={{ transformOrigin: '35px 45px' }}>
        <circle cx="35" cy="45" r="20" fill="#3b82f6" />
        <circle cx="35" cy="45" r="8" fill="#1e40af" />
        <circle cx="35" cy="45" r="4" fill="#60a5fa" />
        {/* Gear teeth */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <rect
            key={`lg-tooth-${angle}`}
            x="32"
            y="20"
            width="6"
            height="10"
            rx="1"
            fill="#3b82f6"
            transform={`rotate(${angle} 35 45)`}
          />
        ))}
      </g>
      {/* Small Gear - spins counter-clockwise */}
      <g className="gear-spin-reverse" style={{ transformOrigin: '68px 62px' }}>
        <circle cx="68" cy="62" r="14" fill="#60a5fa" />
        <circle cx="68" cy="62" r="5" fill="#3b82f6" />
        <circle cx="68" cy="62" r="2.5" fill="#93c5fd" />
        {/* Gear teeth */}
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <rect
            key={`sm-tooth-${angle}`}
            x="66"
            y="44"
            width="4"
            height="7"
            rx="1"
            fill="#60a5fa"
            transform={`rotate(${angle} 68 62)`}
          />
        ))}
      </g>
    </svg>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};
