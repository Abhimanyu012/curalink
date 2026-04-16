import { create } from 'zustand';

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useChatStore = create((set, get) => ({
  /** Unique session ID — persists across re-renders, resets on newSession() */
  sessionId: uid(),

  /** Patient context filled in the sidebar form */
  patientContext: {
    patientName: '',
    disease: '',
    location: '',
  },

  /** All chat messages in order */
  messages: [],

  /** Current pipeline progress event (null when idle) */
  progress: null,

  /** True while a request is in-flight */
  isLoading: false,

  // ── Actions ──────────────────────────────────────────────────────────────

  setPatientContext: (patch) =>
    set((s) => ({ patientContext: { ...s.patientContext, ...patch } })),

  addMessage: (message) =>
    set((s) => ({
      messages: [...s.messages, { id: uid(), ...message }],
    })),

  updateProgress: (progress) => set({ progress }),

  clearProgress: () => set({ progress: null }),

  setLoading: (isLoading) => set({ isLoading }),

  clearMessages: () => set({ messages: [], progress: null }),

  newSession: () =>
    set({
      sessionId: uid(),
      messages: [],
      progress: null,
      isLoading: false,
    }),
}));
