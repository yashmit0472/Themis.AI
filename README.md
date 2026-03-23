# ⚖️ Themis.AI : Moot Court Simulator

Welcome to **Themis.AI**, a real-time AI-powered moot court simulator designed to help law students, professionals, and enthusiasts practice their legal argumentation skills. Engage in high-stakes simulated trials, present your case as a Petitioner or Respondent, and receive instant, dynamic feedback and scoring from an AI Judge.

## Features
- **Real-time AI Judge**: Powered by Google's Gemini 1.5 Flash API, the AI Judge evaluates your arguments instantly via WebSockets, providing logic, clarity, and confidence scores.
- **Dynamic Courtroom UI**: An immersive dashboard complete with Counsel panels, live transcript feeds, pulsating timers, and a fully interactive AI judge speech bubble.
- **Live Scoring & Analytics**: Track your performance across multiple turns. The system dynamically updates your core argumentative metrics and evaluates your legal logic in real-time.
- **Custom Case Selection**: Choose from landmark cases in Indian jurisprudence (e.g., Dr. Priya Mehta v. AIIMS, R.K. Builders v. State of Maharashtra) to ground your arguments in real-world legal contexts.
- **Responsive Dashboard Layout**: Built with modern CSS grid/flexbox to adapt smoothly to your screen without breaking immersiveness.

## Tech Stack
- **Frontend**: React.js, Vite, Zustand (State Management), Vanilla CSS for custom animations and layout.
- **Backend**: Python, FastAPI, WebSockets, Uvicorn.
- **LLM**: Google Generative AI (`google-generativeai`).

---

## How to use

### Prerequisites
You will need the following installed on your machine:
- Node.js (v16+)
- Python (3.8+)
- A Google Gemini API Key.

### 1. Clone the Repository
```bash
git clone https://github.com/yashmit0472/Themis.AI.git
cd Themis.AI
```

### 2. Set up the Backend
Navigate to the root directory and install the required Python dependencies:
```bash
# Recommended: Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`

# Install dependencies
pip install fastapi uvicorn websockets python-dotenv google-generativeai
```

Create a `.env` file in the `backend/` directory (or root) and add your Gemini API Key:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Start the FastAPI server:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Set up the Frontend
Open a new terminal, navigate to the project directory, and start the Vite development server:
```bash
# Install frontend dependencies (if not already done)
npm install

# Run the app
npm run dev
```

### 4. Enter the Courtroom
Open your browser and navigate to `http://localhost:5173`. Select your case, pick your side, and approach the Bench!

---
*Built with passion for legal tech.*
