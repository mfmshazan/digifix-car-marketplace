import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'digifix-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
