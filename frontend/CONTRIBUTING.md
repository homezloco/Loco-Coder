# Contributing Guide

This project enforces centralized logging across the codebase for maintainability, observability, and consistent developer experience.

## Logging Conventions

- Use the centralized logger utility at `src/utils/logger.js`.
- Create a namespaced logger per module or feature:
  
  ```js
  import logger from '@/utils/logger';
  const log = logger.ns('api:service');
  
  log.info('Fetching data', { url });
  log.warn('Fallback engaged');
  log.error('Request failed', err);
  log.group('Batch sync');
  log.groupEnd();
  ```

- Supported methods on a namespace logger:
  - `error`, `warn`, `info`, `debug`, `trace`
  - `group`, `groupCollapsed`, `groupEnd`
  - `once(key, fn)` — run the function only once per session

- DO NOT use `.log()` on logger instances. The interface intentionally does not include `log()`; use `.info()` instead.
- DO NOT use raw `console.*` in production code. The ESLint config enforces `no-console: error` except in:
  - `src/utils/logger.js` (the logger implementation)
  - `src/utils/code-execution.js` (captures user code console output)
  - Test files (`**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`)

- Namespaces should be hierarchical and descriptive:
  - `api`, `api:service`, `api:utils:fetch`
  - `api:ai`, `api:ai:model-manager`, `api:ai:pyodide`
  - `auth`, `api:auth:token`
  - `ui:editor`, `ui:chat`, `monitor:health`

- Levels and filtering:
  - Global level defaults to `warn` in production and `info` in development.
  - You can adjust at runtime:
    ```js
    import logger from '@/utils/logger';
    logger.setLevel('debug');
    logger.enable('api:*,auth,ui:*');
    ```

## Linting

- Run lint for the entire repo:
  ```bash
  npm run lint
  ```
- Run lint against the `src` tree only (stricter, recommended locally):
  ```bash
  npm run lint:src
  ```

`lint:src` uses explicit globs to avoid shell expansion issues and fails on any warnings or errors.

## Tests

- Unit tests use Jest and Testing Library. Run:
  ```bash
  npm test
  ```
- Coverage:
  ```bash
  npm run test:coverage
  ```

## Legacy/Backup Files

- Paths matching `*.original.js`, `*.backup.js`, and `*.new` are ignored by ESLint.
- Avoid modifying these files; migrate relevant logic into maintained modules.
