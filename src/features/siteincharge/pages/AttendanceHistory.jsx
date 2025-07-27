import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ChevronDown, ChevronUp, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';

const AttendanceHistory = ({ 
  attendance, 
  employeeId, 
  employeeName, 
  currentPage, 
  setCurrentPage, 
  monthFilter, 
  setMonthFilter, 
  yearFilter, 
  setYearFilter, 
  attendancePagination 
}) => {
  const { loading, error } = useSelector((state) => state.siteInchargeEmployee);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isTableOpen, setIsTableOpen] = useState(true);

  // Debug attendance prop
  console.log('AttendanceHistory - attendance prop:', attendance);

  const sortedAttendance = useMemo(() => {
    // Filter by employeeId
    const filteredAttendance = attendance.filter((att) => {
      const employeeIdFromRecord = typeof att.employee === 'object' ? att.employee._id : att.employee;
      return employeeIdFromRecord === employeeId;
    });

    // Sort by date or status
    return filteredAttendance.sort((a, b) => {
      const aValue = sortField === 'date' ? new Date(a.date) : a.status;
      const bValue = sortField === 'date' ? new Date(b.date) : b.status;
      if (sortField === 'date') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(bValue);
    });
  }, [attendance, sortField, sortOrder, employeeId]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleMonthChange = (value) => {
    setMonthFilter(parseInt(value));
    setCurrentPage(1);
  };

  const handleYearChange = (value) => {
    setYearFilter(parseInt(value));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= attendancePagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <Card
      className={cn(
        'bg-complementary text-body shadow-lg rounded-xl border border-accent/10 transition-all duration-500',
        'animate-fade-in w-full max-w-[92vw] xs:max-w-[90vw] sm:max-w-none mx-auto'
      )}
      role="region"
      aria-labelledby="attendance-history-title"
    >
      <CardHeader className="p-2 xs:p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 xs:gap-3 sm:gap-4">
          <CardTitle
            id="attendance-history-title"
            className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-1 xs:gap-2 sm:gap-3"
          >
            <div className="flex items-center justify-center w-8 xs:w-10 sm:w-12 h-8 xs:h-10 sm:h-12 rounded-full bg-accent/20 text-accent">
              <User className="h-4 xs:h-5 sm:h-6 w-4 xs:w-5 sm:w-6" />
            </div>
            <span className="truncate">{employeeName ? `${employeeName}'s Attendance History` : 'Attendance History'}</span>
          </CardTitle>
          <div className="flex flex-col sm:flex-row space-x-0 sm:space-x-2 xs:space-x-3 space-y-2 sm:space-y-0 w-full sm:w-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select value={monthFilter.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger
                      className="w-full sm:max-w-[140px] bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-lg text-xs xs:text-sm sm:text-base min-h-[36px]"
                      aria-label="Select month"
                    >
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body border-accent">
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()} className="text-xs xs:text-sm sm:text-base">
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                  Filter by Month
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select value={yearFilter.toString()} onValueChange={handleYearChange}>
                    <SelectTrigger
                      className="w-full sm:max-w-[100px] bg-body text-body border-complementary focus:border-accent focus:ring-2 focus:ring-accent rounded-lg text-xs xs:text-sm sm:text-base min-h-[36px]"
                      aria-label="Select year"
                    >
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-complementary text-body border-accent">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()} className="text-xs xs:text-sm sm:text-base">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                  Filter by Year
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 xs:p-3 sm:p-6 space-y-4 xs:space-y-5 sm:space-y-6">
        {error ? (
          <div className="text-center text-xs xs:text-sm sm:text-base text-destructive bg-accent/5 border border-accent/20 rounded-lg p-2 xs:p-3 sm:p-4">
            Error: {error}
          </div>
        ) : (
          <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen}>
            <CollapsibleTrigger
              className="flex items-center justify-between w-full text-sm xs:text-base sm:text-lg font-semibold text-body hover:text-accent transition-colors"
              aria-label={isTableOpen ? 'Collapse attendance table' : 'Expand attendance table'}
            >
              Attendance Records
              {isTableOpen ? <ChevronUp className="h-4 xs:h-5 w-4 xs:w-5" /> : <ChevronDown className="h-4 xs:h-5 w-4 xs:w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 xs:mt-3 sm:mt-4 animate-fade-in">
              <div className="overflow-x-auto">
                <Table className="w-full" role="grid">
                  <TableHeader>
                    <TableRow className="bg-accent/10 rounded-lg">
                      <TableHead
                        className="cursor-pointer text-xs xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 hover:bg-accent/20 transition-colors min-w-[120px]"
                        aria-sort={sortField === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('date')}
                                className="flex items-center space-x-1 text-body"
                              >
                                <span>Date</span>
                                <ArrowUpDown className="h-4 xs:h-5 w-4 xs:w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                              Sort by Date
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-xs xs:text-sm sm:text-base font-semibold px-2 xs:px-3 sm:px-4 py-2 xs:py-3 hover:bg-accent/20 transition-colors min-w-[120px]"
                        aria-sort={sortField === 'status' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('status')}
                                className="flex items-center space-x-1 text-body"
                              >
                                <span>Status</span>
                                <ArrowUpDown className="h-4 xs:h-5 w-4 xs:w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-complementary text-body border-accent text-xs xs:text-sm sm:text-base">
                              Sort by Status
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px]">
                            <Skeleton className="h-5 w-full bg-accent/20" />
                          </TableCell>
                          <TableCell className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px]">
                            <Skeleton className="h-5 w-20 bg-accent/20" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : sortedAttendance.length > 0 ? (
                      sortedAttendance.map((att) => (
                        <TableRow key={att._id} className="hover:bg-accent/5 transition-colors">
                          <TableCell className="text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px] break-words">
                            {format(new Date(att.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 min-w-[120px]">
                            <Badge
                              variant={
                                att.status === 'present'
                                  ? 'success'
                                  : att.status === 'absent'
                                  ? 'destructive'
                                  : 'warning'
                              }
                              className={cn(
                                'text-xs xs:text-sm sm:text-base rounded-lg',
                                att.status === 'absent' && '[data-theme=light] & text-body'
                              )}
                            >
                              {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="text-center text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 py-2 xs:py-3 bg-accent/5 border border-accent/20 rounded-lg"
                        >
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {attendancePagination.totalPages > 1 && !loading && (
                <div className="flex justify-between items-center mt-4 xs:mt-5 sm:mt-6">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || loading}
                          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-4 py-2 min-h-[36px] text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
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
                    {Array.from({ length: attendancePagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <TooltipProvider key={page}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={currentPage === page ? 'default' : 'outline'}
                              onClick={() => handlePageChange(page)}
                              disabled={loading}
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
                          disabled={currentPage === attendancePagination.totalPages || loading}
                          className="border-accent text-accent hover:bg-accent-hover hover:text-body rounded-lg px-4 py-2 min-h-[36px] text-xs xs:text-sm sm:text-base transition-all duration-300 focus:ring-2 focus:ring-accent focus:ring-offset-2"
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
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceHistory;