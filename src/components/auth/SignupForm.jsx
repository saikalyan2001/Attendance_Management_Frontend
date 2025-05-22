import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  locations: z.array(z.string()).optional(),
});

const SignupForm = ({ onSubmit, loading, error, role }) => {
  const { locations } = useSelector((state) => state.adminLocations);

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      phone: '',
      locations: [],
    },
  });

  useEffect(() => {
    if (role === 'siteincharge' && locations.length > 0) {
      form.setValue('locations', locations.map((loc) => loc._id));
    } else {
      form.setValue('locations', []);
    }
  }, [role, locations, form]);

  const handleSubmit = (data) => {
    onSubmit({
      ...data,
      role,
      locations: role === 'siteincharge' ? data.locations : [],
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="border-error text-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  className="bg-complementary text-body border-accent"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  className="bg-complementary text-body border-accent"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-complementary text-body border-accent"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-complementary text-body border-accent"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {role === 'siteincharge' && (
          <FormField
            control={form.control}
            name="locations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Locations *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange([value])}
                  value={field.value[0] || ''}
                  disabled={loading}
                >
                  <FormControl>
                    <SelectTrigger className="bg-complementary text-body border-accent">
                      <SelectValue placeholder="Select locations" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-complementary text-body">
                    {locations.map((loc) => (
                      <SelectItem key={loc._id} value={loc._id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button
          type="submit"
          className="w-full bg-accent text-body hover:bg-accent-hover"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign Up'}
        </Button>
      </form>
    </Form>
  );
};

export default SignupForm;
