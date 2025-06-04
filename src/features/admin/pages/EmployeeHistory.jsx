import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployeeHistory, reset as resetEmployees } from '../redux/employeeSlice';
import Layout from '../../../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

const EmployeeHistory = () => {
  const { employeeId } = useParams(); // Get employeeId from URL
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { employees, history, loading: employeesLoading, error: employeesError } = useSelector((state) => state.adminEmployees);

  // Find the employee to display their name
  const employee = employees.find(emp => emp._id === employeeId);

  useEffect(() => {
    if (employeeId) {
      dispatch(getEmployeeHistory(employeeId));
    }

    // Cleanup on unmount
    return () => {
      dispatch(resetEmployees());
    };
  }, [dispatch, employeeId]);

  const handleBackClick = () => {
    navigate('/admin/employees');
  };

  return (
    <Layout title={`History for ${employee?.name || 'Employee'}`}>
      <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10 animate-fade-in max-w-full mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
              History for {employee?.name || 'Employee'}
            </CardTitle>
            <Button
              onClick={handleBackClick}
              className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
              aria-label="Back to employees list"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Back to Employees
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : employeesError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{employeesError}</AlertDescription>
            </Alert>
          ) : history ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Transfer History</h3>
                {history.transferHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] sm:text-sm xl:text-base">From Location</TableHead>
                        <TableHead className="text-[10px] sm:text-sm xl:text-base">To Location</TableHead>
                        <TableHead className="text-[10px] sm:text-sm xl:text-base">Transfer Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.transferHistory.map((transfer, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-[10px] sm:text-sm xl:text-base">{transfer.fromLocation?.name || transfer.fromLocation?.city || 'N/A'}</TableCell>
                          <TableCell className="text-[10px] sm:text-sm xl:text-base">{transfer.toLocation?.name || transfer.toLocation?.city || 'N/A'}</TableCell>
                          <TableCell className="text-[10px] sm:text-sm xl:text-base">{new Date(transfer.transferDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-[10px] sm:text-sm xl:text-base">No transfer history available.</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Employment History</h3>
                {history.employmentHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] sm:text-sm xl:text-base">Start Date</TableHead>
                        <TableHead className="text-[10px] sm:text-sm xl:text-base">End Date</TableHead>
                        <TableHead className="text-[10px] sm:text-sm xl:text-base">Status</TableHead>
                        <TableHead className="text-[10px] sm:text-sm xl:text-base">Closing Leaves</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.employmentHistory.map((period, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-[10px] sm:text-sm xl:text-base">{new Date(period.startDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-[10px] sm:text-sm xl:text-base">{period.endDate ? new Date(period.endDate).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell className="text-[10px] sm:text-sm xl:text-base">{period.status}</TableCell>
                          <TableCell className="text-[10px] sm:text-sm xl:text-base">{period.leaveBalanceAtEnd ?? 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-[10px] sm:text-sm xl:text-base">No employment history available.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[10px] sm:text-sm xl:text-base">No history data available.</p>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default EmployeeHistory;