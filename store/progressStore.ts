import { create } from "zustand";

interface ProgressState {
  progress: number;
  updateProgressValue: () => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  progress: 78,

  updateProgressValue: () => {
    set({ progress: Math.floor(Math.random() * 100) });
  },

  resetProgress: () => {
    set({ progress: 0 });
  },
}));
