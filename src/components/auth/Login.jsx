import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../../redux/slices/authSlice';
import LoginForm from './LoginForm';
import { ThemeToggle } from '../common/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [role, setRole] = useState('siteincharge');

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'siteincharge') {
        navigate('/siteincharge/dashboard');
      }
    }
  }, [user, navigate]);

  const handleLogin = (credentials) => {
    dispatch(login({ ...credentials, role }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-body">
      <Card className="w-full max-w-md">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Login</CardTitle>
          <ThemeToggle />
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="role" className="text-body mr-2">Role:</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-complementary text-body">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;