import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const JUDGE_OPENINGS = [
  "This Court takes up the matter of {CASE}. Proceed, Counsel.",
  "The Bench has perused the submissions. We shall now hear oral arguments in {CASE}.",
  "Order. This Court is assembled to adjudicate upon {CASE}. Petitioner's Counsel, you may begin.",
];

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

    setTurn('JUDGE');

    try {
      const state = useGameStore.getState();
      
      // Build history as array of objects for backend
      const history = state.transcript.map(t => ({
        role: t.type === 'judge' ? 'Judge' : (t.type === 'petitioner' ? 'Petitioner' : 'Respondent'),
        argument: t.text
      }));

      const roleName = side === 'petitioner' ? 'Petitioner' : 'Respondent';

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
          try {
            // Backend now sends JSON, not text
            const data = JSON.parse(event.data);
            resolve(data);
          } catch (e) {
            reject(new Error("Invalid JSON response from server"));
          }
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
        }, 20000);

        // Send proper format to backend
        wsRef.current.send(JSON.stringify({
          role: roleName,
          text: text,
          history: history  // Array of objects, not string
        }));
      });

      // judgeResponse is now a parsed object from backend
      const {
        feedback = "The Court acknowledges your submission.",
        score = 5,
        logic_score = 5,
        clarity_score = 5,
        confidence_score = 5,
        interrupt = false
      } = judgeResponse;

      const scores = {
        logic: logic_score,
        clarity: clarity_score,
        confidence: confidence_score,
        feedback: feedback
      };

      updateScores(side, scores);
      setJudgeMessage(feedback, interrupt);
      addTranscript({ type: 'judge', text: feedback, scores });

    } catch (e) {
      console.error("Backend error:", e);
      const fallback = "The court's connection was dropped. Counsel, please proceed.";
      const fallbackScores = { logic: 5, clarity: 5, confidence: 5, feedback: fallback };
      
      setJudgeMessage(fallback, false);
      addTranscript({ type: 'judge', text: fallback, scores: fallbackScores });
      updateScores(side, fallbackScores);
    }

    // Smart timing based on feedback length
    const wordCount = feedback.split(/\s+/).length;
    const readingTime = Math.max(8000, Math.min(wordCount * 300, 20000));

    console.log(`Judge feedback has ${wordCount} words, waiting ${readingTime}ms`);
    
    await new Promise(r => setTimeout(r, readingTime));
    clearJudge();
    // If interrupted, same side goes again. Otherwise, switch turns.
    const nextTurn = interrupt 
      ? (side === 'petitioner' ? 'PETITIONER' : 'RESPONDENT')
      : (side === 'petitioner' ? 'RESPONDENT' : 'PETITIONER');

    console.log(`Interrupt: ${interrupt}, Next turn: ${nextTurn}`);
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
