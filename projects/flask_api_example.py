# Sample Flask API project
from flask import Flask, jsonify, request
import logging
from datetime import datetime
import os

# Configure fallback options - following user preference for fallbacks
PORT = int(os.environ.get('PORT', 5000))
DEBUG_MODE = os.environ.get('DEBUG', 'True').lower() == 'true'
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

# Setup logging with fallback configuration
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app with fallback error handling
app = Flask(__name__)

# Sample in-memory data store with fallback to empty list
try:
    items = [
        {"id": 1, "name": "Item 1", "created_at": datetime.now().isoformat()},
        {"id": 2, "name": "Item 2", "created_at": datetime.now().isoformat()}
    ]
except Exception as e:
    logger.error(f"Failed to initialize data: {e}")
    # Fallback to empty list
    items = []

# API Routes
@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        return jsonify({"items": items, "count": len(items)})
    except Exception as e:
        logger.error(f"Error in get_items: {e}")
        # Fallback response
        return jsonify({"error": str(e), "items": [], "count": 0}), 500

@app.route('/api/items', methods=['POST'])
def create_item():
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"error": "Name field is required"}), 400
            
        new_id = max([item["id"] for item in items], default=0) + 1
        new_item = {
            "id": new_id,
            "name": data["name"],
            "created_at": datetime.now().isoformat()
        }
        items.append(new_item)
        return jsonify(new_item), 201
    except Exception as e:
        logger.error(f"Error in create_item: {e}")
        # Fallback response
        return jsonify({"error": str(e)}), 500

@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    try:
        item = next((i for i in items if i["id"] == item_id), None)
        if item:
            return jsonify(item)
        return jsonify({"error": "Item not found"}), 404
    except Exception as e:
        logger.error(f"Error in get_item: {e}")
        # Fallback response
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "items_count": len(items)
        })
    except Exception as e:
        logger.error(f"Error in health_check: {e}")
        # Fallback response even for health endpoint
        return jsonify({"status": "degraded", "error": str(e)}), 500

# Main entry point with proper fallback
if __name__ == "__main__":
    try:
        logger.info(f"Starting Flask app on port {PORT}")
        app.run(debug=DEBUG_MODE, host='0.0.0.0', port=PORT)
    except Exception as e:
        logger.critical(f"Failed to start application: {e}")
        print(f"Critical error: {e}")
        # Process could exit here, but at least we logged the error
