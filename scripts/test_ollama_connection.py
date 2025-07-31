#!/usr/bin/env python3
"""
Test script to verify Ollama connection from the backend.
This helps isolate whether connection issues are in the frontend or backend.
"""
import sys
import os
import json
import logging
import asyncio
from typing import Dict, Any, Optional
import httpx
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ollama_test.log')
    ]
)
logger = logging.getLogger('ollama_test')

# Configuration
TEST_TIMEOUT = 60  # seconds
OLLAMA_URL = "http://172.28.112.1:11434"  # Direct Windows host IP from WSL
MODEL = "codellama:instruct"

async def test_ollama_connection() -> Dict[str, Any]:
    """Test connection to Ollama API with detailed diagnostics."""
    results = {
        'success': False,
        'endpoints': {},
        'error': None,
        'models': [],
        'version': None,
        'system_info': None
    }
    
    async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
        # Test basic API availability
        try:
            # Test 1: Check if Ollama API is reachable
            logger.info(f"Testing connection to Ollama at {OLLAMA_URL}")
            response = await client.get(f"{OLLAMA_URL}/api/version")
            response.raise_for_status()
            version_data = response.json()
            results['version'] = version_data
            results['endpoints']['/api/version'] = '✅ Success'
            logger.info(f"Ollama version: {version_data}")
            
            # Test 2: List available models
            logger.info("Fetching available models...")
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            response.raise_for_status()
            models_data = response.json()
            results['models'] = models_data.get('models', [])
            results['endpoints']['/api/tags'] = '✅ Success'
            logger.info(f"Available models: {[m['name'] for m in results['models']]}")
            
            # Test 3: System info
            logger.info("Fetching system info...")
            response = await client.get(f"{OLLAMA_URL}/api/show")
            if response.status_code == 200:  # This endpoint might not be available in all versions
                results['system_info'] = response.json()
                results['endpoints']['/api/show'] = '✅ Success'
            
            # Test 4: Try a simple generation
            logger.info("Testing model generation...")
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": MODEL,
                    "prompt": "Reply with 'Hello, Ollama!' if you can hear me.",
                    "stream": False,
                    "options": {"temperature": 0.7}
                },
                timeout=30.0  # Shorter timeout for generation
            )
            
            if response.status_code == 200:
                gen_data = response.json()
                results['generation'] = {
                    'response': gen_data.get('response'),
                    'model': gen_data.get('model'),
                    'tokens_used': gen_data.get('eval_count')
                }
                results['endpoints']['/api/generate'] = '✅ Success'
                logger.info(f"Generation successful: {gen_data.get('response', '')[:100]}...")
            else:
                results['endpoints']['/api/generate'] = f"❌ Failed: {response.status_code} {response.text}"
                logger.error(f"Generation failed: {response.status_code} {response.text}")
            
            results['success'] = True
            
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP error: {e.response.status_code} {e.response.text}"
            results['error'] = error_msg
            logger.error(error_msg)
        except httpx.RequestError as e:
            error_msg = f"Request failed: {str(e)}"
            results['error'] = error_msg
            logger.error(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            results['error'] = error_msg
            logger.error(error_msg, exc_info=True)
    
    return results

async def main():
    """Run the Ollama connection tests and display results."""
    print("\n" + "="*60)
    print("OLLAMA CONNECTION TESTER")
    print("="*60)
    print(f"Testing connection to: {OLLAMA_URL}")
    print(f"Test model: {MODEL}")
    print("-"*60 + "\n")
    
    results = await test_ollama_connection()
    
    # Print summary
    print("\n" + "="*60)
    print("TEST RESULTS")
    print("="*60)
    
    if results['success']:
        print("✅ Connection successful!")
    else:
        print("❌ Connection failed!")
    
    print("\nEndpoint Status:")
    for endpoint, status in results['endpoints'].items():
        print(f"  {endpoint}: {status}")
    
    if results.get('version'):
        print(f"\nOllama Version: {results['version'].get('version', 'Unknown')}")
    
    if results.get('models'):
        print("\nAvailable Models:")
        for model in results['models']:
            print(f"  - {model.get('name', 'Unknown')} (size: {model.get('size', 'N/A')} params)")
    
    if results.get('generation'):
        gen = results['generation']
        print(f"\nGeneration Test (Model: {gen.get('model', 'Unknown')}):")
        print(f"Response: {gen.get('response', 'No response')}")
        print(f"Tokens used: {gen.get('tokens_used', 'N/A')}")
    
    if results.get('error'):
        print(f"\n❌ Error: {results['error']}")
    
    print("\n" + "="*60)
    print("Test completed. Check ollama_test.log for detailed logs.")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
