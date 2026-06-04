import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  className?: string;
}

export const Spinner = ({ className = 'w-4 h-4' }: SpinnerProps) => (
  <Loader2 className={`animate-spin ${className}`} />
);

interface LoadingBlockProps {
  label?: string;
  className?: string;
}

// A simple inline loading row with a spinner and a message.
export const LoadingBlock = ({ label = 'Thinking…', className = '' }: LoadingBlockProps) => (
  <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
    <Spinner className="w-4 h-4" />
    <span className="text-sm">{label}</span>
  </div>
);
