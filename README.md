# RT-2 Educational Platform 🤖

> **An interactive web-based demonstration of RT-2 (Robotics Transformer 2) concepts combining PyBullet simulation with action tokenization visualization**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

## 📖 Project Overview

This college project demonstrates the core concepts of **RT-2 (Robotics Transformer 2)** through two integrated components:

1. **RT-2 Simulation Demo** - Real robot manipulation using PyBullet physics engine with natural language commands
2. **Action Tokenization Visualizer** - Interactive tool showing how continuous robot actions are converted to discrete tokens

### 🎯 Educational Goals

- Teach RT-2 concepts in robotics courses
- Demonstrate vision-language-action models
- Understand action tokenization and discretization
- Learn robotic manipulation basics with IK control
- Explore natural language robot interfaces

---

## ✨ Features

### 🦾 RT-2 Simulation Demo
- **Natural Language Commands**: Control robot using everyday language
- **CLIP-based Vision Understanding**: Semantic matching for object identification
- **PyBullet Physics Simulation**: Realistic robot manipulation with KUKA iiwa arm
- **Real-time IK Control**: Inverse kinematics for smooth motion
- **Pick-and-Place Operations**: Complete task execution with gripper control

### 📊 Action Tokenization Visualizer
- **Discrete Token Generation**: Convert continuous actions to tokens
- **Visual Breakdown**: See how positions are discretized into bins
- **RT-2 Action Format**: Generate 8D action vectors (terminate, x, y, z, roll, pitch, yaw, gripper)
- **Interactive Sliders**: Adjust values and see token changes in real-time
- **Precision Indicators**: Understand quantization effects

---

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern UI components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS v4** - Utility-first styling
- **Shadcn UI** - Beautiful component library
- **Framer Motion** - Smooth animations
- **Three.js** - 3D graphics (if needed)

### Backend
- **Convex** - Real-time database and backend
- **Convex Auth** - Authentication system

### Simulation (External)
- **PyBullet** - Physics simulation engine
- **CLIP (OpenAI)** - Vision-language model
- **PyTorch** - Deep learning framework
- **NumPy** - Numerical computations

---

## 📁 Project Structure

```
rt-2-demo/
├── Pybulllet/                    # PyBullet simulation (runs externally)
│   ├── Simullation.py           # Main simulation with CLIP integration
│   └── requirements.txt          # Python dependencies
├── src/
│   ├── components/
│   │   ├── SimulationDemo.tsx   # Simulation interface component
│   │   ├── ActionTokenizer.tsx  # Action tokenization visualizer
│   │   ├── tokenizer/           # Tokenizer sub-components
│   │   └── ui/                  # Shadcn UI components
│   ├── pages/
│   │   ├── Landing.tsx          # Home page with hero section
│   │   ├── Auth.tsx             # Authentication page
│   │   └── NotFound.tsx         # 404 page
│   ├── convex/                  # Convex backend functions
│   ├── hooks/                   # React hooks
│   └── lib/                     # Utility functions
├── docs/                         # Documentation files
│   ├── SETUP_GUIDE.md           # Detailed setup instructions
│   ├── QUICK_START.md           # Quick start guide
│   └── INTEGRATION_COMPLETE.md  # Integration documentation
├── public/                       # Static assets
├── package.json                  # Node.js dependencies
└── pnpm-lock.yaml               # Lock file for pnpm

```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **Python** (v3.8 or higher)
- **Git**

### 📦 Installation

#### 1. Clone the Repository

```powershell
git clone https://github.com/IAMonlyParthGandhi/rt-2-demo.git
cd rt-2-demo
```

#### 2. Install Frontend Dependencies

```powershell
# Install pnpm if you don't have it
npm install -g pnpm

# Install project dependencies
pnpm install
```

#### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Convex Configuration
VITE_CONVEX_URL=your_convex_url_here

# Other environment variables as needed
```

#### 4. Start the Web Application

```powershell
# Start the development server
pnpm dev
```

The application will be available at `http://localhost:5173` (or `5174` if 5173 is occupied).

---

## 🐍 PyBullet Simulation Setup

⚠️ **Important Note**: The PyBullet simulation runs **externally** in a terminal, separate from the web application. This is because the backend integration encountered issues, so we run it manually.

### Installation Steps

1. **Navigate to PyBullet folder**

```powershell
cd Pybulllet
```

2. **Install Python dependencies**

```powershell
pip install -r requirements.txt
```

