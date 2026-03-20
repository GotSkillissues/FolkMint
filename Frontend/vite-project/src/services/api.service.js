import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

const clearSessionAndRedirect = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For cookies if using session-based auth
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status, config } = error.response;
      const isAuthEndpoint = config?.url?.startsWith('/auth/');

      // Try refresh token flow for expired/invalid access token on non-auth endpoints.
      if (status === 401 && !isAuthEndpoint && !config?._retry) {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
          clearSessionAndRedirect();
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve) => {
            subscribeTokenRefresh((newToken) => {
              config.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(config));
            });
          });
        }

        config._retry = true;
        isRefreshing = true;

        try {
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const newToken = refreshResponse.data?.token;
          const newRefreshToken = refreshResponse.data?.refreshToken;

          if (!newToken) {
            throw new Error('No access token returned from refresh endpoint');
          }

          localStorage.setItem(TOKEN_KEY, newToken);
          if (newRefreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
          }

          onRefreshed(newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(config);
        } catch (refreshError) {
          clearSessionAndRedirect();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      switch (status) {
        case 401:
          if (!isAuthEndpoint && localStorage.getItem(TOKEN_KEY)) {
            clearSessionAndRedirect();
          }
          break;
        case 403:
          console.error('Forbidden: You do not have permission');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          break;
      }
    } else if (error.request) {
      console.error('Network error: No response received');
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
