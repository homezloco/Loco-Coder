import React from 'react';
import PropTypes from 'prop-types';

const MenuItems = ({ 
  items = [], 
  isMobile = false, 
  onItemClick = () => {},
  menuItemRefs = []
}) => {
  if (!items || items.length === 0) return null;

  return items.map((item, index) => {
    // Skip rendering if item is invalid
    if (!item || !item.id) return null;
    
    const handleClick = (e) => {
      if (item.onClick) {
        item.onClick(e);
      }
      onItemClick();
    };
    
    return (
      <button
        key={item.id}
        ref={el => menuItemRefs[index] = el}
        onClick={handleClick}
      className={`menu-item ${isMobile ? 'mobile' : 'desktop'}`}
      aria-label={item.label}
      tabIndex={isMobile ? 0 : -1}
    >
      <span className="menu-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span className="menu-label">{item.label}</span>
      </button>
    );
  });
};

MenuItems.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      onClick: PropTypes.func,
      disabled: PropTypes.bool
    })
  ),
  isMobile: PropTypes.bool,
  onItemClick: PropTypes.func,
  menuItemRefs: PropTypes.array
};

export default React.memo(MenuItems);
