import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import MenuItems from './MenuItems';

const MobileMenu = ({ 
  isOpen, 
  items, 
  onClose,
  onItemClick,
  menuItemRefs
}) => {
  useEffect(() => {
    if (isOpen) {
      // Focus first item when menu opens
      menuItemRefs[0]?.focus();
    }
  }, [isOpen, menuItemRefs]);

  if (!isOpen) return null;

  return (
    <div 
      className="mobile-menu"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="mobile-menu-button"
    >
      <MenuItems 
        items={items} 
        isMobile={true}
        onItemClick={onClose}
        menuItemRefs={menuItemRefs}
      />
    </div>
  );
};

MobileMenu.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    onClick: PropTypes.func.isRequired,
  })).isRequired,
  onClose: PropTypes.func.isRequired,
  onItemClick: PropTypes.func,
  menuItemRefs: PropTypes.array,
};

export default MobileMenu;
