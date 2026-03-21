import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const JUDGE_OPENINGS = [
  "This Court takes up the matter of {CASE}. Proceed, Counsel.",
  "The Bench has perused the submissions. We shall now hear oral arguments in {CASE}.",
  "Order. This Court is assembled to adjudicate upon {CASE}. Petitioner's Counsel, you may begin.",
];

const SCORE_PATTERNS = {
  keywords: ['therefore', 'because', 'pursuant', 'accordingly', 'furthermore', 'however', 'notwithstanding', 'wherein', 'whereas', 'article', 'section', 'precedent', 'constitutional', 'fundamental', 'jurisdiction', 'doctrine', 'principle', 'liable', 'negligence'],
  legalCitations: ['v.', 'scc', 'air', 'scr', 'indian penal', 'constitution', 'act,', 'section'],
  weakWords: ['maybe', 'might', 'perhaps', 'possibly', 'i think', 'i guess', 'um', 'uh'],
};

function computeScore(text) {
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/);
  let logic = 5, clarity = 5, confidence = 5;

  if (words.length > 40) logic += 1.5;
  else if (words.length > 20) logic += 0.8;
  else if (words.length < 8) logic -= 2;

  const keywordCount = SCORE_PATTERNS.keywords.filter(k => lower.includes(k)).length;
  logic += Math.min(keywordCount * 0.4, 2);
  clarity += Math.min(keywordCount * 0.2, 1);

  const citeCount = SCORE_PATTERNS.legalCitations.filter(k => lower.includes(k)).length;
  logic += Math.min(citeCount * 0.6, 2.5);
  confidence += Math.min(citeCount * 0.3, 1);

  const weakCount = SCORE_PATTERNS.weakWords.filter(k => lower.includes(k)).length;
  confidence -= weakCount * 0.8;
  clarity -= weakCount * 0.4;

  if (text.includes('.') && text.includes(',')) clarity += 0.5;

  logic = Math.max(1, Math.min(10, logic + (Math.random() * 1.5 - 0.5)));
  clarity = Math.max(1, Math.min(10, clarity + (Math.random() * 1.2 - 0.4)));
  confidence = Math.max(1, Math.min(10, confidence + (Math.random() * 1.2 - 0.4)));

  const feedback = generateFeedback(logic, clarity, confidence, keywordCount, weakCount, words.length);

  return {
    logic: parseFloat(logic.toFixed(1)),
    clarity: parseFloat(clarity.toFixed(1)),
    confidence: parseFloat(confidence.toFixed(1)),
    feedback,
  };
}

function generateFeedback(logic, clarity, confidence, keywords, weak, length) {
  const feedbacks = [];
  if (logic > 7.5) feedbacks.push("Strong legal reasoning");
  else if (logic < 4) feedbacks.push("Weak logical foundation");
  if (clarity > 7.5) feedbacks.push("Exceptionally clear articulation");
  else if (clarity < 4) feedbacks.push("Lacks structural clarity");
  if (confidence > 7.5) feedbacks.push("Commands authority");
  else if (confidence < 4) feedbacks.push("Hesitant delivery");
  if (keywords > 3) feedbacks.push("Good use of legal terminology");
  if (weak > 0) feedbacks.push("Avoid hedging language");
  if (length < 10) feedbacks.push("Response too brief for this Court");
  if (length > 50) feedbacks.push("Detailed and substantive");
  return feedbacks.length > 0 ? feedbacks.slice(0, 2).join('. ') + '.' : "Adequate submission.";
}

