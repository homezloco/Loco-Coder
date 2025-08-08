/**
 * @jest-environment jsdom
 */
/* eslint-disable no-console */
// Mock logger to avoid console noise and ensure methods exist
// Mock logger for both import paths used by modules under test
jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { ns: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), trace: jest.fn(), group: jest.fn(), groupCollapsed: jest.fn(), groupEnd: jest.fn(), once: jest.fn() }) },
}));
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { ns: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), trace: jest.fn(), group: jest.fn(), groupCollapsed: jest.fn(), groupEnd: jest.fn(), once: jest.fn() }) },
}));

// Drive TOKEN_KEYS via process.env in tests (no module mock needed)

// Polyfill atob for Node before importing module under test
if (typeof global.atob === 'undefined') {
  global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
}

const makeJwt = (payloadObj) => {
  const header = { alg: 'none', typ: 'JWT' };
  const toB64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${toB64(header)}.${toB64(payloadObj)}.`; // signatureless is fine for parsing
};

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const makeStorage = () => {
  const store = new Map();
  return {
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(String(k), String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
};

describe('auth token core flows', () => {
  let setAuthToken, getAuthToken, parseToken, DefaultExport;

  const clearAll = () => {
    localStorage.clear();
    sessionStorage.clear();
    // clear cookie
    document.cookie.split(';').forEach(c => {
      const [k] = c.split('=');
      if (k && k.trim()) {
        document.cookie = `${k.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  };

  beforeEach(async () => {
    clearAll();
    jest.clearAllMocks();
    jest.resetModules();
    process.env.VITE_TOKEN_STORAGE_KEY = 'TEST_AUTH_TOKEN';
    process.env.VITE_TOKEN_REFRESH_KEY = 'TEST_REFRESH_TOKEN';
    delete process.env.VITE_TOKEN_STORAGE_TYPE; // ensure defaults
    delete process.env.VITE_TOKEN_EXPIRES_IN;
    delete process.env.VITE_TOKEN_AUTO_REFRESH;
    delete process.env.VITE_TOKEN_REFRESH_THRESHOLD;
    // Provide deterministic storages for jsdom
    const ls = makeStorage();
    const ss = makeStorage();
    Object.defineProperty(global, 'localStorage', { value: ls, configurable: true });
    Object.defineProperty(global, 'sessionStorage', { value: ss, configurable: true });
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', { value: ls, configurable: true });
      Object.defineProperty(window, 'sessionStorage', { value: ss, configurable: true });
    }
    // Re-import a fresh copy of the module under test for each test to reset internal state (ESM friendly)
    await jest.isolateModulesAsync(async () => {
      const mod = await import('../token.js');
      setAuthToken = mod.setAuthToken;
      getAuthToken = mod.getAuthToken;
      parseToken = mod.parseToken;
      DefaultExport = mod.default;
    });
  });

  test('set/get/clear with remember=true uses localStorage', () => {
    const futureExp = Math.floor((Date.now() + 60_000) / 1000);
    const token = makeJwt({ sub: 'u1', exp: futureExp });

    // set
    expect(setAuthToken(token, true)).toBe(true);

    // get
    expect(getAuthToken()).toBe(token);

    // validate storage
    expect(localStorage.getItem('TEST_AUTH_TOKEN')).toBe(token);
    expect(sessionStorage.getItem('TEST_AUTH_TOKEN')).toBeNull();
    // Cookie may be ignored in jsdom due to Secure attribute; don't assert cookie value

    // clear via default export to cover default API too
    expect(DefaultExport.clearAuthToken()).toBe(true);
    expect(getAuthToken()).toBe('');
    expect(localStorage.getItem('TEST_AUTH_TOKEN')).toBeNull();
    // Cookie cleared is environment-dependent in jsdom; skip strict assert
  });

  test('set/get with remember=false uses sessionStorage', () => {
    const futureExp = Math.floor((Date.now() + 60_000) / 1000);
    const token = makeJwt({ sub: 'u2', exp: futureExp });

    expect(setAuthToken(token, false)).toBe(true);
    expect(getAuthToken()).toBe(token);

    expect(sessionStorage.getItem('TEST_AUTH_TOKEN')).toBe(token);
    // local should be untouched
    expect(localStorage.getItem('TEST_AUTH_TOKEN')).toBeNull();
    // Cookie behavior is environment-dependent in jsdom; skip strict assert
  });

  test('expired token is not returned by getAuthToken', () => {
    const pastExp = Math.floor((Date.now() - 60_000) / 1000);
    const expired = makeJwt({ exp: pastExp });

    // direct storage write to simulate external set
    localStorage.setItem('TEST_AUTH_TOKEN', expired);

    const got = getAuthToken();
    expect(got).toBe('');
  });

  test('parseToken handles invalid input gracefully', () => {
    expect(parseToken('')).toBeNull();
    expect(parseToken('abc.def')).toBeNull();
  });
});
