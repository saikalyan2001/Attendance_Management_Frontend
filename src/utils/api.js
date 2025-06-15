import axios from 'axios';

const api = axios.create({
  baseURL: 'https://attendance-management-backend-wgvu.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('API request:', { url: config.url, token: token ? 'Present' : 'Missing' });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
