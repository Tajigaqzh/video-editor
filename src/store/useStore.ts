import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  user: { name: string } | null;
  setUser: (user: { name: string } | null) => void;
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        setUser: (user) => set({ user }),
      }),
      {
        name: 'app-storage',
      }
    )
  )
);
