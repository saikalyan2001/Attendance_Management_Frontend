import axios from 'axios';

const api = axios.create({
  // baseURL: 'http://localhost:5000/api',
  baseURL: 'https://attendance-management-backend-1-roc6.onrender.com/api',
  timeout: 100000, // 10-second timeout
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Only set Content-Type if not multipart/form-data
    if (
      !config.headers['Content-Type'] ||
      config.headers['Content-Type'] === 'application/json'
    ) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Timeout handling
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({ message: 'Request timed out' });
    }

    // Always reject with a consistent error object
    return Promise.reject({
      message:
        error.response?.data?.message ||
        error.message ||
        'API request failed',
      data: error.response?.data || null,
      status: error.response?.status || null,
    });
  }
);

export default api;
