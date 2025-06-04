import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users } from 'lucide-react';
import { getEmployeeHistory, reset } from '../redux/employeeSlice'; // Update import
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SiteInchargeEmployeeHistory = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { history, loadingGeneral, error } = useSelector((state) => state.siteInchargeEmployee); // Use history instead of employee
  const { user, loading: authLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (employeeId) {
      dispatch(getEmployeeHistory(employeeId)).unwrap().catch((err) => {
        toast.error('Failed to fetch employee history', { duration: 5000 });
        navigate('/siteincharge/employees');
      });
    }

    // Cleanup on unmount
    return () => {
      dispatch(reset());
    };
  }, [dispatch, employeeId, navigate]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'siteincharge')) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (loadingGeneral || authLoading) {
    return (
      <Layout title="Employee History" role="siteincharge">
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (error || !history) {
    return (
      <Layout title="Employee History" role="siteincharge">
        <div className="flex flex-col items-center justify-center h-32 text-body">
          <Users className="h-12 w-12 text-accent/50 mb-2" />
          <p className="text-[10px] sm:text-sm xl:text-base">Employee not found or an error occurred</p>
          <Button
            onClick={() => navigate('/siteincharge/employees')}
            className="mt-2 bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
          >
            Back to Employees
          </Button>
        </div>
      </Layout>
    );
  }

  const transferHistory = history.transferHistory || [];
  const employmentHistory = history.employmentHistory || [];

  return (
    <Layout title={`History for Employee`} role="siteincharge">
      <div className="space-y-6">
        {/* Transfer History */}
        <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
              Transfer History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transferHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow className="bg-complementary hover:bg-accent/10">
                      <TableHead className="text-body px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                        From Location
                      </TableHead>
                      <TableHead className="text-body px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                        To Location
                      </TableHead>
                      <TableHead className="text-body px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                        Transfer Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferHistory.map((transfer, index) => (
                      <TableRow
                        key={index}
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                      >
                        <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                          {transfer.fromLocation?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                          {transfer.toLocation?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                          {new Date(transfer.transferDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-[10px] sm:text-sm xl:text-base text-body">
                No transfer history available.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Employment History */}
        <Card className="bg-complementary text-body shadow-lg rounded-md border border-accent/10">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold">
              Employment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employmentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow className="bg-complementary hover:bg-accent/10">
                      <TableHead className="text-body px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                        Start Date
                      </TableHead>
                      <TableHead className="text-body px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                        End Date
                      </TableHead>
                      <TableHead className="text-body px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                        Status
                      </TableHead>
                      <TableHead className="text-body px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                        Leave Balance at End
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employmentHistory.map((employment, index) => (
                      <TableRow
                        key={index}
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                      >
                        <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                          {new Date(employment.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                          {employment.endDate ? new Date(employment.endDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                          {employment.status}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-[10px] sm:text-sm xl:text-base">
                          {employment.leaveBalanceAtEnd ?? 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-[10px] sm:text-sm xl:text-base text-body">
                No employment history available.
              </p>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={() => navigate('/siteincharge/employees')}
          className="bg-accent text-body hover:bg-accent-hover rounded-md text-[10px] sm:text-sm xl:text-lg py-1 sm:py-2 px-3 sm:px-4 flex items-center transition-all duration-300 hover:shadow-md"
        >
          Back to Employees
        </Button>
      </div>
    </Layout>
  );
};

export default SiteInchargeEmployeeHistory;