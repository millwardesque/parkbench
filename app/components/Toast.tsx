import { useEffect, useState } from 'react';

export type ToastProps = {
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
  onClose: () => void;
};

// Default values for optional props
const defaultToastProps: Partial<ToastProps> = {
  type: 'info',
  duration: 5000,
  onClose: () => {},
};

export function Toast({ message, type, duration, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss the toast after duration
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  // Different styles based on toast type
  const typeStyles = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg border ${
        typeStyles[type]
      } max-w-md transition-opacity`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center">
        <div className="flex-grow">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          type="button"
          className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
          aria-label="Close"
        >
          <span className="text-xl">&times;</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to manage toast state throughout the application
 */
export function useToast() {
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = (props: Partial<ToastProps>) => {
    setToast({
      ...defaultToastProps,
      ...props,
    });
  };

  const hideToast = () => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    hideToast,
  };
}

/**
 * Component to render toast notifications from response headers
 * Uses X-Success and X-Success-Message headers to display success toasts
 * Uses X-Error and X-Error-Message headers to display error toasts
 */
export function ToastFromHeaders() {
  const [toast, setToast] = useState<ToastProps | null>(null);

  useEffect(() => {
    // Check for toast headers
    const success = document
      .querySelector('meta[name="x-success"]')
      ?.getAttribute('content');
    const successMessage = document
      .querySelector('meta[name="x-success-message"]')
      ?.getAttribute('content');
    const error = document
      .querySelector('meta[name="x-error"]')
      ?.getAttribute('content');
    const errorMessage = document
      .querySelector('meta[name="x-error-message"]')
      ?.getAttribute('content');

    if (success === 'true' && successMessage) {
      setToast({
        message: successMessage,
        type: 'success',
        duration: 5000,
      });
    } else if (error === 'true' && errorMessage) {
      setToast({
        message: errorMessage,
        type: 'error',
        duration: 5000,
      });
    }
  }, []);

  if (!toast) return null;

  // Apply default props and pass individually to avoid prop spreading
  const toastWithDefaults = {
    ...defaultToastProps,
    ...toast,
  };

  return (
    <Toast
      message={toastWithDefaults.message!}
      type={toastWithDefaults.type}
      duration={toastWithDefaults.duration}
      onClose={() => {
        setToast(null);
        if (toastWithDefaults.onClose) toastWithDefaults.onClose();
      }}
    />
  );
}
