import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TooltipButton = ({
  onClick,
  disabled,
  children,
  tooltipText,
  variant = "outline",
  size = "sm",
  className,
  ariaLabel,
}) => {
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
      >
        {children}
      </Button>
      <span className={cn(
        "absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 bg-body text-body text-xs px-2 py-1 rounded border border-complementary shadow-sm z-10 whitespace-nowrap",
        "cursor-default"
      )}>
        {tooltipText}
      </span>
    </div>
  );
};

export default TooltipButton;