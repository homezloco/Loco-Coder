import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAILang } from './ailang-adapter';

// Dashboard styles
const styles = {
  container: {
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    padding: '20px',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  stat: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    textAlign: 'left',
    padding: '12px 15px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f8f9fa',
  },
  tableCell: {
    padding: '12px 15px',
    borderBottom: '1px solid #ddd',
  },
  badge: {
    padding: '5px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  statusBadge: (status) => {
    const colors = {
      pending: { bg: '#FFF3CD', text: '#856404' },
      running: { bg: '#CCE5FF', text: '#004085' },
      completed: { bg: '#D4EDDA', text: '#155724' },
      failed: { bg: '#F8D7DA', text: '#721C24' },
    };
    const colorSet = colors[status.toLowerCase()] || colors.pending;
    
    return {
      backgroundColor: colorSet.bg,
      color: colorSet.text,
      padding: '5px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 'bold',
    };
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #ddd',
    marginBottom: '20px',
  },
  tab: {
    padding: '10px 20px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  activeTab: {
    borderBottom: '2px solid #0066cc',
    fontWeight: 'bold',
  },
  taskDetails: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '5px',
    marginTop: '10px',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    fontFamily: 'monospace',
    maxHeight: '300px',
    overflow: 'auto',
  },
  expandButton: {
    background: 'none',
    border: 'none',
    color: '#0066cc',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '5px 0',
    display: 'block',
    marginTop: '5px',
  },
};

/**
 * AILang Dashboard Component
 * 
 * A dashboard for monitoring AILang tasks, agents, and system status
 */