**Note**: PyBullet requires Visual C++ Build Tools on Windows. If installation fails:
- Download [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Or use the provided wheel file in the Pybulllet folder:
  ```powershell
  pip install Pybulllet\pybullet.whl
  ```

3. **Run the Simulation**

```powershell
python Simullation.py
```

### 🎮 Using the Simulation

Once running, you'll see a PyBullet GUI window with three colored cubes (red, green, blue) and a KUKA iiwa robot arm.

**Example Commands:**
```
pick up the red cube and place it on the ground
put the blue block on the green cube
grab the red cube and place it on the table
move the green cube to the blue cube
```

**How it works:**
1. Enter a natural language command in the terminal
2. CLIP processes the command and identifies objects
3. The system generates:
   - **Action Tokens** (discrete representation)
   - **8D Action Vectors** (continuous control signals)
4. Robot executes the pick-and-place operation
5. See real-time feedback in the PyBullet GUI

### 📝 Simulation Output

The simulation displays:
- **Visible Objects**: List of cubes and their positions
- **CLIP Matching**: Which objects were identified from your command
- **Action Tokens**: Discrete tokens like `ACTION_PICK POS_X_+2 POS_Y_-1 POS_Z_+3`
- **8D Action Vectors**: Control signals for the robot (terminate, position, orientation, gripper)
- **Execution Steps**: Progress through pick and place operations

---

## 🎨 Action Tokenizer Web Interface

The web application includes an **Action Tokenization Visualizer** that demonstrates how RT-2 converts continuous robot actions to discrete tokens.

### Features:
- **Interactive Sliders**: Adjust X, Y, Z positions and rotation
- **Token Display**: See real-time token generation
- **Bin Visualization**: Understand discretization process
- **Preset Positions**: Quick access to common poses
- **8D Action Format**: View complete RT-2 action representation

**Access**: Navigate to the tokenizer section in the web interface.

---

## 📚 Documentation

Detailed documentation is available in the `docs/` folder:

- **[SETUP_GUIDE.md](docs/SETUP_GUIDE.md)** - Complete setup instructions
- **[QUICK_START.md](docs/QUICK_START.md)** - Quick start guide
- **[INTEGRATION_COMPLETE.md](docs/INTEGRATION_COMPLETE.md)** - Technical integration details

---

## 🛠️ Development

### Frontend Development

```powershell
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
```

### Backend (Convex)

The project uses Convex for backend services. Functions are defined in `src/convex/`.

---

## 🎓 Educational Use Cases

This project is ideal for:

1. **Robotics Courses**: Teaching manipulation and control
2. **Machine Learning Classes**: Vision-language models
3. **Computer Science Projects**: Full-stack development with robotics
4. **Research Demonstrations**: RT-2 concepts and tokenization
5. **Self-Learning**: Understanding modern robotic transformers

---

## 🔍 How It Works

### RT-2 Pipeline

```
Natural Language → CLIP Encoding → Object Identification
                                   ↓
                            Action Planning
                                   ↓
                    ┌──────────────┴──────────────┐
                    ↓                              ↓
            Action Tokens              8D Action Vectors
         (Discrete Representation)   (Continuous Control)
                    ↓                              ↓
            Visualization            PyBullet Execution
```

### Action Tokenization Process

1. **Workspace Discretization**: 3D space divided into 11x11x11 bins
2. **Position Encoding**: Each coordinate mapped to nearest bin
3. **Token Generation**: Bin indices converted to tokens (e.g., `POS_X_+2`)
4. **Action Sequence**: Complete actions like `ACTION_PICK POS_X_+2 POS_Y_-1 POS_Z_+3 ROT_YAW_0`

---

## 🐛 Troubleshooting

### Common Issues

**PyBullet won't install:**
- Install Visual C++ Build Tools
- Use provided `pybullet.whl` wheel file

**CLIP model download fails:**
- Ensure internet connection
- Model downloads automatically on first run (~1.5GB)

**Port conflicts:**
- Vite will auto-select `5174` if `5173` is busy
- Check terminal output for actual port

**Simulation not responding:**
- Ensure you're running `Simullation.py` in PyBullet folder
- Check Python dependencies are installed
- Verify CUDA/PyTorch installation if using GPU

---

## 👥 Team Structure

This project was designed for a team of 5:

- **Team A (2 people)**: Action tokenization visualizer (frontend)
- **Team B (2 people)**: PyBullet simulation setup and CLIP integration
- **Team C (1 person)**: Documentation, UI/UX, and presentation

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **RT-2 Paper**: [Robotics Transformer 2](https://robotics-transformer2.github.io/)
- **OpenAI CLIP**: Vision-language model
- **PyBullet**: Physics simulation engine
- **Shadcn UI**: Beautiful component library

---

## 📧 Contact

For questions or issues, please open an issue on GitHub or contact the project maintainer.

---

## 🎉 Show Your Faculty!

This project demonstrates:
✅ Modern web development practices
✅ Machine learning integration
✅ Real-time robotics simulation
✅ Professional documentation
✅ Scalable architecture

**Perfect for college project presentations!** 🎓

---

**Made with ❤️ for robotics education**
