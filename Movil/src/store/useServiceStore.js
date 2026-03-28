import { create } from 'zustand';

const useServiceStore = create((set) => ({
  services: [],
  filters: {
    distance: 5000,
    price: null,
    rating: null,
  },
  pagination: {
    page: 1,
    limit: 10,
    hasMore: true,
  },
  isLoading: false,
  isError: false,

  setServices: (services) => set({ services }),
  appendServices: (newServices) => set((state) => ({ services: [...state.services, ...newServices] })),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setPagination: (pagination) => set((state) => ({ pagination: { ...state.pagination, ...pagination } })),
  setLoading: (status) => set({ isLoading: status }),
  setError: (status) => set({ isError: status }),
}));

export default useServiceStore;
