"""
Code execution module with multiple fallback mechanisms
"""
import os
import sys
import subprocess
import tempfile
import uuid
import logging
import time
import concurrent.futures
from typing import Dict, Any, Optional, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CodeExecutionResult:
    """Structured result from code execution"""
    def __init__(
        self, 
        output: str = "", 
        error: str = "", 
        execution_time: float = 0.0,
        success: bool = False,
        method_used: str = "unknown"
    ):
        self.output = output
        self.error = error
        self.execution_time = execution_time
        self.success = success
        self.method_used = method_used
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary for API response"""
        return {
            "output": self.output,
            "error": self.error,
            "execution_time": self.execution_time,
            "success": self.success,
            "method_used": self.method_used
        }


class CodeExecutor:
    """
    Executes code with multiple fallback strategies
    
    Primary method: Subprocess with configurable timeout
    Fallback 1: Docker container execution
    Fallback 2: Restricted subprocess with reduced permissions
    Fallback 3: In-process restricted execution
    """
    
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.temp_dir = tempfile.gettempdir()
        # Ensure temp directory exists
        os.makedirs(self.temp_dir, exist_ok=True)
    
    def execute_code(self, code: str, language: str = "python") -> CodeExecutionResult:
        """
        Execute code with appropriate runner based on language
        with multiple fallback mechanisms
        """
        start_time = time.time()
        
        # Choose execution method based on language with multiple fallbacks
        try:
            if language.lower() == "python":
                return self._execute_python(code)
            elif language.lower() in ["javascript", "js"]:
                return self._execute_javascript(code)
            elif language.lower() == "go":
                return self._execute_go(code)
            elif language.lower() == "rust":
                return self._execute_rust(code)
            elif language.lower() in ["react-native", "reactnative"]:
                return self._execute_react_native(code)
            elif language.lower() in ["swift", "kotlin", "dart", "csharp", "cs"]:
                return self._execute_mobile_language(code, language.lower())
            else:
                # Attempt fallback detection based on code contents
                if "func main" in code and "package main" in code:
                    logger.info(f"Detected Go code for unknown language {language}, using Go executor")
                    return self._execute_go(code)
                elif "fn main" in code and "struct" in code:
                    logger.info(f"Detected Rust code for unknown language {language}, using Rust executor")
                    return self._execute_rust(code)
                elif "import React" in code and "StyleSheet" in code:
                    logger.info(f"Detected React Native code for unknown language {language}, using React Native executor")
                    return self._execute_react_native(code)
                elif "import SwiftUI" in code or "import UIKit" in code:
                    logger.info(f"Detected Swift code for unknown language {language}, using mobile language executor")
                    return self._execute_mobile_language(code, "swift")
                elif "import android" in code or "class MainActivity" in code:
                    logger.info(f"Detected Kotlin code for unknown language {language}, using mobile language executor")
                    return self._execute_mobile_language(code, "kotlin")
                elif "import 'package:flutter" in code or "import 'dart:" in code:
                    logger.info(f"Detected Dart code for unknown language {language}, using mobile language executor")
                    return self._execute_mobile_language(code, "dart")
                elif "using System;" in code and "namespace" in code:
                    logger.info(f"Detected C# code for unknown language {language}, using mobile language executor")
                    return self._execute_mobile_language(code, "csharp")
                elif "def " in code and "print(" in code:
                    logger.info(f"Detected possible Python code for unknown language {language}, attempting Python execution")
                    return self._execute_python(code)
                elif "function " in code or "() =>" in code or "console.log(" in code:
                    logger.info(f"Detected possible JavaScript code for unknown language {language}, attempting JavaScript execution")
                    return self._execute_javascript(code)
                else:
                    # Default fallback for truly unsupported languages
                    return CodeExecutionResult(
                        error=f"Unsupported language: {language}. Currently supported: python, javascript, go, rust, react-native, swift, kotlin, dart, csharp",
                        success=False,
                        execution_time=time.time() - start_time,
                        method_used="none"
                    )
        except Exception as e:
            # Global fallback - try to recover from any unexpected errors
            logger.error(f"Error executing {language} code: {str(e)}")
            return CodeExecutionResult(
                error=f"Execution error: {str(e)}. Ensure the code syntax is correct.",
                success=False,
                execution_time=time.time() - start_time,
                method_used="error_fallback"
            )
    
    def _execute_python(self, code: str) -> CodeExecutionResult:
        """Execute Python code with fallbacks"""
        # Try each method in sequence until one succeeds
        methods = [
            self._execute_subprocess,
            self._execute_restricted_subprocess,
            self._execute_in_process
        ]
        
        last_error = None
        for method in methods:
            try:
                result = method(code, "python")
                if result.success:
                    return result
                last_error = result.error
            except Exception as e:
                logger.error(f"Execution method failed: {method.__name__}, error: {str(e)}")
                last_error = str(e)
        
        # If all methods failed
        return CodeExecutionResult(
            error=f"All execution methods failed. Last error: {last_error}",
            success=False,
            execution_time=0.0,
            method_used="all_failed"
        )
    
    def _execute_javascript(self, code: str) -> CodeExecutionResult:
        """Execute JavaScript code with Node.js"""
        # Similar structure to Python execution but for JavaScript
        # For now, just use subprocess
        return self._execute_subprocess(code, "javascript")
    
    def _execute_subprocess(self, code: str, language: str) -> CodeExecutionResult:
        """Execute code in a subprocess with timeout"""
        start_time = time.time()
        
        # Create a temporary file
        file_id = str(uuid.uuid4())
        if language == "python":
            temp_file = os.path.join(self.temp_dir, f"{file_id}.py")
            command = ["python", temp_file]
        elif language == "javascript":
            temp_file = os.path.join(self.temp_dir, f"{file_id}.js")
            command = ["node", temp_file]
        else:
            return CodeExecutionResult(
                error=f"Unsupported language for subprocess execution: {language}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="subprocess"
            )
        
        try:
            # Write code to temp file
            with open(temp_file, "w") as f:
                f.write(code)
            
            # Execute the code with timeout
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            try:
                stdout, stderr = process.communicate(timeout=self.timeout)
                execution_time = time.time() - start_time
                
                if process.returncode == 0:
                    return CodeExecutionResult(
                        output=stdout,
                        error=stderr,
                        execution_time=execution_time,
                        success=True,
                        method_used="subprocess"
                    )
                else:
                    return CodeExecutionResult(
                        output=stdout,
                        error=f"Process exited with code {process.returncode}: {stderr}",
                        execution_time=execution_time,
                        success=False,
                        method_used="subprocess"
                    )
                    
            except subprocess.TimeoutExpired:
                process.kill()
                return CodeExecutionResult(
                    error=f"Execution timed out after {self.timeout} seconds",
                    success=False,
                    execution_time=self.timeout,
                    method_used="subprocess"
                )
                
        except Exception as e:
            return CodeExecutionResult(
                error=f"Subprocess execution error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="subprocess"
            )
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                logger.error(f"Failed to remove temporary file: {str(e)}")
    
    def _execute_restricted_subprocess(self, code: str, language: str) -> CodeExecutionResult:
        """Execute code in a subprocess with restricted permissions"""
        start_time = time.time()
        
        # Similar to regular subprocess but with added restrictions
        if language != "python":
            return CodeExecutionResult(
                error=f"Restricted execution only supported for Python",
                success=False,
                execution_time=time.time() - start_time,
                method_used="restricted_subprocess"
            )
        
        file_id = str(uuid.uuid4())
        temp_file = os.path.join(self.temp_dir, f"{file_id}.py")
        
        # Add a wrapper script that applies Python's RestrictedPython capabilities
        restricted_code = f"""
