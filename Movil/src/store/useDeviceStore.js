import { create } from 'zustand';

const useDeviceStore = create((set) => ({
  isConnected: false,
  lastActivity: null,
  currentAvatarState: 'IDLE', // 'IDLE' | 'WALK' | 'JUMP' | 'HAPPY', etc.
  telemetry: null, // Battery, signal, etc.

  setConnectionStatus: (status) => set({ isConnected: status }),
  setLastActivity: (timestamp) => set({ lastActivity: timestamp }),
  setAvatarState: (state) => set({ currentAvatarState: state }),
  setTelemetry: (data) => set({ telemetry: data }),
}));

export default useDeviceStore;
