import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileIcon, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const ExcelImport = ({
  excelFile,
  setExcelFile,
  excelDragState,
  handleExcelDragOver,
  handleExcelDragLeave,
  handleExcelDrop,
  handleExcelFileChange,
  handleRemoveExcel,
  handleExcelSubmit,
  employeesLoading,
  locationsLoading,
  isSubmitting,
  excelSectionRef,
  setRegistrationMode,
}) => {
  const getFileIcon = (file) => {
    if (!file) return <FileIcon className="h-5 w-5 text-body" />;
    const extension = file.name.toLowerCase().split(".").pop();
    return <FileIcon className="h-5 w-5 text-body" />;
  };

  return (
    <div ref={excelSectionRef}>
      <h3 className="text-sm sm:text-base xl:text-lg font-semibold mb-3 sm:mb-4 text-body">
        Import Employees from Excel
      </h3>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300",
          excelDragState ? "border-accent bg-accent/10" : "border-complementary",
          excelFile ? "bg-body" : "bg-complementary/10",
          (employeesLoading || locationsLoading || isSubmitting) &&
            "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleExcelDragOver}
        onDragLeave={handleExcelDragLeave}
        onDrop={handleExcelDrop}
        role="region"
        aria-label="Upload file"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("excel-file-input").click();
          }
        }}
      >
        <Input
          id="excel-file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelFileChange}
          className="hidden"
          disabled={employeesLoading || locationsLoading || isSubmitting}
        />
        {!excelFile ? (
          <div className="flex flex-col items-center space-y-2">
            <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-body/60" />
            <p className="text-[10px] sm:text-sm xl:text-base text-body/60">
              Drag & drop a file here or click to upload
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => document.getElementById("excel-file-input").click()}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                disabled={employeesLoading || locationsLoading || isSubmitting}
              >
                Choose File
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExcelFile(null)}
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                disabled={employeesLoading || locationsLoading || isSubmitting}
                aria-label="Cancel file upload"
              >
                Cancel
              </Button>
            </div>
            <p className="text-[9px] sm:text-xs xl:text-sm text-body/50">
              (XLSX, XLS, CSV; Max 5MB)
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2 truncate">
                {getFileIcon(excelFile)}
                <div className="truncate">
                  <span className="text-[10px] sm:text-sm xl:text-base text-body truncate">
                    {excelFile.name}
                  </span>
                  <span className="text-[9px] sm:text-xs xl:text-sm text-body/60 block">
                    {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveExcel}
                className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full"
                disabled={employeesLoading || locationsLoading || isSubmitting}
                aria-label={`Remove file ${excelFile.name}`}
              >
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          type="button"
          onClick={() => setRegistrationMode(null)}
          className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300 hover:shadow-md"
          disabled={employeesLoading || locationsLoading || isSubmitting}
          aria-label="Back"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleExcelSubmit}
          className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
          disabled={employeesLoading || locationsLoading || isSubmitting || !excelFile}
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Import Employees
        </Button>
      </div>
    </div>
  );
};

export default ExcelImport;