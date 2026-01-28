import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl, getDefaultServerUrl } from '../utils/serverConfig';

// ========================================
// DYNAMIC API CONFIGURATION
// ========================================
// The API base URL is configurable through the Server Settings screen
// Users can change the server IP without rebuilding the app
//
// To change DEFAULT server (for all new installs):
// Edit mobile/src/utils/serverConfig.js -> DEFAULT_CONFIG
//
// To change server at runtime:
// Go to Login Screen → Server Settings

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

// Initialize base URL from DEFAULT_CONFIG (single source of truth)
let initialBaseURL = getDefaultServerUrl();
getApiBaseUrl().then(url => {
  initialBaseURL = url;
  api.defaults.baseURL = url;
});

const api = axios.create({
  baseURL: initialBaseURL,
  timeout: 30000, // 30 second timeout for order sync (backend can be slow)
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
