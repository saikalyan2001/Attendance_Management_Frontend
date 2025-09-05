import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { parseServerError } from '@/utils/errorUtils';

const ReusableDeactivateDialog = ({
  open,
  onOpenChange,
  employeeId,
  role,
  reduxSelectors,
  actions,
  setSuccessMessage,
}) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector(reduxSelectors.employees) || {};
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await dispatch(actions.deactivateEmployee(employeeId)).unwrap();
      if (role === 'siteincharge') {
        toast.success('Employee deactivated successfully', {
          id: 'deactivate-employee-success',
          duration: 10000,
          position: 'top-center',
        });
      } else {
        setSuccessMessage('Employee deactivated successfully');
      }
      onOpenChange(false);
      if (actions.reset) {
        dispatch(actions.reset());
      }
    } catch (error) {
      const errorMessage =
        role === 'siteincharge'
          ? error.message || 'Failed to deactivate employee'
          : parseServerError(error).message;
      toast.error(errorMessage, {
        id: `deactivate-employee-error-${Date.now()}`,
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
      <DialogHeader>
        <DialogTitle
          className={`font-bold ${
            role === 'siteincharge'
              ? 'text-base sm:text-lg md:text-xl xl:text-2xl'
              : 'text-base sm:text-lg md:text-xl'
          }`}
        >
          Deactivate Employee
        </DialogTitle>
      </DialogHeader>
      <p className="text-body text-[11px] sm:text-sm xl:text-base">
        Are you sure you want to deactivate this employee? They can be reactivated later.
      </p>
      <DialogFooter className="mt-4">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md"
          disabled={employeesLoading || isSubmitting}
          aria-label="Cancel deactivation"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          className={`bg-error text-body hover:bg-error-hover rounded-md text-[11px] sm:text-sm xl:text-lg py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md ${
            role !== 'siteincharge' ? 'hover:scale-105 animate-pulse' : ''
          }`}
          disabled={employeesLoading || isSubmitting}
          aria-label="Confirm deactivation"
        >
          {employeesLoading || isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Deactivate'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default ReusableDeactivateDialog;