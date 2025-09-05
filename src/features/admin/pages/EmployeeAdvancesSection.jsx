import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown, ChevronUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';
import { parseServerError } from '../../../utils/errorUtils';
import { fetchEmployeeAdvances } from '../redux/employeeSlice';

const EmployeeAdvancesSection = ({
  advances,
  currentPage,
  setCurrentPage,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  employeeName,
  isLoading = false,
  totalPages,
  dispatch,
  id,
  itemsPerPage = 5,
}) => {
  const [isTableOpen, setIsTableOpen] = useState(true);

useEffect(() => {
  if (!advances) {
    dispatch(fetchEmployeeAdvances({ id, page: currentPage, limit: itemsPerPage, sortField, sortOrder }))
      .unwrap()
      .catch((error) => {
        const parsedError = parseServerError(error);
        toast.error(parsedError.message, {
          id: 'advances-fetch-error',
          duration: 5000,
          position: 'top-center',
        });
      });
  }
}, [dispatch, id, currentPage, itemsPerPage, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
    // Fetch advances with new sort parameters
    dispatch(fetchEmployeeAdvances({ id, page: 1, limit: itemsPerPage, sortField: field, sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' }))
      .unwrap()
      .catch((error) => {
        const parsedError = parseServerError(error);
        toast.error(parsedError.message, {
          id: 'advances-sort-error',
          duration: 5000,
          position: 'top-center',
        });
      });
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      dispatch(fetchEmployeeAdvances({ id, page, limit: itemsPerPage, sortField, sortOrder }))
        .unwrap()
        .catch((error) => {
          const parsedError = parseServerError(error);
          toast.error(parsedError.message, {
            id: 'advances-page-error',
            duration: 5000,
            position: 'top-center',
          });
        });
    }
  };

  return (
    <Card
      className={cn(
        'bg-complementary text-body shadow-lg rounded-xl border border-accent/10 transition-all duration-500',
        'animate-fade-in w-full max-w-[92vw] xs:max-w-[90vw] sm:max-w-none mx-auto'
      )}
      role="region"
      aria-labelledby="employee-advances-title"
    >
      <CardHeader className="p-2 xs:p-3 sm:p-6">
        <CardTitle
          id="employee-advances-title"
          className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-1 xs:gap-2 sm:gap-3"
        >
          <div className="flex items-center justify-center w-8 xs:w-10 sm:w-12 h-8 xs:h-10 sm:h-12 rounded-full bg-accent/20 text-accent">
            <User className="h-4 xs:h-5 sm:h-6 w-4 xs:w-5 sm:w-6" />
          </div>
          <span className="truncate">{employeeName ? `${employeeName}'s Advance History` : 'Advance History'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 xs:p-3 sm:p-6 space-y-4 xs:space-y-5 sm:space-y-6">
        <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen}>
          <CollapsibleTrigger
            className="flex items-center justify-between w-full text-sm xs:text-base sm:text-lg font-semibold text-body hover:text-accent transition-colors"
            aria-label={isTableOpen ? 'Collapse advance table' : 'Expand advance table'}
          >
            Advance Records
            {isTableOpen ? <ChevronUp className="h-4 xs:h-5 w-4 xs:w-5" /> : <ChevronDown className="h-4 xs:h-5 w-4 xs:w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 xs:mt-3 sm:mt-4 animate-fade-in">
            <div className="overflow-x-auto">
              <Table className="w-full" role="grid">
                <TableHeader>
                  <TableRow className="bg-accent/10 rounded-lg">
                    <TableHead
                      className="text-xs xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 hover:bg-accent/20 transition-colors cursor-pointer min-w-[120px] max-w-[150px] text-left break-words"
                      aria-sort={sortField === 'amount' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center text-body cursor-pointer"
                              onClick={() => handleSort('amount')}
                            >
                              <span>Amount (₹)</span>
                              <ArrowUpDown className="ml-1 h-4 xs:h-5 w-4 xs:w-5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                            Sort by Amount
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead
                      className="text-xs xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 hover:bg-accent/20 transition-colors cursor-pointer min-w-[120px] max-w-[150px] text-left break-words"
                      aria-sort={sortField === 'month' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center text-body cursor-pointer"
                              onClick={() => handleSort('month')}
                            >
                              <span>Month</span>
                              <ArrowUpDown className="ml-1 h-4 xs:h-5 w-4 xs:w-5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                            Sort by Month
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead
                      className="text-xs xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 hover:bg-accent/20 transition-colors cursor-pointer min-w-[120px] max-w-[150px] text-left break-words"
                      aria-sort={sortField === 'year' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center text-body cursor-pointer"
                              onClick={() => handleSort('year')}
                            >
                              <span>Year</span>
                              <ArrowUpDown className="ml-1 h-4 xs:h-5 w-4 xs:w-5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                            Sort by Year
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                          <Skeleton className="h-5 w-full bg-accent/20" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : advances.length > 0 ? (
                    advances.map((advance, index) => (
                      <TableRow key={advance._id || index} className="hover:bg-accent/5 transition-colors">
                        <TableCell className="text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">
                          ₹{advance.amount}
                        </TableCell>
                        <TableCell className="text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">
                          {format(new Date(2025, advance.month - 1), 'MMMM')}
                        </TableCell>
                        <TableCell className="text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] max-w-[150px] text-left break-words">
                          {advance.year}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 bg-accent/5 border border-accent/20 rounded-lg"
                      >
                        No advances found
                      </TableCell>
                    </TableRow>
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
                        className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 min-h-[36px] text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
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
                              'rounded-lg text-xs xs:text-sm sm:text-base py-1 px-2 xs:px-3 min-h-[36px] transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2'
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
                        className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-2 xs:px-3 sm:px-4 py-1 xs:py-2 min-h-[36px] text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
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
  );
};

export default EmployeeAdvancesSection;