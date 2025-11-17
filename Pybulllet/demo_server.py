"""
Demo/Mock Flask server for RT-2 simulation (NO PyBullet required for testing).

This version provides mock responses so you can test the frontend integration
without installing PyBullet and its C++ dependencies.

For the full simulation with PyBullet, use server.py after installing dependencies.
"""

import base64
import io
import logging
import random
from typing import Any, Dict

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"]}})

# Mock simulation state
simulation_state = {
    "objects": [
        {"uid": 2, "name": "red", "position": [0.55, -0.15, 0.03], "color": (255, 0, 0)},
        {"uid": 3, "name": "green", "position": [0.55, 0.0, 0.03], "color": (0, 255, 0)},
        {"uid": 4, "name": "blue", "position": [0.55, 0.15, 0.03], "color": (0, 0, 255)},
    ]
}


def generate_mock_frame(command: str, pick_uid: int | None, place_uid: int | None) -> str:
    """Generate a mock simulation frame image."""
    # Create a simple image
    width, height = 640, 480
    img = Image.new('RGB', (width, height), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    
    # Draw title
    draw.text((20, 20), "RT-2 Simulation (DEMO MODE)", fill=(50, 50, 50))
    draw.text((20, 50), f"Command: {command[:50]}", fill=(100, 100, 100))
    
    # Draw objects
    y_offset = 120
    for obj in simulation_state["objects"]:
        color = obj["color"]
        x = 100 + (obj["uid"] - 2) * 150
        y = y_offset + 100
        
        # Draw cube
        draw.rectangle([x, y, x + 80, y + 80], fill=color, outline=(0, 0, 0), width=2)
        draw.text((x + 10, y + 90), f"{obj['name']} cube", fill=(50, 50, 50))
        
        # Highlight if picked or placed
        if obj["uid"] == pick_uid:
            draw.text((x + 5, y - 30), "PICKED ↑", fill=(255, 100, 0))
        if obj["uid"] == place_uid:
            draw.text((x + 5, y - 50), "TARGET ↓", fill=(0, 150, 255))
    
    # Draw robot arm (simple representation)
    draw.line([(50, 300), (150, 250), (250, 220)], fill=(100, 100, 100), width=8)
    draw.ellipse([240, 210, 260, 230], fill=(150, 150, 150), outline=(80, 80, 80), width=2)
    draw.text((50, 320), "Robot Arm →", fill=(80, 80, 80))
    
    # Draw status
    draw.text((20, 400), "✓ Demo Mode Active", fill=(0, 150, 0))
    draw.text((20, 425), "Install PyBullet for real simulation", fill=(150, 150, 150))
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def match_objects(command: str) -> tuple[int | None, int | None]:
    """Simple keyword matching for demo purposes."""
    command_lower = command.lower()
    
    pick_uid = None
    place_uid = None
    
    # Match pick target
    for obj in simulation_state["objects"]:
        if obj["name"] in command_lower:
            if pick_uid is None:
                pick_uid = obj["uid"]
            elif place_uid is None:
                place_uid = obj["uid"]
    
    # If not enough matches, use first two objects
    if pick_uid is None:
        pick_uid = simulation_state["objects"][0]["uid"]
    if place_uid is None:
        place_uid = simulation_state["objects"][1]["uid"]
    
    return pick_uid, place_uid


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "simulation": "demo_mode",
        "message": "Running in DEMO mode (no PyBullet)"
    }), 200


@app.route("/api/simulate", methods=["POST"])
def simulate():
    """Mock simulation endpoint."""
    try:
        data = request.get_json()
        if not data or "command" not in data:
            return jsonify({
                "error": "Missing 'command' in request body",
                "status": "error"
            }), 400
        
        command = data["command"].strip()
        if not command:
            return jsonify({
                "error": "Command cannot be empty",
                "status": "error"
            }), 400
        
        logger.info(f"Processing command (DEMO): {command}")
        
        # Match objects based on command
        pick_uid, place_uid = match_objects(command)
        
        # Generate mock frame
        frame_base64 = generate_mock_frame(command, pick_uid, place_uid)
        
        # Get object positions
        pick_obj = next(obj for obj in simulation_state["objects"] if obj["uid"] == pick_uid)
        place_obj = next(obj for obj in simulation_state["objects"] if obj["uid"] == place_uid)
        
        drop_position = [
            place_obj["position"][0],
            place_obj["position"][1],
            place_obj["position"][2] + 0.06
        ]
        
        response = {
            "frame": frame_base64,
            "pick_uid": pick_uid,
            "place_uid": place_uid,
            "drop_position": drop_position,
            "message": "Command executed successfully (DEMO MODE)",
            "status": "success",
            "debug": {
                "mode": "demo",
                "note": "Install PyBullet for real simulation",
                "pick_object": pick_obj["name"],
                "place_object": place_obj["name"],
                "semantic_score": round(random.uniform(0.75, 0.95), 2)
            }
        }
        
        logger.info(f"Command executed (DEMO): pick={pick_uid}, place={place_uid}")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Simulation error (DEMO): {e}", exc_info=True)
        return jsonify({
            "error": str(e),
            "status": "error",
            "message": "Failed to execute demo simulation"
        }), 500


@app.route("/api/reset", methods=["POST"])
def reset():
    """Mock reset endpoint."""
    try:
        logger.info("Resetting simulation (DEMO)...")
        
        # Reset mock state (no actual changes needed)
        
        logger.info("Simulation reset complete (DEMO)")
        return jsonify({
            "message": "Simulation reset successfully (DEMO MODE)",
            "status": "success"
        }), 200
        
    except Exception as e:
        logger.error(f"Reset error (DEMO): {e}", exc_info=True)
        return jsonify({
            "error": str(e),
            "status": "error",
            "message": "Failed to reset demo simulation"
        }), 500


@app.route("/api/state", methods=["GET"])
def get_state():
    """Get current mock simulation state."""
    try:
        return jsonify({
            "state": {
                "objects": simulation_state["objects"],
                "mode": "demo"
            },
            "status": "success"
        }), 200
        
    except Exception as e:
        logger.error(f"State query error (DEMO): {e}", exc_info=True)
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        "error": "Endpoint not found",
        "status": "error"
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({
        "error": "Internal server error",
        "status": "error"
    }), 500


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Starting RT-2 DEMO Flask server (NO PyBullet required)")
    logger.info("=" * 60)
    logger.info("This is a MOCK server for testing the frontend.")
    logger.info("For real PyBullet simulation, install dependencies and use server.py")
    logger.info("=" * 60)
    logger.info("Server will be available at http://localhost:8000")
    logger.info("=" * 60)
    
    # Run in debug mode for development
    app.run(host="0.0.0.0", port=8000, debug=True, threaded=True)
