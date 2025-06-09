import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { deactivateEmployee } from "../redux/employeeSlice";
import { toast } from "sonner";

const DeactivateDialog = ({ open, onOpenChange, employeeId }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);

  const handleConfirm = () => {
    dispatch(deactivateEmployee(employeeId)).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        onOpenChange(false);
        toast.success("Employee deactivated successfully", { duration: 5000 });
      } else {
        toast.error(result.payload || "Failed to deactivate employee", { duration: 5000 });
      }
    });
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
            disabled={employeesLoading}
            aria-label="Cancel deactivation"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-error text-body hover:bg-error-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
            disabled={employeesLoading}
            aria-label="Confirm deactivation"
          >
            {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeactivateDialog;