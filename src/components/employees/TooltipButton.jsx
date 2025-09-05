// src/components/ui/TooltipButton.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TooltipButton = ({
  children,
  tooltipText,
  tooltipPosition = 'top',
  className,
  disabled = false,
  onClick,
  ariaLabel,
  variant = 'outline',
  size = 'sm',
  asChild = false,
  ...props
}) => {
  const tooltipClasses = cn(
    "absolute hidden group-hover:block bg-body text-body text-xs px-2 py-1 rounded border border-complementary shadow-sm z-10 whitespace-nowrap cursor-default",
    // Position classes
    tooltipPosition === 'top' && "bottom-full left-1/2 -translate-x-1/2 mb-2",
    tooltipPosition === 'bottom' && "top-full left-1/2 -translate-x-1/2 mt-2",
    tooltipPosition === 'left' && "right-full top-1/2 -translate-y-1/2 mr-2",
    tooltipPosition === 'right' && "left-full top-1/2 -translate-y-1/2 ml-2"
  );

  if (asChild && React.isValidElement(children)) {
    return (
      <div className="relative group">
        {React.cloneElement(children, {
          onClick: onClick,
          'aria-label': ariaLabel,
          ...children.props,
        })}
        {tooltipText && (
          <span className={tooltipClasses}>
            {tooltipText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      <Button
        variant={variant}
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "bg-transparent border-complementary text-body hover:bg-accent/20 rounded-lg text-sm py-1.5 px-3 transition-all duration-300 hover:shadow-md",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </Button>
      {tooltipText && (
        <span className={tooltipClasses}>
          {tooltipText}
        </span>
      )}
    </div>
  );
};

export default TooltipButton;
