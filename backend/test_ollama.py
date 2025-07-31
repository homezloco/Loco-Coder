#!/usr/bin/env python3
# Test script for Ollama client

# Use absolute import with the full path from the project root
import sys
import os
import requests
import json

# Add the backend directory to the path if not already there
sys_path = os.path.dirname(os.path.abspath(__file__))
if sys_path not in sys.path:
    sys.path.append(sys_path)

# Now import the client
from ollama_client import OllamaClient

def get_available_models():
    """Get the list of available models from both CLI and API"""
    print("\n===== Checking available models =====\n")
    
    # Check API models
    try:
        print("Models from API:")
        response = requests.get('http://localhost:11434/api/tags', timeout=5)
        if response.ok:
            data = response.json()
            if 'models' in data:
                models = data['models']
                for model in models:
                    print(f"- {model.get('name')}")
                return [model.get('name') for model in models]
            else:
                print("No models found in API response")
                return []
        else:
            print(f"Error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Error getting API models: {e}")
        return []

def main():
    print("Testing Ollama client...")
    
    # Get available models
    available_models = get_available_models()
    
    # Models to try in order of preference - prioritize what's available locally
    models_to_try = [
        'codellama:instruct',       # First choice - confirmed available locally
        'codellama:7b-instruct-q4_0', # Second choice - confirmed available locally
        'deepseek-coder:33b',       # Third choice - reported by API but not confirmed locally
    ]
    
    # Add any other detected models
    for model in available_models:
        if model not in models_to_try:
            models_to_try.append(model)
    
    # Try each model until one works
    print("\n===== Testing models =====\n")
    prompt = "Write a simple hello world function in Python"
    
    for model in models_to_try:
        print(f"\nTrying model: {model}")
        client = OllamaClient('http://localhost:11434', model)
        print(f"Sending prompt: {prompt}")
        
        response = client.generate(prompt)
        print("\nResponse from Ollama:")
        print("-" * 40)
        print(response)
        print("-" * 40)
        
        # Ask if we should continue testing other models
        print(f"\nTest completed for {model}!")
        
        # Only test one model to avoid long output
        break
        
    print("\nAll tests completed!")
    print(f"Models available according to our checks: {available_models}")
    print("If you want to test a specific model, modify the script to use that model directly.")


if __name__ == "__main__":
    main()
