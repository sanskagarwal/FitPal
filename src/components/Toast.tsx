import { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, onClose, duration = 4000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: AlertCircle,
          iconColor: 'text-red-600'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: Info,
          iconColor: 'text-blue-600'
        };
    }
  };

  const styles = getStyles();
  const Icon = styles.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`fixed top-4 right-4 left-4 sm:left-auto z-50 max-w-md w-auto sm:w-full shadow-lg rounded-lg border ${styles.bg} ${styles.border} p-4`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
        <p className={`flex-1 text-sm font-medium ${styles.text}`}>{message}</p>
        <button
          onClick={onClose}
          className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0 -m-1 inline-flex items-center justify-center min-h-11 min-w-11`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
