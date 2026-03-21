import { create } from 'zustand';

export const GAME_PHASES = {
  LOBBY: 'LOBBY',
  CASE_SELECT: 'CASE_SELECT',
  COURTROOM: 'COURTROOM',
  VERDICT: 'VERDICT',
};

export const TURN_STATES = {
  WAITING: 'WAITING',
  PETITIONER: 'PETITIONER',
  JUDGE: 'JUDGE',
  RESPONDENT: 'RESPONDENT',
  END: 'END',
};

const initialScores = {
  petitioner: { logic: 0, clarity: 0, confidence: 0, total: 0, history: [] },
  respondent: { logic: 0, clarity: 0, confidence: 0, total: 0, history: [] },
};

export const useGameStore = create((set, get) => ({
  phase: GAME_PHASES.LOBBY,
  turnState: TURN_STATES.WAITING,
  selectedCase: null,
  petitionerName: 'Counsel A',
  respondentName: 'Counsel B',
  scores: initialScores,
  transcript: [],
  judgeMessage: null,
  isJudgeSpeaking: false,
  isInterrupting: false,
  timer: 60,
  timerActive: false,
  roundNumber: 1,
  maxRounds: 3,
  objectionActive: null,
  verdict: null,
  showVerdict: false,

  setPhase: (phase) => set({ phase }),
  setSelectedCase: (c) => set({ selectedCase: c }),
  setPetitionerName: (name) => set({ petitionerName: name }),
  setRespondentName: (name) => set({ respondentName: name }),

  startGame: () => set({
    phase: GAME_PHASES.COURTROOM,
    turnState: TURN_STATES.PETITIONER,
    scores: initialScores,
    transcript: [],
    judgeMessage: null,
    isJudgeSpeaking: false,
    timer: 60,
    timerActive: true,
    roundNumber: 1,
    objectionActive: null,
    verdict: null,
    showVerdict: false,
  }),

  setTurn: (turn) => set({ turnState: turn, timer: 60, timerActive: turn !== TURN_STATES.JUDGE }),

  addTranscript: (entry) => set((state) => ({
    transcript: [...state.transcript, { ...entry, id: Date.now(), timestamp: new Date().toLocaleTimeString() }]
  })),

  setJudgeMessage: (message, interrupting = false) => set({
    judgeMessage: message,
    isJudgeSpeaking: !!message,
    isInterrupting: interrupting,
  }),

  clearJudge: () => set({ judgeMessage: null, isJudgeSpeaking: false, isInterrupting: false }),

  updateScores: (side, newScores) => set((state) => {
    const prev = state.scores[side];
    const logic = Math.min(10, (prev.logic * 0.6 + newScores.logic * 0.4));
    const clarity = Math.min(10, (prev.clarity * 0.6 + newScores.clarity * 0.4));
    const confidence = Math.min(10, (prev.confidence * 0.6 + newScores.confidence * 0.4));
    const total = Math.round((logic + clarity + confidence) / 3 * 10);
    return {
      scores: {
        ...state.scores,
        [side]: {
          logic: parseFloat(logic.toFixed(1)),
          clarity: parseFloat(clarity.toFixed(1)),
          confidence: parseFloat(confidence.toFixed(1)),
          total,
          history: [...prev.history, { logic, clarity, confidence, total, round: state.roundNumber }]
        }
      }
    };
  }),

  setObjection: (side) => set({ objectionActive: side }),
  clearObjection: () => set({ objectionActive: null }),

  tickTimer: () => set((state) => {
    if (!state.timerActive || state.timer <= 0) return {};
    return { timer: state.timer - 1 };
  }),

  setTimerActive: (active) => set({ timerActive: active }),

  nextRound: () => {
    const { roundNumber, maxRounds, turnState } = get();
    if (roundNumber >= maxRounds) {
      get().generateVerdict();
      return;
    }
    const nextTurn = turnState === TURN_STATES.PETITIONER ? TURN_STATES.RESPONDENT : TURN_STATES.PETITIONER;
    set({ roundNumber: roundNumber + 1, turnState: nextTurn, timer: 60, timerActive: true });
  },

  generateVerdict: () => {
    const { scores, petitionerName, respondentName } = get();
    const pTotal = scores.petitioner.total;
    const rTotal = scores.respondent.total;
    const winner = pTotal >= rTotal ? petitionerName : respondentName;
    const loser = pTotal >= rTotal ? respondentName : petitionerName;
    const margin = Math.abs(pTotal - rTotal);

    const verdict = {
      winner,
      loser,
      petitionerScore: pTotal,
      respondentScore: rTotal,
      margin,
      decision: pTotal >= rTotal ? 'ALLOWED' : 'DISMISSED',
      reasoning: margin > 20
        ? `${winner} demonstrated significantly superior legal reasoning, clear precedential analysis, and compelling argumentation throughout the proceedings.`
        : margin > 10
        ? `${winner} provided stronger arguments with better use of legal precedents and more structured submissions.`
        : `This was a closely contested matter. ${winner} prevailed by a narrow margin due to slightly clearer articulation of legal principles.`,
    };
    set({ verdict, showVerdict: true, phase: GAME_PHASES.VERDICT, turnState: TURN_STATES.END, timerActive: false });
  },

  resetGame: () => set({
    phase: GAME_PHASES.LOBBY,
    turnState: TURN_STATES.WAITING,
    selectedCase: null,
    scores: initialScores,
    transcript: [],
    judgeMessage: null,
    isJudgeSpeaking: false,
    isInterrupting: false,
    timer: 60,
    timerActive: false,
    roundNumber: 1,
    objectionActive: null,
    verdict: null,
    showVerdict: false,
  }),
}));
