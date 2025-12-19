import { GearAnimation } from './LoadingSpinner';

export function LoadingOverlay({ message = 'Processing...', show = false }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center">
          <GearAnimation />
          <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white text-center">
            {message}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            Please wait...
          </p>
        </div>
      </div>
    </div>
  );
}
