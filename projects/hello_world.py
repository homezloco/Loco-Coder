# A simple Python example to demonstrate the platform
import sys
from datetime import datetime

def greet(name="World"):
    """
    Returns a greeting message with the current time
    
    Args:
        name: The name to greet (defaults to "World")
    
    Returns:
        str: A formatted greeting
    """
    current_time = datetime.now().strftime("%H:%M:%S")
    return f"Hello, {name}! The current time is {current_time}"

def main():
    # Get name from command line args if provided
    if len(sys.argv) > 1:
        name = sys.argv[1]
    else:
        name = "World"
    
    # Print the greeting
    message = greet(name)
    print(message)
    
    # Print Python version info
    print(f"\nRunning on Python {sys.version}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        # Fallback to basic greeting if something goes wrong
        print("Hello, World!")
