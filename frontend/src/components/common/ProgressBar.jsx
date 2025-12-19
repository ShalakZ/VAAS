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
  const bgColors = {
    blue: 'bg-blue-100 dark:bg-blue-900/50',
    green: 'bg-green-100 dark:bg-green-900/50',
  };

  const textColors = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-48 px-4 py-2 border dark:border-gray-600 rounded text-sm overflow-hidden group transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      {isExporting && (
        <div
          className={`absolute inset-0 ${bgColors[color]} transition-all ease-out h-full`}
          style={{ width: `${isExporting}%` }}
        />
      )}
      <div className={`relative z-10 flex items-center justify-center gap-2 ${isExporting ? textColors[color] : 'text-gray-700 dark:text-gray-200'}`}>
        {isExporting ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{exportingLabel}</span>
          </>
        ) : (
          <>{label}</>
        )}
      </div>
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
