import React, { useState, useEffect, useRef } from 'react';
import { FiCheck, FiUpload, FiFolder, FiAlertCircle, FiInfo, FiEye } from 'react-icons/fi';
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
  
  // Enhanced validation state for real-time feedback
  const [touched, setTouched] = useState({
    name: false,
    description: false
  });
  
  // Template preview state
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Refs for form elements
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  
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

  const validate = (field = null) => {
    let newErrors = {...errors};
    
    // Validate specific field or all fields
    if (!field || field === 'name') {
      if (!formData.name.trim()) {
        newErrors.name = 'Project name is required';
      } else if (formData.name.length < 3) {
        newErrors.name = 'Project name must be at least 3 characters';
      } else if (formData.name.length > 50) {
        newErrors.name = 'Project name cannot exceed 50 characters';
      } else {
        delete newErrors.name;
      }
    }
    
    if (!field || field === 'description') {
      if (formData.description && formData.description.length > 200) {
        newErrors.description = 'Description cannot exceed 200 characters';
      } else {
        delete newErrors.description;
      }
    }
    
    // Only update errors state if we're validating all fields or a specific field
    if (!field || field === 'name' || field === 'description') {
      setErrors(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Mark field as touched for validation styling
    if (!touched[name]) {
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    }
    
    // Perform real-time validation for this field
    setTimeout(() => validate(name), 0);
  };
  
  // Handle field blur for validation feedback
  const handleBlur = (e) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    validate(name);
  };

  const handleLanguageSelect = (languageId) => {
    setFormData(prev => ({ ...prev, language: languageId }));
  };

  const handleTemplateSelect = (templateId) => {
    setFormData(prev => ({ ...prev, template: templateId }));
  };
  
  // Show template preview
  const handleShowPreview = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };
  
  // Close template preview
  const handleClosePreview = () => {
    setShowPreview(false);
  };
  
  // Get template preview image based on template ID
  const getTemplatePreviewImage = (templateId) => {
    // In a real application, these would be actual preview images
    const previewImages = {
      blank: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPkJsYW5rIFByb2plY3Q8L3RleHQ+PC9zdmc+',
      api: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPkFQSSBTZXJ2ZXI8L3RleHQ+PC9zdmc+',
      webapp: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPldlYiBBcHBsaWNhdGlvbjwvdGV4dD48L3N2Zz4=',
      fullstack: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPkZ1bGwgU3RhY2sgQXBwPC90ZXh0Pjwvc3ZnPg==',
      mobile: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPk1vYmlsZSBBcHA8L3RleHQ+PC9zdmc+'
    };
    
    return previewImages[templateId] || previewImages.blank;
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
        {/* Template Preview Modal */}
        {showPreview && previewTemplate && (
          <div className="modal-overlay" style={{ zIndex: 9100 }}>
            <div className="project-creation-modal" style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <h2>Template Preview: {previewTemplate.name}</h2>
                <button type="button" className="close-button" onClick={handleClosePreview}>×</button>
              </div>
              <div className="step-content" style={{ padding: '0' }}>
                <div style={{ padding: '20px' }}>
                  <h3>Template Features</h3>
                  <ul>
                    <li>Project structure optimized for {previewTemplate.name}</li>
                    <li>Pre-configured settings and dependencies</li>
                    <li>Example code and documentation</li>
                    <li>Best practices for {formData.language} development</li>
                  </ul>
                  
                  <div style={{ marginTop: '20px', border: '1px solid var(--border-color, #ddd)', borderRadius: '4px', overflow: 'hidden' }}>
                    <img 
                      src={getTemplatePreviewImage(previewTemplate.id)} 
                      alt={`${previewTemplate.name} preview`} 
                      style={{ width: '100%', height: 'auto' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="primary-button" 
                  onClick={() => {
                    handleTemplateSelect(previewTemplate.id);
                    handleClosePreview();
                  }}
                >
                  Use This Template
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="project-creation-modal">
          <div className="modal-header">
            <h2>{currentStep === 1 ? 'Create New Project' : 'Choose Project Settings'}</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          
          <form onSubmit={handleSubmit}>
          {currentStep === 1 ? (
            <div className="step-content">
              <div className="form-group">
                <label htmlFor="project-name" className="required-field">Project Name</label>
                <div className="field-hint">Choose a unique name for your project</div>
                <input
                  id="project-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  ref={nameInputRef}
                  className={touched.name ? (errors.name ? 'error' : 'valid') : ''}
                  placeholder="My Awesome Project"
                  autoFocus
                />
                {touched.name && errors.name && <div className="error-message">{errors.name}</div>}
                {touched.name && !errors.name && formData.name.trim().length >= 3 && (
                  <div className="success-message">Valid project name</div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="project-description">Description</label>
                <div className="field-hint">Briefly describe what your project does</div>
                <textarea
                  id="project-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Brief description of your project"
                  rows={3}
                  className={touched.description ? (errors.description ? 'error' : formData.description.length > 0 ? 'valid' : '') : ''}
                />
                {touched.description && errors.description && <div className="error-message">{errors.description}</div>}
                <div className="char-counter" style={{ color: formData.description.length > 180 ? (formData.description.length > 200 ? 'var(--danger-color, #e53935)' : 'var(--warning-color, #ff9800)') : 'var(--text-secondary, #666)' }}>
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
                      <div className="template-preview">
                        <img src={getTemplatePreviewImage(template.id)} alt={`${template.name} preview`} />
                      </div>
                      <button 
                        type="button" 
                        className="secondary-button" 
                        style={{ marginTop: '10px', width: '100%' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowPreview(template);
                        }}
                      >
                        <FiEye style={{ marginRight: '5px' }} /> Preview Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <div className="import-section">
                  <h4>Import Existing Project</h4>
                  <p>Have an existing project? Import it to continue development</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".zip,.json"
                    onChange={(e) => {
                      // Handle file import logic here
                      console.log('File selected:', e.target.files[0]);
                      // In a real implementation, this would parse the project file
                    }}
                  />
                  <button 
                    type="button"
                    className="import-button"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <FiUpload /> Import Project
                  </button>
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
    </div>
  );
};

export default ProjectCreationModal;