export function useJudge() {
  const { selectedCase, addTranscript, setJudgeMessage, clearJudge, updateScores, setTurn } = useGameStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8000/ws");
    wsRef.current.onopen = () => console.log("WebSocket connected");
    wsRef.current.onerror = (e) => console.error("WebSocket error:", e);
    wsRef.current.onclose = () => console.log("WebSocket closed");

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const processArgument = useCallback(async (text, side) => {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);

    // Add argument to transcript
    addTranscript({ type: side, text });

    // Compute store scores locally for now to keep the UI bars moving
    const scores = computeScore(text);
    updateScores(side, scores);

    setTurn('JUDGE');

    try {
      const state = useGameStore.getState();
      const chatHistory = state.transcript.map(t => `${t.type}: ${t.text}`).join('\n');
      const roleName = side === 'petitioner' ? state.petitionerName : state.respondentName;

      const judgeResponse = await new Promise((resolve, reject) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reject(new Error("WebSocket not connected"));
          return;
        }

        let timeoutId;

        const cleanup = () => {
          wsRef.current.removeEventListener("message", handleMessage);
          wsRef.current.removeEventListener("error", handleError);
          wsRef.current.removeEventListener("close", handleClose);
          clearTimeout(timeoutId);
        };

        const handleMessage = (event) => {
          cleanup();
          resolve(event.data);
        };
        
        const handleError = (error) => {
          cleanup();
          reject(error);
        };

        const handleClose = () => {
          cleanup();
          reject(new Error("WebSocket closed unexpectedly"));
        };

        wsRef.current.addEventListener("message", handleMessage);
        wsRef.current.addEventListener("error", handleError);
        wsRef.current.addEventListener("close", handleClose);

        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("Timeout waiting for judge response"));
        }, 20000); // 20s timeout

        wsRef.current.send(JSON.stringify({
          role: roleName,
          text: text,
          history: chatHistory
        }));
      });
      
      // Parse Gemini response which often includes markdown
      const cleanResponse = judgeResponse.replace(/\*\*/g, '');
      const lines = cleanResponse.split('\n');
      let feedback = "";
      let parsedScore = null;
      let shouldInterrupt = false;
      let inFeedback = false;

      lines.forEach(line => {
        const l = line.trim().toLowerCase();
        if (l.startsWith('feedback:')) {
          feedback = line.substring(line.toLowerCase().indexOf('feedback:') + 9).trim();
          inFeedback = true;
        }
        else if (l.startsWith('score:')) {
          const s = parseInt(line.replace(/[^0-9]/g, ''));
          if (!isNaN(s)) parsedScore = s;
          inFeedback = false;
        }
        else if (l.startsWith('interrupt')) {
          shouldInterrupt = l.includes('yes');
          inFeedback = false;
        }
        else if (inFeedback && line.trim() !== '') {
          feedback += '\n' + line.trim();
        }
      });

      if (!feedback) feedback = cleanResponse; // fallback

      // Update true scores based on Judge's evaluation
      const updatedScores = parsedScore !== null 
        ? { logic: parsedScore, clarity: parsedScore, confidence: parsedScore, feedback: `AI Scored: ${parsedScore}/10` }
        : scores;
        
      if (parsedScore !== null) {
        updateScores(side, updatedScores);
      }

      setJudgeMessage(feedback, shouldInterrupt);
      addTranscript({ type: 'judge', text: feedback, scores: updatedScores });

    } catch (e) {
      console.error("Backend error:", e);
      const fallback = "The court's connection was dropped. Counsel, please proceed.";
      setJudgeMessage(fallback, false);
      addTranscript({ type: 'judge', text: fallback, scores });
    }

    // After 4 seconds, switch turn
    await new Promise(r => setTimeout(r, 4500));
    clearJudge();
    const nextTurn = side === 'petitioner' ? 'RESPONDENT' : 'PETITIONER';
    setTurn(nextTurn);
    setIsProcessing(false);
  }, [isProcessing, addTranscript, setJudgeMessage, clearJudge, updateScores, setTurn]);

  const getOpeningStatement = useCallback(() => {
    if (!selectedCase) return "Order! This Court is now in session.";
    const template = JUDGE_OPENINGS[Math.floor(Math.random() * JUDGE_OPENINGS.length)];
    return template.replace('{CASE}', selectedCase.title);
  }, [selectedCase]);

  return { processArgument, isProcessing, getOpeningStatement };
}
