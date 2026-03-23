from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from judge import evaluate_argument
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Argument(BaseModel):
    role: str
    text: str
    history: str = ""

@app.post("/argue")
def argue(arg: Argument):
    result = evaluate_argument(arg.role, arg.text, arg.history)
    return {"response": result}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data_text = await websocket.receive_text()
        try:
            data = json.loads(data_text)
            role = data.get("role", "Petitioner")
            text = data.get("text", "")
            history = data.get("history", "")
        except:
            role = "Petitioner"
            text = data_text
            history = ""
            
        try:
            result = evaluate_argument(role, text, history)
            await websocket.send_text(result)
        except Exception as e:
            print(f"Error during argument evaluation: {e}")
            await websocket.send_text(f"Feedback: The Court experienced a disruption. Please repeat.\nScore: 5\nInterrupt (Yes/No): No")