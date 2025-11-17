"""
Flask backend server for RT-2 PyBullet simulation.

IMPORTANT: This server requires PyBullet to be installed.
To install PyBullet on Windows:
1. Install Microsoft Visual C++ Build Tools from: 
   https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Then run: pip install pybullet

Endpoints:
- POST /api/simulate: Execute a natural language command
- POST /api/reset: Reset the simulation scene
"""

import base64
import logging
import sys
from typing import Any, Dict

from flask import Flask, jsonify, request
from flask_cors import CORS

# Import RT2Simulation - will fail if PyBullet not installed
try:
    from p import RT2Simulation
    logger = logging.getLogger(__name__)
    logger.info("✓ PyBullet simulation module loaded successfully")
except ImportError as e:
    print("\n" + "="*70)
    print("ERROR: Cannot start server - PyBullet is not installed!")
    print("="*70)
    print(f"\nImport error: {e}\n")
    print("To install PyBullet on Windows:")
    print("1. Install Microsoft Visual C++ Build Tools:")
    print("   https://visualstudio.microsoft.com/visual-cpp-build-tools/")
    print("2. Then run: pip install pybullet")
    print("\nAlternatively, download a pre-built wheel for Python 3.14:")
    print("   Search for 'pybullet cp314 win_amd64' wheel files")
    print("="*70 + "\n")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"]}})

# Global simulation instance
sim: RT2Simulation | None = None


def ensure_simulation() -> RT2Simulation:
    """Ensure simulation is initialized and return it."""
    global sim
    if sim is None:
        logger.info("Initializing RT2Simulation in headless mode...")
        sim = RT2Simulation(gui=False)
        sim.start()
        logger.info("Simulation initialized successfully")
    return sim


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    try:
        ensure_simulation()
        return jsonify({"status": "healthy", "simulation": "ready"}), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 503


@app.route("/api/simulate", methods=["POST"])
def simulate():
    """Execute a natural language command in the simulation."""
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
        
        logger.info(f"Processing command: {command}")
        
        # Get simulation instance
        simulation = ensure_simulation()
        
        # Execute command
        result = simulation.handle_command(command, capture_frame=True, auto_reset=False)
        
        # Encode frame to base64
        frame_base64 = None
        if result.frame_png:
            frame_base64 = base64.b64encode(result.frame_png).decode("utf-8")
        
        response = {
            "frame": frame_base64,
            "pick_uid": result.pick_uid,
            "place_uid": result.place_uid,
            "drop_position": list(result.drop_position) if result.drop_position else None,
            "message": "Command executed successfully" if result.pick_uid else "Could not resolve pick target",
            "status": "success" if result.pick_uid else "warning",
            "debug": result.debug
        }
        
        logger.info(f"Command executed: pick={result.pick_uid}, place={result.place_uid}")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Simulation error: {e}", exc_info=True)
        return jsonify({
            "error": str(e),
            "status": "error",
            "message": "Failed to execute simulation"
        }), 500


@app.route("/api/reset", methods=["POST"])
def reset():
    """Reset the simulation scene to initial state."""
    try:
        logger.info("Resetting simulation scene...")
        
        # Get simulation instance
        simulation = ensure_simulation()
        
        # Reset scene
        simulation.reset_scene()
        
        logger.info("Simulation reset complete")
        return jsonify({
            "message": "Simulation reset successfully",
            "status": "success"
        }), 200
        
    except Exception as e:
        logger.error(f"Reset error: {e}", exc_info=True)
        return jsonify({
            "error": str(e),
            "status": "error",
            "message": "Failed to reset simulation"
        }), 500


@app.route("/api/state", methods=["GET"])
def get_state():
    """Get current simulation state."""
    try:
        simulation = ensure_simulation()
        snapshot = simulation.get_state_snapshot()
        
        return jsonify({
            "state": snapshot,
            "status": "success"
        }), 200
        
    except Exception as e:
        logger.error(f"State query error: {e}", exc_info=True)
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


def shutdown_simulation():
    """Cleanup simulation on shutdown."""
    global sim
    if sim is not None:
        logger.info("Shutting down simulation...")
        sim.shutdown()
        sim = None


if __name__ == "__main__":
    import atexit
    
    # Register cleanup handler
    atexit.register(shutdown_simulation)
    
    # Run server
    logger.info("Starting RT-2 PyBullet Flask server...")
    logger.info("Server will be available at http://localhost:8000")
    
    # Run WITHOUT debug mode to avoid restart issues
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True)
