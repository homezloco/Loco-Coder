import React, { useState, useEffect } from 'react';
import '../styles/ProjectCreationModal.css';

/**
 * ProjectCreationModal component - Form for creating new projects
 * Features:
 * - Project name, description, language selection
 * - Template options
 * - Validation
 * - Backend integration with fallbacks
 */
const ProjectCreationModal = ({ 
  isOpen, 
  onClose, 
  onCreateProject, 
  apiStatus 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'python',
    template: 'blank',
    isPublic: false,
    tags: []
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [tagInput, setTagInput] = useState('');
  
  // Available languages with icons
  const languages = [
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'javascript', name: 'JavaScript', icon: '🟨' },
    { id: 'react', name: 'React', icon: '⚛️' },
    { id: 'node', name: 'Node.js', icon: '🟢' },
    { id: 'cpp', name: 'C++', icon: '🔵' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'go', name: 'Go', icon: '🔹' },
    { id: 'rust', name: 'Rust', icon: '⚙️' }
  ];
  
  // Project templates
  const templates = [
    { id: 'blank', name: 'Blank Project', description: 'Start with a clean slate' },
    { id: 'api', name: 'API Server', description: 'FastAPI backend with authentication' },
    { id: 'webapp', name: 'Web Application', description: 'React frontend with API integration' },
    { id: 'fullstack', name: 'Full Stack App', description: 'React frontend with Python backend' },
    { id: 'mobile', name: 'Mobile App', description: 'React Native with backend integration' }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        language: 'python',
        template: 'blank',
        isPublic: false,
        tags: []
      });
      setErrors({});
      setCurrentStep(1);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validate = () => {
    let newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }
    
    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description cannot exceed 200 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear the specific error when user corrects it
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleLanguageSelect = (languageId) => {
    setFormData(prev => ({ ...prev, language: languageId }));
  };

  const handleTemplateSelect = (templateId) => {
    setFormData(prev => ({ ...prev, template: templateId }));
  };

  const handleTagAdd = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, tagInput.trim()] 
      }));
      setTagInput('');
    }
  };

  const handleTagRemove = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const nextStep = () => {
    if (currentStep === 1 && validate()) {
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare project data
      const projectData = {
        ...formData,
        created: new Date().toISOString(),
        id: `proj_${Date.now()}`,
        lastModified: new Date().toISOString()
      };
      
      // Try to create project through API if online
      if (apiStatus.status === 'online') {
        try {
          // Primary API attempt
          // const response = await api.createProject(projectData);
          // onCreateProject(response.data);
          
          // For now, simulate API call
          await new Promise(resolve => setTimeout(resolve, 800));
          onCreateProject(projectData);
          
        } catch (apiError) {
          console.warn('Error creating project via primary API:', apiError);
          
          // Try fallback API
          try {
            // const fallbackResponse = await fallbackApi.createProject(projectData);
            // onCreateProject(fallbackResponse.data);
            
            // Simulate fallback API
            await new Promise(resolve => setTimeout(resolve, 500));
            onCreateProject(projectData);
            
          } catch (fallbackError) {
            console.error('Fallback API also failed:', fallbackError);
            
            // Use local fallback
            onCreateProject(projectData);
          }
        }
      } else {
        // Offline mode - use local fallbacks
        console.log('API offline, using local fallback for project creation');
        onCreateProject(projectData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
      setErrors(prev => ({ 
        ...prev, 
        submit: 'Failed to create project. Please try again.' 
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="project-creation-modal">
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {currentStep === 1 ? (
            <div className="step-content">
              <div className="form-group">
                <label htmlFor="project-name">Project Name *</label>
                <input
                  id="project-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="My Awesome Project"
                  className={errors.name ? 'error' : ''}
                  autoFocus
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="project-description">Description</label>
                <textarea
                  id="project-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of your project"
                  rows={3}
                  className={errors.description ? 'error' : ''}
                />
                {errors.description && <div className="error-message">{errors.description}</div>}
                <div className="char-counter">
                  {formData.description.length}/200
                </div>
              </div>
              
              <div className="form-group">
                <label>Tags</label>
                <div className="tag-input-container">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tags and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTagAdd();
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={handleTagAdd}
                    className="tag-add-button"
                  >
                    Add
                  </button>
                </div>
                <div className="tags-container">
                  {formData.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                      <button 
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    id="project-public"
                    type="checkbox"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="project-public">Make project public</label>
                </div>
              </div>
            </div>
          ) : (
            <div className="step-content">
              <div className="form-group">
                <label>Programming Language</label>
                <div className="language-options">
                  {languages.map(lang => (
                    <div
                      key={lang.id}
                      className={`language-option ${formData.language === lang.id ? 'selected' : ''}`}
                      onClick={() => handleLanguageSelect(lang.id)}
                    >
                      <span className="language-icon">{lang.icon}</span>
                      <span className="language-name">{lang.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label>Project Template</label>
                <div className="template-options">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className={`template-option ${formData.template === template.id ? 'selected' : ''}`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <h4>{template.name}</h4>
                      <p>{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="modal-footer">
            {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}
            
            <div className="step-indicator">
              <span className={`step ${currentStep === 1 ? 'active' : ''}`}></span>
              <span className={`step ${currentStep === 2 ? 'active' : ''}`}></span>
            </div>
            
            <div className="button-group">
              {currentStep === 2 && (
                <button 
                  type="button" 
                  className="secondary-button" 
                  onClick={prevStep}
                  disabled={isSubmitting}
                >
                  Back
                </button>
              )}
              
              {currentStep === 1 ? (
                <button 
                  type="button" 
                  className="primary-button" 
                  onClick={nextStep}
                >
                  Next
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="primary-button" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectCreationModal;
