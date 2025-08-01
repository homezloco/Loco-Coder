import { ENDPOINTS } from '../../../config';
import { fetchWithTimeout } from '../../utils/fetch';
import { handleApiError } from '../../utils/errors';

/**
 * Service for handling template-related API operations
 */
class TemplateService {
  constructor() {
    // Bind methods
    this.getTemplates = this.getTemplates.bind(this);
    this.getTemplate = this.getTemplate.bind(this);
    this.createTemplate = this.createTemplate.bind(this);
  }

  /**
   * Get all available templates
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} List of templates
   */
  async getTemplates(options = {}) {
    try {
      const response = await fetchWithTimeout(ENDPOINTS.TEMPLATES.BASE, {
        method: 'GET',
        ...options,
      });

      if (!response.ok) {
        throw await handleApiError(response);
      }

      const templates = await response.json();
      return Array.isArray(templates) ? templates : [];
    } catch (error) {
      console.error('[TemplateService] Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Get a specific template by ID
   * @param {string} templateId - The template ID
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Template data
   */
  async getTemplate(templateId, options = {}) {
    if (!templateId) {
      throw new Error('Template ID is required');
    }

    try {
      const response = await fetchWithTimeout(
        `${ENDPOINTS.TEMPLATES.BASE}/${templateId}`,
        {
          method: 'GET',
          ...options,
        }
      );

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return response.json();
    } catch (error) {
      console.error(`[TemplateService] Error fetching template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new template
   * @param {Object} templateData - Template data
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} The created template
   */
  async createTemplate(templateData, options = {}) {
    if (!templateData || !templateData.name) {
      throw new Error('Template name is required');
    }

    try {
      const response = await fetchWithTimeout(ENDPOINTS.TEMPLATES.BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: JSON.stringify(templateData),
        ...options,
      });

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return response.json();
    } catch (error) {
      console.error('[TemplateService] Error creating template:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const templateService = new TemplateService();

export default templateService;
