# /project-root/backend/test_ollama_cli.py

import sys
import os

# Add the parent directory to the path so we can import from ollama_client.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ollama_client import OllamaClient

# Test script to validate Ollama CLI invocation in WSL environments
def test_ollama_cli():
    print('Starting Ollama CLI invocation test...')
    
    # Use a long timeout to account for larger models or slow initialization
    client = OllamaClient(url='http://172.28.112.1:11434', model='codellama:instruct', timeout=60)
    
    print(f'Using model: {client.model}')
    print(f'Using URL: {client.url}')
    print(f'Timeout set to: {client.timeout} seconds')
    
    # Test model availability detection
    print('\n=== Testing Model Availability ===')
    if client.model_in_api:
        print(f'Model {client.model} is available via API')
    else:
        print(f'Model {client.model} is NOT available via API')
    if client.model_in_cli:
        print(f'Model {client.model} is available via CLI')
    else:
        print(f'Model {client.model} is NOT available via CLI')
    
    # List all available models
    print('\n=== API Models Detected ===')
    for model in client.api_models:
        print(f'- {model}')
    print('\n=== CLI Models Detected ===')
    for model in client.cli_models:
        print(f'- {model}')
    
    # Test CLI command execution with a simple prompt
    print('\n=== Testing CLI Command Execution ===')
    test_prompt = 'Say hello'
    print(f'Testing CLI with prompt: "{test_prompt}"')
    success, response, error = client._run_ollama_command(['ollama', 'run', client.model, test_prompt])
    if success:
        print(f'CLI Success! Response:\n{response}')
    else:
        print(f'CLI Failed. Error:\n{error}')
    
    # Test API generation if model is available via API
    if client.model_in_api:
        print('\n=== Testing API Generation ===')
        print(f'Testing API with prompt: "{test_prompt}"')
        success, response, error = client.generate(test_prompt)
        if success:
            print(f'API Success! Response:\n{response}')
        else:
            print(f'API Failed. Error:\n{error}')
    else:
        print('\n=== Skipping API Generation Test (Model not available via API) ===')
    
    # Test additional models if available
    additional_models = client.cli_models - {client.model}
    if additional_models:
        print('\n=== Testing Additional Models ===')
        for model in additional_models:
            print(f'Testing model: {model}')
            client.model = model  # Switch model temporarily
            success, response, error = client._run_ollama_command(['ollama', 'run', model, test_prompt])
            if success:
                print(f'CLI Success for {model}! Response:\n{response}')
            else:
                print(f'CLI Failed for {model}. Error:\n{error}')
            if model in client.api_models or any(m.startswith(model + ':') for m in client.api_models):
                print(f'Testing API with model: {model}')
                success, response, error = client.generate(test_prompt)
                if success:
                    print(f'API Success for {model}! Response:\n{response}')
                else:
                    print(f'API Failed for {model}. Error:\n{error}')
    else:
        print('\nNo additional models to test.')
    
    print('\nTest completed.')

if __name__ == '__main__':
    test_ollama_cli()
