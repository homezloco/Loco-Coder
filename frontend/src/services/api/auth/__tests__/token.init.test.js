/**
 * Ensures the auth token module loads without throwing during module init.
 */

// Mock logger to avoid touching real console and to ensure ns().info exists
jest.mock('../../../../utils/logger', () => ({
  __esModule: true,
  default: {
    ns: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      group: jest.fn(),
      groupCollapsed: jest.fn(),
      groupEnd: jest.fn(),
    }),
  },
}));

// Mock config to avoid import.meta.env and window dependencies
jest.mock('../../config', () => ({
  __esModule: true,
  API_BASE_URL: '/api',
  FALLBACK_URLS: [],
  ENDPOINTS: {},
  TOKEN_KEYS: {
    storageKey: 'auth_token',
    refreshKey: 'refresh_token',
    expiresIn: 604800,
    storageType: 'localStorage',
    autoRefresh: true,
    refreshThreshold: 300,
    cookieOptions: { path: '/', secure: false, sameSite: 'lax', maxAge: 604800 },
  },
  CACHE_CONFIG: { DEFAULT_TTL: 300000, CLEANUP_INTERVAL: 60000, ENABLED: true },
}));

// Polyfill atob for Node test environment if missing
if (typeof global.atob === 'undefined') {
  // eslint-disable-next-line no-undef
  global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
}

// JSDOM should provide localStorage/sessionStorage/document; ensure they exist
beforeAll(() => {
  expect(window).toBeDefined();
  expect(global.localStorage).toBeDefined();
  expect(global.sessionStorage).toBeDefined();
  expect(global.document).toBeDefined();
});

describe('auth token module init', () => {
  test('does not throw on import', async () => {
    await expect(import('../token.js')).resolves.toBeDefined();
  });
});
