import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Update as UpdateIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

/**
 * AILang Version Information Component
 * 
 * Displays version information for the AILang adapter and AILang language
 */
const AILangVersionInfo = () => {
  const [versionInfo, setVersionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updateTriggered, setUpdateTriggered] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  // Fetch version information from the API
  const fetchVersionInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/version');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setVersionInfo(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching version info:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger an update check
  const triggerUpdate = async (force = false) => {
    setUpdateTriggered(true);
    setUpdateStatus('checking');
    
    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force: force,
          check_only: !force,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setUpdateStatus(data.success ? 'success' : 'error');
      
      // Refresh version info after update check
      if (data.success) {
        setTimeout(() => {
          fetchVersionInfo();
        }, 1000);
      }
    } catch (err) {
      console.error('Error triggering update:', err);
      setUpdateStatus('error');
    } finally {
      setTimeout(() => {
        setUpdateTriggered(false);
        setUpdateStatus(null);
      }, 5000);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchVersionInfo();
  }, []);

  // Format the last updated time
  const formattedLastUpdated = lastUpdated 
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(lastUpdated)
    : 'Never';

  // Determine version status
  const getVersionStatus = () => {
    if (!versionInfo) return { status: 'unknown', icon: <InfoIcon />, color: 'default' };
    
    if (versionInfo.update_available) {
      return { 
        status: 'Update Available', 
        icon: <UpdateIcon />, 
        color: 'warning' 
      };
    }
    
    if (versionInfo.adapter_version === 'unknown' || versionInfo.ailang_current_version === 'unknown') {
      return { 
        status: 'Unknown', 
        icon: <InfoIcon />, 
        color: 'default' 
      };
    }
    
    if (versionInfo.days_since_update && versionInfo.days_since_update > 30) {
      return { 
        status: 'Outdated', 
        icon: <WarningIcon />, 
        color: 'warning' 
      };
    }
    
    return { 
      status: 'Up to Date', 
      icon: <CheckCircleIcon />, 
      color: 'success' 
    };
  };

  const versionStatus = getVersionStatus();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          AILang Version Information
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchVersionInfo}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<UpdateIcon />}
            onClick={() => triggerUpdate(false)}
            disabled={loading || updateTriggered}
          >
            Check for Updates
          </Button>
        </Box>
      </Box>
      
      {loading && <CircularProgress size={24} sx={{ mb: 2 }} />}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load version information: {error}
        </Alert>
      )}
      
      {updateStatus && (
        <Alert 
          severity={updateStatus === 'checking' ? 'info' : updateStatus === 'success' ? 'success' : 'error'} 
          sx={{ mb: 2 }}
        >
          {updateStatus === 'checking' && 'Checking for updates...'}
          {updateStatus === 'success' && 'Update check completed successfully.'}
          {updateStatus === 'error' && 'Update check failed. Please try again.'}
        </Alert>
      )}
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: {formattedLastUpdated}
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Version Status
          </Typography>
          
          <Chip 
            icon={versionStatus.icon} 
            label={versionStatus.status} 
            color={versionStatus.color} 
            variant="outlined"
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                AILang Adapter Version
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {versionInfo?.adapter_version || 'Unknown'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {versionInfo?.adapter_last_update || 'Unknown'}
                {versionInfo?.days_since_update && (
                  <Tooltip title="Days since last update">
                    <Chip 
                      size="small" 
                      label={`${versionInfo.days_since_update} days ago`} 
                      color={versionInfo.days_since_update > 30 ? 'warning' : 'default'}
                      sx={{ ml: 1 }}
                    />
                  </Tooltip>
                )}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Current AILang Version
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {versionInfo?.ailang_current_version || 'Unknown'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Latest AILang Version
              </Typography>
              <Typography variant="body1">
                {versionInfo?.ailang_latest_version || 'Unknown'}
                {versionInfo?.update_available && (
                  <Tooltip title="Update available">
                    <Chip 
                      size="small" 
                      label="Update Available" 
                      color="warning"
                      icon={<UpdateIcon fontSize="small" />}
                      sx={{ ml: 1 }}
                    />
                  </Tooltip>
                )}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        {versionInfo?.update_available && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ my: 2 }} />
            <Alert 
              severity="info" 
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => triggerUpdate(true)}
                  disabled={updateTriggered}
                >
                  UPDATE NOW
                </Button>
              }
            >
              A new version of AILang is available. Update your adapter to use the latest features.
            </Alert>
          </Box>
        )}
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Update History
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Last Update Status
          </Typography>
          <Typography variant="body1">
            {versionInfo?.update_status || 'Unknown'}
          </Typography>
        </Box>
        
        <Button 
          variant="outlined" 
          startIcon={<UpdateIcon />} 
          onClick={() => triggerUpdate(true)}
          disabled={loading || updateTriggered}
        >
          Force Update
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
          This will force an update regardless of version differences
        </Typography>
      </Paper>
    </Box>
  );
};

export default AILangVersionInfo;