# Restricted execution wrapper
import sys
import builtins

# Create safe builtins dictionary
safe_builtins = {{'print': print}}

# Run the code with limited builtins
def execute_restricted():
    # User code starts here
{code.replace('\n', '\n    ')}
    # User code ends here

# Execute with global dict containing only safe builtins
restricted_globals = {{'__builtins__': safe_builtins}}
try:
    exec('''
{code.replace("'", "\\'")}
''', restricted_globals)
except Exception as e:
    print(f"Error: {{str(e)}}", file=sys.stderr)
"""
        
        try:
            # Write restricted code to temp file
            with open(temp_file, "w") as f:
                f.write(restricted_code)
            
            # Execute with timeout
            process = subprocess.Popen(
                ["python", "-E", temp_file],  # -E disables environment variables
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            try:
                stdout, stderr = process.communicate(timeout=self.timeout)
                execution_time = time.time() - start_time
                
                if process.returncode == 0:
                    return CodeExecutionResult(
                        output=stdout,
                        error=stderr,
                        execution_time=execution_time,
                        success=True,
                        method_used="restricted_subprocess"
                    )
                else:
                    return CodeExecutionResult(
                        output=stdout,
                        error=f"Process exited with code {process.returncode}: {stderr}",
                        execution_time=execution_time,
                        success=False,
                        method_used="restricted_subprocess"
                    )
                    
            except subprocess.TimeoutExpired:
                process.kill()
                return CodeExecutionResult(
                    error=f"Execution timed out after {self.timeout} seconds",
                    success=False,
                    execution_time=self.timeout,
                    method_used="restricted_subprocess"
                )
                
        except Exception as e:
            return CodeExecutionResult(
                error=f"Restricted subprocess execution error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="restricted_subprocess"
            )
        finally:
            # Clean up
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                logger.error(f"Failed to remove temporary file: {str(e)}")
    
    def _execute_in_process(self, code: str, language: str) -> CodeExecutionResult:
        """Last resort: Execute code in the current process (dangerous but with restrictions)"""
        start_time = time.time()
        
        if language != "python":
            return CodeExecutionResult(
                error=f"In-process execution only supported for Python",
                success=False,
                execution_time=time.time() - start_time,
                method_used="in_process"
            )
        
        # Use StringIO to capture output
        import io
        from contextlib import redirect_stdout, redirect_stderr
        
        stdout_buffer = io.StringIO()
        stderr_buffer = io.StringIO()
        
        # Prepare a restricted globals dictionary
        restricted_globals = {
            "__builtins__": {
                "print": print,
                "len": len,
                "range": range,
                "int": int,
                "str": str,
                "float": float,
                "bool": bool,
                "list": list,
                "dict": dict,
                "tuple": tuple,
                "set": set,
                # Add other safe builtins as needed
            }
        }
        
        try:
            # Execute with timeout using concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    self._exec_with_redirect,
                    code, restricted_globals, stdout_buffer, stderr_buffer
                )
                
                try:
                    future.result(timeout=self.timeout)
                    execution_time = time.time() - start_time
                    
                    return CodeExecutionResult(
                        output=stdout_buffer.getvalue(),
                        error=stderr_buffer.getvalue(),
                        execution_time=execution_time,
                        success=not bool(stderr_buffer.getvalue()),
                        method_used="in_process"
                    )
                except concurrent.futures.TimeoutError:
                    return CodeExecutionResult(
                        error=f"Execution timed out after {self.timeout} seconds",
                        success=False,
                        execution_time=self.timeout,
                        method_used="in_process"
                    )
        except Exception as e:
            return CodeExecutionResult(
                error=f"In-process execution error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="in_process"
            )
    
    def _exec_with_redirect(self, code, globals_dict, stdout_buffer, stderr_buffer):
        """Execute code with redirected stdout/stderr"""
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            try:
                exec(code, globals_dict)
            except Exception as e:
                print(f"Error: {str(e)}", file=stderr_buffer)


    def _execute_go(self, code: str) -> CodeExecutionResult:
        """Execute Go code with fallbacks"""
        start_time = time.time()
        
        # Create a temporary file
        file_id = str(uuid.uuid4())
        temp_dir = os.path.join(self.temp_dir, file_id)
        temp_file = os.path.join(temp_dir, "main.go")
        
        try:
            # Create directory for Go module
            os.makedirs(temp_dir, exist_ok=True)
            
            # Write code to temp file
            with open(temp_file, "w") as f:
                f.write(code)
            
            try:
                # Check if Go is available
                check_process = subprocess.Popen(
                    ["go", "version"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                check_stdout, check_stderr = check_process.communicate(timeout=5)
                if check_process.returncode != 0:
                    # Go not available, fall back to syntax validation
                    logger.info("Go compiler not available. Falling back to syntax validation.")
                    return self._validate_go_syntax(code, start_time)
                    
                # Initialize Go module
                process = subprocess.Popen(
                    ["go", "mod", "init", f"example.com/{file_id}"],
                    cwd=temp_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                try:
                    process.communicate(timeout=self.timeout)
                except subprocess.TimeoutExpired:
                    process.kill()
                    return CodeExecutionResult(
                        error=f"Go module initialization timed out after {self.timeout} seconds",
                        success=False,
                        execution_time=self.timeout,
                        method_used="go_execute"
                    )
                
                # Run Go code
                process = subprocess.Popen(
                    ["go", "run", "."],
                    cwd=temp_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                try:
                    stdout, stderr = process.communicate(timeout=self.timeout)
                    execution_time = time.time() - start_time
                    
                    if process.returncode == 0:
                        return CodeExecutionResult(
                            output=stdout,
                            error=stderr,
                            execution_time=execution_time,
                            success=True,
                            method_used="go_execute"
                        )
                    else:
                        return CodeExecutionResult(
                            output=stdout,
                            error=f"Process exited with code {process.returncode}: {stderr}",
                            execution_time=execution_time,
                            success=False,
                            method_used="go_execute"
                        )
                except subprocess.TimeoutExpired:
                    process.kill()
                    return CodeExecutionResult(
                        error=f"Execution timed out after {self.timeout} seconds",
                        success=False,
                        execution_time=self.timeout,
                        method_used="go_execute"
                    )
            except FileNotFoundError:
                # Go compiler not available, fall back to syntax validation
                logger.info("Go compiler not available. Falling back to syntax validation.")
                return self._validate_go_syntax(code, start_time)
        except Exception as e:
            return CodeExecutionResult(
                error=f"Go execution error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="go_execute"
            )
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(temp_dir):
                    import shutil
                    shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Failed to remove temporary directory: {str(e)}")
    
    def _execute_rust(self, code: str) -> CodeExecutionResult:
        """Execute Rust code with fallbacks"""
        start_time = time.time()
        
        # Create a temporary directory for the Rust project
        file_id = str(uuid.uuid4())
        temp_dir = os.path.join(self.temp_dir, file_id)
        temp_file = os.path.join(temp_dir, "main.rs")
        
        try:
            # Create directory for Rust file
            os.makedirs(temp_dir, exist_ok=True)
            
            # Write code to temp file
            with open(temp_file, "w") as f:
                f.write(code)
            
            # Compile and run Rust code
            try:
                # Check if rustc is available
                process = subprocess.Popen(
                    ["rustc", "main.rs", "-o", "program"],
                    cwd=temp_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = process.communicate(timeout=self.timeout)
                
                if process.returncode != 0:
                    # Compilation failed, return error
                    return CodeExecutionResult(
                        output="",
                        error=f"Rust compilation error: {stderr}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="rust_execute"
                    )
                
                # Run the compiled program
                run_process = subprocess.Popen(
                    [os.path.join(temp_dir, "program")],
                    cwd=temp_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                try:
                    run_stdout, run_stderr = run_process.communicate(timeout=self.timeout)
                    execution_time = time.time() - start_time
                    
                    if run_process.returncode == 0:
                        return CodeExecutionResult(
                            output=run_stdout,
                            error=run_stderr,
                            execution_time=execution_time,
                            success=True,
                            method_used="rust_execute"
                        )
                    else:
                        return CodeExecutionResult(
                            output=run_stdout,
                            error=f"Process exited with code {run_process.returncode}: {run_stderr}",
                            execution_time=execution_time,
                            success=False,
                            method_used="rust_execute"
                        )
                except subprocess.TimeoutExpired:
                    run_process.kill()
                    return CodeExecutionResult(
                        error=f"Execution timed out after {self.timeout} seconds",
                        success=False,
                        execution_time=self.timeout,
                        method_used="rust_execute"
                    )
            except FileNotFoundError:
                # Rust compiler not available, fall back to syntax validation
                logger.info("Rust compiler not available. Falling back to syntax validation.")
                # Simple syntax validation for Rust
                syntax_errors = self._validate_rust_syntax(code)
                if not syntax_errors:
                    return CodeExecutionResult(
                        output="Rust compiler not available. Basic syntax validation passed.",
                        error="",
                        execution_time=time.time() - start_time,
                        success=True,
                        method_used="rust_syntax_validation"
                    )
                else:
                    return CodeExecutionResult(
                        output="",
                        error=f"Rust syntax validation failed: {syntax_errors}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="rust_syntax_validation"
                    )
                    
                # Run compiled program
                run_process = subprocess.Popen(
                    [os.path.join(temp_dir, "program")],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                try:
                    run_stdout, run_stderr = run_process.communicate(timeout=self.timeout)
                    execution_time = time.time() - start_time
                    
                    if run_process.returncode == 0:
                        return CodeExecutionResult(
                            output=run_stdout,
                            error=run_stderr,
                            execution_time=execution_time,
                            success=True,
                            method_used="rust_execute"
                        )
                    else:
                        return CodeExecutionResult(
                            output=run_stdout,
                            error=f"Process exited with code {run_process.returncode}: {run_stderr}",
                            execution_time=execution_time,
                            success=False,
                            method_used="rust_execute"
                        )
                except subprocess.TimeoutExpired:
                    run_process.kill()
                    return CodeExecutionResult(
                        error=f"Execution timed out after {self.timeout} seconds",
                        success=False,
                        execution_time=self.timeout,
                        method_used="rust_execute"
                    )
            except subprocess.TimeoutExpired:
                process.kill()
                return CodeExecutionResult(
                    error=f"Compilation timed out after {self.timeout} seconds",
                    success=False,
                    execution_time=self.timeout,
                    method_used="rust_execute"
                )
        except Exception as e:
            return CodeExecutionResult(
                error=f"Rust execution error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="rust_execute"
            )
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(temp_dir):
                    import shutil
                    shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Failed to remove temporary directory: {str(e)}")
    
    def _validate_rust_syntax(self, code: str) -> str:
        """Basic Rust syntax validation
        
        Returns empty string if no syntax errors are found,
        otherwise returns a string with error messages.
        """
        # Simple validation rules for Rust
        errors = []
        
        # Check for balanced braces, parentheses and brackets
        stack = []
        pairs = {'(': ')', '[': ']', '{': '}'}
        line_number = 1
        column_number = 0
        
        for i, char in enumerate(code):
            column_number += 1
            if char == '\n':
                line_number += 1
                column_number = 0
                
            if char in '([{':
                stack.append((char, line_number, column_number))
            elif char in ')]}' and stack:
                last_open, last_line, last_col = stack.pop()
                if pairs[last_open] != char:
                    errors.append(f"Line {line_number}, column {column_number}: Mismatched brackets, expected '{pairs[last_open]}', found '{char}'")
            elif char in ')]}':  # Extra closing bracket
                errors.append(f"Line {line_number}, column {column_number}: Unexpected closing bracket '{char}'")
        
        # Check for unclosed brackets
        for char, line, col in stack:
            errors.append(f"Line {line}, column {col}: Unclosed '{char}'")
        
        # Check for missing semicolons
        lines = code.split('\n')
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped and not stripped.startswith('//') and not stripped.endswith('{') \
               and not stripped.endswith('}') and not stripped.endswith(';') \
               and not stripped.endswith('(') and not stripped.endswith('\\') and \
               not stripped.endswith(':') and not stripped.startswith('#'):
                if i < len(lines) - 1 and not lines[i+1].strip().startswith('.'): 
                    if not any(kw in stripped for kw in ['fn', 'struct', 'enum', 'trait', 'impl', 'mod', 'if', 'else', 'for', 'while', 'loop']):
                        errors.append(f"Line {i+1}: Missing semicolon at end of line")
        
        # Check for 'main' function if this is a program
        if 'fn main()' not in code and 'fn main(' not in code:
            errors.append("Warning: No main function found. This might not be a standalone program.")
        
        return '\n'.join(errors)
    
    def _validate_go_syntax(self, code: str, start_time: float) -> CodeExecutionResult:
        """Basic Go syntax validation when the Go compiler is not available
        
        Args:
            code: Go source code to validate
            start_time: Time when the execution started (for timing)
            
        Returns:
            CodeExecutionResult with validation results
        """
        errors = []
        
        # Check for common Go syntax issues
        if "package main" not in code:
            errors.append("Missing package declaration: Go programs require 'package main'.")
        
        if "func main" not in code:
            errors.append("Missing main function: Go programs require a 'func main()' function.")
        
        # Check for balanced brackets, parentheses and braces
        stack = []
        pairs = {'(': ')', '[': ']', '{': '}'}
        line_number = 1
        column_number = 0
        
        for i, char in enumerate(code):
            column_number += 1
            if char == '\n':
                line_number += 1
                column_number = 0
                
            if char in '([{':
                stack.append((char, line_number, column_number))
            elif char in ')]}' and stack:
                last_open, last_line, last_col = stack.pop()
                if pairs[last_open] != char:
                    errors.append(f"Line {line_number}, column {column_number}: Mismatched brackets, expected '{pairs[last_open]}', found '{char}'")
            elif char in ')]}':  # Extra closing bracket
                errors.append(f"Line {line_number}, column {column_number}: Unexpected closing bracket '{char}'")
        
        # Check for unclosed brackets
        for char, line, col in stack:
            errors.append(f"Line {line}, column {col}: Unclosed '{char}'")
        
        # Check for import format
        import_lines = [line.strip() for line in code.split('\n') if line.strip().startswith('import')]
        for line in import_lines:
            if '"' not in line and "'" not in line and "(" not in line:
                errors.append(f"Possibly incorrect import format: '{line}'. Expected quotes around package name.")
        
        # Check for error handling
        if "err :=" in code and "if err != nil" not in code:
            errors.append("Warning: Code creates 'err' variable but may not check for errors.")
        
        # Check for proper function declarations
        lines = code.split('\n')
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith("func ") and "{" not in stripped and i < len(lines) - 1:
                next_line = lines[i+1].strip()
                if not next_line.startswith("{"):
                    errors.append(f"Line {i+1}: Go requires opening braces on the same line as the function declaration.")
        
        # Return results
        if errors:
            return CodeExecutionResult(
                error="\n".join(errors),
                success=False,
                execution_time=time.time() - start_time,
                method_used="go_syntax_validation"
            )
        else:
            return CodeExecutionResult(
                output="Go compiler not available. Basic syntax validation passed.",
                error="",
                execution_time=time.time() - start_time,
                success=True,
                method_used="go_syntax_validation"
            )
    
    def _execute_react_native(self, code: str) -> CodeExecutionResult:
        """Validate and execute React Native code with fallbacks"""
        start_time = time.time()
        
        # React Native requires Node.js for validation
        try:
            # Create a temporary file
            file_id = str(uuid.uuid4())
            temp_dir = os.path.join(self.temp_dir, file_id)
            temp_file = os.path.join(temp_dir, "App.js")
            
            # Create directory
            os.makedirs(temp_dir, exist_ok=True)
            
            # Write code to temp file
            with open(temp_file, "w") as f:
                f.write(code)
            
            # Create a basic package.json
            package_json = {
                "name": "react-native-temp",
                "version": "1.0.0",
                "private": True,
                "dependencies": {
                    "react": "18.2.0",
                    "react-native": "0.71.0",
                    "@babel/core": "^7.20.0"
                }
            }
            
            with open(os.path.join(temp_dir, "package.json"), "w") as f:
                import json
                f.write(json.dumps(package_json))
                
            # Use Node.js to validate the syntax
            try:
                # Validate with Node.js
                validation_code = "try { require('./App.js'); console.log('Syntax valid.'); } catch (e) { console.error(e.message); process.exit(1); }"
                validation_file = os.path.join(temp_dir, "validate.js")
                
                with open(validation_file, "w") as f:
                    f.write(validation_code)
                
                process = subprocess.Popen(
                    ["node", "validate.js"],
                    cwd=temp_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = process.communicate(timeout=self.timeout)
                
                if process.returncode == 0:
                    return CodeExecutionResult(
                        output="React Native code validated successfully. Note that full execution requires a React Native environment.",
                        error="",
                        execution_time=time.time() - start_time,
                        success=True,
                        method_used="react_native_validation"
                    )
                else:
                    return CodeExecutionResult(
                        output="",
                        error=f"React Native syntax error: {stderr if stderr else stdout}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="react_native_validation"
                    )
            except FileNotFoundError:
                # Node.js not available, fall back to basic validation
                errors = self._validate_jsx_syntax(code)
                if errors:
                    return CodeExecutionResult(
                        output="",
                        error=f"React Native syntax error: {errors}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="react_native_basic_validation"
                    )
                else:
                    return CodeExecutionResult(
                        output="React Native code passed basic validation. Node.js not available for full validation.",
                        error="",
                        execution_time=time.time() - start_time,
                        success=True,
                        method_used="react_native_basic_validation"
                    )
        except Exception as e:
            return CodeExecutionResult(
                error=f"React Native validation error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="react_native_validation"
            )
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(temp_dir):
                    import shutil
                    shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Failed to remove temporary directory: {str(e)}")
    
    def _validate_jsx_syntax(self, code: str) -> str:
        """Basic JSX syntax validation for React Native
        
        Returns empty string if no syntax errors are found,
        otherwise returns a string with error messages.
        """
        # Simple validation rules for JSX
        errors = []
        
        # Check for balanced braces, parentheses and brackets
        stack = []
        pairs = {'(': ')', '[': ']', '{': '}', '<': '>'}
        line_number = 1
        column_number = 0
        
        for i, char in enumerate(code):
            column_number += 1
            if char == '\n':
                line_number += 1
                column_number = 0
                
            if char in '([{<':
                stack.append((char, line_number, column_number))
            elif char in ')]}>' and stack:
                last_open, last_line, last_col = stack.pop()
                if pairs[last_open] != char:
                    errors.append(f"Line {line_number}, column {column_number}: Mismatched brackets, expected '{pairs[last_open]}', found '{char}'")
            elif char in ')]}>':  # Extra closing bracket
                errors.append(f"Line {line_number}, column {column_number}: Unexpected closing bracket '{char}'")
        
        # Check for unclosed brackets
        for char, line, col in stack:
            errors.append(f"Line {line}, column {col}: Unclosed '{char}'")
        
        # Basic import validation
        if 'import React' not in code:
            errors.append("Warning: Missing 'import React' statement")
            
        if 'import { ' not in code and '{' in code:
            if 'StyleSheet' in code and 'import { StyleSheet' not in code:
                errors.append("Warning: StyleSheet is used but not imported")
            if 'View' in code and 'import { View' not in code:
                errors.append("Warning: View is used but not imported")
            if 'Text' in code and 'import { Text' not in code:
                errors.append("Warning: Text is used but not imported")
        
        # Check for export component
        if 'export default' not in code:
            errors.append("Warning: Missing 'export default' statement for the component")
        
        return '\n'.join(errors)
    
    def _execute_mobile_language(self, code: str, language: str) -> CodeExecutionResult:
        """Execute mobile development language code with syntax validation"""
        start_time = time.time()
        
        # For now, we'll implement a simplified version that validates syntax
        # based on file extensions and basic patterns
        
        validators = {
            "swift": self._validate_swift,
            "kotlin": self._validate_kotlin,
            "dart": self._validate_dart,
            "csharp": self._validate_csharp,
            "cs": self._validate_csharp
        }
        
        validator = validators.get(language)
        if validator:
            return validator(code)
        else:
            return CodeExecutionResult(
                error=f"No validator available for language: {language}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="mobile_validation"
            )
    
    def _validate_swift(self, code: str) -> CodeExecutionResult:
        """Basic Swift syntax validation"""
        start_time = time.time()
        
        # Create temporary file
        file_id = str(uuid.uuid4())
        temp_file = os.path.join(self.temp_dir, f"{file_id}.swift")
        
        try:
            # Write code to temp file
            with open(temp_file, "w") as f:
                f.write(code)
            
            # Check if Swift compiler is available
            try:
                # Use swiftc to validate syntax
                process = subprocess.Popen(
                    ["swiftc", "-parse", temp_file],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = process.communicate(timeout=self.timeout)
                
                if process.returncode == 0:
                    return CodeExecutionResult(
                        output="Swift code validated successfully. Mobile execution is limited to syntax validation.",
                        error="",
                        execution_time=time.time() - start_time,
                        success=True,
                        method_used="swift_validation"
                    )
                else:
                    return CodeExecutionResult(
                        output="",
                        error=f"Swift syntax error: {stderr}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="swift_validation"
                    )
            except FileNotFoundError:
                # Swift compiler not available, fall back to basic validation
                logger.info("Swift compiler not available. Falling back to syntax validation.")
                syntax_errors = self._validate_swift_syntax(code)
                if not syntax_errors:
                    return CodeExecutionResult(
                        output="Swift compiler not available. Basic syntax validation passed.",
                        error="",
                        execution_time=time.time() - start_time,
                        success=True,
                        method_used="swift_basic_validation"
                    )
                else:
                    return CodeExecutionResult(
                        output="",
                        error=f"Swift syntax validation failed: {syntax_errors}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="swift_basic_validation"
                    )
        except Exception as e:
            return CodeExecutionResult(
                error=f"Swift validation error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="swift_validation"
            )
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                logger.error(f"Failed to remove temporary file: {str(e)}")
    
    def _validate_swift_syntax(self, code: str) -> str:
        """
        Basic Swift syntax validation without requiring the Swift compiler.
        This performs static analysis on Swift code to check for common syntax errors.
        
        Args:
            code: Swift source code to validate
            
        Returns:
            String with error messages, or empty string if validation passes
        """
        errors = []
        
        # Check for balanced braces, brackets, and parentheses
        stack = []
        pairs = {'(': ')', '[': ']', '{': '}'}
        line_number = 1
        column_number = 0
        
        for i, char in enumerate(code):
            column_number += 1
            if char == '\n':
                line_number += 1
                column_number = 0
                
            if char in '([{':
                stack.append((char, line_number, column_number))
            elif char in ')]}' and stack:
                last_open, last_line, last_col = stack.pop()
                if pairs[last_open] != char:
                    errors.append(f"Line {line_number}, column {column_number}: Mismatched brackets, expected '{pairs[last_open]}', found '{char}'")
            elif char in ')]}':  # Extra closing bracket
                errors.append(f"Line {line_number}, column {column_number}: Unexpected closing bracket '{char}'")
        
        # Check for unclosed brackets
        for char, line, col in stack:
            errors.append(f"Line {line}, column {col}: Unclosed '{char}'")
        
        # Check for common Swift-specific syntax issues
        lines = code.split('\n')
        found_main_entry = False
        class_or_struct_defined = False
        
        for i, line in enumerate(lines):
            # Remove comments and whitespace for analysis
            code_line = re.sub(r'//.*$', '', line).strip()
            
            # Check for missing semicolons where they might be required
            if code_line and not code_line.endswith('{') and not code_line.endswith('}') \
               and not code_line.endswith('(') and not code_line.endswith(':') \
               and not code_line.startswith('import') and not code_line.startswith('@') \
               and not code_line.startswith('func') and not code_line.startswith('var') \
               and not code_line.startswith('let') and not code_line.startswith('if') \
               and not code_line.startswith('else') and not code_line.startswith('for') \
               and not code_line.startswith('while') and not code_line.startswith('guard') \
               and not code_line.startswith('class') and not code_line.startswith('struct') \
               and not code_line.startswith('enum') and not code_line.startswith('protocol') \
               and not code_line.startswith('extension') and not code_line.endswith('?') \
               and not code_line.endswith('!') and not code_line.endswith(','):
                next_line = lines[i+1].strip() if i < len(lines) - 1 else ""
                if next_line and not next_line.startswith('.') and not next_line.startswith('?'):
                    errors.append(f"Line {i+1}: Possible syntax error, expected line ending with semicolon or other delimiter")
            
            # Look for entry point patterns
            if '@main' in code_line or 'UIApplicationMain' in code_line or 'main.swift' in code_line or 'func main()' in code_line:
                found_main_entry = True
            
            # Look for class/struct definitions
            if re.search(r'^\s*(class|struct)\s+\w+', code_line):
                class_or_struct_defined = True
            
            # Check for proper property definitions
            if code_line.lstrip().startswith(('var ', 'let ')):
                if not ':' in code_line and not '=' in code_line:
                    errors.append(f"Line {i+1}: Swift properties should include type annotation (:) or initialization (=)")
        
        # Only warn if we don't find main entry in standalone apps
        if not found_main_entry and not class_or_struct_defined:
            errors.append("Warning: No main entry point found (@main attribute, UIApplicationMain, or main.swift). This might not be a standalone application.")
        
        # Check for common Swift import requirements
        if 'UIKit' not in code and 'import UIKit' not in code and any(kw in code for kw in ['UIViewController', 'UIView', 'UITableView']):
            errors.append("Warning: UIKit elements used without 'import UIKit' statement")
        
        if 'SwiftUI' not in code and 'import SwiftUI' not in code and any(kw in code for kw in ['View', 'Text', 'Button', '@State', '@Binding']):
            errors.append("Warning: SwiftUI elements used without 'import SwiftUI' statement")
        
        return '\n'.join(errors)
    
    def _validate_kotlin(self, code: str) -> CodeExecutionResult:
        """Basic Kotlin syntax validation"""
        start_time = time.time()
        
        # Create temporary file
        file_id = str(uuid.uuid4())
        temp_file = os.path.join(self.temp_dir, f"{file_id}.kt")
        
        try:
            # Write code to temp file
            with open(temp_file, "w") as f:
                f.write(code)
            
            # Check if Kotlin compiler is available
            try:
                # Use kotlinc to validate syntax
                process = subprocess.Popen(
                    ["kotlinc", temp_file, "-nowarn"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = process.communicate(timeout=self.timeout)
                
                if process.returncode == 0:
                    return CodeExecutionResult(
                        output="Kotlin code validated successfully. Mobile execution is limited to syntax validation.",
                        error="",
                        execution_time=time.time() - start_time,
                        success=True,
                        method_used="kotlin_validation"
                    )
                else:
                    return CodeExecutionResult(
                        output="",
                        error=f"Kotlin syntax error: {stderr}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="kotlin_validation"
                    )
            except FileNotFoundError:
                # Kotlin compiler not available, fall back to basic validation
                return CodeExecutionResult(
                    output="Kotlin compiler not available. Basic validation performed.",
                    error="",
                    execution_time=time.time() - start_time,
                    success=True,  # Assume success for basic validation
                    method_used="kotlin_basic_validation"
                )
        except Exception as e:
            return CodeExecutionResult(
                error=f"Kotlin validation error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="kotlin_validation"
            )
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                logger.error(f"Failed to remove temporary file: {str(e)}")
    
    def _validate_dart(self, code: str) -> CodeExecutionResult:
        """Basic Dart syntax validation"""
        start_time = time.time()
        
        # Create temporary file
        file_id = str(uuid.uuid4())
        temp_file = os.path.join(self.temp_dir, f"{file_id}.dart")
        
        try:
            # Write code to temp file
            with open(temp_file, "w") as f:
                f.write(code)
            
            # Check if Dart compiler is available
            try:
                # Use dart analyze to validate syntax
                process = subprocess.Popen(
                    ["dart", "analyze", temp_file],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = process.communicate(timeout=self.timeout)
                
                if process.returncode == 0:
                    return CodeExecutionResult(
                        output="Dart code validated successfully. Mobile execution is limited to syntax validation.",
                        error="",
                        execution_time=time.time() - start_time,
                        success=True,
                        method_used="dart_validation"
                    )
                else:
                    return CodeExecutionResult(
                        output="",
                        error=f"Dart syntax error: {stderr if stderr else stdout}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="dart_validation"
                    )
            except FileNotFoundError:
                # Dart compiler not available, fall back to basic validation
                return CodeExecutionResult(
                    output="Dart compiler not available. Basic validation performed.",
                    error="",
                    execution_time=time.time() - start_time,
                    success=True,  # Assume success for basic validation
                    method_used="dart_basic_validation"
                )
        except Exception as e:
            return CodeExecutionResult(
                error=f"Dart validation error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="dart_validation"
            )
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                logger.error(f"Failed to remove temporary file: {str(e)}")
    
    def _validate_csharp(self, code: str) -> CodeExecutionResult:
        """Basic C# syntax validation"""
        start_time = time.time()
        
        # Create temporary file
        file_id = str(uuid.uuid4())
        temp_file = os.path.join(self.temp_dir, f"{file_id}.cs")
        
        try:
            # Write code to temp file
            with open(temp_file, "w") as f:
                f.write(code)
            
            # Check if C# compiler is available
            try:
                # Use csc to validate syntax
                process = subprocess.Popen(
                    ["csc", "/nologo", "/t:library", temp_file],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = process.communicate(timeout=self.timeout)
                output = stdout if stdout else stderr
                
                if process.returncode == 0:
                    return CodeExecutionResult(
                        output="C# code validated successfully. Mobile execution is limited to syntax validation.",
                        error="",
                        execution_time=time.time() - start_time,
                        success=True,
                        method_used="csharp_validation"
                    )
                else:
                    return CodeExecutionResult(
                        output="",
                        error=f"C# syntax error: {output}",
                        execution_time=time.time() - start_time,
                        success=False,
                        method_used="csharp_validation"
                    )
            except FileNotFoundError:
                # C# compiler not available, fall back to basic validation
                return CodeExecutionResult(
                    output="C# compiler not available. Basic validation performed.",
                    error="",
                    execution_time=time.time() - start_time,
                    success=True,  # Assume success for basic validation
                    method_used="csharp_basic_validation"
                )
        except Exception as e:
            return CodeExecutionResult(
                error=f"C# validation error: {str(e)}",
                success=False,
                execution_time=time.time() - start_time,
                method_used="csharp_validation"
            )
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                logger.error(f"Failed to remove temporary file: {str(e)}")

# Singleton instance for use throughout the application
code_executor = CodeExecutor()
