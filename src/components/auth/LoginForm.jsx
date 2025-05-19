import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const LoginForm = ({ onSubmit, loading, error, role }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isSubmitDisabled = !email || !password;

  const handleSubmit = (e) => {
    e.preventDefault();
    const credentials = { email, password };
    onSubmit(credentials);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email" className="text-body">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-complementary text-body"
          required
        />
      </div>
      <div>
        <Label htmlFor="password" className="text-body">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-complementary text-body"
          required
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        className="w-full bg-accent text-white hover:bg-accent-hover"
        disabled={loading || isSubmitDisabled}
      >
        {loading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
};

export default LoginForm;