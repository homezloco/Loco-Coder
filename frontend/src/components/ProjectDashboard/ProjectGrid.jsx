import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ProjectCard from './ProjectCard';
import { 
  toggleProjectFavorite,
  deleteProject,
  filterProjects,
  searchProjects,
  saveDashboardPreferences
} from './projectUtils.jsx';

/**
 * Grid layout for displaying project cards with drag-and-drop functionality
 * @param {Array} projects - List of projects to display
 * @param {Function} onSelectProject - Handler for project selection
 * @param {Function} onToggleFavorite - Handler for toggling favorite status
 * @param {Function} onDeleteProject - Handler for project deletion
 * @param {string} selectedProjectId - Currently selected project ID
 * @param {boolean} isDarkMode - Current theme mode
 * @param {Function} onProjectOrderChange - Handler for project order changes
 */
const ProjectGrid = ({ 
  projects, 
  onSelectProject, 
  onToggleFavorite, 
  onDeleteProject, 
  selectedProjectId,
  isDarkMode,
  onProjectOrderChange,
  isCustomizing,
  customizationMode
}) => {
  // State for arranged projects to allow reordering
  const [arrangedProjects, setArrangedProjects] = useState([]);
  
  // Initialize arranged projects when projects change
  useEffect(() => {
    async function loadPreferences() {
      if (projects && projects.length > 0) {
        try {
          // Load custom order using our multi-tiered persistence system
          const { preferences } = await projectUtils.loadDashboardPreferences();
          
          if (preferences?.projectOrder) {
            const orderMap = preferences.projectOrder;
            // Create a new array with the projects in the saved order
            const orderedProjects = [...projects].sort((a, b) => {
              const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : Number.MAX_SAFE_INTEGER;
              const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : Number.MAX_SAFE_INTEGER;
              return orderA - orderB;
            });
            setArrangedProjects(orderedProjects);
            console.log('Loaded project order from persistence layer');
          } else {
            setArrangedProjects([...projects]);
            console.log('No saved project order found, using default order');
          }
        } catch (error) {
          console.error('Error loading project order:', error);
          setArrangedProjects([...projects]);
        }
      } else {
        setArrangedProjects([]);
      }
    }
    
    loadPreferences();
  }, [projects]);

  // Handle the end of a drag operation
  const handleDragEnd = async (result) => {
    if (!result.destination || !isCustomizing) {
      return; // Drop outside the list or not in customization mode
    }

    const items = Array.from(arrangedProjects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setArrangedProjects(items);

    // Create order map for projects
    const orderMap = {};
    items.forEach((project, index) => {
      orderMap[project.id] = index;
    });
    
    // Save preferences using our multi-tiered persistence system
    try {
      const dashboardPreferences = {
        projectOrder: orderMap,
        layoutMode: customizationMode // Also save the current layout mode
      };
      
      const { success, source } = await saveDashboardPreferences(dashboardPreferences);
      console.log(`Dashboard preferences saved successfully: ${success}, Source: ${source}`);
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
    }
    
    // Notify parent component about order change if handler provided
    if (onProjectOrderChange) {
      onProjectOrderChange(items);
    }
  };

  if (!arrangedProjects || arrangedProjects.length === 0) {
    return null;
  }

  // Determine the appropriate layout style based on the customization mode
  const getContainerStyle = (provided, snapshot) => {
    const baseStyle = {
      position: 'relative',
      visibility: 'visible !important',
      opacity: 1,
      minHeight: '200px',
      padding: '10px',
      backgroundColor: snapshot?.isDraggingOver ? (isDarkMode ? '#1e2736' : '#f0f5ff') : 'transparent',
      transition: 'all 0.3s ease',
    };
    
    // Grid layout (default)
    if (!customizationMode || customizationMode === 'grid') {
      return {
        ...baseStyle,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
        marginTop: '20px',
      };
    } 
    // List layout
    else if (customizationMode === 'list') {
      return {
        ...baseStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        marginTop: '20px',
      };
    }
  };

  // Define styles for draggable items based on layout mode
  const getItemStyle = (provided, snapshot, customizationMode) => {
    const baseStyle = {
      ...provided?.draggableProps?.style,
      opacity: snapshot?.isDragging ? 0.8 : 1,
      transition: 'transform 0.2s ease, opacity 0.2s ease',
    };
    
    // Add specific styles for list layout
    if (customizationMode === 'list') {
      return {
        ...baseStyle,
        width: '100%',
      };
    }
    
    return baseStyle;
  };

  return (
    <>
      {/* Display a help message when customization is enabled */}
      {isCustomizing && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          backgroundColor: isDarkMode ? '#1e2736' : '#f0f5ff',
          borderRadius: '6px',
          border: `1px solid ${isDarkMode ? '#3e4c6a' : '#cde0ff'}`,
          textAlign: 'center',
          fontSize: '14px',
          color: isDarkMode ? '#aed4ff' : '#0053b3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <span role="img" aria-hidden="true" style={{fontSize: '20px'}}>✏️</span>
          <div>
            <strong>Dashboard Customization Mode</strong><br />
            Drag and drop cards to rearrange them. Your layout will be saved automatically.
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable 
          droppableId="project-grid" 
          direction={customizationMode === 'list' ? 'vertical' : 'horizontal'}
        >
          {(provided, snapshot) => (
            <div 
              className={`projects-grid projects-${customizationMode || 'grid'}`} 
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={getContainerStyle(provided, snapshot)}
            >
              {arrangedProjects
                .filter(project => {
                  // Ensure project is valid and has required fields
                  const isValid = project && 
                                typeof project === 'object' && 
                                project.id && 
                                project.name &&
                                typeof project.name === 'string';
                  
                  if (!isValid) {
                    console.warn('Skipping invalid project in ProjectGrid:', project);
                    return false;
                  }
                  return true;
                })
                .map((project, index) => (
                  <Draggable 
                    key={project.id} 
                    draggableId={project.id} 
                    index={index}
                    isDragDisabled={!isCustomizing}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={getItemStyle(provided, snapshot, customizationMode)}
                      >
                        <ProjectCard
                          project={{
                            id: project.id,
                            name: project.name || 'Untitled Project',
                            description: project.description || '',
                            language: project.language || 'plaintext',
                            type: project.type || 'other',
                            tags: Array.isArray(project.tags) ? project.tags : [],
                            favorite: !!project.favorite,
                            createdAt: project.createdAt || new Date().toISOString(),
                            lastModified: project.lastModified || new Date().toISOString(),
                            lastAccessed: project.lastAccessed || Date.now(),
                            status: project.status || 'active',
                            thumbnail: project.thumbnail || null,
                            files: Array.isArray(project.files) ? project.files : [],
                            path: project.path || `/${(project.name || 'untitled').toLowerCase().replace(/\s+/g, '-')}`,
                            settings: typeof project.settings === 'object' ? project.settings : {},
                            metadata: typeof project.metadata === 'object' ? project.metadata : {}
                          }}
                          onSelect={onSelectProject}
                          onToggleFavorite={onToggleFavorite}
                          onDelete={onDeleteProject}
                          isDarkMode={isDarkMode}
                          isSelected={selectedProjectId === project.id}
                          isDragging={snapshot.isDragging}
                          isCustomizing={isCustomizing}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
};

export default ProjectGrid;
