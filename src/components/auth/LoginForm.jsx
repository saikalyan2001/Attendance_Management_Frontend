import { useRef, useEffect, useState } from 'react'; // Added useState
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff } from 'lucide-react'; // Added Eye, EyeOff
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Invalid password'),
});

const LoginForm = ({ onSubmit, loading, role, error }) => {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const formRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility

  useEffect(() => {
    if (error) {
      const message = error === 'Invalid role' ? 'Invalid role' : 
                     error.includes('Please set your password') ? error : 'Invalid email or password';
      form.setError('email', { message });
      form.setError('password', { message });
      const fieldElement = document.querySelector('[name="email"]');
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldElement.focus();
      }
    }
  }, [error, form]);

  useEffect(() => {
    const errors = form.formState.errors;
    if (errors.email || errors.password) {
      const firstErrorField = errors.email ? 'email' : 'password';
      const message = errors[firstErrorField].message;
      toast.error(message, {
        id: `validation-error-${firstErrorField}`,
        duration: 5000,
        position: 'top-center',
      });
      const fieldElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldElement.focus();
      }
    }
  }, [form.formState.errors]);

  useEffect(() => {
    if (user) {
      form.reset();
    }
  }, [user, form]);

  const handleSubmit = async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      // Errors handled via useEffect
    }
  };

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        aria-busy={loading}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base">
                Email <span className="text-error">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  className="w-full bg-complementary text-body border-accent h-10 text-sm sm:text-base"
                  disabled={loading}
                  aria-label="Email address"
                  aria-invalid={!!form.formState.errors.email}
                />
              </FormControl>
              <FormMessage className="text-error text-xs sm:text-sm" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base">
                Password <span className="text-error">*</span>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? 'text' : 'password'} // Toggle type
                    className="w-full bg-complementary text-body border-accent h-10 text-sm sm:text-base pr-10" // Added padding for icon
                    disabled={loading}
                    aria-label="Password"
                    aria-invalid={!!form.formState.errors.password}
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
              <FormMessage className="text-error text-xs sm:text-sm" />
            </FormItem>
          )}
        />
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-accent hover:text-accent-hover underline"
          >
            Forgot Password?
          </Link>
        </div>
        <Button
          type="submit"
          className={cn(
            'w-full bg-accent text-body hover:bg-accent-hover h-10 text-sm sm:text-base transition-all duration-300',
            loading && 'opacity-75'
          )}
          disabled={loading}
          aria-label={loading ? 'Logging in' : 'Login'}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : 'Login'}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;