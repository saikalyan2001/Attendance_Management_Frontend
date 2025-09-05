import { cn } from '@/lib/utils';
import { useTheme } from '../common/ThemeToggle';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';

const LoadingSpinner = ({
  message = "Loading...",
  showProgress = false,
  timeout = 10000,
  onTimeout = null,
  size = "default",
  completeOnUnmount = true,
  variant = "default", // "default", "minimal", "pulse"
  showDelay = 100
}) => {
  const { theme } = useTheme();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const progressRef = useRef(progress);
  const startTimeRef = useRef(Date.now());

  // Memoized size configurations
  const sizeConfig = useMemo(() => ({
    small: {
      spinner: "h-4 w-4",
      text: "text-sm",
      container: "p-4",
      progress: "w-48 h-1.5"
    },
    default: {
      spinner: "h-8 w-8",
      text: "text-base",
      container: "p-6",
      progress: "w-64 h-2"
    },
    large: {
      spinner: "h-12 w-12",
      text: "text-lg",
      container: "p-8",
      progress: "w-80 h-3"
    }
  }), []);

  const currentSize = sizeConfig[size] || sizeConfig.default;

  // Update progressRef whenever progress changes
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Show loading spinner with configurable delay
  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), showDelay);
    return () => clearTimeout(showTimer);
  }, [showDelay]);

  // Enhanced progress animation with realistic timing
  useEffect(() => {
    if (!showProgress || hasTimedOut) return;

    const incrementProgress = () => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        
        // More realistic progress curve
        const elapsed = Date.now() - startTimeRef.current;
        const timeProgress = Math.min(elapsed / timeout, 0.9);
        const randomVariation = Math.random() * 3;
        
        return Math.min(timeProgress * 100 + randomVariation, 90);
      });
    };

    const interval = setInterval(incrementProgress, 200);
    return () => clearInterval(interval);
  }, [showProgress, hasTimedOut, timeout]);

  // Smooth completion animation
  useEffect(() => {
    return () => {
      if (showProgress && completeOnUnmount && progressRef.current < 100) {
        const completeAnimation = () => {
          let current = progressRef.current;
          const step = () => {
            if (current >= 100) return;
            current = Math.min(current + 8, 100);
            setProgress(current);
            if (current < 100) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        };
        completeAnimation();
      }
    };
  }, [showProgress, completeOnUnmount]);

  // Enhanced timeout handling
  useEffect(() => {
    if (timeout <= 0) return;

    const timeoutTimer = setTimeout(() => {
      setHasTimedOut(true);
      setProgress(100);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timeoutTimer);
  }, [timeout, onTimeout]);

  const handleRetry = () => {
    setHasTimedOut(false);
    setProgress(0);
    setIsRetrying(true);
    startTimeRef.current = Date.now();
    
    // Reset retry state after a brief moment
    setTimeout(() => setIsRetrying(false), 500);
    
    onTimeout?.('retry');
  };

  if (!isVisible) return null;

  // Variant-specific rendering
  const renderSpinner = () => {
    switch (variant) {
      case "minimal":
        return (
          <div className="flex items-center justify-center space-x-3">
            <Loader2 
              className={cn(currentSize.spinner, "animate-spin text-accent")}
              aria-hidden="true" 
            />
            <span className={cn(currentSize.text, "font-medium", 
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700')}>
              {message}
            </span>
          </div>
        );
      
      case "pulse":
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className={cn(
                currentSize.spinner,
                "rounded-full border-4 border-accent/20 animate-pulse"
              )} />
              <div className={cn(
                "absolute inset-2 rounded-full bg-accent animate-ping"
              )} />
            </div>
            <p className={cn(currentSize.text, "font-medium animate-pulse",
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700')}>
              {message}
            </p>
          </div>
        );
      
      default:
        return (
          <div className="flex flex-col items-center space-y-6">
            {/* Enhanced spinner with multiple animation rings */}
            <div className="relative flex items-center justify-center">
              {/* Outer ring */}
              <div className={cn(
                currentSize.spinner,
                "absolute rounded-full border-2 border-accent/10 animate-spin",
                "scale-150"
              )} />
              
              {/* Middle ring */}
              <div className={cn(
                currentSize.spinner,
                "absolute rounded-full border-2 border-accent/20 animate-spin",
                "scale-125 [animation-duration:1.5s] [animation-direction:reverse]"
              )} />
              
              {/* Main spinner */}
              <Loader2
                className={cn(
                  currentSize.spinner,
                  "text-accent animate-spin relative z-10"
                )}
                aria-hidden="true"
              />
              
              {/* Inner glow effect */}
              <div className={cn(
                "absolute inset-0 rounded-full bg-accent/5 animate-pulse",
                currentSize.spinner
              )} />
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
              <div className="space-y-1">
                <p className={cn(
                  currentSize.text,
                  "font-semibold",
                  hasTimedOut ? "text-amber-600 dark:text-amber-400" : 
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                )}>
                  {hasTimedOut ? (
                    <span className="flex items-center justify-center space-x-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Taking longer than expected</span>
                    </span>
                  ) : (
                    message
                  )}
                </p>
                
                {!hasTimedOut && (
                  <p className={cn(
                    "text-xs opacity-75",
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    Please wait while we load your content
                  </p>
                )}
              </div>

              {/* Enhanced Progress Bar */}
              {showProgress && (
                <div className="space-y-2">
                  <div
                    className={cn(
                      currentSize.progress,
                      "relative rounded-full overflow-hidden",
                      theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200/50',
                      "backdrop-blur-sm"
                    )}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-label="Loading progress"
                  >
                    <div
                      className={cn(
                        "h-full transition-all duration-300 ease-out relative",
                        "bg-gradient-to-r from-accent to-accent/80"
                      )}
                      style={{ width: `${progress}%` }}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </div>
                  </div>
                  
                  <div className={cn(
                    "text-xs text-center tabular-nums",
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {Math.round(progress)}%
                  </div>
                </div>
              )}

              {/* Timeout handling */}
              {hasTimedOut && (
                <div className="space-y-3 pt-2">
                  <p className={cn(
                    "text-sm",
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    This is taking longer than usual. Please check your connection.
                  </p>
                  
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className={cn(
                      "inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg",
                      "font-medium transition-all duration-200",
                      "bg-accent hover:bg-accent/90 text-white",
                      "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transform hover:scale-105 active:scale-95",
                      theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'
                    )}
                    type="button"
                    aria-label="Retry loading"
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4",
                      isRetrying && "animate-spin"
                    )} />
                    <span>{isRetrying ? "Retrying..." : "Try Again"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'transition-all duration-300 ease-in-out',
        theme === 'dark' 
          ? 'bg-gray-900/90 backdrop-blur-md' 
          : 'bg-white/90 backdrop-blur-md'
      )}
      role="dialog"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading application content"
    >
      <div
        className={cn(
          'relative flex flex-col items-center max-w-md mx-4',
          currentSize.container,
          'rounded-2xl shadow-2xl',
          'border transition-all duration-300',
          theme === 'dark' 
            ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-sm' 
            : 'bg-white/95 border-gray-200/50 backdrop-blur-sm',
          'animate-in fade-in-0 zoom-in-95 duration-300'
        )}
      >
        {renderSpinner()}
      </div>
    </div>
  );
};

export default LoadingSpinner;
