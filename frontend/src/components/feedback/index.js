// Export all feedback components from a single file for easier imports
import FeedbackContext, { FeedbackProvider, useFeedback } from './FeedbackContext';
import ToastNotification, { TOAST_TYPES } from './ToastNotification';
import SkeletonLoader from './SkeletonLoader';
import OfflineIndicator from './OfflineIndicator';

export {
  FeedbackContext,
  FeedbackProvider,
  useFeedback,
  ToastNotification,
  TOAST_TYPES,
  SkeletonLoader,
  OfflineIndicator
};

// Re-export types for better developer experience
export const ToastTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};
