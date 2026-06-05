import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
}

interface SocketContextType {
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useAuthStore((state) => state.socket);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    if (!socket) return;

    // Handle new request submitted (alerts all relevant staff)
    socket.on('request:new', (data: any) => {
      const isEmergency = data.type === 'EMERGENCY';
      showToast(
        isEmergency ? '🚨 URGENT: Emergency Outing Request' : '📝 New Leave Request Submitted',
        `${data.studentName} (${data.rollNumber}) requested a ${data.type.toLowerCase()} to ${data.place}.`,
        isEmergency ? 'error' : 'info'
      );
      // Dispatch live dashboard refresh event
      window.dispatchEvent(new Event('refresh_dashboard'));
    });

    // Handle request status update (alerts student and other stakeholders)
    socket.on('request:updated', (data: any) => {
      const type = data.status === 'REJECTED' || data.status === 'OVERDUE' ? 'warning' : 'success';
      const title = data.status === 'OVERDUE' ? '⚠️ Leave Request Overdue!' : '✅ Request Status Updated';
      const actorName = data.actorType ? data.actorType.toLowerCase() : 'system';
      
      showToast(
        title,
        `Request status changed to ${data.status} by ${actorName}.`,
        type
      );
      // Dispatch live dashboard refresh event
      window.dispatchEvent(new Event('refresh_dashboard'));
    });

    return () => {
      socket.off('request:new');
      socket.off('request:updated');
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ showToast }}>
      {children}

      {/* Modern Sleek Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col space-y-3 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full bg-slate-900/95 backdrop-blur-md border rounded-xl p-4 shadow-2xl flex items-start space-x-3 transition-all duration-300 transform translate-y-0 animate-slide-in border-slate-700/50`}
            style={{
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.35), 0 8px 10px -6px rgb(0 0 0 / 0.35)',
            }}
          >
            {/* Elegant status indicator dot */}
            <div className="mt-1 flex-shrink-0">
              <span className={`flex h-3 w-3 rounded-full ${
                toast.type === 'success' ? 'bg-emerald-400 animate-pulse' :
                toast.type === 'warning' ? 'bg-amber-400 animate-pulse' :
                toast.type === 'error' ? 'bg-rose-500 animate-ping' : 'bg-sky-400 animate-pulse'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-100 mb-0.5">{toast.title}</h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg p-0.5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};
