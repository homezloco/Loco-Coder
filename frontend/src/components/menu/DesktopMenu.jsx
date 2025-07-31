import React from 'react';
import PropTypes from 'prop-types';
import MenuItems from './MenuItems';

const DesktopMenu = ({ items }) => {
  return (
    <nav className="desktop-menu" aria-label="Main navigation">
      <MenuItems items={items} isMobile={false} />
    </nav>
  );
};

DesktopMenu.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    onClick: PropTypes.func.isRequired,
  })).isRequired,
};

export default DesktopMenu;
