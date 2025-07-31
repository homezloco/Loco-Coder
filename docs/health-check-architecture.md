# Health Check & Fallback Architecture

## Overview

This document outlines the health check and fallback architecture implemented in the Coder AI Platform. The system is designed to be resilient, self-healing, and provide a seamless user experience even when backend services are degraded or unavailable.

## Architecture Components

### 1. Backend Health Service (`health_service.py`)

#### Key Features:
- **Circuit Breakers**: Prevents cascading failures by stopping requests to failing services
- **Multi-tiered Fallbacks**: Graceful degradation when components fail
- **Component Health Monitoring**: Individual tracking of critical services
- **Caching**: Reduces load with configurable TTLs
- **Detailed Diagnostics**: Comprehensive status reporting

#### Health Check Types:
- **Liveness**: Basic "am I alive" check for container orchestration
- **Readiness**: Verifies service can accept traffic
- **Startup**: Special check for initial service startup
- **Component**: Detailed status of individual services

### 2. API Endpoints (`health_api.py`)

#### Endpoints:
- `GET /api/health`: Full system health status
- `GET /api/health/liveness`: Kubernetes liveness probe
- `GET /api/health/readiness`: Kubernetes readiness probe
- `GET /api/health/startup`: Kubernetes startup probe
- `GET /api/health/components/{component}`: Individual component status

### 3. Frontend Health Monitoring (`ApiStatusContext.jsx`)

#### Features:
- Real-time health status monitoring
- Progressive backoff for failed checks
- Network status awareness
- Component-level health tracking
- Graceful degradation UI

## Implementation Details

### Backend Implementation

#### Health Service Initialization
```python
# Initialize health service with components
health_service = HealthService(
    name="api-service",
    version=__version__,
    checks=[
        DatabaseHealthCheck(),
        OllamaHealthCheck(),
        FilesystemHealthCheck(),
        NetworkHealthCheck()
    ],
    cache_ttl=30  # seconds
)
```

#### Custom Health Check Example
```python
class OllamaHealthCheck(HealthCheck):
    def __init__(self):
        super().__init__("ollama", "Ollama AI Service")
        
    async def check(self):
        try:
            start_time = time.time()
            response = await ollama_client.health_check()
            response_time = time.time() - start_time
            
            return HealthCheckResult(
                status=HealthStatus.HEALTHY if response.ok else HealthStatus.UNHEALTHY,
                details={
                    "response_time": response_time,
                    "model": response.model,
                    "version": response.version
                }
            )
        except Exception as e:
            return HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                error=str(e)
            )
```

### Frontend Implementation

#### Using the ApiStatusContext
```jsx
import { useApiStatus } from '../contexts/ApiStatusContext';

function StatusIndicator() {
  const { 
    status, 
    isOnline, 
    isDegraded, 
    components,
    lastChecked 
  } = useApiStatus();

  if (status === 'checking') return <LoadingSpinner />;
  
  return (
    <div className={`status-indicator ${status}`}>
      <div>Status: {status.toUpperCase()}</div>
      {isDegraded && (
        <div className="degraded-warning">
          Service degraded: {components.database?.error || 'Unknown error'}
        </div>
      )}
      <div className="last-checked">
        Last checked: {new Date(lastChecked).toLocaleTimeString()}
      </div>
    </div>
  );
}
```

## Error Handling & Fallbacks

### Multi-tiered Fallback Strategy

1. **Primary Source**: Direct API call to backend service
2. **Local Cache**: Check recent health status in IndexedDB
3. **Degraded Mode**: Show UI with limited functionality when critical services are down
4. **Offline Mode**: Full offline support with local data persistence

### Circuit Breaker Pattern

```javascript
// Example circuit breaker implementation
class CircuitBreaker {
  constructor(failureThreshold = 3, resetTimeout = 30000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failureCount = 0;
    this.lastFailure = null;
    this.state = 'CLOSED';
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF-OPEN';
      } else {
        throw new Error('Service unavailable (circuit breaker open)');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF-OPEN') {
        this.reset();
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailure = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      setTimeout(() => this.state = 'HALF-OPEN', this.resetTimeout);
    }
  }

  reset() {
    this.failureCount = 0;
    this.lastFailure = null;
    this.state = 'CLOSED';
  }
}
```

## Monitoring & Alerting

### Metrics Collected
- Response times
- Error rates
- Component status
- Cache hit/miss ratios
- Circuit breaker state changes

### Alerting Rules
- Critical component down > 5 minutes
- Error rate > 5% for 15 minutes
- Response time > 2s (p95) for 10 minutes
- Circuit breaker trips

## Best Practices

1. **Graceful Degradation**: Always provide fallback UIs when services are degraded
2. **Exponential Backoff**: Use progressive backoff for retry mechanisms
3. **Circuit Breaking**: Prevent cascading failures with circuit breakers
4. **Caching**: Cache health status with appropriate TTLs
5. **Throttling**: Implement rate limiting to protect backend services
6. **Detailed Logging**: Log health check failures with context for debugging
7. **Configuration**: Make all timeouts and thresholds configurable

## Troubleshooting

### Common Issues

#### Health Checks Failing
1. Verify backend service is running and accessible
2. Check network connectivity between services
3. Review logs for specific error messages
4. Verify circuit breaker state
5. Check resource constraints (CPU, memory, disk)

#### False Positives
1. Adjust timeouts based on expected response times
2. Review health check implementation for race conditions
3. Verify clock synchronization between services
4. Check for network partitioning

## Future Enhancements

1. **Self-healing**: Automatically restart failed components
2. **Predictive Scaling**: Scale services based on health metrics
3. **Distributed Tracing**: Correlate health checks with request flows
4. **A/B Testing**: Test different fallback strategies
5. **Chaos Engineering**: Test system resilience with controlled failures
