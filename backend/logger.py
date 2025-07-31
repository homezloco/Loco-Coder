#!/usr/bin/env python
"""
Configurable logging module for Local AI Coding Platform with fallback mechanisms
"""
import os
import sys
import logging
import json
import time
from pathlib import Path
from logging.handlers import RotatingFileHandler, QueueHandler
import threading
import queue
from datetime import datetime
import traceback
import atexit

class FallbackLogger:
    """
    Logger with multiple fallback mechanisms:
    1. Primary: Rotating file logger with JSON formatting
    2. Fallback 1: Simple file logger with text formatting
    3. Fallback 2: Console logger
    4. Fallback 3: In-memory buffer with periodic flush to disk
    """
    
    def __init__(
        self,
        name="coder",
        log_dir=None,
        level=logging.INFO,
        max_size_mb=10,
        backup_count=5,
        enable_console=True,
        json_format=True,
        buffer_size=1000,
        flush_interval=60  # seconds
    ):
        """Initialize the fallback logger with multiple logging options"""
        self.name = name
        self.level = self._get_log_level(level)
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.backup_count = backup_count
        self.enable_console = enable_console
        self.json_format = json_format
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval
        self.memory_buffer = []
        self.buffer_lock = threading.Lock()
        
        # Determine log directory with fallbacks
        self.log_dir = self._setup_log_directory(log_dir)
        
        # Setup the Python logger
        self.logger = logging.getLogger(name)
        self.logger.setLevel(self.level)
        
        # Clear any existing handlers
        if self.logger.hasHandlers():
            self.logger.handlers.clear()
        
        # Primary logging setup
        self.setup_primary_logging()
        
        # Set up periodic flushing of in-memory buffer
        self._start_flush_timer()
        
        # Register exit handler to ensure logs are flushed on shutdown
        atexit.register(self.shutdown)
        
        # Log startup information
        self.info(f"Logger initialized: {name}", {
            "log_dir": str(self.log_dir),
            "level": logging.getLevelName(self.level),
            "enable_console": enable_console,
            "json_format": json_format
        })
    
    def _get_log_level(self, level):
        """Convert string or int level to proper logging level with fallback"""
        if isinstance(level, int):
            return level
        
        level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL
        }
        
        if isinstance(level, str) and level.upper() in level_map:
            return level_map[level.upper()]
        
        # Fallback to INFO if invalid level
        return logging.INFO
    
    def _setup_log_directory(self, log_dir):
        """Set up log directory with fallbacks"""
        # Try the provided directory first
        if log_dir:
            directory = Path(log_dir)
        else:
            # Try environment variable
            env_log_dir = os.environ.get("LOG_DIR")
            if env_log_dir:
                directory = Path(env_log_dir)
            else:
                # Fallback to default
                directory = Path("./logs")
        
        # Try to create the directory
        try:
            directory.mkdir(parents=True, exist_ok=True)
            return directory
        except Exception as e:
            # Fallback to system temp directory
            print(f"Warning: Failed to create log directory {directory}: {e}")
            try:
                import tempfile
                temp_dir = Path(tempfile.gettempdir()) / "coder_logs"
                temp_dir.mkdir(parents=True, exist_ok=True)
                return temp_dir
            except Exception as e2:
                # Final fallback to current directory
                print(f"Warning: Failed to create temp log directory: {e2}")
                return Path(".")
    
    def setup_primary_logging(self):
        """Set up the primary logging mechanism with fallbacks"""
        handlers_added = False
        
        # Try setting up rotating file handler
        try:
            file_path = self.log_dir / f"{self.name}.log"
            file_handler = RotatingFileHandler(
                filename=file_path,
                maxBytes=self.max_size_bytes,
                backupCount=self.backup_count,
                encoding="utf-8"
            )
            file_handler.setLevel(self.level)
            
            # Use JSON formatting if enabled
            if self.json_format:
                file_handler.setFormatter(logging.Formatter("%(message)s"))
            else:
                formatter = logging.Formatter(
                    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                )
                file_handler.setFormatter(formatter)
            
            self.logger.addHandler(file_handler)
            handlers_added = True
        except Exception as e:
            print(f"Warning: Could not set up rotating file handler: {e}")
        
        # Set up simple file handler as fallback
        if not handlers_added:
            try:
                simple_file_path = self.log_dir / f"{self.name}_simple.log"
                simple_handler = logging.FileHandler(
                    filename=simple_file_path,
                    encoding="utf-8"
                )
                simple_handler.setLevel(self.level)
                simple_formatter = logging.Formatter(
                    "%(asctime)s - %(levelname)s - %(message)s"
                )
                simple_handler.setFormatter(simple_formatter)
                self.logger.addHandler(simple_handler)
                handlers_added = True
            except Exception as e:
                print(f"Warning: Could not set up simple file handler: {e}")
        
        # Set up console handler if enabled or as fallback
        if self.enable_console or not handlers_added:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(self.level)
            console_formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            console_handler.setFormatter(console_formatter)
            self.logger.addHandler(console_handler)
            handlers_added = True
        
        # If all else fails, we'll use the in-memory buffer
        # which is always available as a final fallback
    
    def _format_log_entry(self, level, message, data=None, exc_info=None):
        """Format a log entry, with JSON if enabled"""
        if self.json_format:
            entry = {
                "timestamp": datetime.now().isoformat(),
                "level": logging.getLevelName(level),
                "message": message
            }
            
            if data:
                if isinstance(data, dict):
                    entry["data"] = data
                else:
                    entry["data"] = {"value": str(data)}
            
            if exc_info:
                entry["exception"] = {
                    "type": exc_info[0].__name__,
                    "message": str(exc_info[1]),
                    "traceback": traceback.format_exception(*exc_info)
                }
            
            return json.dumps(entry)
        else:
            log_msg = message
            if data:
                log_msg += f" - {data}"
            return log_msg
    
    def _add_to_buffer(self, level, message, data=None, exc_info=None):
        """Add log entry to memory buffer"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            "data": data,
        }
        
        if exc_info:
            # Handle both boolean True and exception info tuple
            if exc_info is True:
                # Get current exception info if exc_info is True
                exc_info = sys.exc_info()
            
            if isinstance(exc_info, (tuple, list)) and len(exc_info) == 3:
                exc_type, exc_value, exc_traceback = exc_info
                entry["exception"] = {
                    "type": exc_type.__name__ if exc_type else "UnknownException",
                    "message": str(exc_value) if exc_value else "No exception message",
                    "traceback": traceback.format_exception(exc_type, exc_value, exc_traceback) if exc_type and exc_value else []
                }
            else:
                # Fallback for unexpected exc_info format
                entry["exception"] = {
                    "type": "LoggerError",
                    "message": f"Invalid exc_info format: {type(exc_info)}",
                    "traceback": []
                }
        
        with self.buffer_lock:
            self.memory_buffer.append(entry)
            
            # Trim buffer if it gets too large
            if len(self.memory_buffer) > self.buffer_size:
                self.memory_buffer = self.memory_buffer[-self.buffer_size:]
    
    def _flush_buffer(self):
        """Flush the memory buffer to disk"""
        with self.buffer_lock:
            if not self.memory_buffer:
                return
            
            try:
                buffer_path = self.log_dir / f"{self.name}_buffer.log"
                with open(buffer_path, "a", encoding="utf-8") as f:
                    for entry in self.memory_buffer:
                        # Convert to JSON for storage
                        f.write(json.dumps(entry) + "\n")
                
                # Clear the buffer
                self.memory_buffer.clear()
            except Exception as e:
                # If we can't flush, keep the buffer but print warning
                print(f"Warning: Failed to flush log buffer to disk: {e}")
    
    def _start_flush_timer(self):
        """Start the timer to periodically flush the buffer"""
        def flush_and_reschedule():
            self._flush_buffer()
            # Schedule the next flush
            timer = threading.Timer(self.flush_interval, flush_and_reschedule)
            timer.daemon = True
            timer.start()
        
        # Start the initial timer
        timer = threading.Timer(self.flush_interval, flush_and_reschedule)
        timer.daemon = True
        timer.start()
    
    def log(self, level, message, data=None, exc_info=None):
        """Log a message at the specified level with fallbacks"""
        try:
            # Format the message
            formatted_message = self._format_log_entry(level, message, data, exc_info)
            
            # Try to log using the Python logger
            self.logger.log(level, formatted_message, exc_info=exc_info)
        except Exception as e:
            # Fallback to memory buffer
            self._add_to_buffer(level, message, data, exc_info)
            
            # Print to console as a last resort
            print(f"Logging error (falling back to buffer): {e}")
            print(f"Original log: [{logging.getLevelName(level)}] {message}")
    
    def debug(self, message, data=None, exc_info=None):
        """Log a debug message"""
        self.log(logging.DEBUG, message, data, exc_info)
    
    def info(self, message, data=None, exc_info=None):
        """Log an info message"""
        self.log(logging.INFO, message, data, exc_info)
    
    def warning(self, message, data=None, exc_info=None):
        """Log a warning message"""
        self.log(logging.WARNING, message, data, exc_info)
    
    def error(self, message, data=None, exc_info=None):
        """Log an error message"""
        self.log(logging.ERROR, message, data, exc_info)
    
    def critical(self, message, data=None, exc_info=None):
        """Log a critical message"""
        self.log(logging.CRITICAL, message, data, exc_info)
    
    def exception(self, message, data=None):
        """Log an exception (with traceback)"""
        self.log(logging.ERROR, message, data, exc_info=sys.exc_info())
    
    def shutdown(self):
        """Shutdown the logger and ensure all logs are flushed"""
        self._flush_buffer()
        logging.shutdown()

# Create a default logger instance
default_logger = FallbackLogger()
