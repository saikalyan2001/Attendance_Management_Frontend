import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const editRequestSchema = z.object({
  requestedStatus: z.enum(["present", "absent", "leave", "half-day"], {
    required_error: "Please select a requested status",
  }),
  reason: z
    .string()
    .min(10, { message: "Reason must be at least 10 characters long" })
    .max(500, { message: "Reason cannot exceed 500 characters" }),
});

export const BulkMarkDialog = ({
  bulkConfirmDialog,
  setBulkConfirmDialog,
  confirmBulkSubmit,
  employees,
  loading,
}) => {
  const { open, records, remaining, preview } = bulkConfirmDialog;

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp._id.toString() === employeeId);
    return employee ? `${employee.name} (${employee.employeeId})` : "Unknown";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) =>
        setBulkConfirmDialog({ ...bulkConfirmDialog, open: isOpen })
      }
    >
      <DialogContent className="sm:max-w-[600px] bg-body text-body border-complementary">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {preview ? "Preview Bulk Attendance" : "Confirm Bulk Attendance"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto">
          {records.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Selected Employees</h3>
              <Table className="border border-complementary">
                <TableHeader>
                  <TableRow className="bg-complementary">
                    <TableHead className="text-body text-sm">Employee</TableHead>
                    <TableHead className="text-body text-sm">Status</TableHead>
                    <TableHead className="text-body text-sm">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, index) => (
                    <TableRow
                      key={record.employeeId}
                      className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
                    >
                      <TableCell className="text-body text-sm">
                        {getEmployeeName(record.employeeId)}
                      </TableCell>
                      <TableCell className="text-body text-sm capitalize">
                        {record.status}
                      </TableCell>
                      <TableCell className="text-body text-sm">{record.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {remaining.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Remaining Employees (Marked as Present)
              </h3>
              <Table className="border border-complementary">
                <TableHeader>
                  <TableRow className="bg-complementary">
                    <TableHead className="text-body text-sm">Employee</TableHead>
                    <TableHead className="text-body text-sm">Status</TableHead>
                    <TableHead className="text-body text-sm">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remaining.map((record, index) => (
                    <TableRow
                      key={record.employeeId}
                      className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
                    >
                      <TableCell className="text-body text-sm">
                        {getEmployeeName(record.employeeId)}
                      </TableCell>
                      <TableCell className="text-body text-sm capitalize">
                        {record.status}
                      </TableCell>
                      <TableCell className="text-body text-sm">{record.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() =>
              setBulkConfirmDialog({ ...bulkConfirmDialog, open: false })
            }
            className="border-accent text-accent hover:bg-accent-hover"
            aria-label="Cancel bulk attendance confirmation"
          >
            Cancel
          </Button>
          {!preview && (
            <Button
              onClick={confirmBulkSubmit}
              disabled={loading}
              className="bg-accent text-complementary hover:bg-accent-hover"
              aria-label="Confirm bulk attendance submission"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const IndividualMarkDialog = ({
  individualConfirmDialog,
  setIndividualConfirmDialog,
  confirmIndividualSubmit,
  employees,
  loading,
}) => {
  const { open, records, preview } = individualConfirmDialog;

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp._id.toString() === employeeId);
    return employee ? `${employee.name} (${employee.employeeId})` : "Unknown";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) =>
        setIndividualConfirmDialog({ ...individualConfirmDialog, open: isOpen })
      }
    >
      <DialogContent className="sm:max-w-[600px] bg-body text-body border-complementary">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {preview ? "Preview Attendance" : "Confirm Attendance"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto">
          <Table className="border border-complementary">
            <TableHeader>
              <TableRow className="bg-complementary">
                <TableHead className="text-body text-sm">Employee</TableHead>
                <TableHead className="text-body text-sm">Status</TableHead>
                <TableHead className="text-body text-sm">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, index) => (
                <TableRow
                  key={record.employeeId}
                  className={index % 2 === 0 ? "bg-body" : "bg-complementary"}
                >
                  <TableCell className="text-body text-sm">
                    {getEmployeeName(record.employeeId)}
                  </TableCell>
                  <TableCell className="text-body text-sm capitalize">
                    {record.status}
                  </TableCell>
                  <TableCell className="text-body text-sm">{record.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() =>
              setIndividualConfirmDialog({ ...individualConfirmDialog, open: false })
            }
            className="border-accent text-accent hover:bg-accent-hover"
            aria-label="Cancel individual attendance confirmation"
          >
            Cancel
          </Button>
          {!preview && (
            <Button
              onClick={confirmIndividualSubmit}
              disabled={loading}
              className="bg-accent text-complementary hover:bg-accent-hover"
              aria-label="Confirm individual attendance submission"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const EditRequestDialog = ({
  editRequestDialog,
  setEditRequestDialog,
  submitEditRequest,
  employeeName,
  currentStatus,
  loading,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editRequestSchema),
    defaultValues: {
      requestedStatus: "",
      reason: "",
    },
  });

  useEffect(() => {
    if (!editRequestDialog.open) {
      setValue("requestedStatus", "");
      setValue("reason", "");
    }
  }, [editRequestDialog.open, setValue]);

  const onSubmit = (data) => {
    submitEditRequest(data);
  };

  return (
    <Dialog
      open={editRequestDialog.open}
      onOpenChange={(isOpen) =>
        setEditRequestDialog({ ...editRequestDialog, open: isOpen })
      }
    >
      <DialogContent className="sm:max-w-[500px] bg-body text-body border-complementary">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Request Attendance Edit
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-body">Employee</Label>
            <Input
              value={employeeName}
              disabled
              className="bg-body text-body border-complementary h-12 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-body">Date</Label>
            <Input
              value={format(new Date(editRequestDialog.date), "PPP")}
              disabled
              className="bg-body text-body border-complementary h-12 text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-body">Current Status</Label>
            <Input
              value={currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              disabled
              className="bg-body text-body border-complementary h-12 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="requestedStatus" className="text-sm font-medium text-body">
              Requested Status
            </Label>
            <Select
              onValueChange={(value) => setValue("requestedStatus", value)}
              disabled={loading}
            >
              <SelectTrigger
                className="w-full bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-12 text-sm"
                aria-label="Select requested status for edit request"
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-body text-body">
                <SelectItem value="present" className="text-sm">Present</SelectItem>
                <SelectItem value="absent" className="text-sm">Absent</SelectItem>
                <SelectItem value="half-day" className="text-sm">Half Day</SelectItem>
                <SelectItem value="leave" className="text-sm">Leave</SelectItem>
              </SelectContent>
            </Select>
            {errors.requestedStatus && (
              <p className="text-red-500 text-sm mt-1">
                {errors.requestedStatus.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="reason" className="text-sm font-medium text-body">
              Reason
            </Label>
            <Textarea
              id="reason"
              {...register("reason")}
              className="bg-body text-body border-complementary hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent h-24 text-sm"
              placeholder="Provide a reason for the edit request..."
              disabled={loading}
              aria-label="Reason for attendance edit request"
            />
            {errors.reason && (
              <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setEditRequestDialog({ ...editRequestDialog, open: false })
              }
              className="border-accent text-accent hover:bg-accent-hover"
              disabled={loading}
              aria-label="Cancel edit request"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent text-complementary hover:bg-accent-hover"
              disabled={loading}
              aria-label="Submit edit request"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};