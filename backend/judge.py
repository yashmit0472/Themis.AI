import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")

def evaluate_argument(role, argument, history):
    prompt = f"""
    You are a strict moot court judge.

    Role: {role}
    Argument: {argument}

    Previous Context:
    {history}

    Tasks:
    1. Evaluate argument strength
    2. Interrupt if weak
    3. Give short feedback
    4. Assign score out of 10

    Output format:
    Feedback:
    Score:
    Interrupt (Yes/No):
    """

    response = model.generate_content(prompt)
    return response.text