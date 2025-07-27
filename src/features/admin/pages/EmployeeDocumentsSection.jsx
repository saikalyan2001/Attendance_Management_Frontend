import { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Upload, Loader2, Eye, Search, FileText, Image as ImageIcon, User, ChevronUp, ChevronDown, FilePlus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { addEmployeeDocuments, reset as resetEmployees } from '../redux/employeeSlice';
import { parseServerError } from '@/utils/errorUtils';

// File icon component
const FileIcon = () => <svg className="h-5 w-5 text-body" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

// Get file icon based on extension
const getFileIcon = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    console.warn('Invalid fileName in getFileIcon:', fileName);
    return <FileIcon />;
  }
  const extension = fileName.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png'].includes(extension)) {
    return <ImageIcon className="h-5 w-5 text-body" />;
  }
  if (['pdf', 'doc', 'docx'].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  return <FileIcon />;
};

// Normalize file system path to URL path
const normalizeDocPath = (docPath) => {
  if (!docPath || typeof docPath !== 'string' || docPath.trim() === '') {
    console.warn('Invalid or missing document path:', docPath);
    return null; // Return null for invalid paths
  }
  let normalized = docPath.replace(/\\/g, '/');
  const uploadsIndex = normalized.indexOf('Uploads/documents');
  if (uploadsIndex !== -1) {
    normalized = normalized.substring(uploadsIndex);
  } else {
    const parts = normalized.split('/');
    const docIndex = parts.findIndex(part => part.startsWith('documents-'));
    if (docIndex !== -1) {
      normalized = parts.slice(docIndex - 1).join('/');
    }
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

// Define validation schema for document upload
const uploadDocumentSchema = z.object({
  documents: z.array(
    z.object({
      file: z.any()
        .refine((file) => file instanceof File, 'Please upload a file')
        .refine((file) => {
          if (!(file instanceof File)) return false;
          const filetypes = /pdf|doc|docx|jpg|jpeg|png/;
          const extname = filetypes.test(file.name.toLowerCase().split('.').pop());
          const mimetype = filetypes.test(file.type.toLowerCase().split('/')[1] || '');
          return extname && mimetype;
        }, 'File must be PDF, DOC, DOCX, JPG, JPEG, or PNG')
        .refine((file) => {
          if (!(file instanceof File)) return false;
          return file.size <= 5 * 1024 * 1024;
        }, 'File size must be less than 5MB'),
    })
  ).max(5, 'Cannot upload more than 5 documents').optional(),
});

// Check if file is an image
const isImageFile = (file) => {
  if (!file || !file.name || typeof file.name !== 'string') {
    console.warn('Invalid file in isImageFile:', file);
    return false;
  }
  const extension = file.name.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png'].includes(extension);
};

// Format uploadedAt timestamp
const formatUploadedAt = (uploadedAt) => {
  if (!uploadedAt || typeof uploadedAt !== 'string') {
    console.warn('Invalid uploadedAt:', uploadedAt);
    return 'Unknown';
  }
  try {
    return format(new Date(uploadedAt), 'MMM dd, yyyy, h:mm a');
  } catch (err) {
    console.warn('Failed to format uploadedAt:', uploadedAt, err);
    return 'Unknown';
  }
};

const EmployeeDocumentsSection = ({
  currentEmployee,
  dispatch,
  id,
  employeeName,
  isLoading = false,
  currentPage,
  setCurrentPage,
  itemsPerPage,
}) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragStates, setDragStates] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTableOpen, setIsTableOpen] = useState(true);
  const autoDismissDuration = 5000;
  const formRef = useRef(null);

  const { pagination } = useSelector((state) => state.adminEmployees);

  const uploadForm = useForm({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      documents: [],
    },
  });

  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control: uploadForm.control,
    name: 'documents',
  });

  // Apply search filter and validate documents
  const filteredDocuments = useMemo(() => {
    if (!currentEmployee?.documents || !Array.isArray(currentEmployee.documents)) {
      return [];
    }
    return currentEmployee.documents
      .filter((doc) => {
        if (!doc || typeof doc !== 'object' || !doc.name || typeof doc.name !== 'string' || !doc.path || typeof doc.path !== 'string') {
          console.warn('Skipping invalid document entry:', doc);
          return false;
        }
        return searchQuery
          ? doc.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true;
      })
      .map((doc) => ({
        ...doc,
        normalizedPath: normalizeDocPath(doc.path),
      }))
      .filter((doc) => doc.normalizedPath && doc.normalizedPath.startsWith('/Uploads/documents'));
  }, [currentEmployee?.documents, searchQuery]);

  // Use backend pagination metadata
  const totalItems = pagination?.totalItems || filteredDocuments.length;
  const totalPages = pagination?.totalPages || Math.ceil(totalItems / itemsPerPage);
  const paginatedDocuments = filteredDocuments;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrls, previewUrl]);

  const handleDocumentSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setServerError(null);
      toast.dismiss();

      if (!data.documents || data.documents.length === 0) {
        toast.error('Please upload at least one document to proceed', {
          id: `no-documents-error-${Date.now()}`,
          position: 'top-center',
          duration: autoDismissDuration,
          style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
        });
        return;
      }

      await dispatch(addEmployeeDocuments({ id, documents: data.documents, page: 1, limit: itemsPerPage })).unwrap();
      toast.dismiss();
      toast.success('Documents uploaded successfully', {
        id: 'upload-success',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#28a745', border: '1px solid #28a745' },
      });
      setUploadDialogOpen(false);
      setPreviewOpen(false);
      setPreviewDocument(null);
      setPreviewUrl(null);
      setDragStates({});
      setPreviewUrls({});
      setCurrentPage(1);
      setTimeout(() => {
        dispatch(resetEmployees());
        toast.dismiss();
      }, autoDismissDuration);
    } catch (err) {
      console.error('Submit error:', err);
      toast.dismiss();
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      toast.error(parsedError.message, {
        id: `form-submit-error-${Date.now()}`,
        position: 'top-center',
        duration: autoDismissDuration,
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
      Object.entries(parsedError.fields).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, {
            id: `server-error-${field}-${index}-${Date.now()}`,
            position: 'top-center',
            duration: autoDismissDuration,
            style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
          });
        }, (index + 1) * 500);
      });
      const firstErrorFieldName = Object.keys(parsedError.fields)[0];
      if (firstErrorFieldName) {
        const fieldElement = document.querySelector(`[name="${firstErrorFieldName}"]`);
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentSaveClick = async () => {
    try {
      toast.dismiss();
      const isValid = await uploadForm.trigger();
      if (!isValid) {
        const errors = [];
        const addError = (field, message) => {
          if (message && !errors.some((e) => e.field === field)) {
            errors.push({ field, message });
          }
        };

        const fieldOrder = ['documents'];
        for (let i = 0; i < documentFields.length; i++) {
          fieldOrder.push(`documents[${i}].file`);
        }

        for (const field of fieldOrder) {
          if (field === 'documents') {
            addError('documents', uploadForm.formState.errors.documents?.message);
          } else {
            const index = parseInt(field.match(/\[(\d+)\]/)?.[1], 10);
            addError(field, uploadForm.formState.errors.documents?.[index]?.file?.message);
          }
        }

        if (errors.length > 0) {
          const firstError = errors[0];
          toast.error(firstError.message, {
            id: `validation-error-${firstError.field}-${Date.now()}`,
            position: 'top-center',
            duration: autoDismissDuration,
            style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
          });
          const firstErrorField = firstError.field.includes('[')
            ? document.querySelector(`[name="${firstError.field.replace(']', '').replace('[', '.')}"`)
            : document.querySelector(`[name="${firstError.field}"]`) || formRef.current;
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
          } else if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
      }

      await uploadForm.handleSubmit(handleDocumentSubmit)();
    } catch (error) {
      console.error('handleDocumentSaveClick error:', error);
      toast.dismiss();
      toast.error('Error submitting form, please try again', {
        id: `form-submit-error-${Date.now()}`,
        position: 'top-center',
        duration: autoDismissDuration,
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
  };

  const handlePreviewDocument = (file) => {
    if (!file) {
      console.error('No file provided for preview');
      toast.error('No file selected for preview', {
        id: 'preview-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
      return;
    }
    if (file instanceof File && ['image/jpeg', 'image/png'].includes(file.type)) {
      setPreviewDocument(file);
      const index = documentFields.findIndex((field) => field.file === file);
      if (index !== -1 && previewUrls[index]) {
        setPreviewUrl(previewUrls[index]);
      } else {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
      setPreviewOpen(true);
    } else if (file instanceof File) {
      try {
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
        toast.dismiss();
        toast.success('Document opened in new tab', {
          id: 'preview-info',
          duration: autoDismissDuration,
          position: 'top-center',
          style: { background: '#fff', color: '#28a745', border: '1px solid #28a745' },
        });
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        console.error('Preview error:', err);
        toast.dismiss();
        toast.error('Failed to open document for preview', {
          id: 'preview-error',
          duration: autoDismissDuration,
          position: 'top-center',
          style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
        });
      }
    } else {
      console.error('Invalid file object:', file);
      toast.dismiss();
      toast.error('Invalid file format for preview', {
        id: 'preview-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
  };

  const fetchDocumentForPreview = async (docPath, docName) => {
    try {
      const normalizedDocPath = normalizeDocPath(docPath);
      if (!normalizedDocPath || !normalizedDocPath.startsWith('/Uploads/documents')) {
        throw new Error('Invalid document path after normalization');
      }
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000${normalizedDocPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], docName || 'document', { type: blob.type });
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      handlePreviewDocument(file);
    } catch (err) {
      console.error('Preview error:', err);
      toast.error(`Failed to fetch document for preview: ${err.message}`, {
        id: 'preview-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
  };

  const handleDownloadDocument = async (docPath, docName) => {
    try {
      const normalizedDocPath = normalizeDocPath(docPath);
      if (!normalizedDocPath || !normalizedDocPath.startsWith('/Uploads/documents')) {
        throw new Error('Invalid document path after normalization');
      }
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`http://localhost:5000${normalizedDocPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/octet-stream',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download document: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application') && !contentType.includes('image')) {
        throw new Error(`Invalid content type received: ${contentType}`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Received empty or invalid file data');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${docName || 'document'} successfully`, {
        id: 'download-success',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#28a745', border: '1px solid #28a745' },
      });
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Failed to download document: ${err.message}`, {
        id: 'download-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
  };

  const openUploadDialog = () => {
    setServerError(null);
    toast.dismiss();
    uploadForm.reset({
      documents: [],
    });
    setUploadDialogOpen(true);
  };

  const handleRemoveDocument = (index) => {
    setPreviewUrls((prev) => {
      const newUrls = { ...prev };
      if (newUrls[index]) {
        URL.revokeObjectURL(newUrls[index]);
        delete newUrls[index];
      }
      return newUrls;
    });
    removeDocument(index);
    setDragStates((prev) => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const addDocumentField = () => {
    if (documentFields.length >= 5) {
      toast.error('Cannot add more than 5 documents', {
        id: `max-documents-error-${Date.now()}`,
        position: 'top-center',
        duration: autoDismissDuration,
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
      return;
    }
    appendDocument({ file: null });
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
    <>
      <Card
        className={cn(
          'bg-complementary text-body shadow-lg rounded-xl border border-accent/10 transition-all duration-500',
          'animate-fade-in w-full max-w-[92vw] xs:max-w-[90vw] sm:max-w-none mx-auto'
        )}
        role="region"
        aria-labelledby="employee-documents-title"
      >
        <CardHeader className="p-2 xs:p-3 sm:p-6">
          <CardTitle id="employee-documents-title" className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-1 xs:gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 xs:w-10 sm:w-12 h-8 xs:h-10 sm:h-12 rounded-full bg-accent/20 text-accent">
              <User className="h-4 xs:h-5 sm:h-6 w-4 xs:w-5 sm:w-6" />
            </div>
            <span className="truncate">{employeeName ? `${employeeName}'s Documents` : 'Documents'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 xs:p-3 sm:p-6 space-y-4 xs:space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center max-w-xs sm:max-w-sm">
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-lg text-xs xs:text-sm sm:text-base"
                      aria-label="Search documents"
                    />
                    <Search className="h-5 w-5 ml-2 xs:ml-3 text-body" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                  Search documents
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={openUploadDialog}
                    className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px]"
                    aria-label="Upload new documents"
                  >
                    <Upload className="h-5 w-5 mr-1 xs:mr-2" />
                    Upload Documents
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                  Upload new documents
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen}>
            <CollapsibleTrigger
              className="flex items-center justify-between w-full text-sm xs:text-base sm:text-lg font-semibold text-body hover:text-accent transition-colors"
              aria-label={isTableOpen ? 'Collapse document table' : 'Expand document table'}
            >
              Document Records
              {isTableOpen ? <ChevronUp className="h-4 xs:h-5 w-4 xs:w-5" /> : <ChevronDown className="h-4 xs:h-5 w-4 xs:w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 xs:mt-3 sm:mt-4">
              <div className="overflow-x-auto">
                <Table className="w-full" role="grid">
                  <TableHeader>
                    <TableRow className="bg-accent/10 rounded-lg">
                      <TableHead className="text-xs xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">Name</TableHead>
                      <TableHead className="text-xs xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">Uploaded At</TableHead>
                      <TableHead className="text-xs xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left">
                            <Skeleton className="h-5 w-full bg-accent/20" />
                          </TableCell>
                          <TableCell className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left">
                            <Skeleton className="h-5 w-full bg-accent/20" />
                          </TableCell>
                          <TableCell className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left">
                            <Skeleton className="h-5 w-40 bg-accent/20" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 bg-accent/5 border border-accent/20 rounded-lg"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <p>No valid documents available. Please upload documents.</p>
                            <Button
                              variant="outline"
                              onClick={openUploadDialog}
                              className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px]"
                              aria-label="Upload new documents"
                            >
                              <Upload className="h-5 w-5 mr-1 xs:mr-2" />
                              Upload Documents
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDocuments.map((doc) => (
                        <TableRow key={doc._id} className="hover:bg-accent/5 transition-colors">
                          <TableCell className="flex items-center text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">
                            {getFileIcon(doc.name)}
                            <span className="ml-3 truncate">{doc.name || 'Unknown File'}</span>
                          </TableCell>
                          <TableCell className="text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">
                            {formatUploadedAt(doc.uploadedAt)}
                          </TableCell>
                          <TableCell className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left">
                            <div className="flex space-x-2 xs:space-x-3">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      onClick={() => fetchDocumentForPreview(doc.path, doc.name)}
                                      className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px]"
                                      aria-label={`Preview ${doc.name || 'document'}`}
                                      disabled={!doc.normalizedPath}
                                    >
                                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-1 xs:mr-2" />
                                      Preview
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                                    Preview document
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      onClick={() => handleDownloadDocument(doc.path, doc.name)}
                                      className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px]"
                                      aria-label={`Download ${doc.name || 'document'}`}
                                      disabled={!doc.normalizedPath}
                                    >
                                      Download
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                                    Download document
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && !isLoading && (
                <div className="flex justify-between items-center mt-4 xs:mt-5 sm:mt-6">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || isLoading}
                          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-4 py-2 text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px]"
                          aria-label="Go to previous page"
                        >
                          <ChevronLeft className="h-4 xs:h-5 w-4 xs:w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                        Navigate to previous page
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex flex-wrap justify-center items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <TooltipProvider key={page}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={currentPage === page ? 'default' : 'outline'}
                              onClick={() => handlePageChange(page)}
                              disabled={isLoading}
                              className={cn(
                                currentPage === page
                                  ? 'bg-accent text-body'
                                  : 'border-accent text-accent hover:bg-accent-hover hover:text-body',
                                'rounded-lg text-xs xs:text-sm sm:text-base py-1 px-3 min-h-[36px] transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2'
                              )}
                              aria-label={`Go to page ${page}`}
                            >
                              {page}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                            Go to page {page}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages || isLoading}
                          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-4 py-2 text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px]"
                          aria-label="Go to next page"
                        >
                          <ChevronRight className="h-4 xs:h-5 w-4 xs:w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                        Navigate to next page
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Upload Documents Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle id="upload-dialog-title" className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">Add Documents</DialogTitle>
          </DialogHeader>
          <Form {...uploadForm}>
            <form className="space-y-3 xs:space-y-4 sm:space-y-5 p-2 xs:p-3 sm:p-4" ref={formRef}>
              {documentFields.map((field, index) => (
                <div
                  key={field.id}
                  className={cn(
                    'mb-2 xs:mb-3 sm:mb-4 rounded-md border border-complementary/30 bg-body shadow-sm hover:shadow-md transition-shadow duration-300'
                  )}
                >
                  <FormField
                    control={uploadForm.control}
                    name={`documents.${index}.file`}
                    render={({ field }) => (
                      <FormItem className="p-2 xs:p-3 sm:p-4">
                        <FormControl>
                          <div
                            className={cn(
                              'relative border-2 border-dashed rounded-md p-3 xs:p-4 sm:p-6 text-center transition-all duration-300',
                              dragStates[index] ? 'border-accent bg-accent/10' : 'border-complementary',
                              field.value ? 'bg-body' : 'bg-complementary/10',
                              (isLoading || isSubmitting) && 'opacity-50 cursor-not-allowed'
                            )}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={() => handleDragLeave(index)}
                            onDrop={(e) => handleDrop(e, index, field.onChange)}
                            role="region"
                            aria-label={`Upload document ${index + 1}`}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
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
                              disabled={isLoading || isSubmitting}
                            />
                            {!field.value ? (
                              <div className="flex flex-col items-center space-y-1 xs:space-y-2">
                                <FileIcon className="h-6 w-6 xs:h-8 xs:w-8 sm:h-10 sm:w-10 text-body/60" />
                                <p className="text-[9px] xs:text-xs sm:text-sm text-body/60">
                                  Drag & drop a file here or click to upload
                                </p>
                                <div className="flex gap-1 xs:gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => document.getElementById(`add-document-${index}`).click()}
                                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-xs xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 hover:shadow-md min-h-[32px] xs:min-h-[36px]"
                                    disabled={isLoading || isSubmitting}
                                    aria-label={`Choose file for document ${index + 1}`}
                                  >
                                    Choose File
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRemoveDocument(index)}
                                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-xs xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 hover:shadow-md min-h-[32px] xs:min-h-[36px]"
                                    disabled={isLoading || isSubmitting}
                                    aria-label={`Cancel document ${index + 1} upload`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                <p className="text-[8px] xs:text-[9px] sm:text-xs text-body/60">
                                  (PDF, DOC, DOCX, JPG, JPEG, PNG; Max 5MB)
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-1 xs:space-y-2">
                                <div className="flex items-center justify-between space-x-2">
                                  <div className="flex items-center space-x-1 xs:space-x-2 truncate">
                                    {getFileIcon(field.value.name)}
                                    <div className="truncate">
                                      <span className="text-xs xs:text-sm sm:text-base text-body truncate">
                                        {field.value.name}
                                      </span>
                                      <span className="text-[8px] xs:text-[9px] sm:text-xs text-body/60 block">
                                        ({(field.value.size / 1024 / 1024).toFixed(2)} MB)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 xs:gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => handlePreviewDocument(field.value)}
                                      className={cn(
                                        'p-1 text-accent hover:text-accent-hover focus:ring-2 focus:ring-accent/20 rounded-full',
                                        (isLoading || isSubmitting || !previewUrls[index]) && 'opacity-50 cursor-not-allowed'
                                      )}
                                      aria-label={`Preview document ${field.value.name}`}
                                      disabled={isLoading || isSubmitting || !previewUrls[index]}
                                    >
                                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => handleRemoveDocument(index)}
                                      className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full p-1"
                                      disabled={isLoading || isSubmitting}
                                      aria-label={`Remove document ${field.value.name}`}
                                    >
                                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </Button>
                                  </div>
                                </div>
                                {isImageFile(field.value) && previewUrls[index] && (
                                  <div className="mt-2">
                                    <img
                                      src={previewUrls[index]}
                                      alt={`Preview of ${field.value.name}`}
                                      className="max-w-full h-auto rounded-md max-h-40 object-contain"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage className="text-error text-[9px] xs:text-xs sm:text-sm mt-1" />
                        {serverError?.fields?.[`documents[${index}].file`] && (
                          <p className="text-error text-[9px] xs:text-xs sm:text-sm mt-1">{serverError.fields[`documents[${index}].file`]}</p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              {serverError?.fields?.documents && (
                <p className="text-error text-[9px] xs:text-xs sm:text-sm">{serverError.fields.documents}</p>
              )}
              <div className="flex justify-between items-center mt-2 xs:mt-3 sm:mt-4">
                <Button
                  type="button"
                  onClick={addDocumentField}
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-xs xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 hover:shadow-md min-h-[32px] xs:min-h-[36px]"
                  disabled={documentFields.length >= 5 || isLoading || isSubmitting}
                  aria-label="Add another document"
                >
                  <FilePlus className="h-4 w-4 xs:h-5 xs:w-5 mr-1 xs:mr-2" />
                  Add Document
                </Button>
                <span className="text-[8px] xs:text-[9px] sm:text-xs text-body/60">
                  {documentFields.length}/5 documents
                </span>
              </div>
            </form>
            <DialogFooter className="mt-2 xs:mt-3 sm:mt-4 p-2 xs:p-3 sm:p-4">
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md text-xs xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 min-h-[32px] xs:min-h-[36px]"
                disabled={isSubmitting || isLoading}
                aria-label="Cancel document upload"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDocumentSaveClick}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-xs xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 min-h-[32px] xs:min-h-[36px]"
                disabled={isSubmitting || isLoading}
                aria-label="Save documents"
              >
                {isSubmitting || isLoading ? (
                  <Loader2 className="h-4 w-4 xs:h-5 xs:w-5 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={(open) => {
        setPreviewOpen(open);
        if (!open) {
          setPreviewDocument(null);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }
      }}>
        <DialogContent className="bg-complementary text-body max-w-[90vw] sm:max-w-3xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">
              Preview {previewDocument?.name || 'Document'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-2 xs:p-3 sm:p-4">
            {previewDocument && isImageFile(previewDocument) && previewUrl ? (
              <img
                src={previewUrl}
                alt={`Preview of ${previewDocument.name}`}
                className="max-w-full max-h-[60vh] object-contain rounded-md"
                onError={(e) => {
                  console.error('Image failed to load:', previewUrl);
                  toast.error('Failed to load image preview', {
                    id: 'image-load-error',
                    duration: autoDismissDuration,
                    position: 'top-center',
                    style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
                  });
                }}
              />
            ) : (
              <p className="text-xs xs:text-sm sm:text-base text-body/60">
                Preview not available for this file type. Please download to view.
              </p>
            )}
          </div>
          <DialogFooter className="p-2 xs:p-3 sm:p-4">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewOpen(false);
                setPreviewDocument(null);
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }
              }}
              className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-md text-xs xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 min-h-[32px] xs:min-h-[36px]"
              aria-label="Close preview"
            >
              Close
            </Button>
            {previewDocument && (
              <Button
                onClick={() => handleDownloadDocument(URL.createObjectURL(previewDocument), previewDocument.name)}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-xs xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 min-h-[32px] xs:min-h-[36px]"
                aria-label={`Download ${previewDocument.name}`}
              >
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeDocumentsSection;