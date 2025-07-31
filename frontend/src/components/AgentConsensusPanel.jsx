import React, { useState, useEffect } from 'react';
import '../styles/AgentConsensusPanel.css';

/**
 * Multi-Agent Consensus Panel Component
 * Provides UI for configuring and interacting with the multi-agent system
 * Includes fallbacks for network issues, API errors, and UI rendering
 */
const AgentConsensusPanel = ({ api }) => {
  // State for agents and tasks
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [taskDescription, setTaskDescription] = useState('');
  const [taskContext, setTaskContext] = useState('{}');
  const [consensusStrategy, setConsensusStrategy] = useState('majority_vote');
  const [consensusThreshold, setConsensusThreshold] = useState(0.5);
  
  // Agent registration form
  const [newAgent, setNewAgent] = useState({
    name: '',
    role: 'code_writer',
    api_url: '',
    api_key: '',
    backup_api_url: '',
    backup_api_key: '',
    weight: 1.0,
    timeout: 10.0
  });
  
  // Available agent roles
  const agentRoles = [
    { value: 'code_writer', label: 'Code Writer' },
    { value: 'code_reviewer', label: 'Code Reviewer' },
    { value: 'architect', label: 'Architect' },
    { value: 'security_expert', label: 'Security Expert' },
    { value: 'performance_expert', label: 'Performance Expert' },
    { value: 'documentation_writer', label: 'Documentation Writer' }
  ];
  
  // Consensus strategies
  const consensusStrategies = [
    { value: 'majority_vote', label: 'Majority Vote' },
    { value: 'weighted_vote', label: 'Weighted Vote' },
    { value: 'unanimous', label: 'Unanimous Agreement' },
    { value: 'primary_with_veto', label: 'Primary with Veto Power' }
  ];
  
  // Load agents on component mount
  useEffect(() => {
    fetchAgents();
    
    // Set up polling for task updates
    const taskPollingInterval = setInterval(updateActiveTasks, 5000);
    
    return () => {
      clearInterval(taskPollingInterval);
    };
  }, []);
  
  // Fetch registered agents
  const fetchAgents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.get('/agents/list');
      setAgents(result || []);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError('Failed to load agents. Please try again later.');
      
      // Use local storage as fallback
      try {
        const cachedAgents = localStorage.getItem('cachedAgents');
        if (cachedAgents) {
          setAgents(JSON.parse(cachedAgents));
          setError('Using cached agent data. Connection issues detected.');
        }
      } catch (cacheErr) {
        console.error('Failed to load from cache:', cacheErr);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update agent registration form
  const handleAgentFormChange = (e) => {
    const { name, value } = e.target;
    setNewAgent(prev => ({
      ...prev,
      [name]: name === 'weight' || name === 'timeout' ? parseFloat(value) : value
    }));
  };
  
  // Register a new agent
  const registerAgent = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.post('/agents/register', newAgent);
      
      if (result && result.agent_id) {
        setAgents(prev => [...prev, result]);
        
        // Cache in local storage for fallback
        localStorage.setItem('cachedAgents', JSON.stringify([...agents, result]));
        
        // Reset form
        setNewAgent({
          name: '',
          role: 'code_writer',
          api_url: '',
          api_key: '',
          backup_api_url: '',
          backup_api_key: '',
          weight: 1.0,
          timeout: 10.0
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Failed to register agent:', err);
      setError(`Failed to register agent: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle agent selection for tasks
  const toggleAgentSelection = (agentId) => {
    setSelectedAgents(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId);
      } else {
        return [...prev, agentId];
      }
    });
  };
  
  // Create a new task
  const createTask = async (e) => {
    e.preventDefault();
    
    if (selectedAgents.length === 0) {
      setError('Please select at least one agent');
      return;
    }
    
    if (!taskDescription.trim()) {
      setError('Task description is required');
      return;
    }
    
    // Parse context JSON with error handling
    let contextObj = {};
    try {
      contextObj = JSON.parse(taskContext || '{}');
    } catch (err) {
      setError('Invalid JSON in context field');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const taskPayload = {
      description: taskDescription,
      context: contextObj,
      agent_ids: selectedAgents,
      consensus_config: {
        strategy: consensusStrategy,
        threshold: parseFloat(consensusThreshold),
      }
    };
    
    try {
      const result = await api.post('/agents/tasks', taskPayload);
      
      if (result && result.task_id) {
        // Add to local tasks state
        setTasks(prev => ({
          ...prev,
          [result.task_id]: {
            id: result.task_id,
            description: taskDescription,
            status: 'created',
            agentCount: selectedAgents.length,
            createdAt: new Date().toISOString(),
            result: null
          }
        }));
        
        // Reset form
        setTaskDescription('');
        setTaskContext('{}');
        setSelectedAgents([]);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      setError(`Failed to create task: ${err.message || 'Unknown error'}`);
      
      // Create offline task with pending status for fallback
      const offlineTaskId = `offline-${Date.now()}`;
      setTasks(prev => ({
        ...prev,
        [offlineTaskId]: {
          id: offlineTaskId,
          description: taskDescription,
          status: 'offline_pending',
          agentCount: selectedAgents.length,
          createdAt: new Date().toISOString(),
          result: null,
          offlineData: {
            payload: taskPayload,
            retryCount: 0
          }
        }
      }));
      
      // Store in localStorage for resilience
      try {
        localStorage.setItem('pendingTasks', JSON.stringify({
          ...JSON.parse(localStorage.getItem('pendingTasks') || '{}'),
          [offlineTaskId]: taskPayload
        }));
      } catch (storageErr) {
        console.error('Failed to store pending task:', storageErr);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update active tasks
  const updateActiveTasks = async () => {
    // Get all task IDs that are not in terminal states
    const activeTasks = Object.entries(tasks)
      .filter(([_, task]) => 
        !['completed', 'failed', 'error', 'no_consensus'].includes(task.status))
      .map(([taskId]) => taskId)
      .filter(id => !id.startsWith('offline-')); // Filter out offline tasks
    
    if (activeTasks.length === 0) return;
    
    // Update each task in parallel
    await Promise.allSettled(
      activeTasks.map(async (taskId) => {
        try {
          const result = await api.get(`/agents/tasks/${taskId}`);
          
          if (result) {
            setTasks(prev => ({
              ...prev,
              [taskId]: {
                id: taskId,
                description: result.description,
                status: result.status,
                agentCount: result.agent_count,
                createdAt: new Date(result.created_at * 1000).toISOString(),
                result: result.result,
                responses: result.responses
              }
            }));
          }
        } catch (err) {
          console.error(`Failed to update task ${taskId}:`, err);
        }
      })
    );
    
    // Try to submit any offline pending tasks
    const pendingTasks = Object.entries(tasks)
      .filter(([_, task]) => task.status === 'offline_pending')
      .map(([taskId, task]) => ({ taskId, task }));
    
    for (const { taskId, task } of pendingTasks) {
      if (task.offlineData && task.offlineData.retryCount < 3) {
        try {
          const result = await api.post('/agents/tasks', task.offlineData.payload);
          
          if (result && result.task_id) {
            // Remove offline task and add online one
            setTasks(prev => {
              const newTasks = { ...prev };
              delete newTasks[taskId];
              newTasks[result.task_id] = {
                id: result.task_id,
                description: task.description,
                status: 'created',
                agentCount: task.agentCount,
                createdAt: new Date().toISOString(),
                result: null
              };
              return newTasks;
            });
            
            // Remove from localStorage
            try {
              const pendingTasksJson = localStorage.getItem('pendingTasks');
              if (pendingTasksJson) {
                const pendingTasks = JSON.parse(pendingTasksJson);
                delete pendingTasks[taskId];
                localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));
              }
            } catch (storageErr) {
              console.error('Failed to update pending tasks:', storageErr);
            }
          }
        } catch (err) {
          console.error(`Failed to retry offline task ${taskId}:`, err);
          
          // Increment retry count
          setTasks(prev => ({
            ...prev,
            [taskId]: {
              ...prev[taskId],
              offlineData: {
                ...prev[taskId].offlineData,
                retryCount: prev[taskId].offlineData.retryCount + 1
              }
            }
          }));
        }
      }
    }
  };
  
  // Retry a failed task
  const retryTask = async (taskId) => {
    setIsLoading(true);
    
    try {
      await api.post(`/agents/tasks/${taskId}/retry`);
      
      // Update task status locally
      setTasks(prev => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          status: 'retrying'
        }
      }));
    } catch (err) {
      console.error(`Failed to retry task ${taskId}:`, err);
      setError(`Failed to retry task: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="agent-consensus-panel">
      <h2>Multi-Agent Consensus System</h2>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="panel-container">
        <div className="agents-section">
          <h3>Available Agents</h3>
          
          <div className="agent-list">
            {agents.length === 0 ? (
              <p>No agents registered. Add your first agent below.</p>
            ) : (
              agents.map(agent => (
                <div 
                  key={agent.agent_id} 
                  className={`agent-item ${selectedAgents.includes(agent.agent_id) ? 'selected' : ''}`}
                  onClick={() => toggleAgentSelection(agent.agent_id)}
                >
                  <div className="agent-name">{agent.name}</div>
                  <div className="agent-role">{agent.role}</div>
                  <div className="agent-weight">Weight: {agent.weight}</div>
                  <div className="agent-select-indicator">
                    {selectedAgents.includes(agent.agent_id) ? '✓' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <h3>Register New Agent</h3>
          <form onSubmit={registerAgent} className="agent-form">
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input 
                type="text"
                id="name"
                name="name"
                value={newAgent.name}
                onChange={handleAgentFormChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="role">Role:</label>
              <select
                id="role"
                name="role"
                value={newAgent.role}
                onChange={handleAgentFormChange}
                required
              >
                {agentRoles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="api_url">Primary API URL:</label>
              <input 
                type="url"
                id="api_url"
                name="api_url"
                value={newAgent.api_url}
                onChange={handleAgentFormChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="api_key">Primary API Key:</label>
              <input 
                type="text"
                id="api_key"
                name="api_key"
                value={newAgent.api_key}
                onChange={handleAgentFormChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="backup_api_url">Backup API URL:</label>
              <input 
                type="url"
                id="backup_api_url"
                name="backup_api_url"
                value={newAgent.backup_api_url}
                onChange={handleAgentFormChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="backup_api_key">Backup API Key:</label>
              <input 
                type="text"
                id="backup_api_key"
                name="backup_api_key"
                value={newAgent.backup_api_key}
                onChange={handleAgentFormChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="weight">Weight:</label>
              <input 
                type="number"
                id="weight"
                name="weight"
                min="0.1"
                max="10"
                step="0.1"
                value={newAgent.weight}
                onChange={handleAgentFormChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="timeout">Timeout (seconds):</label>
              <input 
                type="number"
                id="timeout"
                name="timeout"
                min="1"
                max="60"
                step="1"
                value={newAgent.timeout}
                onChange={handleAgentFormChange}
              />
            </div>
            
            <button 
              type="submit" 
              className="register-agent-button"
              disabled={isLoading}
            >
              {isLoading ? 'Registering...' : 'Register Agent'}
            </button>
          </form>
        </div>
        
        <div className="tasks-section">
          <h3>Create New Task</h3>
          <form onSubmit={createTask} className="task-form">
            <div className="form-group">
              <label htmlFor="taskDescription">Task Description:</label>
              <textarea
                id="taskDescription"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter task description"
                required
                rows="4"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="taskContext">Context (JSON):</label>
              <textarea
                id="taskContext"
                value={taskContext}
                onChange={(e) => setTaskContext(e.target.value)}
                placeholder="{}"
                rows="3"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="consensusStrategy">Consensus Strategy:</label>
              <select
                id="consensusStrategy"
                value={consensusStrategy}
                onChange={(e) => setConsensusStrategy(e.target.value)}
              >
                {consensusStrategies.map(strategy => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="consensusThreshold">
                Consensus Threshold ({consensusThreshold}):
              </label>
              <input
                type="range"
                id="consensusThreshold"
                min="0.1"
                max="1.0"
                step="0.1"
                value={consensusThreshold}
                onChange={(e) => setConsensusThreshold(e.target.value)}
              />
            </div>
            
            <div className="selected-agents">
              <p>Selected Agents: {selectedAgents.length}</p>
              <div className="selected-agent-pills">
                {selectedAgents.map(agentId => {
                  const agent = agents.find(a => a.agent_id === agentId);
                  return (
                    <div key={agentId} className="agent-pill">
                      {agent ? agent.name : agentId}
                      <button 
                        className="remove-agent"
                        onClick={() => toggleAgentSelection(agentId)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <button 
              type="submit" 
              className="create-task-button"
              disabled={isLoading || selectedAgents.length === 0}
            >
              {isLoading ? 'Creating...' : 'Create Task'}
            </button>
          </form>
          
          <h3>Task Results</h3>
          <div className="task-list">
            {Object.keys(tasks).length === 0 ? (
              <p>No tasks created yet.</p>
            ) : (
              Object.values(tasks).sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
              ).map(task => (
                <div key={task.id} className={`task-item status-${task.status}`}>
                  <div className="task-header">
                    <div className="task-description">{task.description}</div>
                    <div className="task-status">{task.status}</div>
                  </div>
                  
                  <div className="task-details">
                    <div>Agents: {task.agentCount}</div>
                    <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
                  </div>
                  
                  {task.result && (
                    <div className="task-result">
                      <div className="result-header">
                        <span>{task.result.message}</span>
                        <span className="confidence">
                          Confidence: {Math.round(task.result.confidence * 100)}%
                        </span>
                      </div>
                      
                      {task.result.consensus && (
                        <div className="consensus-content">
                          <pre>{task.result.consensus}</pre>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(task.status === 'failed' || task.status === 'no_consensus' || task.status === 'error') && (
                    <button 
                      className="retry-task-button"
                      onClick={() => retryTask(task.id)}
                      disabled={isLoading}
                    >
                      Retry Task
                    </button>
                  )}
                  
                  {task.status === 'offline_pending' && (
                    <div className="offline-status">
                      <span>Offline - Will retry when online</span>
                      <span>Retry attempts: {task.offlineData?.retryCount || 0}/3</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentConsensusPanel;
