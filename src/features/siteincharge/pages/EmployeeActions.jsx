import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Truck, History, FilePlus, LogOut, UserPlus } from "lucide-react";

const EmployeeActions = ({
  employee,
  onView,
  onEdit,
  onTransfer,
  onHistory,
  onAddDocuments,
  onDeactivate,
  onRejoin,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            className="text-accent hover:text-accent-hover transition-colors"
            aria-label={`View employee ${employee.name}`}
          >
            <Eye className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View Employee</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-accent hover:text-accent-hover transition-colors"
            aria-label={`Edit employee ${employee.name}`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"
              />
            </svg>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit Employee</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onTransfer}
            className="text-accent hover:text-accent-hover transition-colors"
            disabled={employee.status !== "active"}
            aria-label={`Transfer employee ${employee.name}`}
          >
            <Truck className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Transfer Employee</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHistory}
            className="text-accent hover:text-accent-hover transition-colors"
            aria-label={`View history for employee ${employee.name}`}
          >
            <History className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View History</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddDocuments}
            className="text-accent hover:text-accent-hover transition-colors"
            aria-label={`Add documents for employee ${employee.name}`}
          >
            <FilePlus className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add Documents</TooltipContent>
      </Tooltip>
      {employee.status === "active" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeactivate}
              className="text-error hover:text-error-hover transition-colors"
              aria-label={`Deactivate employee ${employee.name}`}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Deactivate Employee</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRejoin}
              className="text-accent hover:text-accent-hover transition-colors"
              aria-label={`Rejoin employee ${employee.name}`}
            >
              <UserPlus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rejoin Employee</TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
};

export default EmployeeActions;