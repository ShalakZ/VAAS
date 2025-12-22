import PropTypes from 'prop-types';

const steps = [
  { id: 'upload', label: 'Upload', icon: '1' },
  { id: 'review', label: 'Review', icon: '2' },
  { id: 'export', label: 'Export', icon: '3' },
];

export function WorkflowSteps({ currentStep, hasData }) {
  // Determine which step we're on
  const getCurrentStepIndex = () => {
    if (currentStep === 'upload') return 0;
    if (currentStep === 'review') return hasData ? 1 : 0;
    return 0;
  };

  const activeIndex = getCurrentStepIndex();

  return (
    <nav aria-label="Workflow progress" className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isComplete = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isUpcoming = index > activeIndex;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${isComplete ? 'bg-green-600 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700' : ''}
                  ${isUpcoming ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
                `}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={`
                  text-xs font-medium hidden sm:block
                  ${isCurrent ? 'text-blue-600 dark:text-blue-400' : ''}
                  ${isComplete ? 'text-green-600 dark:text-green-400' : ''}
                  ${isUpcoming ? 'text-gray-400 dark:text-gray-500' : ''}
                `}
              >
                {step.label}
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
    </nav>
  );
}

WorkflowSteps.propTypes = {
  currentStep: PropTypes.oneOf(['upload', 'review', 'kb']),
  hasData: PropTypes.bool,
};
