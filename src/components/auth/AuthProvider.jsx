// src/components/auth/AuthProvider.jsx
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, setLoading, resetError } from '../../redux/slices/authSlice';
import LoadingSpinner from '../common/LoadingSpinner';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector(state => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(fetchMe());
    } else {
      dispatch(resetError());
      dispatch({ type: 'auth/fetchMe/rejected', payload: null });
    }
  }, [dispatch]);

  if (isLoading) {
    return <LoadingSpinner message="Checking session..." />;
  }

  return children;
};


export default AuthProvider;