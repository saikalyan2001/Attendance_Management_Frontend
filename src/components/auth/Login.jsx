// src/components/auth/Login.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, resetError } from '../../redux/slices/authSlice';
import LoginForm from './LoginForm';
import { ThemeToggle } from '../common/ThemeToggle';
import ToasterProvider from '../common/ToasterProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [role, setRole] = useState('');

  useEffect(() => {
    if (user) {
      toast.success(`Welcome, ${user.name}`, {
        id: 'login-success',
        duration: 5000,
        position: 'top-center',
      });
      const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/siteincharge/dashboard';
      navigate(redirectPath, { replace: true });
      setRole('');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      console.log('Auth error:', error);
      toast.error(error, {
        id: 'auth-error',
        duration: 5000,
        position: 'top-center',
      });
      setTimeout(() => dispatch(resetError()), 100);
    }
  }, [error, dispatch]);

  const handleLogin = (credentials) => {
    if (!role) {
      toast.error('Please select a role', {
        id: 'role-error',
        duration: 5000,
        position: 'top-center',
      });
      return Promise.reject(new Error('Role not selected'));
    }
    dispatch(resetError());
    return dispatch(login({ ...credentials, role }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-body text-body px-4 sm:px-6 py-6">
      <ToasterProvider />
      {loading && <LoadingSpinner />}
      <Card className="w-full max-w-md bg-complementary text-body border border-accent shadow-md">
        <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">Login</CardTitle>
          <div className="mt-2 sm:mt-0">
            <ThemeToggle />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4">
            <Label htmlFor="role" className="text-body text-sm sm:text-base font-semibold block mb-2">
              Role <span className="text-error">*</span>
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger
                id="role"
                className="w-full bg-complementary text-body border-accent h-10 text-sm sm:text-base"
                aria-label="Select your role"
              >
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent className="bg-complementary text-body text-sm sm:text-base">
                <SelectItem value="siteincharge" className="text-sm sm:text-base">
                  Site Incharge
                </SelectItem>
                <SelectItem value="admin" className="text-sm sm:text-base">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <LoginForm onSubmit={handleLogin} loading={loading} role={role} error={error} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;