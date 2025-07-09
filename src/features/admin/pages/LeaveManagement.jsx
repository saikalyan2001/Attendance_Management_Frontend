import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployees, fetchMonthlyLeaves, updateEmployeeLeave } from '../redux/employeeSlice';
import Layout from '../../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const LeaveManagement = () => {
  const dispatch = useDispatch();
  const { employees, monthlyLeaves, loading, error, success, successMessage } = useSelector((state) => state.employees);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    dispatch(fetchEmployees({}));
    dispatch(fetchMonthlyLeaves({ year: selectedYear, month: selectedMonth }));
  }, [dispatch, selectedYear, selectedMonth]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        action: { label: 'Retry', onClick: () => dispatch(fetchMonthlyLeaves({ year: selectedYear, month: selectedMonth })) },
      });
    }
    if (success && successMessage) {
      toast.success(successMessage);
    }
  }, [error, success, successMessage, dispatch, selectedYear, selectedMonth]);

  const handleLeaveAction = (employeeId, requestId, status) => {
    dispatch(updateEmployeeLeave({ id: employeeId, requestId, status }))
      .unwrap()
      .then(() => {
        dispatch(fetchMonthlyLeaves({ year: selectedYear, month: selectedMonth }));
      });
  };

  return (
    <Layout title="Leave Management">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="bg-complementary text-body shadow-md">
        <CardHeader>
          <CardTitle>Monthly Leave Balances</CardTitle>
          <div className="flex space-x-4">
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025].map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Opening Leaves</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Taken</TableHead>
                  <TableHead>Closing Leaves</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyLeaves.map((leave) => (
                  <TableRow key={leave.employee._id}>
                    <TableCell>{leave.employee.name}</TableCell>
                    <TableCell>{leave.openingLeaves.toFixed(1)}</TableCell>
                    <TableCell>{leave.allocated.toFixed(1)}</TableCell>
                    <TableCell>{leave.taken.toFixed(1)}</TableCell>
                    <TableCell>{leave.closingLeaves.toFixed(1)}</TableCell>
                    <TableCell>
                      {leave.available > 0 ? (
                        <>
                          <Button
                            onClick={() => handleLeaveAction(leave.employee._id, leave.requestId, 'approved')}
                            disabled={loading}
                            className="mr-2"
                          >
                            Approve Leave
                          </Button>
                          <Button
                            onClick={() => handleLeaveAction(leave.employee._id, leave.requestId, 'rejected')}
                            disabled={loading}
                            variant="outline"
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button disabled>No Leaves Available</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default LeaveManagement;