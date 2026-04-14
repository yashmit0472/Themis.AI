from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from .judge import build_judge_response, evaluate_argument
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
    history: list = []
    selectedCase: Optional[dict] = None

# Keep this endpoint in case frontend uses it, but WebSocket is primary
@app.post("/argue")
def argue(arg: Argument):
    result = evaluate_argument(arg.role, arg.text, arg.history, arg.selectedCase)
    return {"response": result}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection established")
    
    try:
        while True:
            # Receive message from client
            data_text = await websocket.receive_text()
            
            try:
                data = json.loads(data_text)
                role = data.get("role", "Petitioner")
                text = data.get("text", "")
                history = data.get("history", [])
                selected_case = data.get("selectedCase") or data.get("selected_case")
                
                # Validate input
                if not text.strip():
                    await websocket.send_json(build_judge_response(
                        feedback="The Court did not hear your argument. Please speak clearly.",
                        logic_score=0,
                        clarity_score=0,
                        confidence_score=0,
                        interrupt=True,
                    ))
                    continue
                
            except json.JSONDecodeError:
                print(f"Invalid JSON received: {data_text}")
                await websocket.send_json(build_judge_response(
                    feedback="The Court received an unintelligible submission.",
                    logic_score=0,
                    clarity_score=0,
                    confidence_score=0,
                    interrupt=True,
                ))
                continue
            
            # Evaluate the argument
            try:
                result = evaluate_argument(role, text, history, selected_case)
                await websocket.send_json(result)
                print(f"Sent response: {result}")
                
            except Exception as e:
                print(f"Error during argument evaluation: {e}")
                await websocket.send_json(build_judge_response(
                    feedback="The Court experienced a technical disruption. Please repeat your argument.",
                    logic_score=0,
                    clarity_score=0,
                    confidence_score=0,
                    interrupt=True,
                ))
    
    except WebSocketDisconnect:
        print("WebSocket connection closed")
    except Exception as e:
        print(f"WebSocket error: {e}")
