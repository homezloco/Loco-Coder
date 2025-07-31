import React, { createContext, forwardRef, useContext, useState } from 'react';

// Context to share state between components
const ResizableContext = createContext({
  direction: "horizontal",
  onLayout: () => {},
});

/**
 * ResizablePanelGroup component that manages a group of resizable panels
 */
const ResizablePanelGroup = forwardRef(({
  children,
  direction = "horizontal",
  className = "",
  onLayout = () => {},
  ...props
}, ref) => {
  const [sizes, setSizes] = useState([]);

  // Update sizes when panel resizing happens
  const handleResize = (index, size) => {
    setSizes(prevSizes => {
      const newSizes = [...prevSizes];
      newSizes[index] = size;
      onLayout(newSizes);
      return newSizes;
    });
  };

  return (
    <ResizableContext.Provider value={{ direction, onLayout: handleResize }}>
      <div 
        ref={ref}
        className={`resizable-panel-group ${className} ${direction}`}
        {...props}
      >
        {children}
      </div>
    </ResizableContext.Provider>
  );
});

/**
 * ResizablePanel component that can be resized by the user
 */
const ResizablePanel = forwardRef(({
  children,
  defaultSize = 20,
  minSize = 10,
  maxSize = 80,
  className = "",
  ...props
}, ref) => {
  const { direction } = useContext(ResizableContext);
  const [size, setSize] = useState(defaultSize);
  
  // Get the appropriate style based on direction
  const style = direction === "horizontal" 
    ? { width: `${size}%` } 
    : { height: `${size}%` };

  return (
    <div
      ref={ref}
      className={`resizable-panel ${className}`}
      style={style}
      data-min-size={minSize}
      data-max-size={maxSize}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * ResizableHandle component that provides a draggable handle between panels
 */
const ResizableHandle = forwardRef(({
  withHandle = false,
  className = "",
  ...props
}, ref) => {
  const { direction } = useContext(ResizableContext);
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle mouse events for drag resizing
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    
    const handleMouseMove = (moveEvent) => {
      // Calculate new sizes based on mouse position
      const handle = e.currentTarget;
      const parent = handle.parentElement;
      
      if (parent) {
        const prevPanel = handle.previousElementSibling;
        const nextPanel = handle.nextElementSibling;
        
        if (prevPanel && nextPanel) {
          // Calculate new sizes based on mouse position
          // This would be more complex in a real implementation
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={ref}
      className={`resizable-handle ${className} ${direction} ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      {...props}
    >
      {withHandle && (
        <div className="resizable-handle-bar">
          {direction === "horizontal" ? (
            <div className="handle-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          ) : (
            <div className="handle-line" />
          )}
        </div>
      )}
    </div>
  );
});

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
