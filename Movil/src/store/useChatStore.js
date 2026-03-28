import { create } from 'zustand';

const useChatStore = create((set) => ({
  rooms: [],
  unreadMessagesCount: 0,
  isWsConnected: false,

  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),
  updateRoom: (roomId, updates) => set((state) => ({
    rooms: state.rooms.map((r) => r.id === roomId ? { ...r, ...updates } : r)
  })),
  setUnreadMessagesCount: (count) => set({ unreadMessagesCount: count }),
  incrementUnreadCount: () => set((state) => ({ unreadMessagesCount: state.unreadMessagesCount + 1 })),
  setWsConnectionStatus: (status) => set({ isWsConnected: status }),
}));

export default useChatStore;
