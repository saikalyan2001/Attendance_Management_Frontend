// AuthProvider.jsx
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, setLoading } from '../../redux/slices/authSlice';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      dispatch(setLoading());
      dispatch(fetchMe());
    } else if (!token && !user) {
      dispatch(setLoading());
      dispatch({ type: 'auth/fetchMe/rejected', payload: 'No token found' });
    }
  }, [dispatch, user]);

  return children;
};

export default AuthProvider;