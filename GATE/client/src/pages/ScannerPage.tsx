import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Phone, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../components/Layout';

const API_URL = 'http://localhost:3001/api';

export default function ScannerPage() {
  const [inputVal, setInputVal] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [lastAction, setLastAction] = useState<'IN' | 'OUT' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input focused for barcode scanner
  useEffect(() => {
    const focusInput = () => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener('click', focusInput);
    focusInput();
    return () => document.removeEventListener('click', focusInput);
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    
    setError('');
    setSuccess('');
    setStudent(null);
    setLoading(true);

    try {
      const res = await axios.get(`${API_URL}/scan/${inputVal.trim()}`);
      setStudent(res.data.student);
      setLastAction(res.data.lastAction);
      setInputVal(''); // clear for next scan
    } catch (err: any) {
      setError(err.response?.data?.error || 'Student not found');
      setInputVal('');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (action: 'IN' | 'OUT') => {
    if (!student) return;
    
    try {
      await axios.post(`${API_URL}/scan`, {
        studentId: student.id,
        action
      });
      setSuccess(`Marked ${action} successfully! SMS sent to parent.`);
      setStudent(null);
      setLastAction(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to log attendance');
    }
  };

  const recommendedAction = lastAction === 'IN' ? 'OUT' : 'IN';

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
          Gate Scanner
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Scan ID card barcode or type Roll Number and press Enter
        </p>
      </div>

      <form onSubmit={handleScan} className="mb-8">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Awaiting scan..."
          className="block w-full px-5 py-4 border-2 border-indigo-200 rounded-xl text-center text-2xl uppercase focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          disabled={loading || !!student}
        />
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 mb-6 flex items-center shadow-sm border border-red-100">
          <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
          <h3 className="text-lg font-medium text-red-800">{error}</h3>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 p-4 mb-6 flex items-center shadow-sm border border-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
          <h3 className="text-lg font-medium text-green-800">{success}</h3>
        </div>
      )}

      {student && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Student Profile</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {student.department} - Year {student.year}
            </span>
          </div>
          
          <div className="p-6 sm:p-8">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-md">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-3xl font-bold text-gray-900 truncate">
                  {student.name}
                </p>
                <p className="text-xl text-indigo-600 font-semibold mb-4">
                  {student.rollNo}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-700">
                    <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                    <span className="font-medium">Room: {student.roomNo}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Phone className="h-5 w-5 mr-2 text-gray-400" />
                    <span className="font-medium">Parent: {student.parentPhone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-gray-100 pt-8">
              <button
                onClick={() => markAttendance('IN')}
                className={cn(
                  "flex justify-center items-center px-8 py-4 border text-lg font-bold rounded-xl shadow-sm focus:outline-none focus:ring-4 transition-all",
                  recommendedAction === 'IN' 
                    ? "bg-green-600 text-white hover:bg-green-700 border-transparent focus:ring-green-500/30 scale-105" 
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-500/20"
                )}
              >
                MARK IN
                {recommendedAction === 'IN' && <CheckCircle2 className="ml-2 h-6 w-6" />}
              </button>
              
              <button
                onClick={() => markAttendance('OUT')}
                className={cn(
                  "flex justify-center items-center px-8 py-4 border text-lg font-bold rounded-xl shadow-sm focus:outline-none focus:ring-4 transition-all",
                  recommendedAction === 'OUT' 
                    ? "bg-red-600 text-white hover:bg-red-700 border-transparent focus:ring-red-500/30 scale-105" 
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-500/20"
                )}
              >
                MARK OUT
                {recommendedAction === 'OUT' && <CheckCircle2 className="ml-2 h-6 w-6" />}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
             <span>Currently Marked: <strong className={lastAction === 'IN' ? 'text-green-600' : 'text-red-600'}>{lastAction || 'UNKNOWN'}</strong></span>
             <button onClick={() => setStudent(null)} className="text-indigo-600 hover:text-indigo-800 font-medium">Cancel / Scan Another</button>
          </div>
        </div>
      )}
    </div>
  );
}
