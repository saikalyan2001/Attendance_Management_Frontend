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

const LeaveTable = ({
  leaveReport,
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
    if (!leaveReport?.employees?.length) {
      toast.error('No leave data to export');
      return;
    }
    const data = leaveReport.employees.map((emp) => ({
      Employee: `${emp.name || 'Unknown'} (${emp.employeeId || 'N/A'})`,
      Location: emp.location?.name || 'Unknown',
      Available: emp.paidLeaves.available,
      Used: emp.paidLeaves.used,
      CarriedForward: emp.paidLeaves.carriedForward,
    }));
    const filename = `leave-report-${month}-${year}.csv`;
    const columns = ['Employee', 'Location', 'Available', 'Used', 'CarriedForward'];
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
    if (!leaveReport?.employees?.length) {
      toast.error('No leave data to export');
      return;
    }
    const doc = new jsPDF();
    doc.text('Leave Report', 14, 20);
    doc.text(`Month: ${format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')}`, 14, 30);
    doc.text(
      `Location: ${location === 'all' ? 'All Locations' : locations.find((loc) => loc._id === location)?.name || 'Unknown'}`,
      14,
      40
    );
    autoTable(doc, {
      startY: 50,
      head: [['Employee', 'Location', 'Available', 'Used', 'Carried Forward']],
      body: leaveReport.employees.map((emp) => [
        `${emp.name || 'Unknown'} (${emp.employeeId || 'N/A'})`,
        emp.location?.name || 'Unknown',
        emp.paidLeaves.available,
        emp.paidLeaves.used,
        emp.paidLeaves.carriedForward,
      ]),
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`leave-report-${month}-${year}.pdf`);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const newSort = { ...prev };
      if (newSort.leave?.key === key && newSort.leave?.direction === 'asc') {
        newSort.leave = { key, direction: 'desc' };
      } else {
        newSort.leave = { key, direction: 'asc' };
      }
      return newSort;
    });
  };

  const filterData = (data) => {
    const query = searchQuery.leave.toLowerCase();
    if (!query) return data;
    return data.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(query) ||
        emp.employeeId?.toLowerCase().includes(query)
    );
  };

  const sortData = (data) => {
    if (!data || !sortConfig.leave) return data;
    const { key, direction } = sortConfig.leave;
    return [...data].sort((a, b) => {
      let aValue, bValue;
      if (key === 'employee') {
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
      } else if (key === 'location') {
        aValue = a.location?.name?.toLowerCase() || '';
        bValue = b.location?.name?.toLowerCase() || '';
      } else {
        aValue = a.paidLeaves[key] || 0;
        bValue = b.paidLeaves[key] || 0;
      }
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const paginateData = (data) => {
    const startIndex = (currentPage.leave - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const filteredLeave = useMemo(
    () => (leaveReport?.employees ? filterData(leaveReport.employees) : []),
    [leaveReport, searchQuery.leave]
  );
  const sortedLeave = useMemo(() => sortData(filteredLeave), [filteredLeave, sortConfig.leave]);
  const paginatedLeave = useMemo(() => paginateData(sortedLeave), [sortedLeave, currentPage.leave]);

  return (
    <Card className="bg-complementary text-body mb-6 w-full max-w-full overflow-x-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full max-w-full">
          <span className="text-body font-semibold">Leave Report</span>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
              className="bg-gray-100 dark:bg-gray-800 text-body text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
            >
              {viewMode === 'table' ? 'Card View' : 'Table View'}
            </Button>
            <Button
              onClick={handleDownloadCSV}
              className="bg-accent text-body hover:bg-accent-hover text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              disabled={reportsLoading || !leaveReport?.employees?.length}
            >
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-body hover:bg-accent-hover text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              disabled={reportsLoading || !leaveReport?.employees?.length}
            >
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-body">
            Total Available: {leaveReport?.summary?.totalAvailable || 0} | Total Used: {leaveReport?.summary?.totalUsed || 0} | 
            Total Carried Forward: {leaveReport?.summary?.totalCarriedForward || 0}
          </p>
        </div>
        <div className="relative mb-4 w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-body" />
          <Input
            placeholder="Search employees..."
            className="pl-10 bg-gray-100 dark:bg-gray-800 text-body border-accent rounded-md"
            value={searchQuery.leave}
            onChange={(e) => setSearchQuery({ ...searchQuery, leave: e.target.value })}
          />
        </div>
        {reportsLoading ? (
          <div className="space-y-4">
            {Array(5).fill().map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : filteredLeave.length > 0 ? (
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
                        {sortConfig.leave?.key === 'employee' &&
                          (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('location')}
                      >
                        Location
                        {sortConfig.leave?.key === 'location' &&
                          (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('available')}
                      >
                        Available
                        {sortConfig.leave?.key === 'available' &&
                          (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('used')}
                      >
                        Used
                        {sortConfig.leave?.key === 'used' &&
                          (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('carriedForward')}
                      >
                        Carried Forward
                        {sortConfig.leave?.key === 'carriedForward' &&
                          (sortConfig.leave.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeave.map((emp) => (
                      <TableRow key={emp._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell className="text-body truncate max-w-[200px]">
                          {emp.name || 'Unknown'} ({emp.employeeId || 'N/A'})
                        </TableCell>
                        <TableCell className="text-body truncate max-w-[150px]">{emp.location?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-body">{emp.paidLeaves.available}</TableCell>
                        <TableCell className="text-body">{emp.paidLeaves.used}</TableCell>
                        <TableCell className="text-body">{emp.paidLeaves.carriedForward}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedLeave.map((emp) => (
                  <Card key={emp._id} className="bg-gray-100 dark:bg-gray-800 text-body">
                    <CardContent className="p-4">
                      <p className="font-semibold truncate">
                        {emp.name || 'Unknown'} ({emp.employeeId || 'N/A'})
                      </p>
                      <p className="text-sm truncate">Location: {emp.location?.name || 'Unknown'}</p>
                      <p className="text-sm">Available: {emp.paidLeaves.available}</p>
                      <p className="text-sm">Used: {emp.paidLeaves.used}</p>
                      <p className="text-sm">Carried Forward: {emp.paidLeaves.carriedForward}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage({ ...currentPage, leave: currentPage.leave - 1 })}
                disabled={currentPage.leave === 1}
                className="bg-gray-100 dark:bg-gray-800 text-body text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="text-body text-xs sm:text-sm">
                Page {currentPage.leave} of {Math.ceil(filteredLeave.length / itemsPerPage) || 1}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage({ ...currentPage, leave: currentPage.leave + 1 })}
                disabled={currentPage.leave >= Math.ceil(filteredLeave.length / itemsPerPage)}
                className="bg-gray-100 dark:bg-gray-800 text-body text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <p className="text-body text-center">No employees found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveTable;