import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSettings, updateSettings, updateEmployeeLeaves } from '../redux/settingsSlice';
import Sidebar from '../components/Sidebar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  paidLeavesPerMonth: z
    .number()
    .int()
    .min(1, 'Paid leaves must be at least 1')
    .max(30, 'Paid leaves cannot exceed 30'),
  halfDayDeduction: z
    .number()
    .min(0, 'Half-day deduction must be at least 0')
    .max(1, 'Half-day deduction cannot exceed 1'),
});

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { settings, loading, error } = useSelector((state) => state.adminSettings);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidLeavesPerMonth: 2,
      halfDayDeduction: 0.5,
    },
  });

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      form.reset({
        paidLeavesPerMonth: settings.paidLeavesPerMonth,
        halfDayDeduction: settings.halfDayDeduction,
      });
    }
  }, [settings, form]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: 'adminSettings/reset' });
    }
  }, [error, dispatch]);

  const onSubmit = (data) => {
    dispatch(updateSettings(data))
      .unwrap()
      .then(() => {
        toast.success('Settings updated successfully');
      })
      .catch((err) => toast.error(err));
  };

  const handleUpdateLeaves = () => {
    dispatch(updateEmployeeLeaves())
      .unwrap()
      .then(() => {
        toast.success('Employee leaves updated successfully');
      })
      .catch((err) => toast.error(err));
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-body text-body transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 bg-complementary text-body shadow-md">
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="flex items-center space-x-4">
            <span>Guest</span>
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-5 w-5 text-accent" />
            </Button>
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
                <div className="space-y-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="paidLeavesPerMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paid Leaves Per Month</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="bg-complementary text-body border-accent"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="halfDayDeduction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Half-Day Deduction Rate</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                className="bg-complementary text-body border-accent"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="bg-accent text-body hover:bg-accent-hover"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Settings'}
                      </Button>
                    </form>
                  </Form>
                  <div>
                    <Button
                      onClick={handleUpdateLeaves}
                      className="bg-accent text-body hover:bg-accent-hover"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Employee Leaves'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Settings;
