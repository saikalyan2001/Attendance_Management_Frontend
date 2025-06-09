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

const SalaryTable = ({
  salaryReport,
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
  const calculateTotals = (data) => {
    return data.reduce(
      (acc, emp) => ({
        grossSalary: acc.grossSalary + (typeof emp.grossSalary === 'number' ? emp.grossSalary : 0),
        netSalary: acc.netSalary + (typeof emp.netSalary === 'number' ? emp.netSalary : 0),
        advance: acc.advance + (typeof emp.advance === 'number' ? emp.advance : 0),
        totalSalary: acc.totalSalary + (typeof emp.totalSalary === 'number' ? emp.totalSalary : 0),
      }),
      { grossSalary: 0, netSalary: 0, advance: 0, totalSalary: 0 }
    );
  };

  const totals = useMemo(() => calculateTotals(salaryReport?.employees || []), [salaryReport]);

  const handleDownloadCSV = () => {
    if (!salaryReport?.employees?.length) {
      toast.error('No salary data to export');
      return;
    }
    const data = salaryReport.employees.map((emp) => ({
      Employee: `${emp.employee?.name || 'Unknown'} (${emp.employee?.employeeId || 'N/A'})`,
      Location: emp.location?.name || 'Unknown',
      PresentDays: emp.presentDays,
      HalfDays: emp.halfDays,
      AbsentDays: emp.absentDays,
      UnrecordedDays: emp.unrecordedDays,
      LeaveDays: emp.leaveDays,
      GrossSalary: `₹${typeof emp.grossSalary === 'number' ? emp.grossSalary.toFixed(2) : '0.00'}`,
      NetSalary: `₹${typeof emp.netSalary === 'number' ? emp.netSalary.toFixed(2) : '0.00'}`,
      Advance: `₹${typeof emp.advance === 'number' ? emp.advance.toFixed(2) : '0.00'}`,
      TotalSalary: `₹${typeof emp.totalSalary === 'number' ? emp.totalSalary.toFixed(2) : '0.00'}`,
    }));
    data.push({
      Employee: 'Total',
      Location: '',
      PresentDays: '',
      HalfDays: '',
      AbsentDays: '',
      UnrecordedDays: '',
      LeaveDays: '',
      GrossSalary: `₹${totals.grossSalary.toFixed(2)}`,
      NetSalary: `₹${totals.netSalary.toFixed(2)}`,
      Advance: `₹${totals.advance.toFixed(2)}`,
      TotalSalary: `₹${totals.totalSalary.toFixed(2)}`,
    });
    const filename = `salary-report-${month}-${year}.csv`;
    const columns = ['Employee', 'Location', 'PresentDays', 'HalfDays', 'AbsentDays', 'UnrecordedDays', 'LeaveDays', 'GrossSalary', 'NetSalary', 'Advance', 'TotalSalary'];
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
    if (!salaryReport?.employees?.length) {
      toast.error('No salary data to export');
      return;
    }
    const doc = new jsPDF();
    doc.text('Salary Report', 14, 20);
    doc.text(`Month: ${format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')}`, 14, 30);
    doc.text(
      `Location: ${location === 'all' ? 'All Locations' : locations.find((loc) => loc._id === location)?.name || 'Unknown'}`,
      14,
      40
    );
    autoTable(doc, {
      startY: 50,
      head: [['Employee', 'Location', 'Present Days', 'Half Days', 'Absent Days', 'Unrecorded Days', 'Leave Days', 'Gross Salary', 'Net Salary', 'Advance', 'Total Salary']],
      body: [
        ...salaryReport.employees.map((emp) => [
          `${emp.employee?.name || 'Unknown'} (${emp.employee?.employeeId || 'N/A'})`,
          emp.location?.name || 'Unknown',
          emp.presentDays,
          emp.halfDays,
          emp.absentDays,
          emp.unrecordedDays,
          emp.leaveDays,
          `₹${typeof emp.grossSalary === 'number' ? emp.grossSalary.toFixed(2) : '0.00'}`,
          `₹${typeof emp.netSalary === 'number' ? emp.netSalary.toFixed(2) : '0.00'}`,
          `₹${typeof emp.advance === 'number' ? emp.advance.toFixed(2) : '0.00'}`,
          `₹${typeof emp.totalSalary === 'number' ? emp.totalSalary.toFixed(2) : '0.00'}`,
        ]),
        ['Total', '', '', '', '', '', '', `₹${totals.grossSalary.toFixed(2)}`, `₹${totals.netSalary.toFixed(2)}`, `₹${totals.advance.toFixed(2)}`, `₹${totals.totalSalary.toFixed(2)}`],
      ],
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`salary-report-${month}-${year}.pdf`);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const newSort = { ...prev };
      if (newSort.salary?.key === key && newSort.salary?.direction === 'asc') {
        newSort.salary = { key, direction: 'desc' };
      } else {
        newSort.salary = { key, direction: 'asc' };
      }
      return newSort;
    });
  };

  const filterData = (data) => {
    const query = searchQuery.salary.toLowerCase();
    if (!query) return data;
    return data.filter(
      (emp) =>
        emp.employee?.name?.toLowerCase().includes(query) ||
        emp.employee?.employeeId?.toLowerCase().includes(query)
    );
  };

  const sortData = (data) => {
    if (!data || !sortConfig.salary) return data;
    const { key, direction } = sortConfig.salary;
    return [...data].sort((a, b) => {
      let aValue, bValue;
      if (key === 'employee') {
        aValue = a.employee?.name?.toLowerCase() || '';
        bValue = b.employee?.name?.toLowerCase() || '';
      } else if (key === 'location') {
        aValue = a.location?.name?.toLowerCase() || '';
        bValue = b.location?.name?.toLowerCase() || '';
      } else {
        aValue = typeof a[key] === 'number' ? a[key] : 0;
        bValue = typeof b[key] === 'number' ? b[key] : 0;
      }
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const paginateData = (data) => {
    const startIndex = (currentPage.salary - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const filteredSalary = useMemo(
    () => (salaryReport?.employees ? filterData(salaryReport.employees) : []),
    [salaryReport, searchQuery.salary]
  );
  const sortedSalary = useMemo(() => sortData(filteredSalary), [filteredSalary, sortConfig.salary]);
  const paginatedSalary = useMemo(() => paginateData(sortedSalary), [sortedSalary, currentPage.salary]);

  const getRowTotal = (emp) => ({
    grossSalary: typeof emp.grossSalary === 'number' ? emp.grossSalary : 0,
    netSalary: typeof emp.netSalary === 'number' ? emp.netSalary : 0,
    advance: typeof emp.advance === 'number' ? emp.advance : 0,
    totalSalary: typeof emp.totalSalary === 'number' ? emp.totalSalary : 0,
  });

  return (
    <Card className="bg-complementary text-body mb-6 w-full max-w-full overflow-x-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full max-w-full">
          <span className="text-body font-semibold">Salary Report</span>
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
              disabled={reportsLoading || !salaryReport?.employees?.length}
            >
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-accent text-body hover:bg-accent-hover text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              disabled={reportsLoading || !salaryReport?.employees?.length}
            >
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-body">
            Total Present Days: {salaryReport?.summary?.totalPresentDays || 0} | 
            Total Half Days: {salaryReport?.summary?.totalHalfDays || 0} | 
            Total Absent Days: {salaryReport?.summary?.totalAbsentDays || 0} | 
            Total Unrecorded Days: {salaryReport?.summary?.totalUnrecordedDays || 0} | 
            Total Leave Days: {salaryReport?.summary?.totalLeaveDays || 0} | 
            Total Gross Salary: ₹{totals.grossSalary.toFixed(2)} | 
            Total Net Salary: ₹{totals.netSalary.toFixed(2)} | 
            Total Advance: ₹{totals.advance.toFixed(2)} | 
            Total Salary: ₹{totals.totalSalary.toFixed(2)}
          </p>
        </div>
        <div className="relative mb-4 w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-body" />
          <Input
            placeholder="Search employees..."
            className="pl-10 bg-gray-100 dark:bg-gray-800 text-body border-accent rounded-md"
            value={searchQuery.salary}
            onChange={(e) => setSearchQuery({ ...searchQuery, salary: e.target.value })}
          />
        </div>
        {reportsLoading ? (
          <div className="space-y-4">
            {Array(5).fill().map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : filteredSalary.length > 0 ? (
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
                        {sortConfig.salary?.key === 'employee' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('location')}
                      >
                        Location
                        {sortConfig.salary?.key === 'location' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('presentDays')}
                      >
                        Present Days
                        {sortConfig.salary?.key === 'presentDays' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('halfDays')}
                      >
                        Half Days
                        {sortConfig.salary?.key === 'halfDays' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('absentDays')}
                      >
                        Absent Days
                        {sortConfig.salary?.key === 'absentDays' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('unrecordedDays')}
                      >
                        Unrecorded Days
                        {sortConfig.salary?.key === 'unrecordedDays' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('leaveDays')}
                      >
                        Leave Days
                        {sortConfig.salary?.key === 'leaveDays' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('grossSalary')}
                      >
                        Gross Salary
                        {sortConfig.salary?.key === 'grossSalary' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('netSalary')}
                      >
                        Net Salary
                        {sortConfig.salary?.key === 'netSalary' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('advance')}
                      >
                        Advance
                        {sortConfig.salary?.key === 'advance' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                      <TableHead
                        className="text-body font-semibold cursor-pointer sticky top-0"
                        onClick={() => handleSort('totalSalary')}
                      >
                        Total Salary
                        {sortConfig.salary?.key === 'totalSalary' &&
                          (sortConfig.salary.direction === 'asc' ? <ChevronUp className="inline ml-1 h-4 w-4" /> : <ChevronDown className="inline ml-1 h-4 w-4" />)}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSalary.map((emp) => {
                      const rowTotal = getRowTotal(emp);
                      return (
                        <TableRow key={emp.employee._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <TableCell className="text-body truncate max-w-[200px]">
                            {emp.employee?.name || 'Unknown'} ({emp.employee?.employeeId || 'N/A'})
                          </TableCell>
                          <TableCell className="text-body truncate max-w-[150px]">{emp.location?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-body">{emp.presentDays}</TableCell>
                          <TableCell className="text-body">{emp.halfDays}</TableCell>
                          <TableCell className="text-body">{emp.absentDays}</TableCell>
                          <TableCell className="text-body">{emp.unrecordedDays}</TableCell>
                          <TableCell className="text-body">{emp.leaveDays}</TableCell>
                          <TableCell className="text-body">₹{rowTotal.grossSalary.toFixed(2)}</TableCell>
                          <TableCell className="text-body">₹{rowTotal.netSalary.toFixed(2)}</TableCell>
                          <TableCell className="text-body">₹{rowTotal.advance.toFixed(2)}</TableCell>
                          <TableCell className="text-body">₹{rowTotal.totalSalary.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-gray-100 dark:bg-gray-800 font-semibold">
                      <TableCell className="text-body">Total</TableCell>
                      <TableCell className="text-body"></TableCell>
                      <TableCell className="text-body"></TableCell>
                      <TableCell className="text-body"></TableCell>
                      <TableCell className="text-body"></TableCell>
                      <TableCell className="text-body"></TableCell>
                      <TableCell className="text-body"></TableCell>
                      <TableCell className="text-body">₹{totals.grossSalary.toFixed(2)}</TableCell>
                      <TableCell className="text-body">₹{totals.netSalary.toFixed(2)}</TableCell>
                      <TableCell className="text-body">₹{totals.advance.toFixed(2)}</TableCell>
                      <TableCell className="text-body">₹{totals.totalSalary.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedSalary.map((emp) => {
                  const rowTotal = getRowTotal(emp);
                  return (
                    <Card key={emp.employee._id} className="bg-gray-100 dark:bg-gray-800 text-body">
                      <CardContent className="p-4">
                        <p className="font-semibold truncate">
                          {emp.employee?.name || 'Unknown'} ({emp.employee?.employeeId || 'N/A'})
                        </p>
                        <p className="text-sm truncate">Location: {emp.location?.name || 'Unknown'}</p>
                        <p className="text-sm">Present Days: {emp.presentDays}</p>
                        <p className="text-sm">Half Days: {emp.halfDays}</p>
                        <p className="text-sm">Absent Days: {emp.absentDays}</p>
                        <p className="text-sm">Unrecorded Days: {emp.unrecordedDays}</p>
                        <p className="text-sm">Leave Days: {emp.leaveDays}</p>
                        <p className="text-sm">Gross Salary: ₹{rowTotal.grossSalary.toFixed(2)}</p>
                        <p className="text-sm">Net Salary: ₹{rowTotal.netSalary.toFixed(2)}</p>
                        <p className="text-sm">Advance: ₹{rowTotal.advance.toFixed(2)}</p>
                        <p className="text-sm font-semibold">Total Salary: ₹{rowTotal.totalSalary.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
                <Card className="bg-gray-100 dark:bg-gray-800 text-body col-span-full mt-4">
                  <CardContent className="p-4">
                    <p className="font-semibold">Totals</p>
                    <p className="text-sm">Total Gross Salary: ₹{totals.grossSalary.toFixed(2)}</p>
                    <p className="text-sm">Total Net Salary: ₹{totals.netSalary.toFixed(2)}</p>
                    <p className="text-sm">Total Advance: ₹{totals.advance.toFixed(2)}</p>
                    <p className="text-sm font-semibold">Total Salary: ₹{totals.totalSalary.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage({ ...currentPage, salary: currentPage.salary - 1 })}
                disabled={currentPage.salary === 1}
                className="bg-gray-100 dark:bg-gray-800 text-body text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="text-body text-xs sm:text-sm">
                Page {currentPage.salary} of {Math.ceil(filteredSalary.length / itemsPerPage) || 1}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage({ ...currentPage, salary: currentPage.salary + 1 })}
                disabled={currentPage.salary >= Math.ceil(filteredSalary.length / itemsPerPage)}
                className="bg-gray-100 dark:bg-gray-800 text-body text-xs sm:text-sm py-1 sm:py-2 px-2 sm:px-4 w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <p className="text-body text-center">No salary records available.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SalaryTable;