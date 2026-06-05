import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import NewRequest from './pages/student/NewRequest';
import WardenDashboard from './pages/warden/Dashboard';
import GateScanner from './pages/security/GateScanner';

// A simple protective wrapper
const ProtectedRoute = ({ children, allowedRole }: { children: JSX.Element, allowedRole: 'student' | 'staff' | 'gate' }) => {
  const { isAuthenticated, role, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== allowedRole && allowedRole !== 'gate') {
    return <Navigate to={role === 'student' ? '/student' : '/warden'} replace />;
  }
  
  if (allowedRole === 'gate' && user?.role !== 'SECURITY' && user?.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

import { SocketProvider } from './providers/SocketProvider';

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedRole="student">
              <NewRequest />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/warden/*" 
          element={
            <ProtectedRoute allowedRole="staff">
              <WardenDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/security/*" 
          element={
            <ProtectedRoute allowedRole="gate">
              <GateScanner />
            </ProtectedRoute>
          } 
        />
        
        {/* Default route redirects based on auth */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}
