# /project-root/backend/ollama_client.py

import requests
import json
import os
import time
import subprocess
import re
import logging
import hashlib
import threading
from typing import Optional, Dict, Any, Union, List, Set, Tuple, Callable, Iterator
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, Future

@dataclass
class ModelInfo:
    """Information about an available model."""
    name: str
    size: int  # in bytes
    modified_at: datetime
    is_available: bool = True
    last_used: Optional[datetime] = None
    usage_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'size': self.size,
            'modified_at': self.modified_at.isoformat(),
            'is_available': self.is_available,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'usage_count': self.usage_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ModelInfo':
        return cls(
            name=data['name'],
            size=data['size'],
            modified_at=datetime.fromisoformat(data['modified_at']),
            is_available=data.get('is_available', True),
            last_used=datetime.fromisoformat(data['last_used']) if data.get('last_used') else None,
            usage_count=data.get('usage_count', 0)
        )

class BatchRequest:
    """Represents a batch of prompts to be processed together."""
    def __init__(self, prompts: List[str], callback: Optional[Callable[[List[str]], None]] = None):
        self.prompts = prompts
        self.callback = callback
        self.futures = [Future() for _ in prompts]
    
    def set_result(self, index: int, result: str) -> None:
        """Set the result for a specific prompt in the batch."""
        if 0 <= index < len(self.futures):
            self.futures[index].set_result(result)
    
    def set_exception(self, index: int, exc: Exception) -> None:
        """Set an exception for a specific prompt in the batch."""
        if 0 <= index < len(self.futures):
            self.futures[index].set_exception(exc)
    
    def done(self) -> bool:
        """Check if all requests in the batch are complete."""
        return all(future.done() for future in self.futures)

