import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { deactivateEmployee } from "../redux/employeeSlice";
import { toast } from "react-hot-toast";

const DeactivateDialog = ({ open, onOpenChange, employeeId }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await dispatch(deactivateEmployee(employeeId)).unwrap();
      toast.success("Employee deactivated successfully", {
        id: 'deactivate-employee-success',
        duration: 10000,
        position: 'top-center',
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Failed to deactivate employee", {
        id: 'deactivate-employee-error',
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
            Deactivate Employee
          </DialogTitle>
        </DialogHeader>
        <p className="text-body text-[10px] sm:text-sm xl:text-base">
          Are you sure you want to deactivate this employee? They can be reactivated later.
        </p>
        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
            disabled={employeesLoading || isSubmitting}
            aria-label="Cancel deactivation"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-error text-body hover:bg-error-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
            disabled={employeesLoading || isSubmitting}
            aria-label="Confirm deactivation"
          >
            {employeesLoading || isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeactivateDialog;