import PropTypes from 'prop-types';

export function Skeleton({ className = '', variant = 'text' }) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  const variantClasses = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    circle: 'h-10 w-10 rounded-full',
    rect: 'h-12 w-full',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant] || ''} ${className}`}
      aria-hidden="true"
    />
  );
}

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'title', 'circle', 'rect']),
};

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="animate-pulse" aria-label="Loading data...">
      {/* Header skeleton */}
      <div className="bg-gray-100 dark:bg-gray-900 p-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded flex-1" />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="border-b border-gray-200 dark:border-gray-700 p-3 flex gap-4"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
                colIndex === 0 ? 'w-1/4' :
                colIndex === 1 ? 'flex-1' :
                colIndex === 2 ? 'w-1/5' : 'w-1/6'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

TableSkeleton.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number,
};
