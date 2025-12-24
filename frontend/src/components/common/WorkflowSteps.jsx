import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const steps = [
  { id: 'upload', label: 'Upload', icon: '1' },
  { id: 'review', label: 'Review', icon: '2' },
  { id: 'export', label: 'Export', icon: '3' },
];

export function WorkflowSteps({ currentStep, hasData, exportProgress }) {
  const [showBurst, setShowBurst] = useState(false);
  const [particles, setParticles] = useState([]);
  const [isExportComplete, setIsExportComplete] = useState(false);
  const prevProgress = useRef(exportProgress);

  const particleColors = ['#22c55e', '#4ade80', '#86efac', '#16a34a'];

  // Generate burst particles
  const createParticles = () => {
    const newParticles = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const distance = 20 + Math.random() * 15;
      newParticles.push({
        id: i,
        endX: Math.cos(angle) * distance,
        endY: Math.sin(angle) * distance,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        size: 3 + Math.random() * 3,
      });
    }
    setParticles(newParticles);
  };

  // Detect export completion
  useEffect(() => {
    if (prevProgress.current > 0 && prevProgress.current < 100 && exportProgress >= 100) {
      setIsExportComplete(true);
      setShowBurst(true);
      createParticles();
      setTimeout(() => setShowBurst(false), 500);

      // Reset after 5 seconds
      setTimeout(() => setIsExportComplete(false), 5000);
    }
    if (exportProgress === 0 || (exportProgress > 0 && exportProgress < 100)) {
      setIsExportComplete(false);
    }
    prevProgress.current = exportProgress;
  }, [exportProgress]);

  // Determine which step we're on
  const getCurrentStepIndex = () => {
    if (currentStep === 'upload') return 0;
    if (currentStep === 'review') return hasData ? 1 : 0;
    return 0;
  };

  const activeIndex = getCurrentStepIndex();
  const isExporting = exportProgress > 0 && exportProgress < 100;

  return (
    <nav aria-label="Workflow progress" className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isComplete = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isUpcoming = index > activeIndex;
        const isExportStep = step.id === 'export';

        return (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`
                  relative w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors overflow-hidden
                  ${isComplete ? 'bg-green-600 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700' : ''}
                  ${isUpcoming && !isExportStep ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
                  ${isExportStep && !isExporting && !isExportComplete ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
                  ${isExportStep && isExportComplete ? 'bg-green-500 text-white ring-2 ring-green-300' : ''}
                `}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Export progress fill */}
                {isExportStep && isExporting && (
                  <div
                    className="absolute inset-0 bg-green-500 transition-all duration-200"
                    style={{
                      clipPath: `inset(${100 - exportProgress}% 0 0 0)`,
                    }}
                  />
                )}

                {/* Icon/number */}
                <span className="relative z-10">
                  {isComplete || (isExportStep && isExportComplete) ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={isExportStep && isExporting ? 'text-white' : ''}>{step.icon}</span>
                  )}
                </span>

                {/* Burst particles */}
                {isExportStep && showBurst && (
                  <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
                    {particles.map(p => (
                      <div
                        key={p.id}
                        className="absolute animate-burst-step"
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
              </div>
              <span
                className={`
                  text-xs font-medium hidden sm:block
                  ${isCurrent ? 'text-blue-600 dark:text-blue-400' : ''}
                  ${isComplete ? 'text-green-600 dark:text-green-400' : ''}
                  ${isUpcoming && !isExportStep ? 'text-gray-400 dark:text-gray-500' : ''}
                  ${isExportStep && isExporting ? 'text-green-600 dark:text-green-400' : ''}
                  ${isExportStep && isExportComplete ? 'text-green-600 dark:text-green-400' : ''}
                  ${isExportStep && !isExporting && !isExportComplete ? 'text-gray-400 dark:text-gray-500' : ''}
                `}
              >
                {isExportStep && isExporting ? `${Math.round(exportProgress)}%` : step.label}
              </span>
            </div>

            {/* Connector line (except for last step) */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-8 h-0.5 mx-2
                  ${index < activeIndex ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}

      {/* Burst animation styles */}
      <style>{`
        @keyframes burst-step {
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
        .animate-burst-step {
          animation: burst-step 0.5s ease-out forwards;
        }
      `}</style>
    </nav>
  );
}

WorkflowSteps.propTypes = {
  currentStep: PropTypes.oneOf(['upload', 'review', 'kb']),
  hasData: PropTypes.bool,
  exportProgress: PropTypes.number,
};
