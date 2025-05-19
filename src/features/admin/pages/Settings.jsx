import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSettings, updateSettings } from '../redux/settingsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut } from 'lucide-react';
import { logout } from '../../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { settings, loading, error } = useSelector((state) => state.adminSettings);

  const [form, setForm] = useState({
    paidLeavesPerMonth: '2',
    halfDayDeduction: '0.5',
  });

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setForm({
        paidLeavesPerMonth: settings.paidLeavesPerMonth.toString(),
        halfDayDeduction: settings.halfDayDeduction.toString(),
      });
    }
  }, [settings]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'adminSettings/reset' });
    }
  }, [error, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const paidLeaves = parseInt(form.paidLeavesPerMonth);
    const halfDay = parseFloat(form.halfDayDeduction);

    if (isNaN(paidLeaves) || paidLeaves < 1 || paidLeaves > 30) {
      toast.error('Paid leaves must be between 1 and 30');
      return;
    }

    if (isNaN(halfDay) || halfDay < 0 || halfDay > 1) {
      toast.error('Half-day deduction must be between 0 and 1');
      return;
    }

    dispatch(
      updateSettings({
        paidLeavesPerMonth: paidLeaves,
        halfDayDeduction: halfDay,
      })
    )
      .unwrap()
      .then(() => {
        toast.success('Settings updated successfully');
      })
      .catch((err) => toast.error(err));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="flex items-center space-x-4">
            <span>{user?.email || 'Guest'}</span>
            <ThemeToggle />
            {user && (
              <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Log out">
                <LogOut className="h-5 w-5 text-accent" />
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">
          {error && (
            <Alert variant="destructive" className="mb-6 border-error text-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Card className="bg-complementary text-body max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="paidLeavesPerMonth">Paid Leaves Per Month</Label>
                    <Input
                      id="paidLeavesPerMonth"
                      name="paidLeavesPerMonth"
                      type="number"
                      value={form.paidLeavesPerMonth}
                      onChange={handleInputChange}
                      className="bg-complementary text-body border-accent"
                      min="1"
                      max="30"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="halfDayDeduction">Half-Day Deduction Rate</Label>
                    <Input
                      id="halfDayDeduction"
                      name="halfDayDeduction"
                      type="number"
                      step="0.01"
                      value={form.halfDayDeduction}
                      onChange={handleInputChange}
                      className="bg-complementary text-body border-accent"
                      min="0"
                      max="1"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-accent text-body hover:bg-accent-hover"
                    disabled={loading}
                  >
                    Save Settings
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Settings;