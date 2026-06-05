import { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { Loader2, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function NewRequest() {
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Settings to check if it's a working day
  const [isWorkingDay, setIsWorkingDay] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);

  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0];
  const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
  const laterHour = ((now.getHours() + 2) % 24).toString().padStart(2, '0') + ':00';

  const [formData, setFormData] = useState({
    type: 'OUTING',
    reason: '',
    place: '',
    
    // For OUTING
    outingDate: todayDate,
    
    // For LEAVE
    outDate: todayDate,
    inDate: tomorrowDate,
    
    // Shared times
    outTime: currentHour,
    inTime: laterHour,
    
    isEmergency: false,
    hasHodLetter: false,
    submittedPhysicalCopy: false,
  });

  useEffect(() => {
    api.get('/student/settings')
      .then(res => {
        setIsWorkingDay(res.data.data?.isWorkingDay || false);
      })
      .catch(err => {
        console.error('Failed to fetch settings', err);
      })
      .finally(() => {
        setFetchingSettings(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let finalOutDatetime = '';
      let finalReturnDatetime = '';

      if (formData.type === 'OUTING') {
        if (!formData.outingDate || !formData.outTime) {
          throw new Error("Please tell us when you are leaving.");
        }
        finalOutDatetime = new Date(`${formData.outingDate}T${formData.outTime}`).toISOString();
        const fallbackInTime = formData.inTime || '23:59';
        finalReturnDatetime = new Date(`${formData.outingDate}T${fallbackInTime}`).toISOString();
      } else {
        if (!formData.outDate || !formData.outTime) {
          throw new Error("Please tell us when you are leaving.");
        }
        finalOutDatetime = new Date(`${formData.outDate}T${formData.outTime}`).toISOString();
        
        let fallbackInDate = formData.inDate;
        if (!fallbackInDate) {
          const defaultInDate = new Date(new Date(finalOutDatetime).getTime() + 24 * 60 * 60 * 1000);
          fallbackInDate = defaultInDate.toISOString().split('T')[0];
        }
        const fallbackInTime = formData.inTime || '23:59';
        finalReturnDatetime = new Date(`${fallbackInDate}T${fallbackInTime}`).toISOString();
      }

      const payload = {
        type: formData.type,
        reason: formData.reason,
        place: formData.place,
        isEmergency: formData.isEmergency,
        hasHodLetter: formData.hasHodLetter,
        submittedPhysicalCopy: formData.submittedPhysicalCopy,
        outDatetime: finalOutDatetime,
        expectedReturnDatetime: finalReturnDatetime
      };
      
      await api.post('/requests', payload);
      setIsSuccess(true);
      
      setTimeout(() => {
        logout();
      }, 5000);
      
    } catch (err: any) {
      if (err instanceof Error && err.message.startsWith("Please tell us")) {
        setError(err.message);
      } else {
        const errorData = err.response?.data?.error;
        if (errorData?.code === 'VALIDATION_ERROR' && errorData?.fields?.length > 0) {
          setError(errorData.fields.map((f: any) => f.message).join(' | '));
        } else {
          setError(errorData?.message || 'Failed to submit request.');
        }
      }
      setIsLoading(false);
    }
  };

  if (fetchingSettings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-slate-300 p-10 shadow-sm max-w-md w-full text-center rounded-xl">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted</h2>
          <p className="text-slate-600 mb-8">
            Your request has been forwarded to the Warden. Check your email for updates or the gate pass ticket.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full bg-slate-900 text-white py-3 font-semibold rounded-md hover:bg-slate-800 transition-colors"
          >
            Finish & Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white text-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            New Gatepass Request 
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
              Safe Connection
            </span>
          </h1>
        </div>
        <button 
          onClick={() => logout()}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Logout
        </button>
      </header>
      
      <main className="p-6 max-w-2xl mx-auto mt-6 pb-20">
        <div className="bg-white border border-slate-300 shadow-sm p-6 sm:p-8 rounded-xl">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-red-50 border border-red-100 p-4 rounded-md flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-red-900">Emergency</h3>
                <p className="text-xs text-red-700">Check this if it is an urgent emergency</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.isEmergency}
                  onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  What kind of pass do you need?
                </label>
                <select 
                  className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="OUTING">Outing (Going out and coming back today)</option>
                  <option value="LEAVE">Leave (Staying away for one or more nights)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Where are you going?
                </label>
                <input 
                  type="text"
                  required
                  className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                  placeholder="e.g. Sholinghur"
                  value={formData.place}
                  onChange={e => setFormData({ ...formData, place: e.target.value })}
                />
              </div>
            </div>

            {/* DateTime Section */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-md space-y-4">
              {formData.type === 'OUTING' ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date you are leaving
                    </label>
                    <input 
                      type="date"
                      required
                      className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                      value={formData.outingDate}
                      onChange={e => setFormData({ ...formData, outingDate: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Time you are leaving
                      </label>
                      <input 
                        type="time"
                        required
                        className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                        value={formData.outTime}
                        onChange={e => setFormData({ ...formData, outTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Time you will return <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input 
                        type="time"
                        className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                        value={formData.inTime}
                        onChange={e => setFormData({ ...formData, inTime: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Date you are leaving
                      </label>
                      <input 
                        type="date"
                        required
                        className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                        value={formData.outDate}
                        onChange={e => setFormData({ ...formData, outDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Time you are leaving
                      </label>
                      <input 
                        type="time"
                        required
                        className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                        value={formData.outTime}
                        onChange={e => setFormData({ ...formData, outTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Date you will return <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input 
                        type="date"
                        className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                        value={formData.inDate}
                        onChange={e => setFormData({ ...formData, inDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Time you will return <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input 
                        type="time"
                        className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                        value={formData.inTime}
                        onChange={e => setFormData({ ...formData, inTime: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Why do you need to go?
              </label>
              <textarea 
                required
                rows={3}
                className="w-full border border-slate-300 bg-white p-3 rounded-md text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium resize-none"
                placeholder="Please provide a reason..."
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            {isWorkingDay && (
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-md space-y-4">
                <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Working Day Requirements
                </h3>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800 font-medium">Do you have a permission letter from your HOD or Placement officer?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.hasHodLetter}
                      onChange={(e) => setFormData({ ...formData, hasHodLetter: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800 font-medium">Did you give the physical copy of the letter to the Warden?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.submittedPhysicalCopy}
                      onChange={(e) => setFormData({ ...formData, submittedPhysicalCopy: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>
            )}

            <hr className="border-slate-200" />

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 px-6 py-4 bg-brand-600 hover:bg-brand-700 text-white text-base font-bold rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              Submit Request
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
