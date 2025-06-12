import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../redux/slices/authSlice';
import LoginForm from './LoginForm';
import { ThemeToggle } from '../common/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [role, setRole] = useState('siteincharge');

  useEffect(() => {
    if (user) {
      toast.success(`Welcome, ${user.name}`);
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'siteincharge') {
        navigate('/siteincharge/dashboard');
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleLogin = (credentials) => {
    dispatch(login({ ...credentials, role }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-body text-body">
      <Card className="w-full max-w-md bg-complementary text-body">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Login</CardTitle>
          <ThemeToggle />
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="role" className="text-body mr-2">Role:</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-complementary text-body border-accent">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent className="bg-complementary text-body">
                <SelectItem value="siteincharge">Site Incharge</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <LoginForm
            onSubmit={handleLogin}
            loading={loading}
            error={error}
            role={role}
          />
              <p className="mt-4 text-center text-body">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent hover:underline">
              Sing up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;



