import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';

const setPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/set-password', { token, newPassword: data.password });
      toast.success('Password set successfully. Please log in.');
      navigate('/login');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to set password.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-body text-body p-4">
      <Card className="w-full max-w-md bg-complementary text-body shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Set Your Password</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-error text-error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {!token && (
                <Alert variant="destructive" className="border-error text-error">
                  <AlertDescription>Invalid or missing token. Please use the link sent to your email.</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">New Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          className="bg-complementary text-body border-accent pr-10 rounded-md focus:ring-2 focus:ring-accent"
                          disabled={loading || !token}
                          aria-label="New password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-accent hover:text-accent-hover"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-error text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Confirm Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="bg-complementary text-body border-accent pr-10 rounded-md focus:ring-2 focus:ring-accent"
                          disabled={loading || !token}
                          aria-label="Confirm password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-accent hover:text-accent-hover"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-error text-xs" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-accent text-body hover:bg-accent-hover rounded-md py-2 text-base font-medium transition-all duration-300"
                disabled={loading || !token}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Set Password'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <a
              href="/login"
              className="text-sm text-accent hover:text-accent-hover underline"
              aria-label="Back to login"
            >
              Back to Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPassword;