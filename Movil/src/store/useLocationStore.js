import { create } from 'zustand';

const useLocationStore = create((set) => ({
  coordinates: [0, 0], // [lat, lng]
  permissions: false, // GPS permissions granted
  searchRadius: 5000, // Default 5km radius

  setCoordinates: (coords) => set({ coordinates: coords }),
  setPermissions: (status) => set({ permissions: status }),
  setSearchRadius: (radius) => set({ searchRadius: radius }),
}));

export default useLocationStore;
