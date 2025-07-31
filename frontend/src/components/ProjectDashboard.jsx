import React, { useEffect } from 'react';
import Dashboard from './ProjectDashboard/Dashboard';
import '../styles/ProjectDashboard.css';
import '../styles/ProjectConfirmation.css';

/**
 * ProjectDashboard Component
 * 
 * This is a wrapper around the new modular Dashboard component
 * to maintain backward compatibility with existing code.
 * The component guarantees visibility and accessibility, with proper
 * fallbacks consistent with the platform's UI standards.
 * 
 * @param {Object} props - Component props including:
 * @param {boolean} props.isOpen - Whether the dashboard is open
 * @param {function} props.onClose - Function to close the dashboard
 * @param {function} props.onProjectSelect - Function to handle project selection
 * @param {function} props.onProjectCreate - Function to handle project creation
 * @param {boolean} props.authenticated - Whether the user is authenticated
 * @param {string} props.username - Username of the current user
 * @param {Object} props.apiStatus - Status of the API connection
 * @returns {React.Component}
 */
const ProjectDashboard = (props) => {
  // Ensure styles are applied for guaranteed visibility
  useEffect(() => {
    // Create style element for guaranteed dashboard visibility
    const projectDashboardStyle = document.createElement('style');
    projectDashboardStyle.textContent = `
      .project-dashboard {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      .project-dashboard-container {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 999999 !important;
        background-color: rgba(0, 0, 0, 0.8) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        overflow-y: auto !important;
        backdrop-filter: blur(5px);
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(projectDashboardStyle);
    
    // Log for debugging
    console.log('ProjectDashboard wrapper mounted with props:', props);
    
    // Clean up function
    return () => {
      if (document.head.contains(projectDashboardStyle)) {
        document.head.removeChild(projectDashboardStyle);
      }
      console.log('ProjectDashboard wrapper unmounted');
    };
  }, [props]);
  
  // Simply pass all props to the new modular Dashboard component
  return <Dashboard {...props} />;
};

export default ProjectDashboard;
