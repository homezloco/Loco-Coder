import requests
import sys
import os

def test_ollama_connection(url):
    """Test connection to Ollama server and list available models."""
    print(f"\n{'='*40}")
    print(f"Testing connection to: {url}")
    print(f"{'='*40}")
    
    try:
        # Test basic connection
        print("\nTesting basic connection...")
        response = requests.get(f"{url}/api/tags", timeout=5)
        response.raise_for_status()
        models = response.json().get('models', [])
        
        print(f"✅ Successfully connected to Ollama server")
        print(f"\nAvailable models:")
        for model in models:
            print(f"- {model.get('name', 'unknown')} (size: {model.get('size', 'N/A')} parameters)")
        
        # Test model generation
        test_model = "codellama:instruct"
        print(f"\nTesting generation with model: {test_model}")
        response = requests.post(
            f"{url}/api/generate",
            json={"model": test_model, "prompt": "Respond with 'OK' if you can hear me."},
            timeout=30
        )
        response.raise_for_status()
        print(f"✅ Successfully generated response from {test_model}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Status code: {e.response.status_code}")
            print(f"Response: {e.response.text}")
        return False

if __name__ == "__main__":
    # List of possible Ollama server URLs to try
    possible_urls = [
        "http://172.28.112.1:11434",  # Windows host IP from WSL
        "http://localhost:11434",     # Standard localhost
        "http://host.docker.internal:11434"  # For Docker environments
    ]
    
    # Add URL from environment variable if set
    ollama_url = os.getenv("OLLAMA_URL")
    if ollama_url and ollama_url not in possible_urls:
        possible_urls.insert(0, ollama_url)
    
    print("Testing Ollama server connections...")
    
    success = False
    for url in possible_urls:
        if test_ollama_connection(url):
            success = True
            break
    
    if not success:
        print("\n❌ Failed to connect to Ollama server. Please check:")
        print("1. Is Ollama running? Try: ollama serve")
        print("2. Is the server accessible at one of these URLs?")
        for url in possible_urls:
            print(f"   - {url}")
        print("3. Is the model downloaded? Try: ollama pull codellama:instruct")
        sys.exit(1)
