// Re-export all components and contexts for easier imports
export { default as App } from './App';

export { default as AppHeader } from './AppHeader';
export { default as AppLayout } from './AppLayout';
export { default as FlexibleOutput } from './FlexibleOutput';
export { default as LayoutPresets } from './LayoutPresets';

// Auth exports
export { AuthProvider, useAuth } from './auth/AuthContext';
export { default as LoginModal } from './LoginModal';

// Layout exports
export { default as MainLayout } from './layout/MainLayout';

// Project exports
export { ProjectProvider, useProject, useProjects } from './project/ProjectContext';

// Settings exports
export { SettingsProvider, useSettings } from './settings/SettingsContext';

// Modular App Components
export { default as AppMain } from './modules/AppMain';

// API exports (if needed)
// export * from './api';
