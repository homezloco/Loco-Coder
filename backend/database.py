# /project-root/backend/database.py

import os
import json
import sqlite3
import logging
import time
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime, timedelta
import threading
from pathlib import Path
import random

# Conditional imports for PostgreSQL
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from psycopg2 import pool
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    logging.warning("psycopg2 not available. PostgreSQL support disabled.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration with fallbacks
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()  # postgres, sqlite, json
DB_PATH = os.getenv("DB_PATH", "data/coder.db")
JSON_DB_PATH = os.getenv("JSON_DB_PATH", "data/db.json")

# PostgreSQL configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "coder")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_URL = os.getenv("DATABASE_URL", "")  # Full connection string if provided

# PostgreSQL connection pooling
DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))

# Database retry settings
DB_MAX_RETRIES = int(os.getenv("DB_MAX_RETRIES", "3"))
DB_RETRY_DELAY = float(os.getenv("DB_RETRY_DELAY", "0.5"))  # seconds

# Ensure data directories exist
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(os.path.dirname(JSON_DB_PATH), exist_ok=True)

# Thread safety for file operations
file_lock = threading.Lock()

# Circuit breaker pattern state
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_time=30):
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.lock = threading.Lock()
    
    def record_failure(self):
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.warning(f"Circuit breaker opened due to {self.failure_count} failures")
    
    def record_success(self):
        with self.lock:
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
                logger.info("Circuit breaker closed after successful recovery")
            elif self.state == "CLOSED":
                self.failure_count = 0
    
    def is_allowed(self):
        with self.lock:
            if self.state == "CLOSED":
                return True
            elif self.state == "OPEN":
                # Check if recovery time has elapsed
                if self.last_failure_time and (time.time() - self.last_failure_time) > self.recovery_time:
                    self.state = "HALF_OPEN"
                    logger.info("Circuit breaker attempting recovery (half-open)")
                    return True
                return False
            elif self.state == "HALF_OPEN":
                return True
            return False

# Create circuit breaker instances
pg_circuit = CircuitBreaker()
sqlite_circuit = CircuitBreaker()


class PgConnectionWrapper:
    """A wrapper for PostgreSQL connection to ensure proper return to the pool"""
    
    def __init__(self, connection, pool):
        self.connection = connection
        self.pool = pool
        self.cursor = None
    
    def __enter__(self):
        return self.connection
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # An exception occurred, rollback
            self.connection.rollback()
            logger.error(f"Transaction rolled back due to {exc_type.__name__}: {exc_val}")
        
        # Return the connection to the pool
        if self.pool and self.connection:
            try:
                self.pool.putconn(self.connection)
            except Exception as e:
                logger.error(f"Error returning connection to pool: {e}")
        
        # Don't suppress any exceptions
        return False

