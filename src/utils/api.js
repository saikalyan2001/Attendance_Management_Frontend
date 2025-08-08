import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000, // 10-second timeout
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
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API response error:', error.message);
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out'));
    }
    return Promise.reject(error.response?.data?.message || error.message || 'API request failed');
  }
);

export default api;