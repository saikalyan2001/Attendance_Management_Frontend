import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileText, Image as ImageIcon, Trash2, Eye, PlusCircle, Loader2 } from "lucide-react";
import { uploadDocument } from "../redux/employeeSlice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FileIcon = () => (
  <svg className="h-5 w-5 text-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const uploadDocumentSchema = z.object({
  documents: z
    .array(
      z.object({
        file: z.any().refine((file) => file instanceof File, "Please upload a file"),
      })
    )
    .min(1, "At least one document is required"),
});

const getFileIcon = (file) => {
  if (!file) return <FileIcon className="h-5 w-5 text-body" />;
  const extension = file.name.toLowerCase().split(".").pop();
  if (["jpg", "jpeg", "png"].includes(extension)) {
    return <ImageIcon className="h-5 w-5 text-body" />;
  }
  if (["pdf"].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  if (["doc", "docx"].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  return <FileIcon className="h-5 w-5 text-body" />;
};

const isImageFile = (file) => {
  if (!file) return false;
  const extension = file.name.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png"].includes(extension);
};

const AddDocumentsDialog = ({ open, onOpenChange, employeeId }) => {
  const dispatch = useDispatch();
  const { loading: employeesLoading } = useSelector((state) => state.siteInchargeEmployee);
  const form = useForm({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: { documents: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "documents",
  });
  const [removingIndices, setRemovingIndices] = useState([]);
  const [dragStates, setDragStates] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  const handleSubmit = (data) => {
    dispatch(uploadDocument({ id: employeeId, documents: data.documents })).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        onOpenChange(false);
        toast.success("Documents added successfully", { duration: 5000 });
        setDragStates({});
        setPreviewUrls({});
        setRemovingIndices([]);
      } else {
        toast.error(result.payload || "Failed to add documents", { duration: 5000 });
      }
    });
  };

  const handleRemoveDocument = (index) => {
    setRemovingIndices((prev) => [...prev, index]);
    setTimeout(() => {
      setPreviewUrls((prev) => {
        const newUrls = { ...prev };
        if (newUrls[index]) {
          URL.revokeObjectURL(newUrls[index]);
          delete newUrls[index];
        }
        return newUrls;
      });
      remove(index);
      setRemovingIndices((prev) => prev.filter((i) => i !== index));
      setDragStates((prev) => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }, 300);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragStates((prev) => ({ ...prev, [index]: true }));
  };

  const handleDragLeave = (index) => {
    setDragStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleDrop = (e, index, onChange) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
    setDragStates((prev) => ({ ...prev, [index]: false }));
  };

  const handleFileChange = (index, file, onChange) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
            Add Documents
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={cn(
                  "mb-3 sm:mb-4 rounded-md border border-complementary/30 bg-body shadow-sm hover:shadow-md transition-shadow duration-300",
                  removingIndices.includes(index) ? "animate-fade-out" : "animate-slide-in-row"
                )}
              >
                <FormField
                  control={form.control}
                  name={`documents.${index}.file`}
                  render={({ field }) => (
                    <FormItem className="p-3 sm:p-4">
                      <div
                        className={cn(
                          "relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300",
                          dragStates[index] ? "border-accent bg-accent/10" : "border-complementary",
                          field.value ? "bg-body" : "bg-complementary/10",
                          employeesLoading && "opacity-50 cursor-not-allowed"
                        )}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={() => handleDragLeave(index)}
                        onDrop={(e) => handleDrop(e, index, field.onChange)}
                        role="region"
                        aria-label={`Upload document ${index + 1}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            document.getElementById(`add-document-${index}`).click();
                          }
                        }}
                      >
                        <Input
                          id={`add-document-${index}`}
                          type="file"
                          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                          onChange={(e) => handleFileChange(index, e.target.files[0], field.onChange)}
                          className="hidden"
                          disabled={employeesLoading}
                        />
                        {!field.value ? (
                          <div className="flex flex-col items-center space-y-2">
                            <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-body/60" />
                            <p className="text-[10px] sm:text-sm xl:text-base text-body/60">
                              Drag & drop a file here or click to upload
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={() => document.getElementById(`add-document-${index}`).click()}
                                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4"
                                disabled={employeesLoading}
                              >
                                Choose File
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleRemoveDocument(index)}
                                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4"
                                disabled={employeesLoading}
                                aria-label="Cancel document upload"
                              >
                                Cancel
                              </Button>
                            </div>
                            <p className="text-[9px] sm:text-xs xl:text-sm text-body/50">
                              (PDF, DOC, DOCX, JPG, JPEG, PNG; Max 5MB)
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between space-x-2">
                              <div className="flex items-center space-x-2 truncate">
                                {getFileIcon(field.value)}
                                <div className="truncate">
                                  <span className="text-[10px] sm:text-sm xl:text-base text-body truncate">
                                    {field.value.name}
                                  </span>
                                  <span className="text-[9px] sm:text-xs xl:text-sm text-body/60 block">
                                    ({(field.value.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <a
                                  href={previewUrls[index]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full",
                                    (employeesLoading || !previewUrls[index]) && "opacity-50 cursor-not-allowed"
                                  )}
                                  aria-label={`Preview document ${field.value.name}`}
                                  onClick={(e) => {
                                    if (employeesLoading || !previewUrls[index]) {
                                      e.preventDefault();
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                                </a>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveDocument(index)}
                                  className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full"
                                  disabled={employeesLoading}
                                  aria-label={`Remove document ${field.value.name}`}
                                >
                                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                              </div>
                            </div>
                            {isImageFile(field.value) && previewUrls[index] && (
                              <div className="mt-2 flex justify-center">
                                <img
                                  src={previewUrls[index]}
                                  alt={`Preview of ${field.value.name}`}
                                  className="h-24 w-24 object-cover rounded-md border border-complementary"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base mt-2" />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              onClick={() => append({ file: null })}
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center"
              disabled={employeesLoading}
            >
              <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Add Document
            </Button>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading}
                aria-label="Cancel add documents"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 min-h-[40px] sm:min-h-[48px]"
                disabled={employeesLoading}
                aria-label="Upload documents"
              >
                {employeesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Upload Documents"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDocumentsDialog;