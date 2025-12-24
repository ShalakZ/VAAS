import { useId } from 'react';
import PropTypes from 'prop-types';
import { useModalFocus } from '../../hooks/useModalFocus';

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-4xl' }) {
  const titleId = useId();
  const modalRef = useModalFocus(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 dark:bg-black/70"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-gray-300 dark:border-gray-600`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-900 px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 id={titleId} className="text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl font-bold leading-none"
            aria-label="Close modal"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 p-6 bg-white dark:bg-gray-800">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  maxWidth: PropTypes.string,
};
