import axios from 'axios';

const api = axios.create({
  // baseURL: 'http://localhost:5000/api',
  // baseURL: 'http://192.168.0.139:5000/api',
  // baseURL: 'https://ffe5e64fd59c.ngrok-free.app/api',
  // baseURL: 'https://af120174f72c.ngrok-free.app/api',
  // baseURL: 'https://0e0566f045af.ngrok-free.app/api',
  baseURL: 'https://attendance-management-backend-1-roc6.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
    if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Only set Content-Type if not multipart/form-data
  if (!config.headers['Content-Type'] || config.headers['Content-Type'] === 'application/json') {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

export default api;
