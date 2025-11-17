# RT-2 Simulation Demo - Setup Guide

## 🚀 Quick Start

This project integrates a PyBullet simulation backend with a React/TypeScript frontend to demonstrate RT-2 (Robotics Transformer 2) concepts through natural language commanded robot manipulation.

### Prerequisites

- **Node.js** (v18+) and **pnpm**
- **Python** (v3.8+)
- **PyBullet** requires Visual C++ Build Tools on Windows

---

## 📦 Installation

### 1. Frontend Setup

```powershell
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The frontend will be available at `http://localhost:5173` (or `http://localhost:5174` if 5173 is in use).

### 2. Backend Setup

#### Install Python Dependencies

```powershell
cd Pybulllet

# Install required packages
pip install flask flask-cors sentence-transformers torch pillow numpy
```

**Note about PyBullet**: PyBullet requires C++ build tools. If you encounter installation errors:
- Download and install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Or use a pre-built PyBullet wheel for Windows from [Unofficial Windows Binaries](https://www.lfd.uci.edu/~gohlke/pythonlibs/)

#### Alternative: Install from requirements.txt

```powershell
pip install -r requirements.txt
```

---

## 🎮 Running the Application

### Start the Backend Server

```powershell
cd Pybulllet
python server.py
```

The Flask server will start on `http://localhost:8000`.

**Backend Endpoints:**
- `POST /api/simulate` - Execute a natural language command
- `POST /api/reset` - Reset the simulation scene
- `GET /api/health` - Health check endpoint
- `GET /api/state` - Get current simulation state

### Start the Frontend

```powershell
# In the project root directory
pnpm dev
```

Frontend will be available at `http://localhost:5173` or `http://localhost:5174`.

---

## 🧪 Testing the Integration

1. Open your browser to `http://localhost:5174`
2. You should see the RT-2 Simulation Demo interface
3. Enter a natural language command like:
   - "Pick up the red cube and place it on the blue cube"
   - "Move the object to the left"
   - "Grasp the green block and lift it up"
4. Click "Run" and watch the simulation execute!
5. The PyBullet frame will be displayed showing the robot's action
6. Debug information will show pick/place UIDs and drop positions

---

## 🐛 Troubleshooting

### Port Already in Use
If port 5173 is occupied, Vite will automatically use 5174. Check terminal output for the actual port.

### PyBullet Installation Failed
```powershell
# Install Visual C++ Build Tools
# Then retry:
pip install pybullet
```

### Backend Not Connecting
- Ensure Flask server is running on port 8000
- Check `.env.local` file contains: `VITE_PYBULLET_API_BASE=http://localhost:8000`
- Verify firewall isn't blocking local connections

### CORS Errors
- Flask-CORS is configured to allow `http://localhost:5173` and `http://localhost:5174`
- If using a different port, update `server.py` CORS origins

### Sentence-Transformers Model Download
On first run, sentence-transformers will download the `all-MiniLM-L6-v2` model (~80MB). This is a one-time download.

---

## 📁 Project Structure

```
rt-2-demo/
├── Pybulllet/
│   ├── server.py           # Flask backend server
│   ├── p.py                # RT2Simulation class
│   └── requirements.txt    # Python dependencies
├── src/
│   ├── components/
│   │   ├── SimulationDemo.tsx      # Main simulation UI component
│   │   └── ActionTokenizer.tsx     # Action tokenization visualizer
│   ├── pages/
│   │   └── Landing.tsx              # Landing page with full-screen demo
│   └── lib/
│       └── config.ts                # Backend endpoint configuration
├── .env.local              # Environment variables (create this!)
└── package.json            # Frontend dependencies
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_PYBULLET_API_BASE=http://localhost:8000
```

### Backend Configuration

Edit `Pybulllet/server.py` to customize:
- Port number (default: 8000)
- GUI mode (`gui=False` for headless, `gui=True` for PyBullet GUI)
- Physics time step
- Camera configuration

---

## 🎯 Features

✅ **Natural Language Commands**: Semantic matching using sentence-transformers
✅ **Real-time Simulation**: PyBullet physics simulation with IK control
✅ **Visual Feedback**: PNG frame capture and display
✅ **Debug Information**: Pick/place UIDs, drop positions, semantic scores
✅ **Scene Reset**: Reset objects to original positions
✅ **Action Tokenization Visualizer**: Discrete token representation
✅ **Responsive UI**: Full-screen simulation display

---

## 📝 API Examples

### Simulate Command

**Request:**
```bash
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"command": "pick up the red cube and place it on the blue cube"}'
```

**Response:**
```json
{
  "frame": "base64_encoded_png_image",
  "pick_uid": 2,
  "place_uid": 4,
  "drop_position": [0.55, 0.0, 0.09],
  "message": "Command executed successfully",
  "status": "success",
  "debug": {
    "pick_phrase": "red cube",
    "place_phrase": "blue cube",
    "pick_score": 0.87,
    "place_score": 0.85
  }
}
```

### Reset Scene

**Request:**
```bash
curl -X POST http://localhost:8000/api/reset
```

**Response:**
```json
{
  "message": "Simulation reset successfully",
  "status": "success"
}
```

---

## 🛠️ Development

### Frontend Development
```powershell
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
```

### Backend Development
```powershell
# Run with auto-reload (development)
python server.py

# Run without GUI (production)
# Edit server.py: sim = RT2Simulation(gui=False)
```

---

## 📚 Dependencies

### Frontend
- React + TypeScript
- Vite
- TailwindCSS
- Framer Motion
- Shadcn/ui components

### Backend
- Flask (Web server)
- Flask-CORS (Cross-origin support)
- PyBullet (Physics simulation)
- sentence-transformers (Semantic matching)
- PyTorch (ML backend)
- Pillow (Image processing)
- NumPy (Numerical operations)

---

## 🎓 Educational Use

This project is designed for:
- Teaching RT-2 concepts in robotics courses
- Demonstrating vision-language-action models
- Understanding action tokenization
- Learning robotic manipulation basics
- Prototyping natural language robot interfaces

---

## 📄 License

Educational project - MIT License

---

## 🙋 Support

For issues:
1. Check that both servers are running
2. Verify `.env.local` is configured
3. Check browser console for errors
4. Check Flask server logs for backend errors

---

## 🎉 Success Indicators

✅ Frontend loads at `http://localhost:5174`
✅ Backend responds at `http://localhost:8000/api/health`
✅ Commands execute and display frames
✅ No CORS errors in browser console
✅ Debug info shows pick/place decisions

**Enjoy exploring RT-2 concepts through simulation!** 🤖🦾
