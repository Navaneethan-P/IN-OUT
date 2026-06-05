import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/axios';
import { LogOut, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function GateScanner() {
  const { user, logout } = useAuthStore();
  const [mode, setMode] = useState<'EXIT' | 'ENTRY'>('EXIT');
  const [rollNumber, setRollNumber] = useState('');
  
  // Status overlay
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'ERROR';
    title: string;
    message: string;
    studentName?: string;
    roomNo?: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus mechanism
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) return;

    const currentRoll = rollNumber.trim().toUpperCase();
    setRollNumber(''); // clear immediately for next scan
    
    try {
      const endpoint = mode === 'EXIT' ? '/gate/scan-exit' : '/gate/scan-entry';
      const res = await api.post(endpoint, { rollNumber: currentRoll });
      
      const data = res.data.data;
      
      setScanResult({
        status: 'SUCCESS',
        title: mode === 'EXIT' ? 'EXIT ALLOWED' : 'ENTRY ALLOWED',
        message: mode === 'EXIT' 
          ? `Destination: ${data.type} \nReturn By: ${format(new Date(data.returnTime), 'h:mm a')}`
          : data.wasOverdue ? 'NOTE: Student returned OVERDUE' : 'Welcome back.',
        studentName: data.studentName,
        roomNo: data.roomNo
      });

      // Play success beep
      try {
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-09.mp3');
        audio.play();
      } catch (e) {}

    } catch (err: any) {
      setScanResult({
        status: 'ERROR',
        title: mode === 'EXIT' ? 'EXIT DENIED' : 'ENTRY DENIED',
        message: err.response?.data?.error?.message || 'Verification Failed'
      });
      
      // Play error beep
      try {
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3');
        audio.play();
      } catch (e) {}
    }

    // Auto-clear overlay after 3 seconds
    setTimeout(() => {
      setScanResult(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-hidden">
      <header className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">GATE SECURITY TERMINAL</h1>
          <div className="text-sm text-slate-500 mt-0.5 font-medium flex gap-3">
            <span>{user?.name}</span>
            <span>|</span>
            <span className="uppercase text-yellow-500">{user?.role}</span>
          </div>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-semibold transition-colors border border-slate-700 text-slate-300"
        >
          <LogOut className="w-4 h-4" />
          SYSTEM EXIT
        </button>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* Toggle Mode */}
        <div className="flex bg-slate-800 rounded-none overflow-hidden border border-slate-700 shadow-2xl z-10 w-full max-w-2xl mb-12">
          <button
            className={`flex-1 py-8 text-3xl font-black tracking-widest uppercase transition-colors ${
              mode === 'EXIT' ? 'bg-brand-600 text-white shadow-inner' : 'bg-transparent text-slate-500 hover:bg-slate-700'
            }`}
            onClick={() => setMode('EXIT')}
          >
            EXIT SCAN
          </button>
          <button
            className={`flex-1 py-8 text-3xl font-black tracking-widest uppercase transition-colors ${
              mode === 'ENTRY' ? 'bg-blue-600 text-white shadow-inner' : 'bg-transparent text-slate-500 hover:bg-slate-700'
            }`}
            onClick={() => setMode('ENTRY')}
          >
            ENTRY SCAN
          </button>
        </div>

        {/* Input Form (Hidden but focused) */}
        <form onSubmit={handleScan} className="z-10 w-full max-w-2xl">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-slate-950 text-white text-center text-4xl font-mono py-6 border-2 border-slate-700 focus:border-brand-500 focus:outline-none placeholder-slate-700"
            placeholder="AWAITING BARCODE SCAN..."
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            autoFocus
            autoComplete="off"
          />
        </form>

        <p className="mt-8 text-slate-500 font-mono text-sm tracking-widest">
          SYSTEM ONLINE. SCANNER ACTIVE.
        </p>

        {/* Fullscreen Overlay Result */}
        {scanResult && (
          <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-100 ${
            scanResult.status === 'SUCCESS' ? 'bg-brand-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {scanResult.status === 'SUCCESS' ? (
              <CheckCircle className="w-48 h-48 mb-8 opacity-80" />
            ) : (
              <XCircle className="w-48 h-48 mb-8 opacity-80" />
            )}
            
            <h1 className="text-7xl font-black tracking-tight mb-4 text-center leading-none">
              {scanResult.title}
            </h1>
            
            {scanResult.studentName && (
              <h2 className="text-4xl font-bold mt-4 mb-2">
                {scanResult.studentName} <span className="opacity-75">({scanResult.roomNo})</span>
              </h2>
            )}
            
            <p className="text-2xl font-medium opacity-90 text-center whitespace-pre-wrap mt-4">
              {scanResult.message}
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
