"""
Simple test script to verify the FastAPI backend server starts without errors.
Run this script directly to test server startup.
"""
import uvicorn

if __name__ == "__main__":
    print("Starting FastAPI backend server...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="info")
    print("Server started successfully!")