class Database:
    """Database interface with multiple fallback mechanisms"""
    
    def __init__(self):
        """Initialize the database with cascade of fallback options"""
        self.db_type = DB_TYPE
        self.connection = None
        self.pg_pool = None
        self.failed_operations = 0
        
        # Attempt to connect to the preferred database type
        try:
            if self.db_type == "postgres" and POSTGRES_AVAILABLE:
                self._init_postgres()
            elif self.db_type == "sqlite":
                self._init_sqlite()
            else:
                if self.db_type == "postgres" and not POSTGRES_AVAILABLE:
                    logger.warning("PostgreSQL driver not available. Falling back to SQLite.")
                    self.db_type = "sqlite"
                    self._init_sqlite()
                else:
                    logger.info(f"Using JSON file database at {JSON_DB_PATH}")
                    self.db_type = "json"
        except Exception as e:
            logger.error(f"Failed to initialize {self.db_type} database: {e}")
            
            # First fallback: if PostgreSQL fails, try SQLite
            if self.db_type == "postgres":
                logger.info("Falling back to SQLite database")
                try:
                    self.db_type = "sqlite"
                    self._init_sqlite()
                except Exception as e2:
                    logger.error(f"SQLite fallback also failed: {e2}")
                    logger.info("Falling back to JSON file database")
                    self.db_type = "json"
            else:
                # If SQLite fails directly, use JSON
                logger.info("Falling back to JSON file database")
                self.db_type = "json"
    
    def _init_postgres(self) -> None:
        """Initialize PostgreSQL connection pool with schema"""
        if not POSTGRES_AVAILABLE or not pg_circuit.is_allowed():
            raise Exception("PostgreSQL not available or circuit breaker open")
            
        try:
            # Parse connection string if provided, otherwise use individual params
            if DB_URL:
                # Use connection string directly
                self.pg_pool = pool.ThreadedConnectionPool(
                    DB_POOL_MIN, 
                    DB_POOL_MAX,
                    DB_URL
                )
            else:
                # Use individual connection parameters
                self.pg_pool = pool.ThreadedConnectionPool(
                    DB_POOL_MIN,
                    DB_POOL_MAX,
                    host=DB_HOST,
                    port=DB_PORT,
                    database=DB_NAME,
                    user=DB_USER,
                    password=DB_PASSWORD
                )
            
            # Create tables if they don't exist
            with self._get_pg_connection() as conn:
                with conn.cursor() as cursor:
                    # Create tables that match the SQLite schema but with PostgreSQL types
                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS projects (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                    ''')
                    
                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS files (
                        id TEXT PRIMARY KEY,
                        project_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        path TEXT NOT NULL,
                        content TEXT,
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL,
                        FOREIGN KEY (project_id) REFERENCES projects (id)
                    )
                    ''')
                    
                    cursor.execute('''
                    CREATE TABLE IF NOT EXISTS executions (
                        id TEXT PRIMARY KEY,
                        file_id TEXT NOT NULL,
                        code TEXT NOT NULL,
                        output TEXT,
                        status TEXT NOT NULL,
                        executed_at TIMESTAMP NOT NULL,
                        FOREIGN KEY (file_id) REFERENCES files (id)
                    )
                    ''')
                    
                conn.commit()
            
            # Record success in the circuit breaker
            pg_circuit.record_success()
            logger.info("PostgreSQL database initialized successfully")
        except Exception as e:
            logger.error(f"PostgreSQL initialization error: {e}")
            pg_circuit.record_failure()
            if self.pg_pool:
                self.pg_pool.closeall()
                self.pg_pool = None
            raise e
    
    def _get_pg_connection(self):
        """Get a PostgreSQL connection from the pool with retry logic"""
        for attempt in range(DB_MAX_RETRIES):
            try:
                conn = self.pg_pool.getconn()
                return PgConnectionWrapper(conn, self.pg_pool)
            except (psycopg2.OperationalError, psycopg2.pool.PoolError) as e:
                if attempt < DB_MAX_RETRIES - 1:
                    # Random jitter to prevent thundering herd
                    sleep_time = DB_RETRY_DELAY * (1 + random.random())
                    logger.warning(f"Database connection attempt {attempt+1} failed: {e}. Retrying in {sleep_time:.2f}s")
                    time.sleep(sleep_time)
                else:
                    logger.error(f"All database connection attempts failed: {e}")
                    pg_circuit.record_failure()
                    raise
    
    def _init_sqlite(self) -> None:
        """Initialize SQLite database with schema"""
        if not sqlite_circuit.is_allowed():
            raise Exception("SQLite circuit breaker open")
            
        try:
            self.connection = sqlite3.connect(DB_PATH, check_same_thread=False)
            self.connection.row_factory = sqlite3.Row
            
            # Create tables if they don't exist
            cursor = self.connection.cursor()
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            ''')
            
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                content TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
            ''')
            
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS executions (
                id TEXT PRIMARY KEY,
                file_id TEXT NOT NULL,
                code TEXT NOT NULL,
                output TEXT,
                status TEXT NOT NULL,
                executed_at TEXT NOT NULL,
                FOREIGN KEY (file_id) REFERENCES files (id)
            )
            ''')
            
            self.connection.commit()
            # Record success in circuit breaker
            sqlite_circuit.record_success()
            logger.info("SQLite database initialized successfully")
        except Exception as e:
            logger.error(f"SQLite initialization error: {e}")
            sqlite_circuit.record_failure()
            if self.connection:
                self.connection.close()
            self.connection = None
            raise e
    
    def _get_json_data(self) -> Dict:
        """Read JSON database with fallback to empty structure"""
        if not os.path.exists(JSON_DB_PATH):
            return {
                "projects": {},
                "files": {},
                "executions": {}
            }
        
        try:
            with file_lock:
                with open(JSON_DB_PATH, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error reading JSON database: {e}")
            # Attempt to recover from backup
            backup_path = f"{JSON_DB_PATH}.backup"
            if os.path.exists(backup_path):
                try:
                    with open(backup_path, 'r') as f:
                        return json.load(f)
                except:
                    pass
            
            # Return empty structure as fallback
            return {
                "projects": {},
                "files": {},
                "executions": {}
            }
    
    def _save_json_data(self, data: Dict) -> bool:
        """Save data to JSON file with backup"""
        try:
            # Create backup of current file if it exists
            if os.path.exists(JSON_DB_PATH):
                with file_lock:
                    backup_path = f"{JSON_DB_PATH}.backup"
                    with open(JSON_DB_PATH, 'r') as src, open(backup_path, 'w') as dst:
                        dst.write(src.read())
            
            # Write new data
            with file_lock:
                with open(JSON_DB_PATH, 'w') as f:
                    json.dump(data, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving JSON database: {e}")
            return False
    
    def execute_with_fallback(self, operation_name, sqlite_fn, postgres_fn, json_fn):
        """Execute operation with automatic cascade fallbacks"""
        result = None
        success = False
        error_msg = ""
        
        # Try the primary database type first
        try:
            if self.db_type == "postgres" and self.pg_pool:
                if pg_circuit.is_allowed():
                    result = postgres_fn()
                    pg_circuit.record_success()
                    success = True
                else:
                    logger.warning(f"{operation_name}: PostgreSQL circuit breaker open, falling back to SQLite")
                    self.failed_operations += 1
                    error_msg = "PostgreSQL circuit breaker open"
            elif self.db_type == "sqlite" and self.connection:
                if sqlite_circuit.is_allowed():
                    result = sqlite_fn()
                    sqlite_circuit.record_success()
                    success = True
                else:
                    logger.warning(f"{operation_name}: SQLite circuit breaker open, falling back to JSON")
                    error_msg = "SQLite circuit breaker open"
                    self.failed_operations += 1
            elif self.db_type == "json":
                result = json_fn()
                success = True
        except Exception as primary_e:
            error_msg = str(primary_e)
            logger.error(f"Error in {operation_name} using {self.db_type}: {primary_e}")
            
            # Record failure in appropriate circuit breaker
            if self.db_type == "postgres":
                pg_circuit.record_failure()
            elif self.db_type == "sqlite":
                sqlite_circuit.record_failure()
                
            # Increment the failed operations counter
            self.failed_operations += 1
        
        # If primary database failed, try fallbacks in cascade
        if not success:
            # First fallback: PostgreSQL → SQLite
            if self.db_type == "postgres" and self.connection:
                logger.info(f"{operation_name}: Falling back to SQLite")
                try:
                    if sqlite_circuit.is_allowed():
                        result = sqlite_fn()
                        sqlite_circuit.record_success()
                        success = True
                except Exception as fallback1_e:
                    logger.error(f"SQLite fallback for {operation_name} failed: {fallback1_e}")
                    sqlite_circuit.record_failure()
                    error_msg += f", SQLite fallback: {str(fallback1_e)}"
            
            # Final fallback: JSON
            if not success:
                logger.info(f"{operation_name}: Falling back to JSON")
                try:
                    result = json_fn()
                    success = True
                except Exception as fallback2_e:
                    logger.error(f"JSON fallback for {operation_name} failed: {fallback2_e}")
                    error_msg += f", JSON fallback: {str(fallback2_e)}"
        
        # If all fallbacks failed, return a safe default
        if not success:
            logger.critical(f"{operation_name}: All database mechanisms failed: {error_msg}")
            
            # Default return values for different operation types
            if "get_" in operation_name and "_by_id" not in operation_name:
                return []  # List operations return empty list
            elif "get_" in operation_name:
                return None  # Single item operations return None
            else:
                return False  # Write operations return False
        
        return result
    
    def get_projects(self) -> List[Dict[str, Any]]:
        """Get all projects with cascade fallback mechanisms"""
        def sqlite_op():
            cursor = self.connection.cursor()
            cursor.execute("SELECT * FROM projects ORDER BY updated_at DESC")
            return [dict(row) for row in cursor.fetchall()]
        
        def postgres_op():
            with self._get_pg_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("SELECT * FROM projects ORDER BY updated_at DESC")
                    return cursor.fetchall()
        
        def json_op():
            data = self._get_json_data()
            return [proj for proj in data["projects"].values()]
        
        return self.execute_with_fallback("get_projects", sqlite_op, postgres_op, json_op) or []
    
    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get a project by ID with cascade fallback mechanisms"""
        def sqlite_op():
            cursor = self.connection.cursor()
            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        
        def postgres_op():
            with self._get_pg_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
                    return cursor.fetchone()
        
        def json_op():
            data = self._get_json_data()
            return data["projects"].get(project_id)
        
        return self.execute_with_fallback("get_project", sqlite_op, postgres_op, json_op)
    
    def create_project(self, project_id: str, name: str) -> bool:
        """Create a new project with cascade fallback mechanisms"""
        now = datetime.now()
        now_iso = now.isoformat()
        
        def sqlite_op():
            cursor = self.connection.cursor()
            cursor.execute(
                "INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (project_id, name, now_iso, now_iso)
            )
            self.connection.commit()
            return True
        
        def postgres_op():
            with self._get_pg_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO projects (id, name, created_at, updated_at) VALUES (%s, %s, %s, %s)",
                        (project_id, name, now, now)
                    )
                conn.commit()
                return True
        
        def json_op():
            data = self._get_json_data()
            data["projects"][project_id] = {
                "id": project_id,
                "name": name,
                "created_at": now_iso,
                "updated_at": now_iso
            }
            return self._save_json_data(data)
        
        return self.execute_with_fallback("create_project", sqlite_op, postgres_op, json_op)
    
    def get_files(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all files for a project with cascade fallback mechanisms"""
        def sqlite_op():
            cursor = self.connection.cursor()
            cursor.execute(
                "SELECT * FROM files WHERE project_id = ? ORDER BY updated_at DESC",
                (project_id,)
            )
            return [dict(row) for row in cursor.fetchall()]
        
        def postgres_op():
            with self._get_pg_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(
                        "SELECT * FROM files WHERE project_id = %s ORDER BY updated_at DESC",
                        (project_id,)
                    )
                    return cursor.fetchall()
        
        def json_op():
            data = self._get_json_data()
            return [
                file for file in data["files"].values() 
                if file["project_id"] == project_id
            ]
        
        return self.execute_with_fallback("get_files", sqlite_op, postgres_op, json_op) or []
    
    def get_file(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get a file by ID with cascade fallback mechanisms"""
        def sqlite_op():
            cursor = self.connection.cursor()
            cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        
        def postgres_op():
            with self._get_pg_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("SELECT * FROM files WHERE id = %s", (file_id,))
                    return cursor.fetchone()
        
        def json_op():
            data = self._get_json_data()
            return data["files"].get(file_id)
        
        return self.execute_with_fallback("get_file", sqlite_op, postgres_op, json_op)
    
    def save_file(self, file_id: str, project_id: str, name: str, 
                 path: str, content: str) -> bool:
        """Save a file with cascade fallback mechanisms"""
        now = datetime.now()
        now_iso = now.isoformat()
        
        def sqlite_op():
            cursor = self.connection.cursor()
            
            # Check if file already exists
            cursor.execute("SELECT id FROM files WHERE id = ?", (file_id,))
            exists = cursor.fetchone() is not None
            
            if exists:
                cursor.execute(
                    "UPDATE files SET name = ?, path = ?, content = ?, updated_at = ? WHERE id = ?", 
                    (name, path, content, now_iso, file_id)
                )
            else:
                cursor.execute(
                    "INSERT INTO files (id, project_id, name, path, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", 
                    (file_id, project_id, name, path, content, now_iso, now_iso)
                )
            
            self.connection.commit()
            return True
        
        def postgres_op():
            with self._get_pg_connection() as conn:
                with conn.cursor() as cursor:
                    # Check if file already exists
                    cursor.execute("SELECT id FROM files WHERE id = %s", (file_id,))
                    exists = cursor.fetchone() is not None
                    
                    if exists:
                        cursor.execute(
                            "UPDATE files SET name = %s, path = %s, content = %s, updated_at = %s WHERE id = %s", 
                            (name, path, content, now, file_id)
                        )
                    else:
                        cursor.execute(
                            "INSERT INTO files (id, project_id, name, path, content, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s)", 
                            (file_id, project_id, name, path, content, now, now)
                        )
                conn.commit()
                return True
        
        def json_op():
            data = self._get_json_data()
            
            if file_id in data["files"]:
                data["files"][file_id].update({
                    "name": name,
                    "path": path,
                    "content": content,
                    "updated_at": now_iso
                })
            else:
                data["files"][file_id] = {
                    "id": file_id,
                    "project_id": project_id,
                    "name": name,
                    "path": path,
                    "content": content,
                    "created_at": now_iso,
                    "updated_at": now_iso
                }
            
            return self._save_json_data(data)
        
        result = self.execute_with_fallback("save_file", sqlite_op, postgres_op, json_op)
        
        # Always try to save to filesystem as an ultimate fallback regardless of DB success
        self._save_to_filesystem(project_id, path, content)
        
        return result
    
    def log_execution(self, execution_id: str, file_id: str, 
                     code: str, output: str, status: str) -> bool:
        """Log code execution with cascade fallback mechanisms"""
        now = datetime.now()
        now_iso = now.isoformat()
        
        def sqlite_op():
            cursor = self.connection.cursor()
            cursor.execute(
                "INSERT INTO executions (id, file_id, code, output, status, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
                (execution_id, file_id, code, output, status, now_iso)
            )
            self.connection.commit()
            return True
        
        def postgres_op():
            with self._get_pg_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO executions (id, file_id, code, output, status, executed_at) VALUES (%s, %s, %s, %s, %s, %s)",
                        (execution_id, file_id, code, output, status, now)
                    )
                conn.commit()
                return True
        
        def json_op():
            data = self._get_json_data()
            data["executions"][execution_id] = {
                "id": execution_id,
                "file_id": file_id,
                "code": code,
                "output": output,
                "status": status,
                "executed_at": now_iso
            }
            return self._save_json_data(data)
        
        result = self.execute_with_fallback("log_execution", sqlite_op, postgres_op, json_op)
        
        # Additional fallback to filesystem
        try:
            log_dir = "data/execution_logs"
            os.makedirs(log_dir, exist_ok=True)
            log_path = os.path.join(log_dir, f"{execution_id}.log")
            with open(log_path, 'w') as f:
                f.write(f"File ID: {file_id}\n")
                f.write(f"Status: {status}\n")
                f.write(f"Executed at: {now_iso}\n")
                f.write(f"Code:\n{code}\n\n")
                f.write(f"Output:\n{output}\n")
        except Exception as log_e:
            logger.error(f"Failed to log to filesystem: {log_e}")
        return result

    def _save_to_filesystem(self, project_id: str, path: str, content: str) -> None:
        """Save file content to filesystem as an additional fallback"""
        try:
            # Create directory structure for projects
            file_dir = os.path.join("data", "filesystem", project_id, os.path.dirname(path))
            os.makedirs(file_dir, exist_ok=True)
            
            # Save the file
            full_path = os.path.join("data", "filesystem", project_id, path)
            with open(full_path, 'w') as f:
                f.write(content)
        except Exception as e:
            logger.error(f"Error saving to filesystem: {e}")
            # This is a fallback itself, so no further action needed

    def close(self):
        """Properly close all database connections"""
        if self.connection:
            try:
                self.connection.close()
                logger.info("SQLite connection closed")
            except Exception as e:
                logger.error(f"Error closing SQLite connection: {e}")
            finally:
                self.connection = None
                
        if self.pg_pool:
            try:
                self.pg_pool.closeall()
                logger.info("PostgreSQL connection pool closed")
            except Exception as e:
                logger.error(f"Error closing PostgreSQL pool: {e}")
            finally:
                self.pg_pool = None
    
    def get_status(self) -> Dict[str, Any]:
        """Get database connection status information"""
        status = {
            "type": self.db_type,
            "healthy": False,
            "failed_operations": self.failed_operations,
            "fallbacks": []
        }
        
        # Check current database health
        if self.db_type == "postgres" and self.pg_pool:
            try:
                with self._get_pg_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT 1")
                        status["healthy"] = True
                status["circuit_state"] = pg_circuit.state
                status["fallbacks"] = ["sqlite", "json"]
            except Exception:
                status["healthy"] = False
        elif self.db_type == "sqlite" and self.connection:
            try:
                cursor = self.connection.cursor()
                cursor.execute("SELECT 1")
                status["healthy"] = True
                status["circuit_state"] = sqlite_circuit.state
                status["fallbacks"] = ["json"]
            except Exception:
                status["healthy"] = False
        elif self.db_type == "json":
            try:
                self._get_json_data()
                status["healthy"] = True
                status["fallbacks"] = []
            except Exception:
                status["healthy"] = False
                
        return status


# SQLAlchemy session management
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base

# Create SQLAlchemy engine
engine = None
if DB_TYPE == 'postgres' and POSTGRES_AVAILABLE:
    db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(db_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
elif DB_TYPE == 'sqlite':
    engine = create_engine(f'sqlite:///{DB_PATH}', connect_args={"check_same_thread": False})
else:
    # Fallback to SQLite in memory if no valid DB type is specified
    engine = create_engine('sqlite:///:memory:', connect_args={"check_same_thread": False})

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a scoped session factory
Session = scoped_session(SessionLocal)

# Dependency to get DB session
def get_db_session():
    """
    Get a database session.
    
    Yields:
        Session: A database session
    """
    db = Session()
    try:
        yield db
    finally:
        db.close()

# Base class for SQLAlchemy models
Base = declarative_base()

# Initialize database tables
def init_db():
    """Initialize the database by creating all tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

# Singleton database instance
db = Database()
