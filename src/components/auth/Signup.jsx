import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { signup } from '../../redux/slices/authSlice';
import { fetchLocations } from '../../features/admin/redux/locationsSlice'; // Updated import
import SignupForm from './SignupForm';
import { ThemeToggle } from '../common/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [role, setRole] = useState('siteincharge');

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      toast.success(`Account created for ${user.name}. Please log in.`);
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSignup = (data) => {
    dispatch(signup(data));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-body text-body">
      <Card className="w-full max-w-md bg-complementary text-body">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Sign Up</CardTitle>
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
          <SignupForm
            onSubmit={handleSignup}
            loading={loading}
            error={error}
            role={role}
          />
          <p className="mt-4 text-center text-body">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
