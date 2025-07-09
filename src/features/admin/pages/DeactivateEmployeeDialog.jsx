import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deactivateEmployee, reset as resetEmployees } from '../redux/employeeSlice';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { parseServerError } from '@/utils/errorUtils';

const DeactivateEmployeeDialog = ({ open, onOpenChange, employeeId, setSuccessMessage }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.adminEmployees);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await dispatch(deactivateEmployee(employeeId)).unwrap();
      setSuccessMessage('Employee deactivated successfully');
      onOpenChange(false);
      dispatch(resetEmployees());
    } catch (error) {
      const parsedError = parseServerError(error);
      toast.error(parsedError.message, { position: 'top-center', duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg md:text-xl font-bold">Deactivate Employee</DialogTitle>
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
          className="bg-error text-body hover:bg-error-hover rounded-md text-[11px] sm:text-sm xl:text-lg py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px] transition-all duration-300 hover:shadow-md hover:scale-105 animate-pulse"
          disabled={employeesLoading || isSubmitting}
          aria-label="Confirm deactivation"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Deactivate'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default DeactivateEmployeeDialog;