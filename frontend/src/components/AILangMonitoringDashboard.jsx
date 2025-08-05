import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  Button,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

// Status indicator component
const StatusIndicator = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'ok':
        return { color: 'success', icon: <CheckCircleIcon /> };
      case 'warning':
        return { color: 'warning', icon: <WarningIcon /> };
      case 'error':
        return { color: 'error', icon: <ErrorIcon /> };
      default:
        return { color: 'default', icon: null };
    }
  };

  const { color, icon } = getStatusColor(status);
  
  return (
    <Chip
      icon={icon}
      label={status.toUpperCase()}
      color={color}
      size="small"
      sx={{ fontWeight: 'bold' }}
    />
  );
};

// Component details table
const ComponentDetails = ({ details }) => {
  if (!details || Object.keys(details).length === 0) {
    return <Typography variant="body2">No details available</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Property</TableCell>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(details).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell component="th" scope="row">
                {key}
              </TableCell>
              <TableCell>{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Component icon selector
const ComponentIcon = ({ name }) => {
  switch (name.toLowerCase()) {
    case 'filesystem':
      return <StorageIcon />;
    case 'process':
      return <MemoryIcon />;
    case 'logs':
      return <TimelineIcon />;
    case 'api':
      return <CodeIcon />;
    default:
      return null;
  }
};

// Main monitoring dashboard component
const AILangMonitoringDashboard = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle auto-refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchHealthData();
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  // Initial data fetch
  useEffect(() => {
    fetchHealthData();
  }, []);

  // Format the last updated time
  const formattedLastUpdated = lastUpdated 
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(lastUpdated)
    : 'Never';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          AILang Adapter Monitoring
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchHealthData}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          
          <Button
            variant={autoRefresh ? "contained" : "outlined"}
            color={autoRefresh ? "primary" : "inherit"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>
        </Box>
      </Box>
      
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load health data: {error}
        </Alert>
      )}
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: {formattedLastUpdated}
      </Typography>
      
      {healthData && (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" component="div">
                  Overall System Status
                </Typography>
                <StatusIndicator status={healthData.status} />
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Timestamp: {new Date(healthData.timestamp).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Component Status
          </Typography>
          
          <Grid container spacing={3}>
            {healthData.components && Object.entries(healthData.components).map(([name, data]) => (
              <Grid item xs={12} md={6} key={name}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 2 }}>
                          <ComponentIcon name={name} />
                        </Box>
                        <Typography>{name.charAt(0).toUpperCase() + name.slice(1)}</Typography>
                      </Box>
                      <StatusIndicator status={data.status} />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <ComponentDetails details={data.details} />
                  </AccordionDetails>
                </Accordion>
              </Grid>
            ))}
          </Grid>
        </>
      )}
      
      {!healthData && !loading && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <Typography variant="body1" color="text.secondary">
            No health data available. Click Refresh to check again.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AILangMonitoringDashboard;
