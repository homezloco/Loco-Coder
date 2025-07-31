#!/usr/bin/env python
"""
Test runner for the Local AI Coding Platform
Runs all unit tests with proper reporting and fallbacks
"""
import os
import sys
import unittest
import argparse
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("test_runner")

def discover_and_run_tests(test_dir=None, pattern="test_*.py", verbosity=2, failfast=False):
    """Discover and run tests with proper error handling and fallbacks"""
    start_time = time.time()
    
    # Default to the backend/tests directory if none specified
    if test_dir is None:
        # Use the script's directory to find the backend/tests directory
        script_dir = Path(__file__).parent.absolute()
        test_dir = script_dir / "backend" / "tests"
    else:
        test_dir = Path(test_dir)
    
    logger.info(f"Discovering tests in: {test_dir}")
    
    if not test_dir.exists():
        logger.error(f"Test directory does not exist: {test_dir}")
        print(f"❌ ERROR: Test directory not found: {test_dir}")
        return False
    
    try:
        # Discover tests
        test_loader = unittest.TestLoader()
        test_suite = test_loader.discover(
            str(test_dir),
            pattern=pattern
        )
        
        # Count tests
        test_count = test_suite.countTestCases()
        if test_count == 0:
            logger.warning(f"No tests found in {test_dir} with pattern {pattern}")
            print(f"⚠️ WARNING: No tests found in {test_dir} with pattern {pattern}")
            return False
        
        print(f"\n🧪 Running {test_count} tests from {test_dir}")
        print("=" * 80)
        
        # Create test runner with XML reporting capability
        runner = unittest.TextTestRunner(verbosity=verbosity, failfast=failfast)
        
        # Run tests
        result = runner.run(test_suite)
        
        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        
        # Print summary
        print("\n" + "=" * 80)
        print(f"✅ Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
        print(f"❌ Failed: {len(result.failures)}")
        print(f"⚠️ Errors: {len(result.errors)}")
        print(f"⏱️  Time elapsed: {elapsed_time:.2f} seconds")
        
        # Return True if all tests passed
        return len(result.failures) == 0 and len(result.errors) == 0
        
    except Exception as e:
        logger.error(f"Error running tests: {e}")
        print(f"❌ ERROR: Failed to run tests: {e}")
        return False

def run_specific_test_module(module_name, verbosity=2):
    """Run a specific test module by name with proper error handling"""
    try:
        # Import the module
        print(f"\n🧪 Running specific test module: {module_name}")
        print("=" * 80)
        
        # Try to import and run the module
        try:
            __import__(module_name)
            module = sys.modules[module_name]
            
            # Run the tests in the module
            runner = unittest.TextTestRunner(verbosity=verbosity)
            result = runner.run(unittest.TestLoader().loadTestsFromModule(module))
            
            # Print summary
            print("\n" + "=" * 80)
            print(f"✅ Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
            print(f"❌ Failed: {len(result.failures)}")
            print(f"⚠️ Errors: {len(result.errors)}")
            
            return len(result.failures) == 0 and len(result.errors) == 0
        
        except ImportError:
            logger.error(f"Could not import test module: {module_name}")
            print(f"❌ ERROR: Could not import test module: {module_name}")
            
            # Fallback: Try to find the module in backend/tests
            script_dir = Path(__file__).parent.absolute()
            test_dir = script_dir / "backend" / "tests"
            sys.path.append(str(test_dir.parent))
            
            try:
                module_name_short = module_name.split('.')[-1]
                __import__(f"tests.{module_name_short}")
                module = sys.modules[f"tests.{module_name_short}"]
                
                runner = unittest.TextTestRunner(verbosity=verbosity)
                result = runner.run(unittest.TestLoader().loadTestsFromModule(module))
                
                # Print summary
                print("\n" + "=" * 80)
                print(f"✅ Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
                print(f"❌ Failed: {len(result.failures)}")
                print(f"⚠️ Errors: {len(result.errors)}")
                
                return len(result.failures) == 0 and len(result.errors) == 0
                
            except ImportError as e:
                logger.error(f"Fallback import failed: {e}")
                print(f"❌ ERROR: Could not find test module. Tried both {module_name} and tests.{module_name_short}")
                return False
    
    except Exception as e:
        logger.error(f"Error running specific test module: {e}")
        print(f"❌ ERROR: Failed to run specific test: {e}")
        return False

def main():
    """Main entry point with argument parsing"""
    parser = argparse.ArgumentParser(description='Run tests for the Local AI Coding Platform')
    parser.add_argument('-d', '--dir', help='Directory to search for tests')
    parser.add_argument('-p', '--pattern', default='test_*.py', help='Pattern to match test files')
    parser.add_argument('-v', '--verbosity', type=int, default=2, help='Verbosity level')
    parser.add_argument('-f', '--failfast', action='store_true', help='Stop on first failure')
    parser.add_argument('-m', '--module', help='Run a specific test module')
    
    args = parser.parse_args()
    
    print("\n🔍 Local AI Coding Platform - Test Runner")
    print("=" * 80)
    
    if args.module:
        success = run_specific_test_module(args.module, args.verbosity)
    else:
        success = discover_and_run_tests(
            test_dir=args.dir,
            pattern=args.pattern,
            verbosity=args.verbosity,
            failfast=args.failfast
        )
    
    # Return exit code based on test results
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
