import React from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const ReusableDialog = ({
  open,
  onOpenChange,
  title,
  children,
  onSubmit,
  submitLabel = 'Submit',
  isSubmitting = false,
  isLoading = false,
  submitButtonClass = 'bg-accent text-body hover:bg-accent-hover',
  cancelButtonClass = 'border-complementary text-body hover:bg-complementary/10',
  submitDisabled = false,
  maxWidth = 'sm:max-w-md',
}) => {
  return (
    <DialogContent className={`bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] ${maxWidth}`}>
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">{title}</DialogTitle>
      </DialogHeader>
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          {children}
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`${cancelButtonClass} rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md`}
              disabled={isLoading || isSubmitting}
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              className={`${submitButtonClass} rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md`}
              disabled={isLoading || isSubmitting || submitDisabled}
              aria-label={submitLabel}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : submitLabel}
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  );
};

export default ReusableDialog;