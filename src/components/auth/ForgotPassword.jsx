import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';
import { Link } from 'react-router-dom';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setSuccess(true);
      toast.success('If the email exists, a password reset link has been sent.', {
        duration: 5000,
      });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send reset link.';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-body text-body p-4">
      <Card className="w-full max-w-md bg-complementary text-body shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Reset Your Password</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-error text-error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-accent text-accent">
                  <AlertDescription>
                    If the email exists, a password reset link has been sent. Please check your inbox.
                  </AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="bg-complementary text-body border-accent rounded-md focus:ring-2 focus:ring-accent"
                        disabled={loading || success}
                        placeholder="Enter your email"
                        aria-label="Email address"
                      />
                    </FormControl>
                    <FormMessage className="text-error text-xs" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-accent text-body hover:bg-accent-hover rounded-md py-2 text-base font-medium transition-all duration-300"
                disabled={loading || success}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-accent hover:text-accent-hover underline"
                  aria-label="Back to login"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;