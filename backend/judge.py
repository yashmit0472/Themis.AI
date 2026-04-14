from google import genai
import os
from dotenv import load_dotenv
import re

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

JUDGE_RESPONSE_FIELDS = (
    "feedback",
    "score",
    "logic_score",
    "clarity_score",
    "confidence_score",
    "interrupt",
    "evidence",
    "reasoning_breakdown",
)

SCORING_RUBRIC = {
    "logic": "Relevance to the issue, use of precedent, and factual consistency with the selected case.",
    "clarity": "Structure, directness, and whether the argument answers the legal question clearly.",
    "confidence": "Courtroom tone, composure, and assertiveness without overclaiming.",
}


def build_judge_response(*, feedback, logic_score, clarity_score, confidence_score, interrupt, evidence=None, reasoning_breakdown=None):
    overall_score = round((logic_score + clarity_score + confidence_score) / 3, 1)
    return {
        "feedback": feedback,
        "score": overall_score,
        "logic_score": logic_score,
        "clarity_score": clarity_score,
        "confidence_score": confidence_score,
        "interrupt": interrupt,
        "evidence": evidence or [],
        "reasoning_breakdown": reasoning_breakdown or SCORING_RUBRIC,
    }

def evaluate_argument(role, argument, history):
    """
    Evaluates a legal argument in a moot court setting.
    """
    
    # Build context from history
    context_str = ""
    if history:
        context_str = "\n".join([
            f"{turn.get('role', 'Unknown')}: {turn.get('argument', '')}"
            for turn in history[-6:]
        ])
    
    prompt = f"""You are a Supreme Court judge presiding over a moot court session. Your role is to evaluate arguments critically, ask probing questions, and maintain courtroom decorum.

CURRENT SPEAKER: {role}
CURRENT ARGUMENT: {argument}

PREVIOUS ARGUMENTS:
{context_str if context_str else "This is the opening statement."}

YOUR TASK:
1. Evaluate this argument on:
   - Legal logic and precedent citation (0-10)
   - Clarity and structure (0-10)  
   - Confidence and delivery (0-10)

2. Provide brief, sharp feedback (2-3 sentences max). Be a real judge:
   - If the argument is weak, vague, or irrelevant, INTERRUPT and demand clarification
   - If it's substantive, acknowledge it and probe deeper with a pointed question
   - If it's off-topic or nonsensical, call it out directly

3. Decide if you need to interrupt (if argument is unclear, off-topic, or needs immediate clarification)

RESPOND IN EXACTLY THIS FORMAT (no extra text):
FEEDBACK: [your 2-3 sentence response as a judge]
LOGIC: [score 0-10]
CLARITY: [score 0-10]
CONFIDENCE: [score 0-10]
INTERRUPT: [YES or NO]
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        text = response.text.strip()
        
        # Parse response with regex
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?=\n[A-Z]+:|$)', text, re.DOTALL)
        logic_match = re.search(r'LOGIC:\s*(\d+)', text)
        clarity_match = re.search(r'CLARITY:\s*(\d+)', text)
        confidence_match = re.search(r'CONFIDENCE:\s*(\d+)', text)
        interrupt_match = re.search(r'INTERRUPT:\s*(YES|NO)', text, re.IGNORECASE)
        
        feedback = feedback_match.group(1).strip() if feedback_match else "The court acknowledges your submission."
        logic_score = int(logic_match.group(1)) if logic_match else 5
        clarity_score = int(clarity_match.group(1)) if clarity_match else 5
        confidence_score = int(confidence_match.group(1)) if confidence_match else 5
        interrupt = interrupt_match.group(1).upper() == "YES" if interrupt_match else False

        return build_judge_response(
            feedback=feedback,
            logic_score=logic_score,
            clarity_score=clarity_score,
            confidence_score=confidence_score,
            interrupt=interrupt,
        )
        
    except Exception as e:
        print(f"Error in evaluate_argument: {e}")
        return build_judge_response(
            feedback="The court experienced a technical difficulty. Please repeat your argument.",
            logic_score=0,
            clarity_score=0,
            confidence_score=0,
            interrupt=True,
        )
