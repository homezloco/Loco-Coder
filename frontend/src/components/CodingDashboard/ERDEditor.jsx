import React, { useState, useEffect, useRef } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiLink, FiUnlink, FiGrid, FiDownload, FiUpload, FiKey } from 'react-icons/fi';
import './ERDEditor.css';

/**
 * ERDEditor Component
 * 
 * A visual editor for creating Entity Relationship Diagrams (ERDs)
 * Allows users to define entities, attributes, and relationships
 */
const ERDEditor = ({ 
  initialEntities = [], 
  initialRelationships = [],
  onChange,
  isDarkMode = false
}) => {
  // State for entities and relationships
  const [entities, setEntities] = useState(initialEntities);
  const [relationships, setRelationships] = useState(initialRelationships);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  const [isCreatingRelationship, setIsCreatingRelationship] = useState(false);
  const [relationshipStart, setRelationshipStart] = useState(null);
  const [hoveredEntity, setHoveredEntity] = useState(null);
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [newEntityData, setNewEntityData] = useState({
    name: '',
    attributes: []
  });
  const [newAttributeData, setNewAttributeData] = useState({
    name: '',
    type: 'string',
    isPrimary: false,
    isRequired: false
  });
  const [isAddingAttribute, setIsAddingAttribute] = useState(false);
  const [draggedEntity, setDraggedEntity] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 2000, height: 1500 });
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isGridVisible, setIsGridVisible] = useState(true);
  
  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Data types for attributes
  const dataTypes = [
    'string', 'text', 'integer', 'float', 'boolean', 
    'date', 'datetime', 'time', 'json', 'uuid', 
    'binary', 'enum', 'array', 'object'
  ];
  
  // Relationship types
  const relationshipTypes = [
    { value: 'one-to-one', label: '1:1', description: 'One-to-One' },
    { value: 'one-to-many', label: '1:N', description: 'One-to-Many' },
    { value: 'many-to-one', label: '1:N', description: 'Many-to-One' },
    { value: 'many-to-many', label: 'N:M', description: 'Many-to-Many' }
  ];
  
  // Initialize with default entities if none provided
  useEffect(() => {
    if (initialEntities.length === 0) {
      setEntities([
        {
          id: 'user',
          name: 'User',
          x: 200,
          y: 150,
          width: 220,
          height: 200,
          attributes: [
            { name: 'id', type: 'uuid', isPrimary: true, isRequired: true },
            { name: 'username', type: 'string', isPrimary: false, isRequired: true },
            { name: 'email', type: 'string', isPrimary: false, isRequired: true },
            { name: 'created_at', type: 'datetime', isPrimary: false, isRequired: true }
          ]
        }
      ]);
    } else {
      setEntities(initialEntities);
    }
    
    if (initialRelationships.length === 0) {
      setRelationships([]);
    } else {
      setRelationships(initialRelationships);
    }
  }, [initialEntities, initialRelationships]);
  
  // Notify parent component when entities or relationships change
  useEffect(() => {
    if (onChange) {
      onChange({ entities, relationships });
    }
  }, [entities, relationships, onChange]);
  
  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.max(2000, width),
          height: Math.max(1500, height)
        });
      }
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);
  
  // Add a new entity
  const addEntity = () => {
    if (!newEntityData.name) return;
    
    const newEntity = {
      id: newEntityData.name.toLowerCase().replace(/\s+/g, '_'),
      name: newEntityData.name,
      x: 200 + (entities.length * 50) % 400,
      y: 150 + (entities.length * 50) % 300,
      width: 220,
      height: 200,
      attributes: [
        { name: 'id', type: 'uuid', isPrimary: true, isRequired: true }
      ]
    };
    
    setEntities([...entities, newEntity]);
    setNewEntityData({ name: '', attributes: [] });
    setIsAddingEntity(false);
    setSelectedEntity(newEntity.id);
  };
  
  // Remove an entity
  const removeEntity = (entityId) => {
    // Remove entity
    const updatedEntities = entities.filter(entity => entity.id !== entityId);
    
    // Remove relationships connected to this entity
    const updatedRelationships = relationships.filter(
      rel => rel.source !== entityId && rel.target !== entityId
    );
    
    setEntities(updatedEntities);
    setRelationships(updatedRelationships);
    
    if (selectedEntity === entityId) {
      setSelectedEntity(null);
    }
  };
  
  // Add attribute to an entity
  const addAttribute = (entityId) => {
    if (!newAttributeData.name) return;
    
    const updatedEntities = entities.map(entity => {
      if (entity.id === entityId) {
        return {
          ...entity,
          attributes: [...entity.attributes, { ...newAttributeData }],
          height: entity.height + 30 // Increase height to accommodate new attribute
        };
      }
      return entity;
    });
    
    setEntities(updatedEntities);
    setNewAttributeData({
      name: '',
      type: 'string',
      isPrimary: false,
      isRequired: false
    });
    setIsAddingAttribute(false);
  };
  
  // Remove attribute from an entity
  const removeAttribute = (entityId, attributeName) => {
    const updatedEntities = entities.map(entity => {
      if (entity.id === entityId) {
        return {
          ...entity,
          attributes: entity.attributes.filter(attr => attr.name !== attributeName),
          height: entity.height - 30 // Decrease height when removing attribute
        };
      }
      return entity;
    });
    
    setEntities(updatedEntities);
  };
  
  // Start creating a relationship
  const startRelationship = (entityId) => {
    setIsCreatingRelationship(true);
    setRelationshipStart(entityId);
  };
  
  // Complete relationship creation
  const completeRelationship = (targetEntityId) => {
    if (relationshipStart && relationshipStart !== targetEntityId) {
      const newRelationship = {
        id: `${relationshipStart}_to_${targetEntityId}`,
        source: relationshipStart,
        target: targetEntityId,
        type: 'one-to-many', // Default relationship type
        sourceField: '',
        targetField: ''
      };
      
      setRelationships([...relationships, newRelationship]);
    }
    
    setIsCreatingRelationship(false);
    setRelationshipStart(null);
  };
  
  // Update relationship type
  const updateRelationshipType = (relationshipId, newType) => {
    const updatedRelationships = relationships.map(rel => {
      if (rel.id === relationshipId) {
        return { ...rel, type: newType };
      }
      return rel;
    });
    
    setRelationships(updatedRelationships);
  };
  
  // Remove a relationship
  const removeRelationship = (relationshipId) => {
    const updatedRelationships = relationships.filter(rel => rel.id !== relationshipId);
    setRelationships(updatedRelationships);
    
    if (selectedRelationship === relationshipId) {
      setSelectedRelationship(null);
    }
  };
  
  // Handle entity selection
  const handleEntityClick = (entityId, event) => {
    event.stopPropagation();
    
    if (isCreatingRelationship) {
      completeRelationship(entityId);
    } else {
      setSelectedEntity(entityId === selectedEntity ? null : entityId);
      setSelectedRelationship(null);
    }
  };
  
  // Handle relationship selection
  const handleRelationshipClick = (relationshipId, event) => {
    event.stopPropagation();
    setSelectedRelationship(relationshipId === selectedRelationship ? null : relationshipId);
    setSelectedEntity(null);
  };
  
  // Handle entity drag start
  const handleEntityDragStart = (entityId, event) => {
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    
    setDraggedEntity(entityId);
    setDragOffset({ x: offsetX, y: offsetY });
    setSelectedEntity(entityId);
  };
  
  // Handle entity drag
  const handleCanvasMouseMove = (event) => {
    if (!draggedEntity) return;
    
    const entity = entities.find(e => e.id === draggedEntity);
    if (!entity) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - containerRect.left - dragOffset.x + viewportOffset.x;
    const y = event.clientY - containerRect.top - dragOffset.y + viewportOffset.y;
    
    // Update entity position
    const updatedEntities = entities.map(e => {
      if (e.id === draggedEntity) {
        return { ...e, x, y };
      }
      return e;
    });
    
    setEntities(updatedEntities);
  };
  
  // Handle entity drag end
  const handleCanvasMouseUp = () => {
    setDraggedEntity(null);
  };
  
  // Handle canvas click (deselect)
  const handleCanvasClick = () => {
    setSelectedEntity(null);
    setSelectedRelationship(null);
    setIsAddingEntity(false);
    setIsAddingAttribute(false);
  };
  
  // Export ERD as JSON
  const exportERD = () => {
    const data = { entities, relationships };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erd.json';
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  // Import ERD from JSON
  const importERD = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.entities && Array.isArray(data.entities)) {
          setEntities(data.entities);
        }
        if (data.relationships && Array.isArray(data.relationships)) {
          setRelationships(data.relationships);
        }
      } catch (error) {
        console.error('Error parsing ERD file:', error);
        // TODO: Show error message to user
      }
    };
    reader.readAsText(file);
  };
  
  // Render entity
  const renderEntity = (entity) => {
    const isSelected = selectedEntity === entity.id;
    
    return (
      <div
        key={entity.id}
        className={`erd-entity ${isSelected ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
        style={{
          left: entity.x,
          top: entity.y,
          width: entity.width,
          minHeight: entity.height
        }}
        onClick={(e) => handleEntityClick(entity.id, e)}
        onMouseDown={(e) => handleEntityDragStart(entity.id, e)}
        onMouseEnter={() => setHoveredEntity(entity.id)}
        onMouseLeave={() => setHoveredEntity(null)}
      >
        <div className="erd-entity-header">
          <h3>{entity.name}</h3>
          <div className="erd-entity-actions">
            {isSelected && (
              <>
                <button 
                  className="erd-icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingAttribute(true);
                  }}
                >
                  <FiPlus />
                </button>
                <button 
                  className="erd-icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRelationship(entity.id);
                  }}
                >
                  <FiLink />
                </button>
                <button 
                  className="erd-icon-button delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEntity(entity.id);
                  }}
                >
                  <FiTrash2 />
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="erd-entity-attributes">
          {entity.attributes.map((attr, index) => (
            <div 
              key={`${entity.id}-${attr.name}`} 
              className={`erd-attribute ${attr.isPrimary ? 'primary' : ''} ${attr.isRequired ? 'required' : ''}`}
            >
              <div className="erd-attribute-name">
                {attr.isPrimary && <span className="erd-key-icon">🔑</span>}
                {attr.name}
              </div>
              <div className="erd-attribute-type">
                {attr.type}
                {isSelected && (
                  <button 
                    className="erd-icon-button delete-attr"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttribute(entity.id, attr.name);
                    }}
                  >
                    <FiTrash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {isSelected && isAddingAttribute && (
            <div className="erd-add-attribute">
              <input
                type="text"
                placeholder="Attribute name"
                value={newAttributeData.name}
                onChange={(e) => setNewAttributeData({
                  ...newAttributeData,
                  name: e.target.value
                })}
                onClick={(e) => e.stopPropagation()}
              />
              <select
                value={newAttributeData.type}
                onChange={(e) => setNewAttributeData({
                  ...newAttributeData,
                  type: e.target.value
                })}
                onClick={(e) => e.stopPropagation()}
              >
                {dataTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <div className="erd-attribute-options">
                <label>
                  <input
                    type="checkbox"
                    checked={newAttributeData.isPrimary}
                    onChange={(e) => setNewAttributeData({
                      ...newAttributeData,
                      isPrimary: e.target.checked
                    })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  Primary
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={newAttributeData.isRequired}
                    onChange={(e) => setNewAttributeData({
                      ...newAttributeData,
                      isRequired: e.target.checked
                    })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  Required
                </label>
              </div>
              <div className="erd-attribute-actions">
                <button 
                  className="erd-button add"
                  onClick={(e) => {
                    e.stopPropagation();
                    addAttribute(entity.id);
                  }}
                >
                  Add
                </button>
                <button 
                  className="erd-button cancel"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingAttribute(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render relationship
  const renderRelationship = (relationship) => {
    const sourceEntity = entities.find(e => e.id === relationship.source);
    const targetEntity = entities.find(e => e.id === relationship.target);
    
    if (!sourceEntity || !targetEntity) return null;
    
    // Calculate connection points
    const sourceX = sourceEntity.x + sourceEntity.width / 2;
    const sourceY = sourceEntity.y + sourceEntity.height / 2;
    const targetX = targetEntity.x + targetEntity.width / 2;
    const targetY = targetEntity.y + targetEntity.height / 2;
    
    // Calculate line path
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const angle = Math.atan2(dy, dx);
    
    // Adjust connection points to entity borders
    const sourceRadius = Math.min(sourceEntity.width, sourceEntity.height) / 2;
    const targetRadius = Math.min(targetEntity.width, targetEntity.height) / 2;
    
    const adjustedSourceX = sourceX + Math.cos(angle) * sourceRadius;
    const adjustedSourceY = sourceY + Math.sin(angle) * sourceRadius;
    const adjustedTargetX = targetX - Math.cos(angle) * targetRadius;
    const adjustedTargetY = targetY - Math.sin(angle) * targetRadius;
    
    // Calculate control points for curved line
    const controlPointOffset = 50;
    const controlPoint1X = adjustedSourceX + Math.cos(angle) * controlPointOffset;
    const controlPoint1Y = adjustedSourceY + Math.sin(angle) * controlPointOffset;
    const controlPoint2X = adjustedTargetX - Math.cos(angle) * controlPointOffset;
    const controlPoint2Y = adjustedTargetY - Math.sin(angle) * controlPointOffset;
    
    // Path for the relationship line
    const path = `M ${adjustedSourceX} ${adjustedSourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${adjustedTargetX} ${adjustedTargetY}`;
    
    // Calculate midpoint for relationship type label
    const midX = (adjustedSourceX + adjustedTargetX) / 2;
    const midY = (adjustedSourceY + adjustedTargetY) / 2;
    
    const isSelected = selectedRelationship === relationship.id;
    
    // Find relationship type label
    const relType = relationshipTypes.find(rt => rt.value === relationship.type) || relationshipTypes[0];
    
    return (
      <g key={relationship.id} className={`erd-relationship ${isSelected ? 'selected' : ''}`}>
        <path
          d={path}
          className="erd-relationship-line"
          onClick={(e) => handleRelationshipClick(relationship.id, e)}
        />
        
        {/* Arrowhead */}
        <marker
          id={`arrowhead-${relationship.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
        
        {/* Relationship type label */}
        <foreignObject
          x={midX - 20}
          y={midY - 15}
          width="40"
          height="30"
          className="erd-relationship-label"
          onClick={(e) => handleRelationshipClick(relationship.id, e)}
        >
          <div className={`relationship-type ${isDarkMode ? 'dark' : ''}`}>
            {relType.label}
          </div>
        </foreignObject>
        
        {/* Relationship actions when selected */}
        {isSelected && (
          <foreignObject
            x={midX + 25}
            y={midY - 15}
            width="80"
            height="30"
          >
            <div className={`relationship-actions ${isDarkMode ? 'dark' : ''}`}>
              <button 
                className="erd-icon-button"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = relationshipTypes.findIndex(rt => rt.value === relationship.type);
                  const nextIndex = (currentIndex + 1) % relationshipTypes.length;
                  updateRelationshipType(relationship.id, relationshipTypes[nextIndex].value);
                }}
              >
                <FiEdit2 size={14} />
              </button>
              <button 
                className="erd-icon-button delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRelationship(relationship.id);
                }}
              >
                <FiUnlink size={14} />
              </button>
            </div>
          </foreignObject>
        )}
      </g>
    );
  };
  
  // Render temporary relationship line when creating
  const renderTemporaryRelationship = () => {
    if (!isCreatingRelationship || !relationshipStart) return null;
    
    const sourceEntity = entities.find(e => e.id === relationshipStart);
    if (!sourceEntity) return null;
    
    const sourceX = sourceEntity.x + sourceEntity.width / 2;
    const sourceY = sourceEntity.y + sourceEntity.height / 2;
    
    // Use mouse position or hovered entity position
    let targetX, targetY;
    
    if (hoveredEntity && hoveredEntity !== relationshipStart) {
      const targetEntity = entities.find(e => e.id === hoveredEntity);
      if (targetEntity) {
        targetX = targetEntity.x + targetEntity.width / 2;
        targetY = targetEntity.y + targetEntity.height / 2;
      }
    } else {
      // Use mouse position relative to canvas
      const containerRect = containerRef.current.getBoundingClientRect();
      targetX = (lastMousePosition?.x || 0) - containerRect.left + viewportOffset.x;
      targetY = (lastMousePosition?.y || 0) - containerRect.top + viewportOffset.y;
    }
    
    return (
      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        className="erd-temp-relationship"
        strokeDasharray="5,5"
      />
    );
  };
  
  // Track mouse position for temporary relationship line
  const [lastMousePosition, setLastMousePosition] = useState(null);
  
  const handleMouseMove = (e) => {
    setLastMousePosition({ x: e.clientX, y: e.clientY });
    handleCanvasMouseMove(e);
  };
  
  return (
    <div 
      ref={containerRef} 
      className={`erd-editor-container ${isDarkMode ? 'dark' : ''}`}
    >
      {/* Toolbar */}
      <div className="erd-toolbar">
        <button 
          className="erd-toolbar-button"
          onClick={() => setIsAddingEntity(true)}
        >
          <FiPlus /> Add Entity
        </button>
        <button 
          className="erd-toolbar-button"
          onClick={exportERD}
        >
          <FiDownload /> Export
        </button>
        <label className="erd-toolbar-button">
          <FiUpload /> Import
          <input 
            type="file" 
            accept=".json" 
            style={{ display: 'none' }} 
            onChange={importERD} 
          />
        </label>
        <button 
          className={`erd-toolbar-button ${isGridVisible ? 'active' : ''}`}
          onClick={() => setIsGridVisible(!isGridVisible)}
        >
          <FiGrid /> Grid
        </button>
      </div>
      
      {/* Canvas */}
      <div 
        className={`erd-canvas ${isGridVisible ? 'grid' : ''}`}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleCanvasMouseUp}
        style={{
          width: canvasSize.width,
          height: canvasSize.height
        }}
      >
        {/* SVG for relationships */}
        <svg 
          ref={canvasRef}
          className="erd-relationships"
          width={canvasSize.width}
          height={canvasSize.height}
        >
          {relationships.map(renderRelationship)}
          {renderTemporaryRelationship()}
        </svg>
        
        {/* Entities */}
        {entities.map(renderEntity)}
        
        {/* Add Entity Form */}
        {isAddingEntity && (
          <div className="erd-add-entity-modal">
            <div className={`erd-add-entity-form ${isDarkMode ? 'dark' : ''}`}>
              <h3>Add New Entity</h3>
              <input
                type="text"
                placeholder="Entity Name"
                value={newEntityData.name}
                onChange={(e) => setNewEntityData({
                  ...newEntityData,
                  name: e.target.value
                })}
              />
              <div className="erd-form-actions">
                <button 
                  className="erd-button add"
                  onClick={addEntity}
                  disabled={!newEntityData.name}
                >
                  Add
                </button>
                <button 
                  className="erd-button cancel"
                  onClick={() => setIsAddingEntity(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ERDEditor;
