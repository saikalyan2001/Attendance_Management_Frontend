import { cn } from '@/lib/utils';
import { useTheme } from '../common/ThemeToggle';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => {
  const { theme } = useTheme();

  // Debug theme value
  console.log('Current theme in LoadingSpinner:', theme);

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-opacity-50 z-50',
        theme === 'dark' ? 'bg-[#1f2937]' : 'bg-body', // Hardcode dark theme bg
        'animate-fade-in'
      )}
    >
      <Loader2
        className={cn(
          'h-12 w-12 text-accent',
          'animate-spin',
          theme === 'dark' ? 'opacity-90' : 'opacity-100' // Increased opacity for visibility
        )}
      />
    </div>
  );
};

export default LoadingSpinner;