// Core API configuration and utilities
// This is now a compatibility layer that re-exports from the new modular structure

// Import from the new modular structure
import { apiClient, API_BASE_URL } from './config/axios-config';
import { 
  TOKEN_STORAGE_KEY,
  USERNAME_STORAGE_KEY,
  FORCE_ONLINE_KEY,
  STORES 
} from './config/constants';

// Re-export everything for backward compatibility
export {
  apiClient,
  API_BASE_URL,
  TOKEN_STORAGE_KEY,
  USERNAME_STORAGE_KEY,
  FORCE_ONLINE_KEY,
  STORES
};

// Export default for legacy code
export default {
  apiClient,
  API_BASE_URL,
  TOKEN_STORAGE_KEY,
  USERNAME_STORAGE_KEY,
  FORCE_ONLINE_KEY,
  STORES
};
