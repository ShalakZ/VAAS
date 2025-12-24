import { useId, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useModalFocus } from '../../hooks/useModalFocus';

// Store persistent sizes per modal (keyed by title or a unique identifier)
const persistentSizes = new Map();

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-4xl', resizable = false, defaultSize }) {
  const titleId = useId();
  const modalRef = useModalFocus(isOpen, onClose);

  // Use persistent size if available, otherwise use defaultSize
  const getInitialSize = () => {
    if (resizable && title && persistentSizes.has(title)) {
      return persistentSizes.get(title);
    }
    return defaultSize || { width: 800, height: 600 };
  };

  // Resize state
  const [size, setSize] = useState(getInitialSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });
  const justFinishedResizing = useRef(false);

  // Sync size when modal opens (to pick up persisted size)
  useEffect(() => {
    if (isOpen && resizable && title && persistentSizes.has(title)) {
      setSize(persistentSizes.get(title));
    }
  }, [isOpen, resizable, title]);

  // Resize handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  }, [size]);

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const deltaX = e.clientX - resizeRef.current.startX;
      const deltaY = e.clientY - resizeRef.current.startY;
      const newSize = {
        width: Math.max(400, Math.min(window.innerWidth - 100, resizeRef.current.startWidth + deltaX)),
        height: Math.max(300, Math.min(window.innerHeight - 100, resizeRef.current.startHeight + deltaY)),
      };
      setSize(newSize);
      // Persist the size
      if (title) {
        persistentSizes.set(title, newSize);
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      // Set flag to prevent backdrop click from closing modal
      justFinishedResizing.current = true;
      setTimeout(() => {
        justFinishedResizing.current = false;
      }, 100);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, title]);

  if (!isOpen) return null;

  const modalStyle = resizable ? {
    width: `${size.width}px`,
    height: `${size.height}px`,
    maxWidth: 'none',
    maxHeight: 'none',
  } : {};

  const handleBackdropClick = () => {
    // Don't close if we're resizing or just finished resizing
    if (isResizing || justFinishedResizing.current) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 dark:bg-black/70"
      onClick={handleBackdropClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl ${resizable ? '' : maxWidth + ' w-full max-h-[90vh]'} overflow-hidden flex flex-col border-2 border-gray-300 dark:border-gray-600 relative`}
        style={modalStyle}
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

        {/* Resize Handle */}
        {resizable && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize group z-10"
            title="Drag to resize"
          >
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
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
  resizable: PropTypes.bool,
  defaultSize: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
  }),
};