class OllamaClient:
    """Enhanced Ollama client with model management, batching, and caching."""
    
    # Cache configuration
    DEFAULT_CACHE_TTL = 3600  # 1 hour
    MAX_CACHE_SIZE = 1000  # Maximum number of cached responses
    
    def __init__(self, url: str, model: str, timeout: int = 30, enable_cache: bool = True):
        """Initialize the Ollama client with enhanced reliability features.
        
        Args:
            url: Base URL of the Ollama server
            model: Name of the model to use (e.g., 'codellama:instruct')
            timeout: Base timeout in seconds (will be adjusted based on model size)
            enable_cache: Whether to enable response caching
        """
        # Store configuration
        self.model = model.strip()
        self.original_url = url.rstrip('/')
        self.base_url = self.original_url
        self.enable_cache = enable_cache
        self.timeout = timeout  # Store the base timeout
        
        # Configure timeouts based on model size
        self._configure_timeouts(model, timeout)
        
        # Connection and retry configuration
        self.max_retries = 3
        self.retry_delay = 2  # Base delay in seconds
        self.backoff_factor = 2  # Exponential backoff multiplier
        self.max_retry_delay = 60  # Maximum delay between retries
        
        # Track model and connection state
        self.model_in_api = False
        self.model_in_cli = False
        self.is_wsl = False
        self.possible_hosts = []
        self.last_error = None
        self.session = None  # Will be initialized on first use
        
        # Model management
        self.available_models: Dict[str, ModelInfo] = {}
        self.model_lock = threading.Lock()
        
        # Batching
        self.batch_requests: List[BatchRequest] = []
        self.batch_lock = threading.Lock()
        self.batch_interval = 0.1  # seconds
        self.batch_thread = None
        self.batch_running = False
        
        # Caching
        self.cache: Dict[str, Tuple[str, float]] = {}
        self.cache_ttl = self.DEFAULT_CACHE_TTL
        
        # Thread pool for concurrent requests
        self.thread_pool = ThreadPoolExecutor(max_workers=10)
        
        # Default backup responses when all else fails
        self.backup_responses = {
            "help": "I can help you write code, explain concepts, or debug issues.",
            "error": "I'm sorry, but I couldn't process that request. Please try again in a moment.",
            "code": "```python\ndef hello_world():\n    print('Hello, World!')\n\nhello_world()\n```",
            "timeout": "The request took too long to process. The model might be busy. Please try again with a shorter prompt.",
            "connection": "Could not connect to the AI service. Please check your network connection and try again."
        }
        
        # Track available models with timestamps
        self.api_models = set()
        self.cli_models = set()
        self.last_model_check = 0
        self.model_check_interval = 300  # 5 minutes between model checks
        
        # Initialize connection and model checking
        self._initialize_connection()
    
    def _configure_timeouts(self, model: str, base_timeout: int):
        """Configure timeouts based on model size and operation type."""
        model_lower = model.lower()
        
        # Base timeouts for different operations (in seconds)
        self.timeout_config = {
            'connect': 10,  # Connection timeout
            'read': 30,     # Read timeout for API responses
            'write': 30,    # Write timeout for API requests
            'model_load': 300,  # Timeout for model loading
            'model_check': 10,  # Timeout for model availability checks
        }
        
        # Adjust timeouts based on model size
        if any(size in model_lower for size in ["70b", "65b", "34b"]):
            # Very large models
            self.timeout_config.update({
                'read': 600,  # 10 minutes
                'model_load': 900,  # 15 minutes
            })
            print(f"Using extended timeouts for very large model: {model}")
        elif any(size in model_lower for size in ["33b", "30b", "13b"]):
            # Large models
            self.timeout_config.update({
                'read': 300,  # 5 minutes
                'model_load': 600,  # 10 minutes
            })
            print(f"Using longer timeouts for large model: {model}")
        elif any(size in model_lower for size in ["7b", "6b", "3b"]):
            # Medium models
            self.timeout_config.update({
                'read': 180,  # 3 minutes
                'model_load': 300,  # 5 minutes
            })
            print(f"Using moderate timeouts for medium-sized model: {model}")
        else:
            # Small models or unknown size
            self.timeout_config.update({
                'read': 120,  # 2 minutes
                'model_load': 180,  # 3 minutes
            })
            print(f"Using default timeouts for model: {model}")
            
        # Apply the base timeout scaling if provided
        if base_timeout > 0:
            scale = base_timeout / 30  # Normalize to default 30s
            for key in self.timeout_config:
                self.timeout_config[key] = int(self.timeout_config[key] * scale)
    
    def _initialize_connection(self):
        """Initialize the HTTP session and detect environment."""
        # Create a session with connection pooling
        self.session = requests.Session()
        self.session.verify = False  # Disable SSL verification for local development
        
        # Configure retry strategy
        retry_strategy = requests.adapters.HTTPAdapter(
            max_retries=3,
            pool_connections=10,
            pool_maxsize=100,
            pool_block=False
        )
        
        # Mount the adapter
        self.session.mount("http://", retry_strategy)
        self.session.mount("https://", retry_strategy)
        
        # Detect environment and set up connection
        self._detect_wsl_and_set_url(self.original_url)
        
        # Initial model check (non-blocking)
        try:
            self._check_connection()
        except Exception as e:
            print(f"Initial connection check failed: {e}")
            self.last_error = str(e)
    
    def _detect_wsl_and_set_url(self, url: str) -> None:
        """Detect if running in WSL and set appropriate URL for Windows host access"""
        self.is_wsl = False
        self.possible_hosts = [url.rstrip('/')]
        
        # Detect WSL environment
        if os.path.exists("/proc/version") and "microsoft" in open("/proc/version").read().lower():
            print("Detected WSL environment, will try multiple connection methods to Windows host")
            self.is_wsl = True
            
            # Extract port from URL if present
            port = "11434"  # Default port
            if ":" in url.split("/")[-1]:
                port = url.split(":")[-1]
            
            # Define Windows host URLs to try - prioritize localhost first
            self.possible_hosts = [
                f"http://localhost:{port}",            # Try localhost first
                f"http://127.0.0.1:{port}",           # Try 127.0.0.1 as well
                f"http://host.docker.internal:{port}", # Docker convention for host
                f"http://172.17.0.1:{port}",          # Common Docker bridge
                f"http://192.168.1.1:{port}",         # Common default gateway 
                f"http://172.29.112.1:{port}",        # Recent WSL default IP
                f"http://172.28.112.1:{port}"         # Added previously successful IP
            ]
            print(f"Will attempt these connection URLs: {', '.join(self.possible_hosts)}")
        
        # Start with first URL option
        self.url = self.possible_hosts[0]
        print(f"Initially using URL: {self.url}")
        
    def _check_connection(self) -> bool:
        """Test connection to Ollama server and check model availability in both API and CLI"""
        # Try each possible host URL until one works (for WSL environments)
        if self.is_wsl:
            for url in self.possible_hosts:
                self.url = url
                print(f"\nTrying connection with URL: {self.url}")
                api_success = self._try_wsl_host_connection()
                if api_success:
                    print(f"Successfully connected to Ollama server at {self.url}")
                    break
        else:
            api_success = self._check_api_models()
            
        cli_success = self._check_cli_models()
        
        # Print status information
        if self.model_in_api:
            print(f"Model '{self.model}' is available via Ollama API.")
        else:
            print(f"Warning: Model '{self.model}' NOT found via Ollama API. Available API models: {self.api_models}")
            
        if self.model_in_cli:
            print(f"Model '{self.model}' is available via Ollama CLI.")
        else:
            print(f"Warning: Model '{self.model}' NOT found via Ollama CLI. Available CLI models: {self.cli_models}")
            
        # Success if either API or CLI can access the model
        return api_success or cli_success
            
    def _try_wsl_host_connection(self, max_retries: int = 3) -> bool:
        """Try to connect to each possible host URL with retries and better diagnostics"""
        session = requests.Session()
        session.verify = False  # Disable SSL verification for local development
        
        # Add retry strategy with compatibility for older requests versions
        try:
            # Try with full options for newer requests versions
            retry_strategy = requests.adapters.HTTPAdapter(
                max_retries=3,
                status_forcelist=[429, 500, 502, 503, 504],
                allowed_methods=["HEAD", "GET", "OPTIONS"]
            )
        except TypeError:
            # Fallback for older requests versions
            retry_strategy = requests.adapters.HTTPAdapter(max_retries=3)
            
        session.mount("http://", retry_strategy)
        session.mount("https://", retry_strategy)
        
        for host_url in self.possible_hosts:
            print(f"\n{'='*40}")
            print(f"Testing connection to: {host_url}")
            print(f"{'='*40}")
            
            for attempt in range(max_retries + 1):
                try:
                    # Try multiple endpoints in sequence
                    endpoints = [
                        ('/api/tags', 'GET'),
                        ('/api/version', 'GET'),
                        ('/api/health', 'GET')
                    ]
                    
                    for endpoint, method in endpoints:
                        url = f'{host_url.rstrip("/")}{endpoint}'
                        print(f"\nAttempt {attempt + 1}/{max_retries + 1} - {method} {url}")
                        
                        try:
                            start_time = time.time()
                            response = session.request(
                                method=method,
                                url=url,
                                timeout=(3.05, 10),  # 3s connect, 10s read timeout
                                headers={
                                    'Accept': 'application/json',
                                    'User-Agent': 'OllamaClient/1.0',
                                    'Connection': 'keep-alive'
                                }
                            )
                            elapsed = time.time() - start_time
                            
                            print(f"Response [{response.status_code}] in {elapsed:.2f}s")
                            
                            if response.status_code == 200:
                                self.url = host_url
                                print(f"✅ Successfully connected to Ollama API at: {self.url}")
                                
                                # Try to get model information
                                try:
                                    models = response.json().get('models', [])
                                    if models:
                                        print(f"Available models: {', '.join(m.get('name', 'unknown') for m in models[:5])}" + 
                                              ("..." if len(models) > 5 else ""))
                                except Exception as e:
                                    print(f"Note: Could not parse models list: {e}")
                                
                                return True
                            
                            print(f"Unexpected status code: {response.status_code}")
                            if response.text:
                                print(f"Response: {response.text[:500]}")
                                
                        except requests.exceptions.RequestException as e:
                            print(f"Request failed: {e.__class__.__name__}: {e}")
                            if hasattr(e, 'response') and e.response is not None:
                                print(f"Response status: {e.response.status_code}")
                                print(f"Response text: {e.response.text[:500]}")
                    
                    # If we get here, all endpoints failed
                    if attempt < max_retries:
                        wait_time = self.retry_delay * (2 ** attempt)  # Exponential backoff
                        print(f"\nAll endpoints failed. Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                    
                except Exception as e:
                    print(f"Unexpected error during connection test: {e}")
                    if attempt < max_retries:
                        wait_time = self.retry_delay * (2 ** attempt)
                        print(f"Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
        
        print("\n❌ All connection attempts failed")
        return False

    def _check_api_models(self) -> bool:
        """Check which models are available via the Ollama API"""
        try:
            # First check if Ollama server is running with a short timeout
            print(f"Checking API models at {self.url} with timeout={self.timeout}")
            
            # Try with a session for connection pooling
            session = requests.Session()
            session.verify = False  # Disable SSL verification if needed
            
            # First try the /api/tags endpoint
            try:
                response = session.get(
                    f"{self.url}/api/tags", 
                    timeout=min(10, self.timeout)  # Shorter timeout for initial check
                )
                response.raise_for_status()
                data = response.json()
                models = data.get('models', [])
                model_names = [model.get('name') for model in models]
            except Exception as e:
                print(f"Warning: /api/tags failed with {e}, trying /api/list")
                # Fall back to /api/list if /api/tags fails
                try:
                    response = session.get(
                        f"{self.url}/api/list",
                        timeout=min(10, self.timeout)
                    )
                    response.raise_for_status()
                    data = response.json()
                    models = data.get('models', [])
                    model_names = [model.get('name') for model in models]
                except Exception as e2:
                    print(f"Warning: Both /api/tags and /api/list failed: {e2}")
                    return False
            
            print(f"Found {len(model_names)} models via API: {model_names}")
            
            # Store all API models
            self.api_models = set(model_names)
            
            # Check if model exists (accounting for namespace format like 'namespace/model')
            self.model_in_api = any(
                m == self.model or m.endswith(f'/{self.model}') 
                for m in model_names
            )
            
            return True
            
        except requests.exceptions.Timeout:
            print(f"Timeout while checking API models at {self.url}")
            return False
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error while checking API models at {self.url}: {e}")
            return False
        except Exception as e:
            print(f"Unexpected error checking API models: {e}")
            return False
            
    def _check_cli_models(self) -> bool:
        """Check which models are available via the Ollama CLI"""
        try:
            cli_env = os.environ.copy()
            cli_env['OLLAMA_HOST'] = self.url
            commands = [
                ['ollama', 'list'],
                ['which', 'ollama', '&&', 'ollama', 'list'],
                ['/usr/local/bin/ollama', 'list'],
                ['cmd.exe', '/c', 'ollama', 'list'],
                ['cmd.exe', '/c', r'"C:\Users\Shane Holmes\AppData\Local\Programs\Ollama\ollama.exe"', 'list'],
                ['cmd.exe', '/c', r'"C:\Program Files\Ollama\ollama.exe"', 'list'],
                ['bash', '-c', 'ollama list'],
                ['wsl', '--distribution', 'Ubuntu-22.04', 'ollama', 'list'],
                ['/mnt/c/Users/Shane Holmes/AppData/Local/Programs/Ollama/ollama.exe', 'list']
            ]
            for cmd in commands:
                print(f'DEBUG - Trying command: {cmd}')
                try:
                    result = subprocess.run(cmd, env=cli_env, shell=False, capture_output=True, text=True, timeout=self.timeout * 2)  # Increased timeout for CLI
                    if result.returncode == 0 and result.stdout:
                        lines = result.stdout.splitlines()
                        for line in lines[1:]:  # Skip header line if it exists
                            parts = line.split()
                            if parts:
                                model_name = parts[0].strip()
                                if model_name and ':' in model_name:
                                    self.cli_models.add(model_name)
                        if self.cli_models:
                            print(f'DEBUG - Successfully detected CLI models with command: {cmd}')
                            return True
                    else:
                        print(f'Return code: {result.returncode}')
                        if result.stderr:
                            print(f'Stderr: {result.stderr}')
                        elif not result.stdout:
                            print(f'No output received from command: {cmd}')
                except subprocess.TimeoutExpired:
                    print(f'Warning: Command {repr(cmd)} failed: Command {repr(cmd)} timed out after {self.timeout * 2} seconds')
                except FileNotFoundError:
                    print(f'Warning: Command {repr(cmd)} failed: Command interpreter not found')
                except Exception as e:
                    print(f'Warning: Command {repr(cmd)} failed: Unexpected error: {str(e)}')
            print(f'Warning: Failed to detect CLI models after trying all commands')
            return False
        except Exception as e:
            print(f"Warning: Ollama CLI check failed: {str(e)}")
            return False

    def generate(self, prompt: str, **kwargs) -> Union[str, Iterator[str]]:
        """
        Generate a response from the Ollama model with optimized fallback mechanisms
        
        Args:
            prompt: The input prompt to generate a response for
            **kwargs: Additional generation parameters:
                - model: Override the default model
                - temperature: Controls randomness (0.0 to 1.0)
                - max_tokens: Maximum number of tokens to generate
                - top_p: Nucleus sampling parameter
                - stream: Whether to stream the response (returns generator if True)
                - timeout: Override default timeout in seconds
                - use_cache: Whether to use cached responses (default: True)
                
        Returns:
            Generated text response (str) or generator of response chunks (if streaming)
            
        Raises:
            RuntimeError: If all generation attempts fail
        """
        stream = kwargs.pop('stream', False)
        use_cache = kwargs.pop('use_cache', True)
        
        # Check cache first if not streaming and cache is enabled
        if not stream and use_cache and self.enable_cache:
            cached = self.get_cached_response(prompt, **kwargs)
            if cached is not None:
                return cached
                
        if stream:
            return self._stream_response(prompt, **kwargs)
            
        # Start timing the request
        start_time = time.time()
        
        # Initialize logging
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        
        # Log the start of generation
        logger.info("\n" + "="*80)
        logger.info(f"OllamaClient.generate() - Starting generation")
        logger.info(f"Model: {self.model}")
        logger.info(f"Prompt length: {len(prompt)} characters")
        logger.info(f"Parameters: {json.dumps(kwargs, indent=2) if kwargs else 'None'}")
        
        # Ensure prompt is a string and not empty
        if not prompt or not isinstance(prompt, str):
            error_msg = f"Invalid prompt: {repr(prompt)[:200]}"
            logger.error(error_msg)
            return self._get_fallback_response("error")
            
        # Trim very long prompts to prevent timeouts
        max_prompt_length = 8000  # Characters, not tokens
        if len(prompt) > max_prompt_length:
            logger.warning(f"Prompt too long ({len(prompt)} chars), truncating to {max_prompt_length} chars")
            prompt = prompt[:max_prompt_length]
        
        # Check model availability with caching
        current_time = time.time()
        if current_time - self.last_model_check > self.model_check_interval:
            logger.info("Model check interval elapsed, rechecking model availability...")
            self._check_connection()
        
        # Prepare generation parameters with sensible defaults
        params = {
            'model': kwargs.get('model', self.model),
            'prompt': prompt,
            'stream': kwargs.get('stream', False),
            'options': {
                'temperature': min(max(float(kwargs.get('temperature', 0.7)), 0.1), 1.0),
                'top_p': min(max(float(kwargs.get('top_p', 0.9)), 0.1), 1.0),
                'num_ctx': min(int(kwargs.get('num_ctx', 2048)), 8192),
                'repeat_penalty': float(kwargs.get('repeat_penalty', 1.1)),
                'stop': kwargs.get('stop', [])
            }
        }
        
        # Add optional parameters if provided
        if 'max_tokens' in kwargs:
            params['options']['num_predict'] = int(kwargs['max_tokens'])
        
        # Determine which generation methods to try based on model availability
        methods_to_try = []
        
        if self.model_in_api:
            methods_to_try.extend([
                (self._try_api_generate, "API Generate"),
                (self._try_api_completion, "API Completion"),
                (self._try_curl_fallback, "CURL Fallback")
            ])
        
        if self.model_in_cli:
            methods_to_try.append((self._try_cli_fallback, "CLI Fallback"))
        
        # If no methods are available, try a basic API call as last resort
        if not methods_to_try:
            methods_to_try.append((self._try_direct_http, "Direct HTTP"))
        
        # Try each method in sequence with retries
        last_error = None
        for method, method_name in methods_to_try:
            for attempt in range(self.max_retries):
                try:
                    logger.info(f"\n--- Attempt {attempt + 1}/{self.max_retries} with {method_name} ---")
                    
                    # Calculate remaining time for this attempt
                    elapsed = time.time() - start_time
                    remaining_time = max(1, self.timeout_config['read'] - elapsed)
                    
                    # Make the request with timeout
                    response = method(prompt, timeout=remaining_time, **kwargs)
                    
                    if response and response.strip():
                        elapsed_total = time.time() - start_time
                        logger.info(f"✓ Successfully generated response in {elapsed_total:.2f}s")
                        logger.info("="*80 + "\n")
                        return response
                    
                    logger.warning(f"Empty response from {method_name}, retrying...")
                    
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"{method_name} attempt {attempt + 1} failed: {last_error}")
                    
                    # Exponential backoff before retry
                    if attempt < self.max_retries - 1:
                        wait_time = min(
                            self.retry_delay * (self.backoff_factor ** attempt),
                            self.max_retry_delay
                        )
                        logger.info(f"Waiting {wait_time:.1f}s before retry...")
                        time.sleep(wait_time)
        
        # If we get here, all attempts failed
        error_msg = f"All generation attempts failed. Last error: {last_error or 'Unknown error'}"
        logger.error(error_msg)
        
        # Return an appropriate fallback response
        if "timeout" in str(last_error).lower():
            return self._get_fallback_response("timeout")
        elif any(conn_err in str(last_error).lower() for conn_err in ["connection", "connect", "refused"]):
            return self._get_fallback_response("connection")
        else:
            return self._get_fallback_response("error")
    
    def _try_api_generate(self, prompt: str) -> Optional[str]:
        """
        Try to generate text using the Ollama API with retries and fallbacks
        
        Args:
            prompt: The input prompt to generate a response for
            
        Returns:
            Generated text response or None if all attempts fail
        """
        max_retries = 2
        retry_delay = 1  # Start with 1 second delay
        
        # Log the start of the generation attempt
        print("\n" + "="*80)
        print(f"OllamaClient._try_api_generate() called with prompt: {prompt[:100]}...")
        print(f"Using model: {self.model}")
        print(f"Base URL: {self.url}")
        print(f"Request timeout: {self.timeout} seconds")
        print("="*80 + "\n")
        
        for attempt in range(max_retries + 1):
            try:
                start_time = time.time()
                session = requests.Session()
                session.verify = False  # Disable SSL verification if needed
                
                # Set up session with retry strategy
                retry_strategy = requests.adapters.HTTPAdapter(
                    max_retries=3,
                    status_forcelist=[429, 500, 502, 503, 504],
                    allowed_methods=["POST"]
                )
                session.mount("http://", retry_strategy)
                session.mount("https://", retry_strategy)
                
                print(f"\n" + "-"*50)
                print(f"Attempt {attempt + 1}/{max_retries + 1}: Ollama /api/generate with model {self.model}")
                print(f"URL: {self.url}/api/generate")
                
                # Prepare the payload with optimized parameters for better reliability and speed
                payload = {
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,  # Disable streaming for simpler response handling
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "num_ctx": 2048,  # Reduced context window for faster response
                        "num_predict": 512,  # Limit response length
                        "repeat_penalty": 1.1,
                        "top_k": 40
                    }
                }
                
                # Log request details
                print("\nSending request to Ollama API:")
                print(f"URL: {self.url}/api/generate")
                print(f"Headers: {json.dumps(headers, indent=2)}")
                print(f"Payload: {json.dumps(payload, indent=2)}")
                print(f"Request timeout: {self.timeout} seconds")
                
                # Make the request with timeout handling
                url = f"{self.url}/api/generate"
                headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'OllamaClient/1.0',
                    'Connection': 'keep-alive'
                }
                
                # Make the request with proper timeout handling
                try:
                    response = session.post(
                        url,
                        json=payload,
                        timeout=(10, self.timeout),  # Connect timeout 10s, read timeout from config
                        headers=headers,
                        allow_redirects=True
                    )
                    response.raise_for_status()  # Raise exception for bad status codes
                    
                    # Log successful response
                    print(f"\n✅ Successfully received response from Ollama API")
                    print(f"Status code: {response.status_code}")
                    print(f"Response time: {time.time() - start_time:.2f} seconds")
                    print(f"Response status: {response.status_code}")
                    
                    # Parse and handle the response
                    try:
                        # Parse JSON response
                        result = response.json()
                        print(f"Response keys: {list(result.keys())}")
                        
                        # Extract response text
                        response_text = None
                        if 'response' in result:
                            response_text = result['response']
                            print(f"✓ Found 'response' in result")
                        elif 'text' in result:  # Some APIs use 'text' instead of 'response'
                            response_text = result['text']
                            print(f"✓ Found 'text' in result")
                        else:
                            print(f"⚠ Unexpected response format. Available keys: {list(result.keys())}")
                            response_text = str(result)  # Fallback to string representation
                        
                        # Log response metrics if available
                        if 'total_duration' in result:
                            total_seconds = result['total_duration'] / 1_000_000_000  # Convert nanoseconds to seconds
                            print(f"Response generated in {total_seconds:.2f} seconds")
                        if 'eval_count' in result:
                            print(f"Tokens generated: {result['eval_count']}")
                        
                        if response_text:
                            print(f"Response (first 200 chars): {response_text[:200]}...")
                            return response_text
                        
                        return "Received empty response from model"
                        
                    except json.JSONDecodeError as json_err:
                        print(f"JSON parsing error: {json_err}. Response: {response.text[:200]}...")
                        # Try to handle as streaming response (line-delimited JSON)
                        if hasattr(self, '_handle_streaming_response'):
                            return self._handle_streaming_response(response.text)
                        return None
                        
                except requests.exceptions.HTTPError as http_err:
                    # Handle HTTP errors (status codes >= 400)
                    if hasattr(http_err, 'response') and http_err.response is not None:
                        status_code = http_err.response.status_code
                        print(f"HTTP Error {status_code}: {http_err}")
                        
                        # Handle rate limiting
                        if status_code == 429:  # Too Many Requests
                            retry_after = int(http_err.response.headers.get('Retry-After', retry_delay))
                            print(f"Rate limited. Retrying after {retry_after} seconds...")
                            time.sleep(retry_after)
                            continue
                            
                        # If it's a 404, no point in retrying
                        if status_code == 404:
                            print(f"Model not found (404). Giving up.")
                            return None
                    
                    # For other HTTP errors, we'll retry
                    if attempt < max_retries:
                        wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                        print(f"HTTP error occurred. Retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                        continue
                    
                    print(f"Max retries reached. Giving up.")
                    return None
                    
                except requests.exceptions.RequestException as req_err:
                    # Handle other request exceptions (timeout, connection error, etc.)
                    print(f"Request failed: {req_err.__class__.__name__}: {req_err}")
                    
                    if attempt < max_retries:
                        wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                        print(f"Retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                        continue
                        
                    print(f"Max retries reached. Giving up.")
                    return None
                    
                    return None
                    
            except requests.exceptions.Timeout as timeout_err:
                print(f"Request timed out (attempt {attempt + 1}/{max_retries + 1}): {timeout_err}")
                if attempt >= max_retries:
                    print("Max retries reached for timeout")
                    return None
                time.sleep(retry_delay * (attempt + 1))
                
            except requests.exceptions.RequestException as req_err:
                print(f"Request failed (attempt {attempt + 1}/{max_retries + 1}): {req_err}")
                if attempt >= max_retries:
                    print("Max retries reached for request error")
                    return None
                time.sleep(retry_delay * (attempt + 1))
                
            except Exception as e:
                print(f"Unexpected error in _try_api_generate (attempt {attempt + 1}/{max_retries + 1}): {e}")
                if attempt >= max_retries:
                    print("Max retries reached for unexpected error")
                    return None
                time.sleep(retry_delay * (attempt + 1))
        
        print("All retry attempts failed in _try_api_generate")
        return None
        
    def _handle_streaming_response(self, response_text: str) -> Optional[str]:
        """Handle streaming response format (line-delimited JSON)"""
        try:
            full_response = ""
            lines = [line.strip() for line in response_text.split('\n') if line.strip()]
            print(f"Treating as streaming response with {len(lines)} lines")
            
            for line in lines:
                try:
                    chunk = json.loads(line)
                    if 'response' in chunk:
                        full_response += chunk['response']
                    elif 'text' in chunk:  # Some APIs use 'text' instead of 'response'
                        full_response += chunk['text']
                    elif 'message' in chunk:  # Some APIs use 'message'
                        full_response += chunk['message']
                except json.JSONDecodeError as e:
                    print(f"Could not parse line as JSON: {e}")
                    print(f"Offending line: {line[:200]}...")
                    continue
                except Exception as e:
                    print(f"Error processing chunk: {e}")
                    continue
            
            if full_response:
                print(f"Successfully extracted {len(full_response)} characters from streaming response")
                return full_response
            else:
                print("No valid response content found in streaming data")
                return None
                
        except Exception as e:
            print(f"Error handling streaming response: {e}")
            return None

    def _try_api_completion(self, prompt: str) -> Optional[str]:
        """Try the Ollama /api/completion endpoint as alternative"""
        try:
            print(f"Attempting Ollama /api/completion with model {self.model}")
            
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False
            }
            
            response = requests.post(
                f"{self.url}/api/completion",
                json=payload,
                timeout=self.timeout * 2  # Longer timeout for generation
            )
            
            if response.ok:
                data = response.json()
                if 'response' in data:
                    print(f"Success! Got response from Ollama /api/completion")
                    return data['response']
                else:
                    print(f"Response doesn't contain 'response' key: {list(data.keys())}")
            else:
                print(f"Error response from completion API: {response.text[:100]}")
                
            return None
        except Exception as e:
            print(f"Exception during /api/completion call: {str(e)}")
            return None

    def _run_ollama_command(self, command: List[str], input_text: Optional[str] = None) -> tuple:
        """Run an Ollama command with subprocess and return (success, output/error message, full stderr for diagnostics)"""
        try:
            # Ensure PATH includes common Windows locations (mapped to WSL)
            env = os.environ.copy()
            
            # Add Windows PATH translated for WSL access
            windows_path = env.get("PATH", "")
            additional_paths = [
                "/mnt/c/Program Files/Ollama",  # WSL path to Windows program files
                "/mnt/c/ProgramData/chocolatey/bin",  # Chocolatey installs
                "/mnt/c/Windows/System32",  # System32 for cmd.exe access
            ]
            env["PATH"] = ":".join([windows_path] + additional_paths)
            
            # Also set Windows environment variables for direct access
            env["OLLAMA_HOST"] = self.url.replace("http://", "").replace(":11434", "")
            print(f"Setting OLLAMA_HOST={env['OLLAMA_HOST']} in CLI environment")
            
            # Try multiple command formats to ensure execution
            command_variants = [
                command,  # Original command
                ["wsl", "--distribution", "Ubuntu", "--", *command],  # Explicit WSL call
                ["cmd.exe", "/c", *command],  # Direct Windows command
                ["bash", "-c", " ".join(command)]  # Bash shell execution
            ]
            
            last_error = None
            for cmd_variant in command_variants:
                print(f"Attempting CLI command: {' '.join(cmd_variant)}")
                try:
                    process = subprocess.run(
                        cmd_variant,
                        input=input_text,
                        text=True,
                        capture_output=True,
                        timeout=self.timeout * 2,  # Longer timeout for generation
                        env=env
                    )
                    if process.returncode == 0:
                        print(f"CLI command succeeded with variant: {' '.join(cmd_variant)}")
                        return True, process.stdout, process.stderr
                    else:
                        error_msg = f"Command failed with return code {process.returncode}"
                        print(error_msg)
                        last_error = f"{error_msg}\nSTDERR: {process.stderr}\nSTDOUT: {process.stdout}"
                except subprocess.TimeoutExpired:
                    print(f"CLI command timed out after {self.timeout * 2} seconds with variant: {' '.join(cmd_variant)}")
                    last_error = f"Command timed out after {self.timeout * 2} seconds"
                except FileNotFoundError:
                    print(f"CLI command not found with variant: {' '.join(cmd_variant)}")
                    last_error = f"Command not found: {cmd_variant[0]}"
                except Exception as e:
                    print(f"CLI command failed with exception for variant {' '.join(cmd_variant)}: {str(e)}")
                    last_error = f"Unexpected error: {str(e)}"
            
            return False, "", f"All command variants failed. Last error: {last_error}"
        except Exception as e:
            print(f"Unexpected error in _run_ollama_command: {str(e)}")
            return False, "", f"Unexpected error: {str(e)}"

    def _try_curl_fallback(self, prompt: str) -> Optional[str]:
        """Use curl subprocess as a fallback method"""
        try:
            print("Attempting curl subprocess as fallback")
            
            # Create a temporary JSON file for the payload to avoid escaping issues
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
                payload = {
                    "model": self.model,
                    "prompt": prompt
                }
                json.dump(payload, f)
                temp_file = f.name
            
            # Use the file in the curl command
            curl_cmd = f'curl -s -X POST {self.url}/api/generate -H "Content-Type: application/json" -d @{temp_file}'
            print(f"Curl command: {curl_cmd}")
            
            # Execute the curl command
            result = subprocess.run(curl_cmd, shell=True, text=True, capture_output=True, timeout=self.timeout * 2)  # Longer timeout for generation
            print(f"Curl exit code: {result.returncode}")
            
            # Clean up the temporary file
            try:
                os.unlink(temp_file)
            except:
                pass
            
            if result.stdout:
                try:
                    data = json.loads(result.stdout)
                    print(f"Curl success! Response keys: {list(data.keys())}")
                    if 'response' in data:
                        return data['response']
                    else:
                        print(f"Curl response doesn't contain 'response' key")
                except Exception as e:
                    print(f"Error parsing curl output: {e}")
                    print(f"Raw curl output: {result.stdout[:100]}")
            
            if result.stderr:
                print(f"Curl error: {result.stderr}")
                
            return None
        except Exception as e:
            print(f"Exception during curl fallback: {str(e)}")
            return None

    def _try_cli_fallback(self, prompt: str) -> Optional[str]:
        """Use direct Ollama CLI as final fallback"""
        try:
            print("Attempting direct Ollama CLI command")
            
            # Escape quotes in the prompt for command line
            escaped_prompt = prompt.replace('"', '\\"')
            
            # Prepare list of commands to try
            commands_to_try = [
                f'ollama run {self.model} "{escaped_prompt}"',
                f'cmd.exe /c "ollama.exe run {self.model} \"{escaped_prompt}\""',
                f'cmd.exe /c "C:\\Users\\{os.environ.get("USERNAME")}\\AppData\\Local\\Programs\\Ollama\\ollama.exe run {self.model} \"{escaped_prompt}\""',
            ]
            
            # Try each command until one succeeds
            for ollama_cmd in commands_to_try:
                print(f"Trying Ollama command: {ollama_cmd}")
                
                try:
                    result = self._run_ollama_command(ollama_cmd.split(), input_text=escaped_prompt)
                    if result[0]:
                        print("Ollama CLI command succeeded!")
                        return result[1].strip()
                        
                    print(f"Attempt failed, stderr: {result[2]}")
                except Exception as cmd_err:
                    print(f"Command failed with error: {cmd_err}")
                    continue
            
            # If we got here, all commands failed
            print("All Ollama CLI commands failed")
            return None
        except Exception as e:
            print(f"Exception during Ollama CLI fallback: {str(e)}")
            return None
    
    def _stream_response(self, prompt: str, **kwargs) -> Iterator[str]:
        """
        Stream the response from the API.
        
        Args:
            prompt: The input prompt
            **kwargs: Generation parameters
            
        Yields:
            Response chunks as they are received
        """
        logger = logging.getLogger(__name__)
        
        # Prepare the request payload
        payload = self._prepare_generation_payload(prompt, stream=True, **kwargs)
        
        try:
            session = self._get_http_session()
            response = session.post(
                f"{self.url}/api/generate",
                json=payload,
                stream=True,
                timeout=(self.timeout_config['connect'], self.timeout_config['read'])
            )
            
            if response.status_code != 200:
                error_msg = f"Streaming request failed with status {response.status_code}: {response.text}"
                logger.error(error_msg)
                yield self._get_fallback_response(prompt)
                return
                
            full_response = []
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        if 'response' in chunk:
                            yield chunk['response']
                            full_response.append(chunk['response'])
                            
                        # Check for errors in the stream
                        if 'error' in chunk:
                            logger.error(f"Error in streaming response: {chunk['error']}")
                            break
                            
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to decode streaming response: {e}")
                        break
            
            # Cache the complete response if caching is enabled
            if self.enable_cache and full_response:
                self.cache_response(prompt, ''.join(full_response), **kwargs)
                
        except Exception as e:
            logger.error(f"Error during streaming: {e}")
            yield self._get_fallback_response(prompt)
    
    def _prepare_generation_payload(self, prompt: str, stream: bool = False, **kwargs) -> Dict[str, Any]:
        """Prepare the generation payload with default values and validation."""
        model = kwargs.get('model', self.model)
        
        payload = {
            'model': model,
            'prompt': prompt,
            'stream': stream,
            'options': {
                'temperature': min(max(float(kwargs.get('temperature', 0.7)), 0.1), 1.0),
                'top_p': min(max(float(kwargs.get('top_p', 0.9)), 0.1), 1.0),
                'num_ctx': min(int(kwargs.get('num_ctx', 2048)), 8192),
            }
        }
        
        # Add optional parameters with validation
        if 'max_tokens' in kwargs:
            payload['options']['num_predict'] = min(int(kwargs['max_tokens']), 4096)
            
        if 'top_k' in kwargs:
            payload['options']['top_k'] = max(1, min(int(kwargs['top_k']), 100))
            
        if 'repeat_penalty' in kwargs:
            payload['options']['repeat_penalty'] = max(0.0, min(float(kwargs['repeat_penalty']), 2.0))
            
        return payload
    
    def _try_direct_http(self, prompt: str, **kwargs) -> Optional[str]:
        """
        Try to generate text using a direct HTTP request as a last resort.
        
        Args:
            prompt: The input prompt to generate a response for
            **kwargs: Additional generation parameters
            
        Returns:
            Generated text response or None if the request fails
        """
        logger = logging.getLogger(__name__)
        logger.info("Trying direct HTTP request as last resort...")
        
        # Use the session with retry strategy
        session = self._get_http_session()
        
        # Prepare the request payload
        payload = self._prepare_generation_payload(prompt, stream=False, **kwargs)
        
        try:
            # Try the generate endpoint first
            response = session.post(
                f"{self.url}/api/generate",
                json=payload,
                timeout=(self.timeout_config['connect'], self.timeout_config['read'])
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response')
                
            # If generate fails, try the completion endpoint
            logger.warning(f"Generate endpoint failed with {response.status_code}, trying completion endpoint...")
            
            response = session.post(
                f"{self.url}/api/completion",
                json=payload,
                timeout=(self.timeout_config['connect'], self.timeout_config['read'])
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response')
                
            logger.error(f"Direct HTTP request failed with status {response.status_code}: {response.text}")
            return None
            
        except Exception as e:
            logger.error(f"Direct HTTP request failed: {e}")
            return None
            
    def _get_http_session(self) -> requests.Session:
        """Get or create an HTTP session with connection pooling.
        
        Returns:
            A requests.Session instance with retry strategy
        """
        if self.session is None:
            # Create a new session with connection pooling
            self.session = requests.Session()
            
            # Configure retry strategy
            retry_strategy = requests.adapters.HTTPAdapter(
                max_retries=3,
                pool_connections=10,
                pool_maxsize=100,
                pool_block=False
            )
            
            # Mount the adapter for both http and https
            self.session.mount("http://", retry_strategy)
            self.session.mount("https://", retry_strategy)
            
            # Configure default headers
            self.session.headers.update({
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'OllamaClient/1.0'
            })
            
            # Disable SSL verification warnings for local development
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            self.session.verify = False
            
        return self.session
        
    def _get_fallback_response(self, prompt: str) -> str:
        """Provide a contextual fallback response when the API is unavailable"""
        prompt_lower = prompt.lower()
        
        # Build a detailed error message
        status_info = ""
        if self.model_in_api:
            status_info += f"✓ Model '{self.model}' is available via API\n"
        else:
            status_info += f"✗ Model '{self.model}' is NOT available via API"
            if self.api_models:
                status_info += f" (Available API models: {', '.join(self.api_models)})\n"
            else:
                status_info += f" (No models available via API)\n"
        
        if self.model_in_cli:
            status_info += f"✓ Model '{self.model}' is available via CLI\n"
        else:
            status_info += f"✗ Model '{self.model}' is NOT available via CLI"
            if self.cli_models:
                status_info += f" (Available CLI models: {', '.join(self.cli_models)})\n"
            else:
                status_info += " (No models available via CLI)\n"
                
        # Check for Windows/WSL discrepancy
        if self.model_in_cli and not self.model_in_api:
            status_info += "\nNOTE: You appear to be experiencing the Windows/WSL Ollama model visibility issue.\n"
            status_info += "Models are visible to CLI but not to the API.\n"
            status_info += "This is a known Ollama issue. Try restarting the Ollama server with 'ollama serve'.\n"

    # Model Management Methods

    def list_models(self, refresh: bool = False) -> Dict[str, ModelInfo]:
        """List all available models with their information.
        
        Args:
            refresh: If True, force refresh the model list from the server
            
        Returns:
            Dictionary mapping model names to ModelInfo objects
        """
        if not refresh and self.available_models:
            return self.available_models
            
        try:
            session = self._get_http_session()
            response = session.get(
                f"{self.url}/api/tags",
                timeout=(self.timeout_config['connect'], self.timeout_config['read'])
            )
            
            if response.status_code == 200:
                models_data = response.json().get('models', [])
                with self.model_lock:
                    self.available_models = {
                        model['name']: ModelInfo(
                            name=model['name'],
                            size=model.get('size', 0),
                            modified_at=datetime.fromisoformat(model.get('modified_at', '1970-01-01T00:00:00Z')),
                            is_available=True
                        )
                        for model in models_data
                    }
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            if not self.available_models:  # Only return empty if we have no cached models
                return {}
                
        return self.available_models
    
    def get_model_info(self, model_name: str, refresh: bool = False) -> Optional[ModelInfo]:
        """Get information about a specific model.
        
        Args:
            model_name: Name of the model to get info for
            refresh: If True, force refresh the model list
            
        Returns:
            ModelInfo object if found, None otherwise
        """
        models = self.list_models(refresh=refresh)
        return models.get(model_name)
    
    def pull_model(self, model_name: str) -> bool:
        """Pull a model from the Ollama registry.
        
        Args:
            model_name: Name of the model to pull
            
        Returns:
            True if successful, False otherwise
        """
        try:
            session = self._get_http_session()
            response = session.post(
                f"{self.url}/api/pull",
                json={'name': model_name},
                stream=True,
                timeout=(self.timeout_config['connect'], self.timeout_config['model_load'])
            )
            
            if response.status_code == 200:
                # Stream the response to show progress
                for line in response.iter_lines():
                    if line:
                        status = json.loads(line)
                        logger.info(f"Pulling {model_name}: {status.get('status', '')}")
                
                # Refresh the model list
                self.list_models(refresh=True)
                return True
                
        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {e}")
            
        return False
    
    def remove_model(self, model_name: str) -> bool:
        """Remove a model from the Ollama server.
        
        Args:
            model_name: Name of the model to remove
            
        Returns:
            True if successful, False otherwise
        """
        try:
            session = self._get_http_session()
            response = session.delete(
                f"{self.url}/api/delete",
                json={'name': model_name},
                timeout=(self.timeout_config['connect'], self.timeout_config['read'])
            )
            
            if response.status_code == 200:
                with self.model_lock:
                    if model_name in self.available_models:
                        del self.available_models[model_name]
                return True
                
        except Exception as e:
            logger.error(f"Failed to remove model {model_name}: {e}")
            
        return False
    
    def set_default_model(self, model_name: str) -> bool:
        """Set the default model to use for generation.
        
        Args:
            model_name: Name of the model to set as default
            
        Returns:
            True if the model exists and was set as default, False otherwise
        """
        models = self.list_models()
        if model_name in models:
            self.model = model_name
            return True
        return False
    
    def _update_model_usage(self, model_name: str) -> None:
        """Update the last used timestamp and usage count for a model."""
        with self.model_lock:
            if model_name in self.available_models:
                self.available_models[model_name].last_used = datetime.utcnow()
                self.available_models[model_name].usage_count += 1
    
    # Caching Methods
    
    def _get_cache_key(self, prompt: str, model: Optional[str] = None, **kwargs) -> str:
        """Generate a cache key for the given prompt and parameters."""
        model = model or self.model
        key_data = json.dumps({
            'prompt': prompt,
            'model': model,
            **{k: v for k, v in kwargs.items() if k not in ['stream']}
        }, sort_keys=True)
        return hashlib.sha256(key_data.encode()).hexdigest()
    
    def get_cached_response(self, prompt: str, **kwargs) -> Optional[str]:
        """Get a cached response for the given prompt and parameters."""
        if not self.enable_cache:
            return None
            
        cache_key = self._get_cache_key(prompt, **kwargs)
        if cache_key in self.cache:
            response, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                return response
            # Remove expired cache entry
            del self.cache[cache_key]
        return None
    
    def cache_response(self, prompt: str, response: str, **kwargs) -> None:
        """Cache a response for the given prompt and parameters."""
        if not self.enable_cache:
            return
            
        cache_key = self._get_cache_key(prompt, **kwargs)
        self.cache[cache_key] = (response, time.time())
        
        # Trim cache if it gets too large
        if len(self.cache) > self.MAX_CACHE_SIZE:
            # Remove oldest entries
            oldest_entries = sorted(
                self.cache.items(),
                key=lambda x: x[1][1]
            )[:self.MAX_CACHE_SIZE // 2]
            for key, _ in oldest_entries:
                del self.cache[key]
    
    # Batch Processing Methods
    
    def _process_batch_requests(self) -> None:
        """Background thread to process batch requests."""
        while self.batch_running:
            with self.batch_lock:
                if not self.batch_requests:
                    time.sleep(self.batch_interval)
                    continue
                    
                # Get the next batch request
                batch = self.batch_requests.pop(0)
                
            try:
                # Process the batch
                self._process_batch(batch)
            except Exception as e:
                logger.error(f"Error processing batch: {e}")
                # Set exception for all futures in the batch
                for i in range(len(batch.futures)):
                    batch.set_exception(i, e)
    
    def _process_batch(self, batch: BatchRequest) -> None:
        """Process a single batch of prompts."""
        try:
            # Try to use the batch API if available
            session = self._get_http_session()
            response = session.post(
                f"{self.url}/api/generate/batch",
                json={
                    'model': self.model,
                    'prompts': batch.prompts,
                    'stream': False
                },
                timeout=(self.timeout_config['connect'], len(batch.prompts) * self.timeout_config['read'])
            )
            
            if response.status_code == 200:
                results = response.json().get('responses', [])
                for i, result in enumerate(results):
                    if i < len(batch.futures):
                        batch.set_result(i, result.get('response', ''))
                return
                
            # Fall back to processing prompts individually
            logger.warning("Batch API not available, falling back to individual requests")
            
        except Exception as e:
            logger.error(f"Batch request failed: {e}")
            # Fall through to individual processing
        
        # Process each prompt individually
        for i, prompt in enumerate(batch.prompts):
            try:
                result = self.generate(prompt, use_cache=True)
                batch.set_result(i, result)
            except Exception as e:
                batch.set_exception(i, e)
    
    def generate_batch(
        self,
        prompts: List[str],
        callback: Optional[Callable[[List[str]], None]] = None
    ) -> List[Future]:
        """Generate responses for multiple prompts in batch.
        
        Args:
            prompts: List of prompts to generate responses for
            callback: Optional callback function that will be called with the list of responses
            
        Returns:
            List of Future objects that will contain the responses
        """
        batch = BatchRequest(prompts, callback)
        
        # Start the batch processing thread if not already running
        with self.batch_lock:
            if not self.batch_running and not self.batch_thread:
                self.batch_running = True
                self.batch_thread = threading.Thread(
                    target=self._process_batch_requests,
                    daemon=True
                )
                self.batch_thread.start()
            
            self.batch_requests.append(batch)
        
        return batch.futures
    
    # Cleanup
    
    # Fine-tuning Methods
    
    def create_fine_tune(
        self,
        training_data: Union[str, List[Dict[str, str]]],
        base_model: Optional[str] = None,
        fine_tuned_name: Optional[str] = None,
        num_epochs: int = 3,
        learning_rate: float = 1e-5,
        batch_size: int = 4,
        callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Create a fine-tuned model from training data.
        
        Args:
            training_data: Either a path to a JSONL file or a list of training examples.
                          Each example should be a dict with 'prompt' and 'completion' keys.
            base_model: The base model to fine-tune (defaults to current model)
            fine_tuned_name: Name for the fine-tuned model
            num_epochs: Number of training epochs
            learning_rate: Learning rate for fine-tuning
            batch_size: Batch size for training
            callback: Optional callback function to receive progress updates
            
        Returns:
            Dictionary with fine-tuning job information
        """
        logger = logging.getLogger(__name__)
        
        if not fine_tuned_name and base_model:
            fine_tuned_name = f"{base_model}-fine-tuned-{int(time.time())}"
        elif not fine_tuned_name:
            fine_tuned_name = f"{self.model}-fine-tuned-{int(time.time())}"
            
        base_model = base_model or self.model
        
        # Prepare training data
        if isinstance(training_data, str):
            # Load from file
            try:
                with open(training_data, 'r', encoding='utf-8') as f:
                    training_examples = [json.loads(line) for line in f]
            except Exception as e:
                logger.error(f"Failed to load training data: {e}")
                raise ValueError(f"Failed to load training data: {e}")
        else:
            training_examples = training_data
            
        # Validate training examples
        for i, example in enumerate(training_examples):
            if not isinstance(example, dict) or 'prompt' not in example or 'completion' not in example:
                raise ValueError(f"Training example {i} must be a dict with 'prompt' and 'completion' keys")
                
        # Create a temporary file for the training data
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            for example in training_examples:
                f.write(json.dumps(example) + '\n')
            training_file = f.name
            
        try:
            # Create the fine-tuning job
            session = self._get_http_session()
            
            # Prepare the request payload
            payload = {
                'base_model': base_model,
                'training_file': training_file,
                'model_name': fine_tuned_name,
                'num_epochs': num_epochs,
                'learning_rate': learning_rate,
                'batch_size': batch_size
            }
            
            # Start the fine-tuning job
            response = session.post(
                f"{self.url}/api/fine-tune",
                json=payload,
                stream=True,
                timeout=(self.timeout_config['connect'], self.timeout_config['model_load'] * 10)  # Longer timeout for fine-tuning
            )
            
            if response.status_code != 200:
                error_msg = f"Fine-tuning request failed with status {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)
                
            # Process the streaming response
            result = {}
            for line in response.iter_lines():
                if line:
                    try:
                        update = json.loads(line)
                        if 'status' in update:
                            logger.info(f"Fine-tuning status: {update['status']}")
                            if callback:
                                callback(update)
                        if 'model' in update:
                            result['model'] = update['model']
                        if 'error' in update:
                            raise RuntimeError(f"Fine-tuning error: {update['error']}")
                    except json.JSONDecodeError as e:
                        logger.warning(f"Failed to parse fine-tuning update: {e}")
                        
            # Refresh the model list
            self.list_models(refresh=True)
            
            return {
                'status': 'completed',
                'model': fine_tuned_name,
                'base_model': base_model,
                'num_examples': len(training_examples),
                **result
            }
            
        except Exception as e:
            logger.error(f"Fine-tuning failed: {e}")
            raise
            
        finally:
            # Clean up the temporary file
            try:
                if os.path.exists(training_file):
                    os.remove(training_file)
            except Exception as e:
                logger.warning(f"Failed to clean up training file: {e}")
    
    def list_fine_tunes(self) -> List[Dict[str, Any]]:
        """
        List all fine-tuned models.
        
        Returns:
            List of fine-tuned models with their information
        """
        try:
            session = self._get_http_session()
            response = session.get(
                f"{self.url}/api/fine-tunes",
                timeout=(self.timeout_config['connect'], self.timeout_config['read'])
            )
            
            if response.status_code == 200:
                return response.json().get('models', [])
            else:
                logger.error(f"Failed to list fine-tuned models: {response.status_code} {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error listing fine-tuned models: {e}")
            return []
    
    def get_fine_tune_status(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        Get the status of a fine-tuning job.
        
        Args:
            model_name: Name of the fine-tuned model
            
        Returns:
            Dictionary with fine-tuning status or None if not found
        """
        try:
            session = self._get_http_session()
            response = session.get(
                f"{self.url}/api/fine-tunes/{model_name}",
                timeout=(self.timeout_config['connect'], self.timeout_config['read'])
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Failed to get fine-tune status: {response.status_code} {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting fine-tune status: {e}")
            return None
    
    def cancel_fine_tune(self, model_name: str) -> bool:
        """
        Cancel a running fine-tuning job.
        
        Args:
            model_name: Name of the fine-tuned model to cancel
            
        Returns:
            True if the job was cancelled, False otherwise
        """
        try:
            session = self._get_http_session()
            response = session.post(
                f"{self.url}/api/fine-tunes/{model_name}/cancel",
                timeout=(self.timeout_config['connect'], self.timeout_config['read'])
            )
            
            if response.status_code == 200:
                logger.info(f"Cancelled fine-tuning job for model: {model_name}")
                return True
            else:
                logger.warning(f"Failed to cancel fine-tuning job: {response.status_code} {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error cancelling fine-tuning job: {e}")
            return False
    
    # Cleanup and Resource Management
    
    def close(self) -> None:
        """Clean up resources used by the client."""
        self.batch_running = False
        if self.batch_thread:
            self.batch_thread.join(timeout=5.0)
            self.batch_thread = None
            
        if self.session:
            self.session.close()
            self.session = None
            
        self.thread_pool.shutdown(wait=True)
    
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
    
    # Fallback Response
    
    def _get_fallback_response(self, prompt: str) -> str:
        """Provide a contextual fallback response when the API is unavailable"""
        prompt_lower = prompt.lower()
        
        # First check for specific error patterns
        if any(word in prompt_lower for word in ["help", "what can you do", "who are you"]):
            return self.backup_responses["help"]
        elif any(word in prompt_lower for word in ["code", "example", "snippet"]):
            return self.backup_responses["code"]
        elif any(word in prompt_lower for word in ["timeout", "took too long"]):
            return self.backup_responses["timeout"]
        elif any(word in prompt_lower for word in ["connection", "connect", "refused"]):
            return self.backup_responses["connection"]
        elif any(word in prompt_lower for word in ["help", "assist", "support"]):
            return self.backup_responses["help"]
            
        # Default fallback response
        return self.backup_responses["error"] + "\n\n" + "Ollama service check:\n\n" + status_info + "\n" + \
               "Please ensure that:\n" + \
               "1. The Ollama server is running with `ollama serve`\n" + \
               f"2. Your model is available with `ollama list`\n" + \
               f"3. You can start the model with `ollama run {self.model}`\n\n" + \
               "If it's still not working, check that no other service is using port 11434 and that Ollama is properly installed."
