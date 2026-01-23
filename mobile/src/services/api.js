import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from '../utils/serverConfig';

// ========================================
// DYNAMIC API CONFIGURATION
// ========================================
// The API base URL is now configurable through the Server Settings screen
// Users can change the server IP without rebuilding the app
//
// DEFAULT CONFIGURATION:
// - Backend IP: localhost (configure via Server Settings)
// - Backend Port: 5000
// - Protocol: HTTP
//
// To change server: Go to Login Screen → Server Settings

let cachedBaseURL = null;

// Get API base URL (cached for performance)
const getApiBaseUrl = async () => {
  if (!cachedBaseURL) {
    cachedBaseURL = await getServerUrl();
  }
  return cachedBaseURL;
};

// Reset cached URL (call when server config changes)
export const resetApiBaseUrl = () => {
  cachedBaseURL = null;
};

// Initialize base URL - LOCALHOST for development
let initialBaseURL = 'http://localhost:5000/api'; // LOCALHOST - configured for local testing
getApiBaseUrl().then(url => {
  initialBaseURL = url;
  api.defaults.baseURL = url;
});

const api = axios.create({
  baseURL: initialBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Update base URL before each request
api.interceptors.request.use(
  async (config) => {
    const baseURL = await getApiBaseUrl();
    config.baseURL = baseURL;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
