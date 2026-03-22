// Server Configuration Utility for Desktop App
// Stores and retrieves central server IP address

const SERVER_CONFIG_KEY = 'serverConfig';
const CONFIG_VERSION_KEY = 'serverConfigVersion';
const CURRENT_CONFIG_VERSION = 8; // Increment this to force reset old configs

// Default configuration
// IMPORTANT: Update this before building for production distribution
// Option 1: Set your production server here for all clients
// Option 2: Leave as localhost and let users configure on first launch

// Production server (VPS) - ACTIVE:
const DEFAULT_CONFIG = {
  host: '147.93.108.205',  // VPS Production Server
  port: '5001',            // Backend API port
  protocol: 'http'         // HTTP
};

const normalizeConfig = (config) => {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const protocol = config.protocol === 'https' ? 'https' : 'http';
  const host = String(config.host || '').trim();
  const port = String(config.port || '').trim();

  if (!host || !port) {
    return null;
  }

  return { protocol, host, port };
};

const isLocalHostConfig = (config) => {
  if (!config || !config.host) return false;
  const host = String(config.host).toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
};

// Local Development Server - uncomment for local testing:
// const DEFAULT_CONFIG = {
//   host: 'localhost',       // Local Development Server
//   port: '5000',            // Backend API port
//   protocol: 'http'         // HTTP (use 'https' if SSL is configured)
// };

// Production example (uncomment and update for production builds):
// const DEFAULT_CONFIG = {
//   host: 'api.yourdomain.com',  // Your production domain or IP
//   port: '443',                  // 443 for HTTPS, 80 for HTTP
//   protocol: 'https'             // Use HTTPS in production
// };

// Check and migrate config version (resets old configs to new defaults)
const checkConfigVersion = () => {
  try {
    const storedVersion = localStorage.getItem(CONFIG_VERSION_KEY);
    if (!storedVersion || parseInt(storedVersion) < CURRENT_CONFIG_VERSION) {
      // Old or no version - reset to new defaults
      localStorage.removeItem(SERVER_CONFIG_KEY);
      localStorage.setItem(CONFIG_VERSION_KEY, CURRENT_CONFIG_VERSION.toString());
      console.log('🔄 Server config reset to new defaults (version upgrade)');
      return;
    }

    // Auto-heal stale local config when app defaults are production backend.
    const stored = localStorage.getItem(SERVER_CONFIG_KEY);
    if (stored) {
      const parsed = normalizeConfig(JSON.parse(stored));
      const defaultIsRemote = !isLocalHostConfig(DEFAULT_CONFIG);
      if (!parsed || (defaultIsRemote && isLocalHostConfig(parsed))) {
        localStorage.removeItem(SERVER_CONFIG_KEY);
        console.log('🔄 Server config reset to production defaults');
      }
    }
  } catch (error) {
    console.error('Error checking config version:', error);
  }
};

// Run version check on module load
checkConfigVersion();

export const getServerConfig = () => {
  try {
    const stored = localStorage.getItem(SERVER_CONFIG_KEY);
    if (stored) {
      const parsed = normalizeConfig(JSON.parse(stored));
      if (parsed) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error reading server config:', error);
  }
  return normalizeConfig(DEFAULT_CONFIG) || DEFAULT_CONFIG;
};

export const setServerConfig = (config) => {
  try {
    const normalized = normalizeConfig(config);
    if (!normalized) {
      return false;
    }
    localStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(normalized));
    return true;
  } catch (error) {
    console.error('Error saving server config:', error);
    return false;
  }
};

export const getServerUrl = () => {
  const config = getServerConfig();
  return `${config.protocol}://${config.host}:${config.port}/api`;
};

export const isServerConfigured = () => {
  const config = getServerConfig();
  return config.host !== 'localhost' || localStorage.getItem(SERVER_CONFIG_KEY) !== null;
};

export const resetServerConfig = () => {
  try {
    localStorage.removeItem(SERVER_CONFIG_KEY);
    return true;
  } catch (error) {
    console.error('Error resetting server config:', error);
    return false;
  }
};

// Test server connection
export const testServerConnection = async (host, port, protocol = 'http') => {
  try {
    const response = await fetch(`${protocol}://${host}:${port}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Connection successful',
        data
      };
    } else {
      return {
        success: false,
        message: `Server returned status ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Connection failed',
      error: error.code
    };
  }
};
