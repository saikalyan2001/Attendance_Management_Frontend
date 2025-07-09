// src/components/auth/AuthProvider.jsx
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, setLoading, resetError } from '../../redux/slices/authSlice';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      dispatch(setLoading());
      dispatch(fetchMe());
    } else if (!token && !user) {
      dispatch(resetError());
      dispatch({ type: 'auth/fetchMe/rejected', payload: null });
    }
  }, [dispatch, user]);

  return children;
};

export default AuthProvider;