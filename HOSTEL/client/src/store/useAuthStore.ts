import { create } from 'zustand';
import { AuthState } from '../types';
import { io } from 'socket.io-client';

// Dynamic intranet socket URL — resolves to whatever host served this page.
// In production (single-port on Express), this is the server's LAN IP:3000.
// In development (Vite), this proxies through Vite to localhost:3000.
const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

let initialUser = null;
let initialStudent = null;
let initialIsAuth = false;
let initialRole: 'student' | 'staff' | 'gate' | null = null;
let initialSocket = null;

if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  const authDataStr = localStorage.getItem('auth_data');
  if (token && authDataStr) {
    try {
      const { userData, isStudent } = JSON.parse(authDataStr);
      if (userData) {
        initialIsAuth = true;
        initialRole = isStudent ? 'student' : (userData.role === 'SECURITY' ? 'gate' : 'staff');
        if (isStudent) {
          initialStudent = userData;
        } else {
          initialUser = userData;
        }
        initialSocket = io(SOCKET_URL, { auth: { token } });
      }
    } catch (e) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_data');
    }
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  student: initialStudent,
  isAuthenticated: initialIsAuth,
  role: initialRole,
  socket: initialSocket,

  setAuth: (token, refreshToken, userData, isStudent) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    
    // Also store user data briefly so refresh on reload is easy
    localStorage.setItem('auth_data', JSON.stringify({ userData, isStudent }));

    const socket = io(SOCKET_URL, { auth: { token } });

    if (isStudent) {
      set({ student: userData, user: null, isAuthenticated: true, role: 'student', socket });
    } else {
      set({ user: userData, student: null, isAuthenticated: true, role: 'staff', socket });
    }
  },

  logout: () => {
    get().socket?.disconnect();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_data');
    set({ user: null, student: null, isAuthenticated: false, role: null, socket: null });
  },

  checkAuth: () => {
    const token = localStorage.getItem('access_token');
    const authDataStr = localStorage.getItem('auth_data');
    
    if (token && authDataStr) {
      try {
        const { userData, isStudent } = authDataStr ? JSON.parse(authDataStr) : { userData: null, isStudent: false };
        if (userData) {
          const socket = io(SOCKET_URL, { auth: { token } });

          if (isStudent) {
            set({ student: userData, user: null, isAuthenticated: true, role: 'student', socket });
          } else {
            set({ user: userData, student: null, isAuthenticated: true, role: 'staff', socket });
          }
        }
      } catch (e) {
        // invalid data
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_data');
        set({ isAuthenticated: false, socket: null });
      }
    } else {
      set({ isAuthenticated: false, socket: null });
    }
  }
}));

// Listen for 401s from axios
if (typeof window !== 'undefined') {
  window.addEventListener('auth-unauthorized', () => {
    useAuthStore.getState().logout();
  });
}
