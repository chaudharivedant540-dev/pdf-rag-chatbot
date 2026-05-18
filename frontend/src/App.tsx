import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

export default function App() {
  const { isLoggedIn, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  return isLoggedIn ? <ChatPage /> : <AuthPage />;
}
