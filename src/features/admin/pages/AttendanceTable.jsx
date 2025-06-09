import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AttendanceTable = ({
  attendanceReport,
  locations,
  reportsLoading,
  month,
  year,
  location,
  searchQuery,
  setSearchQuery,
  sortConfig,
  setSortConfig,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  viewMode,
  setViewMode,
}) => {
  const handleDownloadCSV = () => {
    if (!attendanceReport?.attendance?.length) {
      toast.error('No attendance data to export');
      return;
    }
    const data = attendanceReport.attendance.map((record) => ({
      Employee: `${record.employee?.name || 'Unknown'} (${record.employee?.employeeId || 'N/A'})`,
      Location: record.location?.name || 'Unknown',
      Date: format(new Date(record.date), 'MM/dd/yyyy'),
      Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
    }));
    const filename = `attendance-report-${month}-${year}.csv`;
    const columns = ['Employee', 'Location', 'Date', 'Status'];
    const csv = Papa.unparse(data, { header: true, columns });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (!attendanceReport?.attendance?.length) {
      toast.error('No attendance data to export');
      return;
    }
    const doc = new jsPDF();
    doc.text('Attendance Report', 14, 20);
    doc.text(`Month: ${format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')}`, 14, 30);
    doc.text(
      `Location: ${location === 'all' ? 'All Locations' : locations.find((loc) => loc._id === location)?.name || 'Unknown'}`,
      14,
      40
    );
    autoTable(doc, {
      startY: 50,
      head: [['Employee', 'Location', 'Date', 'Status']],
      body: attendanceReport.attendance.map((record) => [
        `${record.employee?.name || 'Unknown'} (${record.employee?.employeeId || 'N/A'})`,
        record.location?.name || 'Unknown',
        format(new Date(record.date), 'MM/dd/yyyy'),
        record.status.charAt(0).toUpperCase() + record.status.slice(1),
      ]),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`attendance-report-${month}-${year}.pdf`);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const newSort = { ...prev };
      if (newSort.attendance?.key === key && newSort.attendance?.direction === 'asc') {
        newSort.attendance = { key, direction: 'desc' };
      } else {
        newSort.attendance = { key, direction: 'asc' };
      }
      return newSort;
    });
  };

  const filterData = (data) => {
    const query = searchQuery.attendance.toLowerCase();
    if (!query) return data;
    return data.filter(
      (record) =>
        record.employee?.name?.toLowerCase().includes(query) ||
        record.employee?.employeeId?.toLowerCase().includes(query)
    );
  };

  const sortData = (data) => {
    if (!data || !sortConfig.attendance) return data;
    const { key, direction } = sortConfig.attendance;
    return [...data].sort((a, b) => {
      let aValue, bValue;
      if (key === 'employee') {
        aValue = a.employee?.name?.toLowerCase() || '';
        bValue = b.employee?.name?.toLowerCase() || '';
      } else if (key === 'location') {
        aValue = a.location?.name?.toLowerCase() || '';
        bValue = b.location?.name?.toLowerCase() || '';
      } else if (key === 'date') {
        aValue = new Date(a.date);
        bValue = new Date(b.date);
      } else {
        aValue = a[key]?.toLowerCase() || '';
        bValue = b[key]?.toLowerCase() || '';
      }
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const paginateData = (data) => {
    const startIndex = (currentPage.attendance - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const filteredAttendance = useMemo(
    () => (attendanceReport?.attendance ? filterData(attendanceReport.attendance) : []),
    [attendanceReport, searchQuery.attendance]
  );
  const sortedAttendance = useMemo(() => sortData(filteredAttendance), [filteredAttendance, sortConfig.attendance]);
  const paginatedAttendance = useMemo(() => paginateData(sortedAttendance), [sortedAttendance, currentPage.attendance]);

  return (
    <Card className="bg-complementary text-body mb-6 w-full max-w-full overflow-x-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full max-w-full">
          <span className="text-body font-semibold">Attendance Report</span>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant=" of-outline"
              onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
              className="bg-gray-100 dark:bg-gray-800 text-body text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
            >
              {viewMode === 'table' ? 'Card View' : 'Table View'}
            </Button>
            <Button
              onClick={handleDownloadCSV}
              className="bg-accent text-body hover:bg-accent-hover text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              disabled={reportsLoading || !attendanceReport?.attendance?.length}
            >
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-body hover:bg-accent-hover text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              disabled={reportsLoading || !attendanceReport?.attendance?.length}
            >
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-body">
            Present: {attendanceReport?.summary?.totalPresent || 0} | Absent: {attendanceReport?.summary?.totalAbsent || 0} | 
            Leave: {attendanceReport?.summary?.totalLeave || 0} | Half-Day: {attendanceReport?.summary?.totalHalfDay || 0}
          </p>
        </div>
        <div className="relative mb-4 w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-body" />
          <Input
            placeholder="Search employees..."
            className="pl-10 bg-gray-100 dark:bg-gray-800 text-body border-accent rounded-md"
            value={searchQuery.attendance}
            onChange={(e) => setSearchQuery({ ...searchQuery, attendance: e.target.value })}
          />
        </div>
        {reportsLoading ? (
          <div className="space-y-4">
            {Array(5).fill().map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : filteredAttendance.length > 0 ? (
          <>
            {viewMode === 'table' ? (
              <div className="relative overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('employee')}
                      >
                        Employee
                        {sortConfig.attendance?.key === 'employee' &&
                          (sortConfig.attendance.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('location')}
                      >
                        Location
                        {sortConfig.attendance?.key === 'location' &&
                          (sortConfig.attendance.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('date')}
                      >
                        Date
                        {sortConfig.attendance?.key === 'date' &&
                          (sortConfig.attendance.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        {sortConfig.attendance?.key === 'status' &&
                          (sortConfig.attendance.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendance.map((record) => (
                      <TableRow key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell className="text-body truncate max-w-[200px]">
                          {record.employee?.name || 'Unknown'} ({record.employee?.employeeId || 'N/A'})
                        </TableCell>
                        <TableCell className="text-body truncate max-w-[150px]">{record.location?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-body">{format(new Date(record.date), 'MM/dd/yyyy')}</TableCell>
                        <TableCell
                          className={
                            record.status === 'present'
                              ? 'text-green-500'
                              : record.status === 'absent'
                              ? 'text-red-500'
                              : record.status === 'half-day'
                              ? 'text-blue-500'
                              : 'text-yellow-500'
                          }
                        >
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedAttendance.map((record) => (
                  <Card key={record._id} className="bg-gray-100 dark:bg-gray-800 text-body">
                    <CardContent className="p-4">
                      <p className="font-semibold truncate">
                        {record.employee?.name || 'Unknown'} ({record.employee?.employeeId || 'N/A'})
                      </p>
                      <p className="text-sm truncate">Location: {record.location?.name || 'Unknown'}</p>
                      <p className="text-sm">Date: {format(new Date(record.date), 'MM/dd/yyyy')}</p>
                      <p
                        className={
                          record.status === 'present'
                            ? 'text-green-500'
                            : record.status === 'absent'
                            ? 'text-red-500'
                            : record.status === 'half-day'
                            ? 'text-blue-500'
                            : 'text-yellow-500'
                        }
                      >
                        Status: {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage({ ...currentPage, attendance: currentPage.attendance - 1 })}
                disabled={currentPage.attendance === 1}
                className="bg-gray-100 dark:bg-gray-800 text-body text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="text-body text-xs sm:text-sm">
                Page {currentPage.attendance} of {Math.ceil(filteredAttendance.length / itemsPerPage) || 1}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage({ ...currentPage, attendance: currentPage.attendance + 1 })}
                disabled={currentPage.attendance >= Math.ceil(filteredAttendance.length / itemsPerPage)}
                className="bg-gray-100 dark:bg-gray-800 text-body text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <p className="text-body text-center">No attendance records available.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceTable;