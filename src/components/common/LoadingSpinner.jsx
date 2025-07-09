// Enhanced LoadingSpinner Component
import { cn } from '@/lib/utils';
import { useTheme } from '../common/ThemeToggle';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const LoadingSpinner = ({ 
  message = "Loading...", 
  showProgress = false,
  timeout = 10000,
  onTimeout = null,
  size = "default", // "small", "default", "large"
  completeOnUnmount = true // Whether to complete progress bar when unmounting
}) => {
  const { theme } = useTheme();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Show loading after small delay to prevent flash
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(showTimer);
  }, []);

  // Progress animation
  useEffect(() => {
    if (!showProgress) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        const increment = Math.random() * 10 + 5;
        return Math.min(prev + increment, 90);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [showProgress]);

  // Complete progress when component is about to unmount
  useEffect(() => {
    return () => {
      if (showProgress && completeOnUnmount) {
        setProgress(100);
      }
    };
  }, [showProgress, completeOnUnmount]);

  // Timeout handling
  useEffect(() => {
    if (timeout <= 0) return;

    const timeoutTimer = setTimeout(() => {
      setHasTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timeoutTimer);
  }, [timeout, onTimeout]);

  const sizeClasses = {
    small: "h-6 w-6",
    default: "h-12 w-12",
    large: "h-16 w-16"
  };

  const textSizeClasses = {
    small: "text-sm",
    default: "text-lg",
    large: "text-xl"
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col items-center justify-center z-50 transition-opacity duration-300',
        theme === 'dark' 
          ? 'bg-gray-900/80 backdrop-blur-sm' 
          : 'bg-white/80 backdrop-blur-sm'
      )}
      role="status"
      aria-label="Loading application content"
    >
      <div className={cn(
        'flex flex-col items-center space-y-6 p-8 rounded-2xl shadow-2xl',
        theme === 'dark' 
          ? 'bg-gray-800/90 border border-gray-700' 
          : 'bg-white/90 border border-gray-200'
      )}>
        {/* Main Spinner */}
        <div className="relative">
          <Loader2
            className={cn(
              sizeClasses[size],
              'text-accent animate-spin',
              theme === 'dark' ? 'opacity-90' : 'opacity-100'
            )}
          />
          
          {/* Pulsing ring effect */}
          <div className={cn(
            'absolute inset-0 rounded-full border-2 border-accent/20 animate-pulse',
            sizeClasses[size]
          )} />
        </div>

        {/* Loading Message */}
        <div className="text-center space-y-2">
          <p className={cn(
            textSizeClasses[size],
            'font-medium animate-pulse',
            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          )}>
            {hasTimedOut ? "Taking longer than expected..." : message}
          </p>
          
          {/* Progress Bar */}
          {showProgress && (
            <div className={cn(
              'w-64 h-2 rounded-full overflow-hidden',
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
            )}>
              <div 
                className="h-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Timeout Message */}
          {hasTimedOut && (
            <p className={cn(
              'text-sm',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}>
              Please check your connection and try again
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;