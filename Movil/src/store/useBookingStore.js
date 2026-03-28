import { create } from 'zustand';

const useBookingStore = create((set) => ({
  activeBookings: [],
  history: [],
  checkoutState: {
    selectedDate: null,
    selectedTime: null,
    provider: null,
    total: 0,
    status: 'idle', // 'idle' | 'processing_payment' | 'success' | 'error'
  },

  setActiveBookings: (bookings) => set({ activeBookings: bookings }),
  setHistory: (history) => set({ history }),
  setCheckoutState: (updates) => set((state) => ({ checkoutState: { ...state.checkoutState, ...updates } })),
  resetCheckoutFlow: () => set({ checkoutState: { selectedDate: null, selectedTime: null, provider: null, total: 0, status: 'idle' } }),
}));

export default useBookingStore;
