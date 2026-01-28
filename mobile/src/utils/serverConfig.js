import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_CONFIG_KEY = '@distribution_server_config';

// Default configuration - VPS Production Server
// ============================================
// SINGLE SOURCE OF TRUTH FOR SERVER URL
// ============================================
// To change the server for all new installs, update ONLY this DEFAULT_CONFIG
// For local development, change to your computer's IP address
// To find your IP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
const DEFAULT_CONFIG = {
  host: '147.93.108.205', // VPS Production Server
  port: '5001',
  protocol: 'http'
};

/**
 * Get default server URL (synchronous - for initial load)
 */
export const getDefaultServerUrl = () => {
  return `${DEFAULT_CONFIG.protocol}://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}/api`;
};

/**
 * Get default config (synchronous)
 */
export const getDefaultConfig = () => {
  return { ...DEFAULT_CONFIG };
};

/**
 * Get server configuration from AsyncStorage
 */
export const getServerConfig = async () => {
  try {
    const stored = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading server config:', error);
  }
  return DEFAULT_CONFIG;
};

/**
 * Save server configuration to AsyncStorage
 */
export const setServerConfig = async (config) => {
  try {
    await AsyncStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(config));
    return { success: true };
  } catch (error) {
    console.error('Error saving server config:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get full server URL for API calls
 */
export const getServerUrl = async () => {
  const config = await getServerConfig();
  return `${config.protocol}://${config.host}:${config.port}/api`;
};

/**
 * Check if server is configured (not using default)
 */
export const isServerConfigured = async () => {
  try {
    const stored = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
    return stored !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Reset server configuration to default
 */
export const resetServerConfig = async () => {
  try {
    await AsyncStorage.removeItem(SERVER_CONFIG_KEY);
    return { success: true };
  } catch (error) {
    console.error('Error resetting server config:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test server connection
 */
export const testServerConnection = async (host, port, protocol = 'http') => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${protocol}://${host}:${port}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    let message = 'Connection failed';
    if (error.name === 'AbortError') {
      message = 'Connection timeout - Server not responding';
    } else if (error.message.includes('Network request failed')) {
      message = 'Cannot reach server - Check IP address and WiFi';
    }
    
    return {
      success: false,
      message,
      error: error.message
    };
  }
};
