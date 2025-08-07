import React, { useContext } from 'react';
import { FaArrowLeft, FaArrowRight, FaHome, FaCode, FaDatabase, FaFileAlt, FaFlask } from 'react-icons/fa';
import { ThemeContext } from '../../contexts/ThemeContext';
import { PreferencesContext } from '../../contexts/PreferencesContext';
import './ProjectFlowNav.css';

/**
 * ProjectFlowNav component provides navigation between different stages of the project workflow
 * Helps create a seamless flow from project creation to code generation
 */
const ProjectFlowNav = ({ 
  currentStage, 
  projectId, 
  onNavigate,
  showLabels = true
}) => {
  // Get theme context
  const { darkMode } = useContext(ThemeContext);
  
  // Get preferences context
  const { preferences, updateUIPreferences } = useContext(PreferencesContext);
  
  // Define workflow stages
  const stages = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome />, path: '/' },
    { id: 'erd', label: 'Database Design', icon: <FaDatabase />, path: `/project/${projectId}/erd` },
    { id: 'api', label: 'API Design', icon: <FaFileAlt />, path: `/project/${projectId}/api` },
    { id: 'test', label: 'Test Design', icon: <FaFlask />, path: `/project/${projectId}/test` },
    { id: 'implementation', label: 'Implementation', icon: <FaCode />, path: `/project/${projectId}/implementation` }
  ];
  
  // Find current stage index
  const currentIndex = stages.findIndex(stage => stage.id === currentStage);
  
  // Handle navigation
  const handleNavigate = (stageId) => {
    // Save last viewed tab in preferences
    updateUIPreferences({ lastViewedTab: stageId });
    
    // Call navigation callback
    if (onNavigate) {
      onNavigate(stageId);
    }
  };
  
  // Get previous and next stages
  const prevStage = currentIndex > 0 ? stages[currentIndex - 1] : null;
  const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  
  return (
    <div className={`project-flow-nav ${darkMode ? 'dark' : 'light'}`}>
      <div className="nav-container">
        {/* Previous button */}
        {prevStage && (
          <button 
            className="nav-button prev"
            onClick={() => handleNavigate(prevStage.id)}
            title={`Go to ${prevStage.label}`}
          >
            <FaArrowLeft className="nav-icon" />
            {showLabels && <span className="nav-label">Back to {prevStage.label}</span>}
          </button>
        )}
        
        {/* Stage indicators */}
        <div className="stage-indicators">
          {stages.map((stage, index) => (
            <div 
              key={stage.id}
              className={`stage-indicator ${currentStage === stage.id ? 'active' : ''}`}
              onClick={() => handleNavigate(stage.id)}
              title={stage.label}
            >
              <div className="stage-icon">{stage.icon}</div>
              {showLabels && <div className="stage-label">{stage.label}</div>}
              {index < stages.length - 1 && <div className="stage-connector" />}
            </div>
          ))}
        </div>
        
        {/* Next button */}
        {nextStage && (
          <button 
            className="nav-button next"
            onClick={() => handleNavigate(nextStage.id)}
            title={`Go to ${nextStage.label}`}
          >
            {showLabels && <span className="nav-label">Continue to {nextStage.label}</span>}
            <FaArrowRight className="nav-icon" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProjectFlowNav;
