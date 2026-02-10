
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  privateKey: CryptoKey | null;
  setAuth: (user: User, token: string, privateKey: CryptoKey) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

// Custom storage for CryptoKey (which is not serializable by default JSON.stringify)
// We need to export/import it if we want persistence, BUT
// Security Risk: Persisting private key in localStorage is risky.
// However, for this demo, we rely on the user re-entering password on refresh OR
// we accept the risk.
// Better approach: Do NOT persist privateKey. User must login again on refresh to decrypt it.
// This aligns with "high security" - key is memory-only.
// So we persist token/user but NOT privateKey.
// Wait, if we lose privateKey on refresh, the user can't read messages without re-login.
// This is actually a feature for strict security.
// The user prompt says "Login -> Password decrypts private key only in browser".
// If they refresh, they should probably re-enter password or we store it in session storage (still risky).
// I will NOT persist the private key. User stays logged in but needs to "unlock" (re-enter password) if key is missing?
// Or just logout on refresh?
// Let's persist token and user, but keep privateKey in memory.
// If privateKey is null but token exists, app should redirect to a "Unlock" screen or Login.
// For simplicity in this iteration, I'll just clear everything on refresh or logout,
// OR allow token persistence but check for privateKey existence in the App layout.

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      privateKey: null,
      
      setAuth: (user, token, privateKey) => set({ user, token, privateKey }),
      
      logout: () => {
        set({ user: null, token: null, privateKey: null });
        // Optional: Call logout API
      },

      isAuthenticated: () => !!get().token && !!get().privateKey,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token 
        // Exclude privateKey from persistence
      }),
    }
  )
);
