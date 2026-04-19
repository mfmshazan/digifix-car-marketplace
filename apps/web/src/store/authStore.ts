import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'CUSTOMER' | 'SALESMAN';
  avatar: string | null;
  phone: string | null;
  store?: {
    id: string;
    name: string;
  } | null;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem('digifix_token', token);
        } else {
          localStorage.removeItem('digifix_token');
        }
      },

      login: (user, token) => {
        localStorage.setItem('digifix_token', token);
        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        localStorage.removeItem('digifix_token');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },

      setLoading: (isLoading) => set({ isLoading }),

      refreshProfile: async () => {
        const { token, isAuthenticated } = get();
        if (!token || !isAuthenticated) return;

        try {
          const response = await authApi.getProfile();
          if (response.success && response.data) {
            set({ user: response.data });
          }
        } catch (error) {
          console.error('Failed to refresh profile:', error);
          // If profile fetch fails with 401, the interceptor will handle logout
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'digifix-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
