import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  role: null, // 'CLIENT' | 'PROVIDER'

  login: (userData, token, role) => set({ user: userData, token, role }),
  logout: () => set({ user: null, token: null, role: null }),
  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}));

export default useAuthStore;
