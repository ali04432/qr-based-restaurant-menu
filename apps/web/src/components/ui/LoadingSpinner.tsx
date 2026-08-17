// ============================================================
// Loading Spinner Component
// Accessible, animated loading indicator.
// ============================================================

interface LoadingSpinnerProps {
  /** Visual size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label for screen readers */
  label?: string;
  /** Center the spinner in its container */
  centered?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
};

export function LoadingSpinner({
  size = 'md',
  label = 'Loading...',
  centered = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div role="status" aria-label={label}>
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full
          border-brand-200
          border-t-brand-500
          animate-spin
        `}
      />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[100px]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
