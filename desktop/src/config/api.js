// ============================================
// CENTRAL API CONFIGURATION
// ============================================
// SINGLE SOURCE OF TRUTH for all backend API URLs
// Update this ONE variable to change backend server for entire app

// Local Development Backend - For Testing New Features
export const BACKEND_URL = 'http://localhost:5000/api';

// Alternative configurations (uncomment to use):
// export const BACKEND_URL = 'http://147.93.108.205:5001/api';  // VPS Production Backend
// export const BACKEND_URL = 'https://api.yourdomain.com/api';  // Production with domain

// Export as default API_BASE_URL for backward compatibility
export const API_BASE_URL = BACKEND_URL;

// Environment detection
const environment = process.env.NODE_ENV || 'development';

const config = {
  API_BASE_URL: BACKEND_URL,
  BACKEND_URL,
  environment
};

export default config;
