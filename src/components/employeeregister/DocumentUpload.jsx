import { FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileIcon, Image, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const getFileIcon = (file) => {
  if (!file) return <FileIcon className="h-5 w-5 text-body" />;
  const extension = file.name.toLowerCase().split(".").pop();
  if (["jpg", "jpeg", "png"].includes(extension)) {
    return <Image className="h-5 w-5 text-body" />;
  }
  if (["pdf"].includes(extension)) {
    return <FileIcon className="h-5 w-5 text-body" />;
  }
  if (["doc", "docx"].includes(extension)) {
    return <FileIcon className="h-5 w-5 text-body" />;
  }
  if (["xlsx", "xls"].includes(extension)) {
    return <FileIcon className="h-5 w-5 text-body" />;
  }
  return <FileIcon className="h-5 w-5 text-body" />;
};

const isImageFile = (file) => {
  if (!file) return false;
  const extension = file.name.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png"].includes(extension);
};

const DocumentUpload = ({
  index,
  form,
  serverError,
  fieldProps,
  onChange,
  value,
  dragState,
  preview,
  setPreview,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleRemoveDocument,
  employeesLoading,
  locationsLoading,
  isSubmitting,
}) => {
  return (
    <div
      className={cn(
        "mb-3 sm:mb-4 rounded-md border border-complementary/30 bg-body shadow-sm hover:shadow-md transition-shadow duration-300",
        "animate-fade-in"
      )}
    >
      <FormItem className="p-3 sm:p-4">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-md p-4 sm:p-6 text-center transition-all duration-300",
            dragState ? "border-accent bg-accent/10" : "border-complementary",
            value ? "bg-body" : "bg-complementary/10",
            (employeesLoading || locationsLoading || isSubmitting) &&
              "opacity-50 cursor-not-allowed"
          )}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={() => handleDragLeave(index)}
          onDrop={(e) => handleDrop(e, index, onChange)}
          role="region"
          aria-label={`Upload document ${index + 1}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById(`file-input-${index}`).click();
            }
          }}
        >
          <FormControl>
            <Input
              id={`file-input-${index}`}
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  onChange(file);
                  const previewUrl = URL.createObjectURL(file);
                  setPreview(index, previewUrl);
                }
              }}
              className="hidden"
              disabled={employeesLoading || locationsLoading || isSubmitting}
            />
          </FormControl>
          {!value ? (
            <div className="flex flex-col items-center space-y-2">
              <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-body/60" />
              <p className="text-[10px] sm:text-sm xl:text-base text-body/60">
                Drag & drop a file here or click to upload
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    document.getElementById(`file-input-${index}`).click()
                  }
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                  disabled={
                    employeesLoading || locationsLoading || isSubmitting
                  }
                >
                  Choose File
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleRemoveDocument(index)}
                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 transition-all duration-300"
                  disabled={
                    employeesLoading || locationsLoading || isSubmitting
                  }
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
                  {getFileIcon(value)}
                  <div className="truncate">
                    <span className="text-[10px] sm:text-sm xl:text-base text-body truncate">
                      {value.name}
                    </span>
                    <span className="text-[9px] sm:text-xs xl:text-sm text-body/60 block">
                      {(value.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
  {/* ✅ FIXED: Smart preview button that handles both cases */}
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={() => {
      // ✅ NEW: Handle preview for files not yet uploaded
      if (!value.webViewLink && !value.googleDriveId) {
        // This is a newly selected file (not uploaded yet)
        if (preview) {
          // Use the local blob URL for preview
          window.open(preview, '_blank');
        } else if (isImageFile(value)) {
          // Create temporary blob URL for images
          const tempUrl = URL.createObjectURL(value);
          window.open(tempUrl, '_blank');
          // Clean up after a short delay
          setTimeout(() => URL.revokeObjectURL(tempUrl), 1000);
        } else {
          // For non-images, show an alert or toast
          alert('Preview will be available after uploading the document.');
        }
      } else {
        // This is an uploaded file with Google Drive links
        const previewUrl = value.webViewLink || 
          (value.googleDriveId ? `/api/files/${value.googleDriveId}/view` : '#');
        if (previewUrl !== '#') {
          window.open(previewUrl, '_blank');
        }
      }
    }}
    className="p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full"
    aria-label={`Preview document ${value.originalName || value.name}`}
    disabled={employeesLoading || locationsLoading || isSubmitting}
  >
    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
  </Button>
  
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={() => handleRemoveDocument(index)}
    className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full"
    disabled={employeesLoading || locationsLoading || isSubmitting}
    aria-label={`Remove document ${value.name}`}
  >
    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
  </Button>
</div>

              </div>
              {isImageFile(value) && preview && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={preview}
                    alt={`Preview of ${value.name}`}
                    className="h-24 w-24 object-cover rounded-md border border-complementary"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <FormMessage className="text-error text-[9px] sm:text-xs xl:text-base mt-2">
          {serverError?.fields?.[`documents[${index}].file`] ||
            form.formState.errors.documents?.[index]?.file?.message}
        </FormMessage>
      </FormItem>
    </div>
  );
};

export default DocumentUpload;
