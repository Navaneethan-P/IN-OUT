import axios from 'axios';

// Dynamic intranet resolution — works on any machine without reconfiguration.
// In production (single-port serving), the React app is served by the Express
// server itself on port 3000, so window.location points to the right host.
// In development (Vite proxy), the proxy forwards /api to localhost:3000.
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear storage and redirect to login if unauthorized
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);
