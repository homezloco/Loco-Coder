import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { SkeletonLoader } from '../feedback';

/**
 * VirtualizedProjectList Component
 * A performance-optimized list component that renders only the visible items
 * in a potentially very large list of projects.
 */
const VirtualizedProjectList = ({
  projects = [],
  renderItem,
  itemHeight = 250,
  containerHeight = 800,
  overscan = 3,
  isDarkMode = false,
  isLoading = false,
  onItemVisible = null,
  emptyMessage = 'No projects found'
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [observerRef, setObserverRef] = useState(null);
  
  // Calculate number of items that should be rendered based on container height
  const itemsPerPage = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  
  // Handle scroll events to calculate visible items
  const handleScroll = (event) => {
    const { scrollTop } = event.target;
    setScrollTop(scrollTop);
  };
  
  // Update visible range based on scroll position
  useEffect(() => {
    const startIndex = Math.floor(scrollTop / itemHeight) - overscan;
    const start = Math.max(0, startIndex);
    const end = Math.min(projects.length - 1, start + itemsPerPage - 1);
    
    setVisibleRange({ start, end });
    
    // Notify when items become visible
    if (onItemVisible) {
      for (let i = start; i <= end; i++) {
        if (projects[i]) {
          onItemVisible(projects[i], i);
        }
      }
    }
  }, [scrollTop, projects.length, itemHeight, itemsPerPage, overscan, onItemVisible, projects]);
  
  // Set up IntersectionObserver to detect when items enter/exit viewport
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    
    // Use IntersectionObserver as a fallback mechanism to ensure
    // we're correctly tracking visible items
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && onItemVisible) {
            const index = Number(entry.target.dataset.index);
            if (!isNaN(index) && projects[index]) {
              onItemVisible(projects[index], index);
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    
    setObserverRef(observer);
    
    return () => {
      observer.disconnect();
    };
  }, [onItemVisible, projects]);
  
  // When the container or visible items change, update observers
  useEffect(() => {
    if (!observerRef) return;
    
    // Disconnect all previous observations
    observerRef.disconnect();
    
    // Observe currently visible items
    const elements = document.querySelectorAll('.virtual-list-item');
    elements.forEach((el) => {
      observerRef.observe(el);
    });
    
    return () => {
      observerRef.disconnect();
    };
  }, [visibleRange, observerRef]);
  
  // Render loading state with skeleton loaders
  if (isLoading) {
    return (
      <div
        style={{
          height: containerHeight,
          overflowY: 'auto',
          position: 'relative',
          backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            padding: '20px'
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`skeleton-${i}`}>
              <SkeletonLoader type="card" isDarkMode={isDarkMode} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (projects.length === 0) {
    return (
      <div
        style={{
          height: containerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          color: isDarkMode ? '#94a3b8' : '#64748b',
          backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
          textAlign: 'center',
          borderRadius: '8px'
        }}
      >
        <div>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 16px', opacity: 0.5 }}
          >
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <p style={{ fontSize: '16px', fontWeight: 500 }}>{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  // Calculate the total height of all items to ensure proper scrolling
  const totalHeight = projects.length * itemHeight;
  
  // Get the items that should be rendered
  const visibleItems = [];
  for (let i = visibleRange.start; i <= visibleRange.end; i++) {
    if (i >= 0 && i < projects.length) {
      visibleItems.push({
        item: projects[i],
        index: i
      });
    }
  }
  
  return (
    <div
      style={{
        height: containerHeight,
        overflowY: 'auto',
        position: 'relative',
        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc'
      }}
      onScroll={handleScroll}
      data-testid="virtualized-list-container"
      aria-label={`Project list containing ${projects.length} items`}
    >
      {/* Spacer to ensure scrollbar reflects total content height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={item.id || index}
            className="virtual-list-item"
            data-index={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
              willChange: 'transform', // Performance optimization for GPU
              contain: 'layout', // Performance optimization
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

VirtualizedProjectList.propTypes = {
  projects: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  itemHeight: PropTypes.number,
  containerHeight: PropTypes.number,
  overscan: PropTypes.number,
  isDarkMode: PropTypes.bool,
  isLoading: PropTypes.bool,
  onItemVisible: PropTypes.func,
  emptyMessage: PropTypes.string
};

export default VirtualizedProjectList;
