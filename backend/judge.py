from google import genai
import os
from dotenv import load_dotenv
import re
from typing import Optional

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

TOKEN_RE = re.compile(r"[a-z0-9]+")
STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "from", "have", "has", "had",
    "were", "was", "are", "is", "be", "to", "of", "in", "on", "at", "by",
    "an", "a", "as", "it", "its", "or", "if", "can", "may", "will", "would",
    "should", "could", "do", "does", "did", "not", "but", "we", "they", "you",
    "your", "our", "their", "his", "her", "there", "here", "case", "court",
}


def normalize_text(text: Optional[str]) -> str:
    return (text or "").strip().lower()


def tokenize(text: Optional[str]):
    return [token for token in TOKEN_RE.findall(normalize_text(text)) if token not in STOPWORDS]


def build_case_chunks(selected_case):
    if not selected_case:
        return []

    chunks = []
    case_title = selected_case.get("title", "Selected Case")

    facts = selected_case.get("facts")
    if facts:
        chunks.append({
            "case_title": case_title,
            "chunk_type": "facts",
            "label": "Facts",
            "text": str(facts).strip(),
        })

    for index, issue in enumerate(selected_case.get("issues", []) or [], start=1):
        issue_text = str(issue).strip()
        if issue_text:
            chunks.append({
                "case_title": case_title,
                "chunk_type": "issues",
                "label": f"Issue {index}",
                "text": issue_text,
            })

    for index, precedent in enumerate(selected_case.get("precedents", []) or [], start=1):
        precedent_text = str(precedent).strip()
        if precedent_text:
            chunks.append({
                "case_title": case_title,
                "chunk_type": "precedents",
                "label": f"Precedent {index}",
                "text": precedent_text,
            })

    return chunks


def build_retrieval_query(argument, history):
    query_parts = [argument or ""]
    for turn in (history or [])[-6:]:
        turn_text = turn.get("argument") or turn.get("text") or ""
        if turn_text:
            query_parts.append(turn_text)
    return " \n".join(part for part in query_parts if part).strip()


def match_chunk_terms(query_tokens, chunk_text):
    chunk_tokens = tokenize(chunk_text)
    if not query_tokens or not chunk_tokens:
        return []

    query_set = set(query_tokens)
    chunk_set = set(chunk_tokens)
    return sorted(query_set & chunk_set)


def retrieve_case_evidence(selected_case, argument, history, limit=4):
    case_chunks = build_case_chunks(selected_case)
    if not case_chunks:
        return []

    query_text = build_retrieval_query(argument, history)
    query_tokens = tokenize(query_text)
    scored_chunks = []

    for chunk in case_chunks:
        matched_terms = match_chunk_terms(query_tokens, chunk["text"])
        scored_chunks.append({
            "case_title": chunk["case_title"],
            "chunk_type": chunk["chunk_type"],
            "label": chunk["label"],
            "text": chunk["text"],
            "match_count": len(matched_terms),
            "matched_terms": matched_terms,
        })

    scored_chunks.sort(key=lambda item: (-item["match_count"], item["chunk_type"], item["label"]))

    top_chunks = scored_chunks[:limit]
    if top_chunks and all(item["match_count"] == 0 for item in top_chunks):
        return scored_chunks[:min(2, len(scored_chunks))]

    return top_chunks


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

def evaluate_argument(role, argument, history, selected_case=None):
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

    retrieved_evidence = retrieve_case_evidence(selected_case, argument, history)
    evidence_str = "\n".join([
        f"- [{item['match_count']} matches] {item['label']} ({item['chunk_type']}): {item['text']}"
        for item in retrieved_evidence
    ]) if retrieved_evidence else "No case evidence matched strongly enough."

    case_context = "No case selected."
    if selected_case:
        case_context = f"CASE: {selected_case.get('title', 'Selected Case')}\nSUBTITLE: {selected_case.get('subtitle', '')}\nFACTS: {selected_case.get('facts', '')}\nISSUES: {', '.join(selected_case.get('issues', []) or [])}\nPRECEDENTS: {', '.join(selected_case.get('precedents', []) or [])}"
    
    prompt = f"""You are a Supreme Court judge presiding over a moot court session. Your role is to evaluate arguments critically, ask probing questions, and maintain courtroom decorum.

CURRENT SPEAKER: {role}
CURRENT ARGUMENT: {argument}

SELECTED CASE:
{case_context}

PREVIOUS ARGUMENTS:
{context_str if context_str else "This is the opening statement."}

RETRIEVED CASE EVIDENCE:
{evidence_str}

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
            evidence=retrieved_evidence,
        )
        
    except Exception as e:
        print(f"Error in evaluate_argument: {e}")
        return build_judge_response(
            feedback="The court experienced a technical difficulty. Please repeat your argument.",
            logic_score=0,
            clarity_score=0,
            confidence_score=0,
            interrupt=True,
            evidence=retrieved_evidence,
        )
