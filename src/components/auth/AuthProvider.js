// AuthProvider.js
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchMe } from '../../redux/slices/authSlice';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return children;
};

export default AuthProvider;