const AILangDashboard = () => {
  // State
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [systemStatus, setSystemStatus] = useState({});
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [adapterVersion, setAdapterVersion] = useState(null);
  const [ailangVersion, setAilangVersion] = useState(null);
  const [taskTemplates, setTaskTemplates] = useState([]);
  
  // Initialize AILang adapter
  const { 
    getTaskTemplates,
    getAgents,
    getSystemStatus,
    getAdapterVersion
  } = useAILang({
    modelUrl: '/api/ailang/models/default',
    onError: (error) => setError(error.message || 'Error initializing AILang adapter')
  });

  // Fetch tasks from the backend
  const fetchTasks = useCallback(async () => {
    try {
      const response = await axios.get('/api/tasks');
      setTasks(response.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to fetch tasks');
    }
  }, []);

  // Fetch agents and system status
  const fetchSystemData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get task templates
      const templates = await getTaskTemplates();
      setTaskTemplates(templates);
      
      // Get agents
      const agentList = await getAgents();
      setAgents(agentList);
      
      // Get system status
      const status = await getSystemStatus();
      setSystemStatus(status);
      
      // Get version information
      const versionInfo = await getAdapterVersion();
      setAdapterVersion(versionInfo.version);
      setAilangVersion(versionInfo.ailangCompatibility);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching system data:', err);
      setError('Failed to fetch system data');
      setLoading(false);
    }
  }, [getTaskTemplates, getAgents, getSystemStatus, getAdapterVersion]);

  // Load data on component mount
  useEffect(() => {
    fetchTasks();
    fetchSystemData();
    
    // Set up polling for tasks (every 5 seconds)
    const taskInterval = setInterval(fetchTasks, 5000);
    
    // Clean up intervals on unmount
    return () => {
      clearInterval(taskInterval);
    };
  }, [fetchTasks, fetchSystemData]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchTasks();
    fetchSystemData();
  };

  // Toggle task details expansion
  const toggleTaskExpansion = (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
    } else {
      setExpandedTask(taskId);
    }
  };

  // Calculate statistics
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.status === 'completed').length,
    failedTasks: tasks.filter(task => task.status === 'failed').length,
    activeAgents: agents.filter(agent => agent.status === 'active').length,
  };

  // Render loading state
  if (loading && !tasks.length && !agents.length) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading AILang dashboard...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h3 style={{ color: '#721C24' }}>Error</h3>
          <p>{error}</p>
          <button style={styles.refreshButton} onClick={handleRefresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>AILang Dashboard</h1>
        <button style={styles.refreshButton} onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      {/* System Status Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>System Status</h2>
        <div style={styles.grid}>
          <div>
            <div style={styles.stat}>{stats.totalTasks}</div>
            <div style={styles.statLabel}>Total Tasks</div>
          </div>
          <div>
            <div style={styles.stat}>{stats.completedTasks}</div>
            <div style={styles.statLabel}>Completed Tasks</div>
          </div>
          <div>
            <div style={styles.stat}>{stats.activeAgents}</div>
            <div style={styles.statLabel}>Active Agents</div>
          </div>
          <div>
            <div style={styles.stat}>{taskTemplates.length}</div>
            <div style={styles.statLabel}>Task Templates</div>
          </div>
        </div>
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <div>AILang Adapter Version: {adapterVersion || 'Unknown'}</div>
          <div>AILang Compatibility: {ailangVersion || 'Unknown'}</div>
          <div>System Status: {systemStatus.status || 'Unknown'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <div 
          style={{ ...styles.tab, ...(activeTab === 'tasks' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </div>
        <div 
          style={{ ...styles.tab, ...(activeTab === 'agents' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('agents')}
        >
          Agents
        </div>
        <div 
          style={{ ...styles.tab, ...(activeTab === 'templates' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('templates')}
        >
          Task Templates
        </div>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Recent Tasks</h2>
          {tasks.length === 0 ? (
            <p>No tasks found</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>ID</th>
                  <th style={styles.tableHeader}>Template</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Created</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <React.Fragment key={task.id}>
                    <tr>
                      <td style={styles.tableCell}>{task.id.substring(0, 8)}...</td>
                      <td style={styles.tableCell}>{task.template}</td>
                      <td style={styles.tableCell}>
                        <span style={styles.statusBadge(task.status)}>
                          {task.status}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        {new Date(task.created_at).toLocaleString()}
                      </td>
                      <td style={styles.tableCell}>
                        <button 
                          style={styles.expandButton}
                          onClick={() => toggleTaskExpansion(task.id)}
                        >
                          {expandedTask === task.id ? 'Hide Details' : 'Show Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedTask === task.id && (
                      <tr>
                        <td colSpan="5" style={styles.tableCell}>
                          <div style={styles.taskDetails}>
                            <strong>Context:</strong>
                            <pre>{JSON.stringify(task.context, null, 2)}</pre>
                            
                            {task.result && (
                              <>
                                <strong>Result:</strong>
                                <pre>{JSON.stringify(task.result, null, 2)}</pre>
                              </>
                            )}
                            
                            {task.error && (
                              <>
                                <strong>Error:</strong>
                                <pre style={{ color: '#721C24' }}>{task.error}</pre>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Agents</h2>
          {agents.length === 0 ? (
            <p>No agents found</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>ID</th>
                  <th style={styles.tableHeader}>Name</th>
                  <th style={styles.tableHeader}>Role</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Tasks Completed</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => (
                  <tr key={agent.id}>
                    <td style={styles.tableCell}>{agent.id}</td>
                    <td style={styles.tableCell}>{agent.name}</td>
                    <td style={styles.tableCell}>{agent.role}</td>
                    <td style={styles.tableCell}>
                      <span style={styles.statusBadge(agent.status)}>
                        {agent.status}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{agent.tasks_completed || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Task Templates</h2>
          {taskTemplates.length === 0 ? (
            <p>No task templates found</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Name</th>
                  <th style={styles.tableHeader}>Description</th>
                  <th style={styles.tableHeader}>Consensus Strategy</th>
                  <th style={styles.tableHeader}>Required Context</th>
                </tr>
              </thead>
              <tbody>
                {taskTemplates.map(template => (
                  <tr key={template.name}>
                    <td style={styles.tableCell}>{template.name}</td>
                    <td style={styles.tableCell}>{template.description}</td>
                    <td style={styles.tableCell}>{template.consensus_strategy}</td>
                    <td style={styles.tableCell}>
                      {template.required_context?.join(', ') || 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AILangDashboard;
