import { create } from 'zustand';

const useDeviceStore = create((set) => ({
  isConnected: false,
  lastActivity: null,
  currentAvatarState: 'IDLE', // 'IDLE' | 'WALK' | 'JUMP' | 'HAPPY', etc.
  telemetry: null, // Battery, signal, etc.

  audioFeatures: null,

  setConnectionStatus: (status) => set({ isConnected: status }),
  setLastActivity: (timestamp) => set({ lastActivity: timestamp }),
  setAvatarState: (state) => set({ currentAvatarState: state }),
  setTelemetry: (data) => set({ telemetry: data }),
  setAudioFeatures: (data) => set({ audioFeatures: data }),
}));

export default useDeviceStore;
