import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isLoggedIn: boolean;
  username: string;
  email: string;
  role: string;
  token: string;
  login: (userData: { username: string; email: string; role: string; access_token: string }) => void;
  logout: () => void;
  initAuth: () => void;
  setUser: (data: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      username: '',
      email: '',
      role: '',
      token: '',

      login: (userData) => {
        set({
          isLoggedIn: true,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          token: userData.access_token,
        });
      },

      logout: () => {
        set({
          isLoggedIn: false,
          username: '',
          email: '',
          role: '',
          token: '',
        });
      },

      initAuth: () => {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        if (token && username) {
          set({
            isLoggedIn: true,
            token,
            username,
            email: localStorage.getItem('email') || '',
            role: localStorage.getItem('role') || 'user',
          });
        }
      },

      setUser: (data) => {
        set(data);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
