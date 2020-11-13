import create from 'zustand';

export type UseAuthStore = {
  expired?: boolean
  setExpired: (expired: boolean) => void;
};

const useAuthStore = create<UseAuthStore>(set => ({
  expired: false,
  setExpired: (expired: boolean) => set({ expired }),
}));

export { useAuthStore };
