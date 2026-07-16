import { create } from 'zustand';

interface UIStore {
  isQuickLogOpen: boolean;
  setQuickLogOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isQuickLogOpen: false,
  setQuickLogOpen: (open) => set({ isQuickLogOpen: open }),
}));
