import { useEffect, useRef, useId } from 'react';
import PropTypes from 'prop-types';
import { Button } from './Button';

const variants = {
  danger: {
    icon: (
      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    confirmVariant: 'danger',
  },
  warning: {
    icon: (
      <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    confirmVariant: 'primary',
  },
  info: {
    icon: (
      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    confirmVariant: 'primary',
  },
  success: {
    icon: (
      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    confirmVariant: 'success',
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false,
}) {
  const titleId = useId();
  const descId = useId();
  const confirmButtonRef = useRef(null);
  const previousActiveElement = useRef(null);
  const modalRef = useRef(null);

  const variantStyle = variants[variant] || variants.warning;

  // Store the previously focused element and focus the confirm button when opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      // Small delay to ensure the modal is rendered
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 10);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Restore focus when closing
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Handle escape key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trapping
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 dark:bg-black/70"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variantStyle.iconBg}`}>
              {variantStyle.icon}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <div id={descId} className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {message}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={variantStyle.confirmVariant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  variant: PropTypes.oneOf(['danger', 'warning', 'info', 'success']),
  loading: PropTypes.bool,
};
