import React, { useState } from 'react';
import {
  Box,
  Container,
  CssBaseline,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Article as ArticleIcon,
  Update as UpdateIcon,
  Settings as SettingsIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';

// Import our dashboard components
import AILangMonitoringDashboard from './AILangMonitoringDashboard';
import AILangLogViewer from './AILangLogViewer';
import AILangVersionInfo from './AILangVersionInfo';

// Drawer width for desktop view
const drawerWidth = 240;

/**
 * Main AILang Adapter Dashboard component that integrates all monitoring features
 */
const AILangDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for drawer and current view
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // Handle navigation item click
  const handleNavClick = (view) => {
    setCurrentView(view);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };
  
  // Open GitHub repository in new tab
  const openGitHubRepo = () => {
    window.open('https://github.com/ailang-ai/ailang', '_blank');
  };
  
  // Drawer content
  const drawerContent = (
    <>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          AILang Adapter
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={currentView === 'dashboard'} 
            onClick={() => handleNavClick('dashboard')}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="System Status" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            selected={currentView === 'logs'} 
            onClick={() => handleNavClick('logs')}
          >
            <ListItemIcon>
              <ArticleIcon />
            </ListItemIcon>
            <ListItemText primary="Logs" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            selected={currentView === 'version'} 
            onClick={() => handleNavClick('version')}
          >
            <ListItemIcon>
              <UpdateIcon />
            </ListItemIcon>
            <ListItemText primary="Version Info" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={openGitHubRepo}>
            <ListItemIcon>
              <GitHubIcon />
            </ListItemIcon>
            <ListItemText primary="GitHub Repository" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            selected={currentView === 'settings'} 
            onClick={() => handleNavClick('settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );
  
  // Render the current view content
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <AILangMonitoringDashboard />;
      case 'logs':
        return <AILangLogViewer />;
      case 'version':
        return <AILangVersionInfo />;
      case 'settings':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Settings
            </Typography>
            <Typography variant="body1">
              Settings configuration will be available in a future update.
            </Typography>
          </Box>
        );
      default:
        return <AILangMonitoringDashboard />;
    }
  };
  
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { md: drawerOpen ? `${drawerWidth}px` : 0 },
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: drawerOpen ? 'none' : 'block' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {currentView === 'dashboard' && 'System Status'}
            {currentView === 'logs' && 'Logs Viewer'}
            {currentView === 'version' && 'Version Information'}
            {currentView === 'settings' && 'Settings'}
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Drawer - responsive for mobile/desktop */}
      <Box
        component="nav"
        sx={{ width: { md: drawerOpen ? drawerWidth : 0 }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer (temporary) */}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth 
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}
        
        {/* Desktop drawer (persistent) */}
        {!isMobile && (
          <Drawer
            variant="persistent"
            open={drawerOpen}
            sx={{
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth 
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { 
            md: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%' 
          },
          ml: { md: drawerOpen ? `${drawerWidth}px` : 0 },
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        
        {/* Content area with scrolling */}
        <Container 
          maxWidth="xl" 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            py: 2,
          }}
        >
          <Paper 
            elevation={0} 
            sx={{ 
              minHeight: '100%',
              p: 0,
              backgroundColor: 'transparent',
            }}
          >
            {renderContent()}
          </Paper>
        </Container>
        
        {/* Bottom navigation for mobile */}
        {isMobile && (
          <Paper 
            sx={{ 
              position: 'fixed', 
              bottom: 0, 
              left: 0, 
              right: 0,
              zIndex: theme.zIndex.appBar,
            }} 
            elevation={3}
          >
            <BottomNavigation
              value={currentView}
              onChange={(event, newValue) => {
                setCurrentView(newValue);
              }}
              showLabels
            >
              <BottomNavigationAction 
                label="Status" 
                value="dashboard" 
                icon={<DashboardIcon />} 
              />
              <BottomNavigationAction 
                label="Logs" 
                value="logs" 
                icon={<ArticleIcon />} 
              />
              <BottomNavigationAction 
                label="Version" 
                value="version" 
                icon={<UpdateIcon />} 
              />
              <BottomNavigationAction 
                label="Settings" 
                value="settings" 
                icon={<SettingsIcon />} 
              />
            </BottomNavigation>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default AILangDashboard;
