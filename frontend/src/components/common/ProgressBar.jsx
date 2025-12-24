import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

export function ProgressBar({ progress, color = 'blue', className = '' }) {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
  };

  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 ${className}`}>
      <div
        className={`${colors[color]} h-2.5 rounded-full transition-all duration-300`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function ExportButton({ onClick, disabled, isExporting, label, exportingLabel, color = 'blue' }) {
  const [fillLevel, setFillLevel] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [particles, setParticles] = useState([]);
  const prevExporting = useRef(isExporting);
  const unfillTimer = useRef(null);
  const unfillInterval = useRef(null);

  const bgColors = {
    blue: 'bg-blue-400/40 dark:bg-blue-500/40',
    green: 'bg-green-400/40 dark:bg-green-500/40',
  };

  const completeBgColors = {
    blue: 'bg-blue-400/60 dark:bg-blue-500/50',
    green: 'bg-green-400/60 dark:bg-green-500/50',
  };

  const textColors = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
  };

  const particleColors = {
    blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'],
    green: ['#22c55e', '#4ade80', '#86efac', '#16a34a'],
  };

  // Generate burst particles
  const createParticles = () => {
    const newParticles = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 25 + Math.random() * 20;
      newParticles.push({
        id: i,
        endX: Math.cos(angle) * distance,
        endY: Math.sin(angle) * distance,
        color: particleColors[color][Math.floor(Math.random() * particleColors[color].length)],
        size: 4 + Math.random() * 4,
      });
    }
    setParticles(newParticles);
  };

  // Track export progress
  useEffect(() => {
    if (isExporting && typeof isExporting === 'number') {
      setFillLevel(isExporting);
      setIsComplete(false);

      // Clear any unfill in progress
      if (unfillTimer.current) clearTimeout(unfillTimer.current);
      if (unfillInterval.current) clearInterval(unfillInterval.current);
    }
  }, [isExporting]);

  // Detect completion (was exporting, now not)
  useEffect(() => {
    if (prevExporting.current && !isExporting && fillLevel >= 100) {
      // Export just completed
      setIsComplete(true);
      setShowBurst(true);
      createParticles();

      // Hide burst after animation
      setTimeout(() => setShowBurst(false), 600);

      // Start unfill after 5 seconds
      unfillTimer.current = setTimeout(() => {
        unfillInterval.current = setInterval(() => {
          setFillLevel(prev => {
            if (prev <= 0) {
              clearInterval(unfillInterval.current);
              setIsComplete(false);
              return 0;
            }
            return prev - 2; // Slow unfill
          });
        }, 50);
      }, 5000);
    }
    prevExporting.current = isExporting;
  }, [isExporting, fillLevel, color]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unfillTimer.current) clearTimeout(unfillTimer.current);
      if (unfillInterval.current) clearInterval(unfillInterval.current);
    };
  }, []);

  const currentFill = isExporting ? isExporting : fillLevel;
  const showFill = currentFill > 0;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-48 h-9 px-4 border dark:border-gray-600 rounded text-sm overflow-hidden group transition-all ${
        disabled && !isComplete ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm'
      } ${isComplete ? 'border-green-400 dark:border-green-500' : ''}`}
    >
      {/* Fill bar */}
      {showFill && (
        <div
          className={`absolute inset-y-0 left-0 ${isComplete ? completeBgColors[color] : bgColors[color]} transition-all duration-300 ease-out`}
          style={{ width: `${currentFill}%` }}
        />
      )}

      {/* Burst particles */}
      {showBurst && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute animate-burst"
              style={{
                left: '50%',
                top: '50%',
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: '50%',
                '--end-x': `${p.endX}px`,
                '--end-y': `${p.endY}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Button content */}
      <div className={`relative z-10 flex items-center justify-center gap-2 h-full ${
        isExporting || isComplete ? textColors[color] : 'text-gray-700 dark:text-gray-200'
      }`}>
        {isExporting ? (
          <>
            <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{exportingLabel}</span>
          </>
        ) : isComplete ? (
          <>
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Complete!</span>
          </>
        ) : (
          <>{label}</>
        )}
      </div>

      {/* Inline styles for burst animation */}
      <style>{`
        @keyframes burst {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(-50% + var(--end-x)),
              calc(-50% + var(--end-y))
            ) scale(0);
            opacity: 0;
          }
        }
        .animate-burst {
          animation: burst 0.5s ease-out forwards;
        }
      `}</style>
    </button>
  );
}

ProgressBar.propTypes = {
  progress: PropTypes.number,
  color: PropTypes.oneOf(['blue', 'green', 'yellow', 'red']),
  className: PropTypes.string,
};

ExportButton.propTypes = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  isExporting: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  label: PropTypes.string,
  exportingLabel: PropTypes.string,
  color: PropTypes.oneOf(['blue', 'green']),
};
