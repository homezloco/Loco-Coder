import { showToast } from '../components/feedback/Toast';
import logger from '../utils/logger';

export const auditFileWithAI = async (fileContent, fileName, settings) => {
  if (!settings.enableAIAudit || !settings.aiAuditEndpoint) {
    return null; // AI audit is not enabled
  }

  try {
    const response = await fetch(settings.aiAuditEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiAuditApiKey}`
      },
      body: JSON.stringify({
        content: fileContent,
        fileName,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`AI audit failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    logger.ns('api:ai:audit').error('AI audit error', { error });
    showToast(`AI audit failed: ${error.message}`, 'error');
    return null;
  }
};

export const getAIAuditSuggestions = (auditResult) => {
  if (!auditResult) return [];
  
  // Process the audit result and return actionable suggestions
  return auditResult.issues?.map(issue => ({
    id: issue.id,
    message: issue.message,
    severity: issue.severity || 'info',
    line: issue.line,
    column: issue.column,
    suggestion: issue.suggestion
  })) || [];
};
