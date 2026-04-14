import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const JUDGE_OPENINGS = [
  "This Court takes up the matter of {CASE}. Proceed, Counsel.",
  "The Bench has perused the submissions. We shall now hear oral arguments in {CASE}.",
  "Order. This Court is assembled to adjudicate upon {CASE}. Petitioner's Counsel, you may begin.",
];

export function useJudge() {
  const {
    selectedCase,
    addTranscript,
    setJudgeMessage,
    clearJudge,
    updateScores,
    beginJudgePhase,
    resumeSameSpeakerWithRetry,
    advanceToOtherSpeaker,
  } = useGameStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef(null);
  const synthRef = useRef(null);
  const voicesRef = useRef([]);

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8000/ws");
    wsRef.current.onopen = () => console.log("WebSocket connected");
    wsRef.current.onerror = (e) => console.error("WebSocket error:", e);
    wsRef.current.onclose = () => console.log("WebSocket closed");

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      voicesRef.current = synthRef.current.getVoices();
      synthRef.current.onvoiceschanged = () => {
        voicesRef.current = synthRef.current.getVoices();
      };
      console.log("Speech synthesis initialized");
    } else {
      console.error("Speech synthesis not supported in this browser");
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const pickJudgeVoice = useCallback(() => {
    const voices = voicesRef.current || [];
    if (!voices.length) return null;
    return voices.find(v => v.lang?.toLowerCase().startsWith('en-in'))
      || voices.find(v => v.lang?.toLowerCase().startsWith('en'))
      || voices[0];
  }, []);

  const speak = useCallback((text, options = {}) => {
    const { interrupt = false } = options;
    if (!synthRef.current) {
      console.error("Speech synthesis not available");
      return Promise.resolve();
    }

    if (typeof synthRef.current.resume === 'function') {
      synthRef.current.resume();
    }
    synthRef.current.cancel();

    return new Promise((resolve) => {
      const clippedText = interrupt
        ? text.split(/[.?!]/).filter(Boolean)[0] || text
        : text;
      const utterance = new SpeechSynthesisUtterance(clippedText);
      const selectedVoice = pickJudgeVoice();
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.lang = selectedVoice?.lang || 'en-IN';
      utterance.rate = interrupt ? 1.1 : 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      utterance.onend = done;
      utterance.onerror = () => done();

      synthRef.current.speak(utterance);
      setTimeout(done, interrupt ? 1800 : 7000);
    });
  }, [pickJudgeVoice]);

  const processArgument = useCallback(async (text, side) => {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);

    // Add argument to transcript
    addTranscript({ type: side, text });

    beginJudgePhase();

    let judgeResponse = null;
    try {
      const state = useGameStore.getState();
      const selectedCaseData = state.selectedCase;
      
      // Build history as array of objects for backend
      const history = state.transcript.map(t => ({
        role: t.type === 'judge' ? 'Judge' : (t.type === 'petitioner' ? 'Petitioner' : 'Respondent'),
        argument: t.text
      }));

      const roleName = side === 'petitioner' ? 'Petitioner' : 'Respondent';

      judgeResponse = await new Promise((resolve, reject) => {
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
            const data = JSON.parse(event.data);
            resolve(data);
          } catch (_error) {
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

        wsRef.current.send(JSON.stringify({
          role: roleName,
          text: text,
          history: history,
          selectedCase: selectedCaseData,
        }));
      });

      // judgeResponse is now a parsed object from backend
      const {
        feedback = "The Court acknowledges your submission.",
        logic_score = 5,
        clarity_score = 5,
        confidence_score = 5,
        interrupt = false,
        evidence = [],
        reasoning_breakdown = null,
      } = judgeResponse;

      const scores = {
        logic: logic_score,
        clarity: clarity_score,
        confidence: confidence_score,
        feedback: feedback,
        evidence,
        reasoning_breakdown,
      };

      const { retryCountBySpeaker } = useGameStore.getState();
      const nextAttempt = Math.min((retryCountBySpeaker?.[side] || 0) + 1, 2);
      const interruptContext = interrupt
        ? { speaker: side, attempt: nextAttempt, max: 2 }
        : null;

      updateScores(side, scores);
      setJudgeMessage(feedback, interrupt, interruptContext);
      await speak(feedback, { interrupt });
      addTranscript({ type: 'judge', text: feedback, scores });

    } catch (e) {
      console.error("Backend error:", e);
      const fallback = "The court's connection was dropped. Counsel, please proceed.";
      const fallbackScores = {
        logic: 5,
        clarity: 5,
        confidence: 5,
        feedback: fallback,
        evidence: [],
        reasoning_breakdown: null,
      };
      
      setJudgeMessage(fallback, false);
      addTranscript({ type: 'judge', text: fallback, scores: fallbackScores });
      updateScores(side, fallbackScores);
      await speak(fallback, { interrupt: false });
      judgeResponse = { feedback: fallback, interrupt: false };
    }

    await new Promise(r => setTimeout(r, judgeResponse?.interrupt ? 120 : 220));
    clearJudge();
    const { retryCountBySpeaker } = useGameStore.getState();
    const isInterrupt = !!judgeResponse?.interrupt;
    const currentRetries = retryCountBySpeaker?.[side] || 0;

    if (isInterrupt && currentRetries < 2) {
      resumeSameSpeakerWithRetry(side);
    } else {
      advanceToOtherSpeaker(side);
    }
    setIsProcessing(false);
  }, [
    isProcessing,
    addTranscript,
    setJudgeMessage,
    clearJudge,
    updateScores,
    beginJudgePhase,
    resumeSameSpeakerWithRetry,
    advanceToOtherSpeaker,
    speak,
  ]);

  const getOpeningStatement = useCallback(() => {
    if (!selectedCase) return "Order! This Court is now in session.";
    const template = JUDGE_OPENINGS[Math.floor(Math.random() * JUDGE_OPENINGS.length)];
    return template.replace('{CASE}', selectedCase.title);
  }, [selectedCase]);

  return { processArgument, isProcessing, getOpeningStatement };
}
