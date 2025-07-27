import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { uploadDocument } from '../redux/employeeSlice';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Eye, Trash2, Search, FileText, Image as ImageIcon, User, ChevronUp, ChevronDown, FilePlus, ChevronLeft, ChevronRight, Loader2, ArrowUpDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { parseServerError } from '@/utils/errorUtils';

// File icon component
const FileIcon = () => <svg className="h-5 w-5 text-body" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

// Get file icon based on extension
const getFileIcon = (fileName) => {
  if (!fileName) return <FileIcon className="h-5 w-5 text-body" />;
  const extension = fileName.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png'].includes(extension)) {
    return <ImageIcon className="h-5 w-5 text-body" />;
  }
  if (['pdf', 'doc', 'docx'].includes(extension)) {
    return <FileText className="h-5 w-5 text-body" />;
  }
  return <FileIcon className="h-5 w-5 text-body" />;
};

// Normalize file system path to URL path
const normalizeDocPath = (docPath) => {
  if (!docPath) return '';
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

// Validation schema for document upload
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
  ).min(1, 'At least one valid document is required').max(5, 'Cannot upload more than 5 documents'),
});

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

const Documents = ({ employeeId, documents, documentsPagination, setDocumentsCurrentPage, employeeName = 'Documents', isLoading = false }) => {
  const dispatch = useDispatch();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [uploadValidationTriggered, setUploadValidationTriggered] = useState(false);
  const [uploadIsSubmitting, setUploadIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragStates, setDragStates] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});
  const [removingIndices, setRemovingIndices] = useState([]);
  const [isTableOpen, setIsTableOpen] = useState(true);
  const [sortField, setSortField] = useState('uploadedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const autoDismissDuration = 5000;
  const formRef = useRef(null);
    const [serverError, setServerError] = useState(null);
  

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

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    if (!searchQuery) return documents;
    return documents.filter((doc) => {
      if (!doc.name || typeof doc.name !== 'string') {
        console.warn('Invalid doc.name in filteredDocuments:', doc);
        return false;
      }
      return doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [documents, searchQuery]);

  // Sorting logic
  const sortedDocuments = useMemo(() => {
    if (!filteredDocuments || !Array.isArray(filteredDocuments)) return [];

    console.log('Total documents:', documents?.length, 'Filtered documents:', filteredDocuments.length);

    return [...filteredDocuments].sort((a, b) => {
      let aValue, bValue;
      if (sortField === 'name') {
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
      } else if (sortField === 'uploadedAt') {
        aValue = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        bValue = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      }
      if (aValue === bValue) return 0;
      return sortOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
    });
  }, [filteredDocuments, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setDocumentsCurrentPage(1); // Reset to first page on sort change
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= documentsPagination?.totalPages) {
      setDocumentsCurrentPage(page);
      console.log('Page changed to:', page);
    }
  };

  useEffect(() => {
    console.log('isLoading:', isLoading, 'isTableOpen:', isTableOpen);
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      if (previewDocument?.previewUrl) {
        URL.revokeObjectURL(previewDocument.previewUrl);
      }
    };
  }, [previewUrls, previewDocument, isLoading, isTableOpen]);

  useEffect(() => {
    if (uploadValidationTriggered && !uploadIsSubmitting) {
      const errors = [];
      if (uploadForm.formState.errors.documents?.message) {
        errors.push({ field: 'documents', message: uploadForm.formState.errors.documents.message });
      } else if (uploadForm.formState.errors.documents) {
        uploadForm.formState.errors.documents.forEach((docError, index) => {
          if (docError?.file?.message) {
            const message = docError.file.message === 'Please upload a file' ? 'A document file is required' : docError.file.message;
            errors.push({ field: `documents.${index}.file`, message });
          }
        });
      }
      if (errors.length > 0) {
        const firstError = errors[0];
        toast.error(firstError.message, {
          id: `upload-document-validation-error-${firstError.field.replace('.', '-')}`,
          duration: autoDismissDuration,
          position: 'top-center',
          style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
        });
        const fieldElement = document.querySelector(`[name="${firstError.field}"]`) || formRef.current;
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      } else if (uploadForm.formState.isValid) {
        uploadForm.handleSubmit(handleDocumentSubmit)();
      }
      setUploadValidationTriggered(false);
    }
  }, [uploadValidationTriggered, uploadForm.formState.errors, uploadForm.formState.isValid, uploadForm, uploadIsSubmitting]);

  const handleDocumentSubmit = async (data) => {
    try {
      setUploadIsSubmitting(true);
      toast.dismiss();
      setServerError(null);
      if (!data.documents || data.documents.length === 0) {
        toast.error('Please add at least one document', {
          id: 'upload-document-no-files',
          duration: autoDismissDuration,
          position: 'top-center',
          style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
        });
        return;
      }
      await dispatch(uploadDocument({ id: employeeId, documents: data.documents })).unwrap();
      toast.success('Documents uploaded successfully', {
        id: 'upload-document-success',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#28a745', border: '1px solid #28a745' },
      });
      setUploadDialogOpen(false);
      setPreviewOpen(false);
      setPreviewDocument(null);
      setPreviewUrls({});
      setDragStates({});
      setRemovingIndices([]);
      setDocumentsCurrentPage(1); // Reset to first page after upload
    } catch (err) {
      console.error('Upload error:', err);
      toast.dismiss();
      const parsedError = parseServerError(err);
      setServerError(parsedError);
      toast.error(parsedError.message || 'Failed to upload documents', {
        id: 'upload-document-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
      Object.entries(parsedError.fields || {}).forEach(([field, message], index) => {
        setTimeout(() => {
          toast.error(message, {
            id: `server-error-${field}-${index}-${Date.now()}`,
            position: 'top-center',
            duration: autoDismissDuration,
            style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
          });
        }, (index + 1) * 500);
      });
      const firstErrorFieldName = Object.keys(parsedError.fields || {})[0];
      if (firstErrorFieldName) {
        const fieldElement = document.querySelector(`[name="${firstErrorFieldName}"]`) || formRef.current;
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fieldElement.focus();
        }
      }
    } finally {
      setUploadIsSubmitting(false);
    }
  };

  const handleUploadClick = async () => {
    try {
      toast.dismiss();
      await uploadForm.trigger();
      setUploadValidationTriggered(true);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Error submitting form, please try again', {
        id: 'upload-document-form-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
  };

  const handlePreviewDocument = (file) => {
    if (!file || !(file instanceof File)) {
      toast.error('Invalid file format for preview', {
        id: 'preview-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
      return;
    }
    try {
      if (['image/jpeg', 'image/png'].includes(file.type)) {
        const previewUrl = URL.createObjectURL(file);
        setPreviewDocument({ file, previewUrl });
        setPreviewOpen(true);
      } else {
        const previewUrl = URL.createObjectURL(file);
        window.open(previewUrl, '_blank');
        toast.success('Document opened in new tab', {
          id: 'preview-info',
          duration: autoDismissDuration,
          position: 'top-center',
          style: { background: '#fff', color: '#28a745', border: '1px solid #28a745' },
        });
        setTimeout(() => URL.revokeObjectURL(previewUrl), 1000);
      }
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Failed to open document for preview', {
        id: 'preview-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
  };

  const fetchDocumentForPreview = async (docPath, docName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const normalizedDocPath = normalizeDocPath(docPath);
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
      if (!blob || blob.size === 0) {
        throw new Error('Received empty or invalid file data');
      }
      const file = new File([blob], docName, { type: blob.type });
      handlePreviewDocument(file);
    } catch (err) {
      console.error('Fetch document error:', err);
      toast.error(`Failed to fetch document for preview: ${err.message}`, {
        id: 'fetch-document-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
  };

  const downloadDocument = async (docPath, docName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const normalizedDocPath = normalizeDocPath(docPath);
      const response = await fetch(`http://localhost:5000${normalizedDocPath}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download document: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Received empty or invalid file data');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${docName} successfully`, {
        id: 'download-document-success',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#28a745', border: '1px solid #28a745' },
      });
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Failed to download document: ${err.message}`, {
        id: 'download-document-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
    }
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
      removeDocument(index);
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
      setDragStates((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleFileChange = (index, file, onChange) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [index]: previewUrl }));
      onChange(file);
    }
  };

  const handleAddDocument = () => {
    if (documentFields.length >= 5) {
      toast.error('Cannot upload more than 5 documents', {
        id: 'max-documents-error',
        duration: autoDismissDuration,
        position: 'top-center',
        style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
      });
      return;
    }
    appendDocument({ file: null });
  };

  return (
    <Card
      className={cn(
        'bg-complementary text-body shadow-lg rounded-xl border border-accent/10 transition-all duration-500',
        'animate-fade-in w-full max-w-[92vw] xs:max-w-[90vw] sm:max-w-none mx-auto'
      )}
      role="region"
      aria-labelledby="documents-title"
    >
      <CardHeader className="p-2 xs:p-3 sm:p-6">
        <CardTitle id="documents-title" className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-1 xs:gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 xs:w-10 sm:w-12 h-8 xs:h-10 sm:h-12 rounded-full bg-accent/20 text-accent">
            <User className="h-4 xs:h-5 sm:h-6 w-4 xs:w-5 sm:w-6" />
          </div>
          <span className="truncate">{employeeName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 xs:p-3 sm:p-6 space-y-4 xs:space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center max-w-xs sm:max-w-sm">
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-lg text-[10px] xs:text-sm sm:text-base"
                    aria-label="Search documents"
                  />
                  <Search className="h-4 xs:h-5 sm:h-5 w-4 xs:w-5 sm:w-5 ml-2 xs:ml-3 text-body" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
                Search documents
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadDialogOpen(true)}
                  className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-[10px] xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px] xs:min-h-[40px]"
                  aria-label="Upload new documents"
                >
                  <Upload className="h-4 xs:h-5 sm:h-5 w-4 xs:w-5 sm:w-5 mr-1 xs:mr-2" />
                  Upload Documents
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
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
          <CollapsibleContent className="mt-2 xs:mt-3 sm:mt-4 animate-fade-in">
            <div className="overflow-x-auto">
              <Table className="w-full" role="grid">
                <TableHeader>
                  <TableRow className="bg-accent/10 rounded-lg">
                    <TableHead
                      className="text-[10px] xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 hover:bg-accent/20 transition-colors cursor-pointer min-w-[120px] max-w-[150px] text-left break-words"
                      aria-sort={sortField === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center text-body cursor-pointer"
                              onClick={() => handleSort('name')}
                            >
                              <span>Name</span>
                              <ArrowUpDown className="ml-1 h-4 xs:h-5 w-4 xs:w-5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
                            Sort by Name
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead
                      className="text-[10px] xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 hover:bg-accent/20 transition-colors cursor-pointer min-w-[120px] max-w-[150px] text-left break-words"
                      aria-sort={sortField === 'uploadedAt' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center text-body cursor-pointer"
                              onClick={() => handleSort('uploadedAt')}
                            >
                              <span>Uploaded At</span>
                              <ArrowUpDown className="ml-1 h-4 xs:h-5 w-4 xs:w-5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
                            Sort by Uploaded At
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-[10px] xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">
                      Actions
                    </TableHead>
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
                  ) : sortedDocuments.length > 0 ? (
                    sortedDocuments.map((doc, index) => (
                      <TableRow key={index} className="hover:bg-accent/5 transition-colors">
                        <TableCell className="flex items-center text-[10px] xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">
                          {getFileIcon(doc.name)}
                          <span className="ml-3 truncate">{doc.name || 'Unknown File'}</span>
                        </TableCell>
                        <TableCell className="text-[10px] xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">
                          {formatUploadedAt(doc.uploadedAt)}
                        </TableCell>
                        <TableCell className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left">
                          <div className="flex space-x-2 xs:space-x-3">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fetchDocumentForPreview(doc.path, doc.name)}
                                    className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-[10px] xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px] xs:min-h-[40px]"
                                    aria-label={`Preview ${doc.name || 'document'}`}
                                    disabled={!doc.name || typeof doc.name !== 'string'}
                                  >
                                    <Eye className="h-4 xs:h-5 sm:h-5 w-4 xs:w-5 sm:w-5 mr-1 xs:mr-2" />
                                    Preview
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
                                  Preview document
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => downloadDocument(doc.path, doc.name)}
                                    className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-[10px] xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px] xs:min-h-[40px]"
                                    aria-label={`Download ${doc.name || 'document'}`}
                                    disabled={!doc.name || typeof doc.name !== 'string'}
                                  >
                                    <svg className="h-4 xs:h-5 sm:h-5 w-4 xs:w-5 sm:w-5 mr-1 xs:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 6l-4-4m0 0L8 6m4-4v12" />
                                    </svg>
                                    Download
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
                                  Download document
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-[10px] xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 bg-accent/5 border border-accent/20 rounded-lg"
                      >
                        {searchQuery ? 'No documents match your search.' : 'No documents uploaded.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
           <div className="flex justify-between items-center mt-4 xs:mt-5 sm:mt-6">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          onClick={() => handlePageChange((documentsPagination?.page || 1) - 1)}
          disabled={(documentsPagination?.page || 1) === 1 || isLoading}
          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-[10px] xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px]"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 xs:h-5 w-4 xs:w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
        Navigate to previous page
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <div className="flex flex-wrap justify-center items-center gap-2">
    {documentsPagination?.totalPages > 0 ? (
      Array.from({ length: documentsPagination.totalPages }, (_, i) => i + 1).map((page) => (
        <TooltipProvider key={page}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={documentsPagination?.page === page ? 'default' : 'outline'}
                onClick={() => handlePageChange(page)}
                disabled={isLoading}
                className={cn(
                  documentsPagination?.page === page
                    ? 'bg-accent text-body hover:bg-accent-hover'
                    : 'border-accent text-accent hover:bg-accent-hover hover:text-body',
                  'rounded-lg text-[10px] xs:text-sm sm:text-base py-1 xs:py-2 px-2 xs:px-3 min-h-[36px] transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2'
                )}
                aria-label={`Go to page ${page}`}
              >
                {page}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
              Go to page {page}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))
    ) : (
      <Button
        variant="outline"
        disabled
        className="border-accent text-accent rounded-lg text-[10px] xs:text-sm sm:text-base py-1 xs:py-2 px-2 xs:px-3 min-h-[36px] transition-all duration-300"
        aria-label="Page 1"
      >
        1
      </Button>
    )}
  </div>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          onClick={() => handlePageChange((documentsPagination?.page || 1) + 1)}
          disabled={(documentsPagination?.page || 1) === (documentsPagination?.totalPages || 1) || isLoading}
          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-[10px] xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px]"
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 xs:h-5 w-4 xs:w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-complementary text-body border-accent text-[10px] xs:text-sm sm:text-base">
        Navigate to next page
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) {
            uploadForm.reset();
            setUploadValidationTriggered(false);
            setServerError(null);
            setRemovingIndices([]);
            setDragStates({});
            setPreviewUrls({});
          }
        }}
      >
        <DialogContent className="bg-complementary text-body max-h-[80vh] overflow-y-auto max-w-[90vw] sm:max-w-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle id="upload-dialog-title" className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">
              Add Documents
            </DialogTitle>
            <DialogDescription className="text-[10px] xs:text-sm sm:text-base">
              Upload documents (PDF, DOC, DOCX, JPG, JPEG, PNG; Max 5MB).
            </DialogDescription>
          </DialogHeader>
          <Form {...uploadForm}>
            <form className="space-y-3 xs:space-y-4 sm:space-y-5 p-2 xs:p-3 sm:p-4" ref={formRef}>
              {documentFields.map((field, index) => (
                <div
                  key={field.id}
                  className={cn(
                    'mb-2 xs:mb-3 sm:mb-4 rounded-md border border-complementary/30 bg-body shadow-sm hover:shadow-md transition-shadow duration-300',
                    removingIndices.includes(index) ? 'animate-fade-out' : 'animate-slide-in-row'
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
                              uploadIsSubmitting && 'opacity-50 cursor-not-allowed'
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
                                document.getElementById(`add-document-${field.id}`).click();
                              }
                            }}
                          >
                            <Input
                              id={`add-document-${field.id}`}
                              type="file"
                              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                              onChange={(e) => handleFileChange(index, e.target.files[0], field.onChange)}
                              className="hidden"
                              disabled={uploadIsSubmitting}
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
                                    onClick={() => document.getElementById(`add-document-${field.id}`).click()}
                                    className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 hover:shadow-md min-h-[32px] xs:min-h-[36px]"
                                    disabled={uploadIsSubmitting}
                                    aria-label={`Choose file for document ${index + 1}`}
                                  >
                                    Choose File
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRemoveDocument(index)}
                                    className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 transition-all duration-300 hover:shadow-md min-h-[32px] xs:min-h-[36px]"
                                    disabled={uploadIsSubmitting}
                                    aria-label={`Cancel document ${index + 1} upload`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                <p className="text-[8px] xs:text-[9px] sm:text-xs text-body/50">
                                  (PDF, DOC, DOCX, JPG, JPEG, PNG; Max 5MB)
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-1 xs:space-y-2">
                                <div className="flex items-center justify-between space-x-2">
                                  <div className="flex items-center space-x-1 xs:space-x-2 truncate">
                                    {getFileIcon(field.value.name)}
                                    <div className="truncate">
                                      <span className="text-[10px] xs:text-sm sm:text-base text-body truncate">
                                        {field.value.name}
                                      </span>
                                      <span className="text-[8px] xs:text-[9px] sm:text-xs text-body/60 block">
                                        {(field.value.size / 1024 / 1024).toFixed(2)} MB
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
                                        uploadIsSubmitting && 'opacity-50 cursor-not-allowed'
                                      )}
                                      disabled={uploadIsSubmitting}
                                      aria-label={`Preview ${field.value.name}`}
                                    >
                                      <Eye className="h-4 xs:h-5 sm:h-5 w-4 xs:w-5 sm:w-5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => handleRemoveDocument(index)}
                                      className="text-error hover:text-error-hover focus:ring-2 focus:ring-error/20 rounded-full p-1"
                                      disabled={uploadIsSubmitting}
                                      aria-label={`Remove document ${field.value.name}`}
                                    >
                                      <Trash2 className="h-4 xs:h-5 sm:h-5 w-4 xs:w-5 sm:w-5" />
                                    </Button>
                                  </div>
                                </div>
                                {['image/jpeg', 'image/png'].includes(field.value.type) && previewUrls[index] && (
                                  <div className="mt-1 xs:mt-2 flex justify-center">
                                    <img
                                      src={previewUrls[index]}
                                      alt={`Preview of ${field.value.name}`}
                                      className="h-16 xs:h-20 sm:h-24 w-16 xs:w-20 sm:w-24 object-cover rounded-md border border-complementary"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage className="text-error text-[8px] xs:text-[9px] sm:text-xs mt-1 xs:mt-2">
                          {serverError?.fields?.[`documents[${index}].file`] || uploadForm.formState.errors.documents?.[index]?.file?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              <Button
                type="button"
                onClick={handleAddDocument}
                className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md min-h-[32px] xs:min-h-[36px]"
                disabled={uploadIsSubmitting}
                aria-label="Add another document"
              >
                <FilePlus className="h-4 xs:h-5 sm:h-5 w-4 xs:w-5 sm:w-5 mr-1 xs:mr-2" />
                Add Document
              </Button>
              <DialogFooter className="mt-3 xs:mt-4 sm:mt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                  className="border-complementary text-body hover:bg-complementary/10 rounded-md text-[10px] xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 min-h-[32px] xs:min-h-[36px] transition-all duration-300 hover:shadow-md"
                  disabled={uploadIsSubmitting}
                  aria-label="Cancel document upload"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUploadClick}
                  className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] xs:text-sm sm:text-base py-1 xs:py-1.5 sm:py-2 px-2 xs:px-3 sm:px-4 min-h-[32px] xs:min-h-[36px] transition-all duration-300 hover:shadow-md"
                  disabled={uploadIsSubmitting}
                  aria-label="Upload documents"
                >
                  {uploadIsSubmitting ? <Loader2 className="h-4 xs:h-5 sm:h-5 w-4 xs:w-5 sm:w-5 animate-spin" /> : 'Upload'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            if (previewDocument?.previewUrl) {
              URL.revokeObjectURL(previewDocument.previewUrl);
              setPreviewDocument(null);
            }
          }
        }}
      >
        <DialogContent className="bg-complementary text-body rounded-lg max-w-[90vw] sm:max-w-3xl animate-fade-in">
          <DialogHeader>
            <DialogTitle id="preview-dialog-title" className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold">
              Document Preview
            </DialogTitle>
          </DialogHeader>
          {previewDocument && ['image/jpeg', 'image/png'].includes(previewDocument.file.type) ? (
            <div className="flex justify-center items-center max-h-[60vh]">
              <img
                src={previewDocument.previewUrl}
                alt={`Preview of ${previewDocument.file.name}`}
                className="max-h-[60vh] max-w-full object-contain rounded-md border border-complementary"
                onError={() => {
                  toast.error('Failed to load image preview', {
                    id: 'preview-error',
                    duration: autoDismissDuration,
                    position: 'top-center',
                    style: { background: '#fff', color: '#dc3545', border: '1px solid #dc3545' },
                  });
                  setPreviewOpen(false);
                  setPreviewDocument(null);
                }}
              />
            </div>
          ) : (
            <p className="text-error text-[10px] xs:text-sm sm:text-base">Preview opened in a new tab</p>
          )}
          <DialogFooter className="mt-3 xs:mt-4 sm:mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 text-[10px] xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2 min-h-[36px] xs:min-h-[40px]"
              aria-label="Close preview"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Documents;