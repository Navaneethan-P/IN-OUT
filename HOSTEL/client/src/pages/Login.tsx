import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/axios';
import { KeyRound, User, Loader2 } from 'lucide-react';

export default function Login() {
  const [roleMode, setRoleMode] = useState<'student' | 'staff'>('student');
  const [identifier, setIdentifier] = useState(''); // Roll number or email
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = roleMode === 'student' ? '/auth/student/login' : '/auth/staff/login';
      const payload = roleMode === 'student' 
        ? { rollNumber: identifier, password } 
        : { email: identifier, password };
        
      const response = await api.post(endpoint, payload);
      
      const { accessToken, user } = response.data.data;
      
      setAuth(
        accessToken, 
        '', // No refresh token implemented yet
        user, 
        roleMode === 'student'
      );
      
      if (roleMode === 'student') {
        navigate('/student');
      } else if (user.role === 'SECURITY') {
        navigate('/security');
      } else {
        navigate('/warden');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-300 shadow-sm rounded-none">
        
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
          <h1 className="text-xl font-semibold text-white tracking-tight">
            HOSTEL OPERATIONS
          </h1>
          <p className="text-slate-400 text-sm mt-1">Platform Access Terminal</p>
        </div>

        <div className="p-6">
          <div className="flex border border-slate-300 rounded-none mb-6">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                roleMode === 'student' 
                  ? 'bg-brand-500 text-white border-r border-brand-600' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-r border-slate-300'
              }`}
              onClick={() => { setRoleMode('student'); setIdentifier(''); setError(null); }}
            >
              STUDENT LOGIN
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                roleMode === 'staff' 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => { setRoleMode('staff'); setIdentifier(''); setError(null); }}
            >
              STAFF LOGIN
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <span className="font-semibold text-red-800 mt-0.5">ERR:</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                {roleMode === 'student' ? 'Roll Number' : 'Institutional Email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={roleMode === 'staff' ? 'email' : 'text'}
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder={roleMode === 'student' ? 'e.g. 22BIT0001' : 'warden@hostel.edu'}
                  value={identifier}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIdentifier(roleMode === 'student' ? val.toUpperCase() : val.toLowerCase());
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier || !password}
              className="w-full mt-6 flex justify-center py-2.5 px-4 border border-transparent rounded-none shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'AUTHENTICATE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
