import { Socket } from 'socket.io-client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'warden' | 'hod' | 'placement' | 'gate' | 'ADMIN' | 'WARDEN' | 'HOD' | 'PLACEMENT' | 'SECURITY';
  department?: string | null;
}

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  room_id: string;
  department: string;
  year: number;
  section: string;
}

export interface AuthState {
  user: User | null;
  student: Student | null;
  isAuthenticated: boolean;
  role: 'student' | 'staff' | null;
  socket: Socket | null;
  setAuth: (token: string, refreshToken: string, userData: any, isStudent: boolean) => void;
  logout: () => void;
  checkAuth: () => void;
}
