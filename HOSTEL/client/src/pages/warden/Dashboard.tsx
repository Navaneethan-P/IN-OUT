import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/axios';
import {
  LogOut, Filter, Loader2, Phone, CheckCircle, XCircle,
  ShieldAlert, BarChart3, Clock, Users, FileDown, FileText,
  AlertTriangle, Settings, Search, RefreshCw, ChevronDown,
  Download, Eye, Activity, Home, Database
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { CircularGauge, BarIndicator } from '../../components/CSSCharts';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AnalyticsPayload {
  totalStudents: number;
  presence: { inside: number; outside: number; overdue: number };
  messForecast: number;
  approvals: { approved: number; rejected: number; pending: number };
}

type Tab = 'dashboard' | 'queue' | 'students' | 'reports' | 'settings';

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVALS: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  OUT_CONFIRMED: 'bg-blue-100 text-blue-800',
  OVERDUE: 'bg-red-200 text-red-900 font-bold animate-pulse',
  RETURNED: 'bg-slate-100 text-slate-700',
  COMPLETED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-slate-100 text-slate-400',
  EXPIRED: 'bg-orange-100 text-orange-700',
  DRAFT: 'bg-slate-100 text-slate-500',
};

// ─── Utility ───────────────────────────────────────────────────────────────────

function triggerCSVDownload(url: string, token: string | null) {
  if (!token) return;
  const fullUrl = `${window.location.protocol}//${window.location.hostname}:3000/api/v1${url}`;
  const a = document.createElement('a');
  a.href = fullUrl;
  // Append token as query param for download (simpler than fetch + blob for CSV)
  const sep = url.includes('?') ? '&' : '?';
  a.href = `${fullUrl}${sep}__token=${encodeURIComponent(token)}`;
  // Use fetch with auth header for security
  fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const cd = 'content-disposition';
      link.download = `hostel_export_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    });
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function WardenDashboard() {
  const { user, logout } = useAuthStore();
  const token = localStorage.getItem('access_token');

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Email Credentials State
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [showCredsModal, setShowCredsModal] = useState(false);

  // Dashboard data
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

  // Queue data
  const [requests, setRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVALS');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Students data
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDeptFilter, setStudentDeptFilter] = useState('');
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  // Settings data
  const [settings, setSettings] = useState<any>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // Export state
  const [exportStatus, setExportStatus] = useState('');
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [exportDept, setExportDept] = useState('');

  // ─── Data Fetchers ────────────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true);
    try {
      const res = await api.get('/analytics');
      setAnalytics(res.data.data);
    } catch (err) { console.error(err); }
    finally { setIsAnalyticsLoading(false); }
  }, []);

  const fetchRequests = useCallback(async (status = statusFilter) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/warden/requests?status=${status}&limit=100`);
      setRequests(res.data.data.items || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [statusFilter]);

  const fetchAllRequests = useCallback(async () => {
    try {
      const res = await api.get('/warden/requests?limit=200');
      setAllRequests(res.data.data.items || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchStudents = useCallback(async () => {
    setIsStudentsLoading(true);
    try {
      const params = new URLSearchParams();
      if (studentSearch) params.set('search', studentSearch);
      if (studentDeptFilter) params.set('department', studentDeptFilter);
      const res = await api.get(`/warden/students?${params}&limit=100`);
      setStudents(res.data.data.items || []);
    } catch (err) { console.error(err); }
    finally { setIsStudentsLoading(false); }
  }, [studentSearch, studentDeptFilter]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/warden/settings');
      setSettings(res.data.data.settings);
      setGoogleEmail(res.data.data.googleEmail);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchRequests();
    fetchAllRequests();
    fetchSettings(); // <-- Added this so googleEmail is populated on load!

    // Check for OAuth callbacks
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_success') === 'true') {
      alert('Google account connected successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      const details = params.get('details') ? `\nDetails: ${params.get('details')}` : '';
      alert(`Google connect failed: ${params.get('error')}${details}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handleRefresh = () => { fetchAnalytics(); fetchRequests(); fetchAllRequests(); fetchSettings(); };
    window.addEventListener('refresh_dashboard', handleRefresh);
    return () => window.removeEventListener('refresh_dashboard', handleRefresh);
  }, []);

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'students') fetchStudents();
    }, 400);
    return () => clearTimeout(timer);
  }, [studentSearch, studentDeptFilter]);

  // ─── Action Handlers ──────────────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    if (!googleEmail) {
      alert("Please Connect your Google Account first to send emails.");
      setShowCredsModal(true);
      return;
    }
    setIsProcessing(true);
    try {
      await api.patch(`/warden/requests/${id}/approve`, { note: 'Approved by Warden' });
      await fetchRequests(); await fetchAnalytics(); await fetchAllRequests();
      setSelectedRequest(null);
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { setShowRejectInput(true); return; }
    if (!googleEmail) {
      alert("Please Connect your Google Account first to send emails.");
      setShowCredsModal(true);
      return;
    }
    setIsProcessing(true);
    try {
      await api.patch(`/warden/requests/${id}/reject`, { reason: rejectReason });
      await fetchRequests(); await fetchAnalytics(); await fetchAllRequests();
      setSelectedRequest(null); setRejectReason(''); setShowRejectInput(false);
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const handleParentCall = async (id: string, response: string) => {
    if (!googleEmail) {
      alert("Please Connect your Google Account first to send emails.");
      setShowCredsModal(true);
      return;
    }
    setIsProcessing(true);
    try {
      await api.post(`/warden/requests/${id}/parent-verify`, {
        callMethod: 'MANUAL',
        phoneCalled: selectedRequest?.student?.fatherPhone || '0000000000',
        response: response.toUpperCase(),
      });
      await fetchRequests(); await fetchAnalytics(); await fetchAllRequests();
      setSelectedRequest(null);
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await api.patch('/warden/settings', {
        isWorkingDay: settings?.isWorkingDay,
        isPlacementActive: settings?.isPlacementActive,
        hostelName: settings?.hostelName,
        defaultOutingLimitHours: settings?.defaultOutingLimitHours,
      });
      setSettingsMsg('✓ Settings saved successfully');
      setTimeout(() => setSettingsMsg(''), 3000);
    } catch (err) { console.error(err); setSettingsMsg('✗ Failed to save'); }
    finally { setIsSavingSettings(false); }
  };

  // ─── Export Triggers ──────────────────────────────────────────────────────────

  const handleExport = (type: string) => {
    const params = new URLSearchParams();
    if (exportStatus) params.set('status', exportStatus);
    if (exportDept) params.set('department', exportDept);
    if (exportFromDate) params.set('fromDate', exportFromDate);
    if (exportToDate) params.set('toDate', exportToDate);

    const urls: Record<string, string> = {
      requests: `/warden/export/requests?${params}`,
      students: `/warden/export/students?${params}`,
      overdue: '/warden/export/overdue',
      audit: `/warden/export/audit?${params}`,
    };

    if (token) triggerCSVDownload(urls[type], token);
  };

  // ─── Computed Values ──────────────────────────────────────────────────────────

  const overdueRequests = allRequests.filter(r => r.status === 'OVERDUE');
  const pendingCount = requests.filter(r => r.status === 'PENDING_APPROVALS').length;

  // ─── Render ───────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Live Dashboard', icon: Activity },
    { id: 'queue', label: 'Approval Queue', icon: Clock, badge: pendingCount },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'reports', label: 'Reports & Export', icon: FileDown },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── HEADER ─── */}
      <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center border-b border-indigo-900/60 sticky top-0 z-20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 flex items-center justify-center rounded-lg">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">HMS — WARDEN CONTROL</h1>
            <div className="text-xs text-slate-400 font-medium">{user?.name} · {user?.role}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overdueRequests.length > 0 && (
            <div className="flex items-center gap-2 bg-red-950/60 border border-red-700/50 text-red-400 text-xs px-3 py-1.5 rounded-full animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              {overdueRequests.length} OVERDUE
            </div>
          )}
          <button
            onClick={() => setShowCredsModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-colors border rounded-lg mr-2 ${
              googleEmail 
              ? 'bg-emerald-900/50 border-emerald-700/50 text-emerald-200 hover:bg-emerald-800' 
              : 'bg-indigo-900/50 hover:bg-indigo-800 border-indigo-700/50 text-indigo-200'
            }`}
          >
            {googleEmail ? <CheckCircle className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
            {googleEmail ? 'MAIL CONNECTED' : 'MAIL SETUP'}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold transition-colors border border-slate-700 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            LOGOUT
          </button>
        </div>
      </header>

      {/* ─── NAV TABS ─── */}
      <nav className="bg-white border-b border-slate-200 sticky top-[57px] z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex gap-0 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold tracking-wide border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ════════════════════════ DASHBOARD TAB ════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats cards row */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students', value: analytics.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                  { label: 'Currently Inside', value: analytics.presence.inside, icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Currently Outside', value: analytics.presence.outside, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                  { label: 'Overdue', value: analytics.presence.overdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-5`}>
                      <div className={`${stat.color} mb-3`}><Icon className="w-5 h-5" /></div>
                      <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-slate-500 font-semibold mt-1">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Charts */}
            {isAnalyticsLoading && !analytics ? (
              <div className="bg-slate-900 rounded-2xl py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading analytics...</span>
              </div>
            ) : analytics && (
              <div className="grid md:grid-cols-12 gap-6">
                <div className="col-span-5 bg-slate-900 rounded-2xl p-6 flex justify-center items-center gap-8">
                  <CircularGauge value={analytics.presence.inside} max={analytics.totalStudents} label="INSIDE" subLabel="Campus presence" colorClass="stroke-emerald-400" />
                  <CircularGauge value={analytics.presence.overdue} max={Math.max(analytics.presence.outside + analytics.presence.overdue, 1)} label="OVERDUE" subLabel="Critical" colorClass="stroke-rose-500" bgStrokeClass="stroke-slate-800/20" />
                </div>
                <div className="col-span-7 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <BarIndicator label="MESS FORECAST tonight" value={analytics.messForecast} max={analytics.totalStudents} colorClass="bg-indigo-500" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Decision Ledger</div>
                    <div className="flex gap-8">
                      <div><div className="text-2xl font-black text-emerald-600">{analytics.approvals.approved}</div><div className="text-xs text-slate-500 font-semibold">Approved</div></div>
                      <div><div className="text-2xl font-black text-red-500">{analytics.approvals.rejected}</div><div className="text-xs text-slate-500 font-semibold">Rejected</div></div>
                      <div><div className="text-2xl font-black text-amber-500">{analytics.approvals.pending}</div><div className="text-xs text-slate-500 font-semibold">Pending</div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overdue alert panel */}
            {overdueRequests.length > 0 && (
              <div className="bg-red-950/20 border border-red-300 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-red-700 font-black text-sm mb-4">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                  ⚠ OVERDUE STUDENTS — IMMEDIATE ACTION REQUIRED
                </div>
                <div className="space-y-2">
                  {overdueRequests.map(r => (
                    <div key={r.id} className="bg-white border border-red-200 rounded-xl px-4 py-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900">{r.student?.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({r.student?.rollNumber})</span>
                        <div className="text-xs text-red-600 font-semibold mt-0.5">
                          Expected back: {format(new Date(r.expectedReturnDatetime), 'MMM d, h:mm a')} · {formatDistanceToNow(new Date(r.expectedReturnDatetime), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">📞 {r.student?.fatherPhone}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════ QUEUE TAB ════════════════════════ */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </div>
              {['PENDING_APPROVALS', 'APPROVED', 'OUT_CONFIRMED', 'OVERDUE', 'RETURNED', 'REJECTED', 'ALL'].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s === 'ALL' ? '' : s); fetchRequests(s === 'ALL' ? '' : s); }}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${
                    (s === 'ALL' && !statusFilter) || statusFilter === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
                </button>
              ))}
              <button
                onClick={() => { fetchRequests(); fetchAnalytics(); fetchAllRequests(); }}
                className="ml-auto flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="px-5 py-3 text-left">Student</th>
                      <th className="px-5 py-3 text-left">Type / Destination</th>
                      <th className="px-5 py-3 text-left">Schedule</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>
                    ) : requests.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">No requests found.</td></tr>
                    ) : requests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{req.student?.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{req.student?.rollNumber} · Rm {req.student?.room?.roomNumber || '—'}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded mr-2 ${req.type === 'EMERGENCY' ? 'bg-red-100 text-red-700' : req.type === 'LEAVE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {req.type}
                          </span>
                          <div className="text-xs text-slate-600 truncate max-w-[160px] mt-1">{req.place}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-xs font-semibold text-slate-800">↑ {format(new Date(req.outDatetime), 'MMM d, h:mm a')}</div>
                          <div className="text-xs text-slate-400">↓ {format(new Date(req.expectedReturnDatetime), 'MMM d, h:mm a')}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-500'}`}>
                            {req.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => { setSelectedRequest(req); setShowRejectInput(false); setRejectReason(''); }}
                            className="bg-slate-900 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" /> Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════ STUDENTS TAB ════════════════════════ */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="bg-transparent text-sm outline-none flex-1 text-slate-700"
                />
              </div>
              <select
                value={studentDeptFilter}
                onChange={e => setStudentDeptFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white outline-none"
              >
                <option value="">All Departments</option>
                <option value="IT">IT</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
              <button
                onClick={() => handleExport('students')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="px-5 py-3 text-left">Student</th>
                      <th className="px-5 py-3 text-left">Dept / Year</th>
                      <th className="px-5 py-3 text-left">Room</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isStudentsLoading ? (
                      <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>
                    ) : students.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400">No students found.</td></tr>
                    ) : students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{s.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{s.rollNumber}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded mr-1">{s.department}</span>
                          <span className="text-xs text-slate-500">Year {s.year}{s.section ? ` ${s.section}` : ''}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-mono text-slate-700">{s.room?.roomNumber || '—'}</td>
                        <td className="px-5 py-3.5">
                          {s.isOut ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 w-fit">OUT</span>
                              {s.activeRequest && <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{s.activeRequest.ticketCode || s.activeRequest.id}</span>}
                            </div>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">IN</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={async () => {
                              try {
                                await api.post(`/warden/students/${s.id}/toggle-presence`);
                                fetchStudents();
                                fetchAnalytics();
                                fetchRequests();
                              } catch (err) {
                                console.error(err);
                                alert("Failed to change presence.");
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ml-auto border ${s.isOut ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                          >
                            {s.isOut ? (
                                <>
                                  <CheckCircle className="w-3 h-3" /> Mark IN
                                </>
                              ) : (
                                <>
                                  <LogOut className="w-3 h-3" /> Mark OUT
                                </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-semibold flex justify-between items-center">
                <span>{students.length} students shown</span>
                <span className="text-[10px] uppercase text-slate-400">Manual attendance automatically generates background leave requests</span>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════ REPORTS TAB ════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Filter bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-500" /> Export Filters
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Status</label>
                  <select value={exportStatus} onChange={e => setExportStatus(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none text-slate-700">
                    <option value="">All Statuses</option>
                    {['PENDING_APPROVALS','APPROVED','OUT_CONFIRMED','OVERDUE','RETURNED','COMPLETED','REJECTED','CANCELLED','EXPIRED'].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Department</label>
                  <select value={exportDept} onChange={e => setExportDept(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none text-slate-700">
                    <option value="">All Depts</option>
                    {['IT','CSE','ECE','MECH','CIVIL'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">From Date</label>
                  <input type="date" value={exportFromDate} onChange={e => setExportFromDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-700" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">To Date</label>
                  <input type="date" value={exportToDate} onChange={e => setExportToDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-700" />
                </div>
              </div>
            </div>

            {/* Export cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  type: 'requests', icon: FileText, color: 'indigo',
                  title: 'Leave Requests Report',
                  desc: 'All leave/outing requests with student details, dates, approval chain, and ticket codes. Supports status and date filters.',
                  cols: 'TicketCode, Student, Dept, Type, Status, Reason, Destination, OutDate, ReturnDate, IsOverdue'
                },
                {
                  type: 'students', icon: Users, color: 'emerald',
                  title: 'Student Directory',
                  desc: 'Complete student registry with room assignments, contact numbers, and current hostel status. Filter by department.',
                  cols: 'RollNumber, Name, Dept, Year, Room, StudentPhone, FatherPhone, MotherPhone, Email'
                },
                {
                  type: 'overdue', icon: AlertTriangle, color: 'red',
                  title: 'Overdue Students Report',
                  desc: 'Students who have not returned by their expected return time. Critical report for immediate warden action.',
                  cols: 'TicketCode, Student, Dept, ExpectedReturn, HoursOverdue, FatherPhone, MotherPhone'
                },
                {
                  type: 'audit', icon: Database, color: 'purple',
                  title: 'Full Audit Trail',
                  desc: 'Complete state-machine event log — every status change, who acted, when. Use for compliance and dispute resolution.',
                  cols: 'Timestamp, TicketCode, Student, FromStatus, ToStatus, ActorType, Note'
                },
              ].map(card => {
                const Icon = card.icon;
                const colorMap: Record<string, string> = {
                  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
                  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
                  red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
                  purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
                };
                const btnMap: Record<string, string> = {
                  indigo: 'bg-indigo-600 hover:bg-indigo-700',
                  emerald: 'bg-emerald-600 hover:bg-emerald-700',
                  red: 'bg-red-600 hover:bg-red-700',
                  purple: 'bg-purple-600 hover:bg-purple-700',
                };
                return (
                  <div key={card.type} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold mb-4 ${colorMap[card.color]}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {card.title}
                    </div>
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">{card.desc}</p>
                    <div className="bg-slate-50 rounded-xl p-3 mb-4">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Columns</div>
                      <div className="text-xs text-slate-600 font-mono">{card.cols}</div>
                    </div>
                    <button
                      onClick={() => handleExport(card.type)}
                      className={`w-full flex items-center justify-center gap-2 text-white px-4 py-2.5 text-xs font-bold rounded-xl transition-colors ${btnMap[card.color]}`}
                    >
                      <Download className="w-4 h-4" />
                      Download CSV
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
              <b>📊 Excel Tip:</b> All CSV exports include a UTF-8 BOM header so they open correctly in Microsoft Excel. Double-click the downloaded file to open directly.
            </div>
          </div>
        )}

        {/* ════════════════════════ SETTINGS TAB ════════════════════════ */}
        {activeTab === 'settings' && settings && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" /> System Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Hostel Name</label>
                  <input
                    type="text"
                    value={settings.hostelName || ''}
                    onChange={e => setSettings({ ...settings, hostelName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Default Outing Limit (Hours)</label>
                  <input
                    type="number"
                    min={1} max={48}
                    value={settings.defaultOutingLimitHours || 12}
                    onChange={e => setSettings({ ...settings, defaultOutingLimitHours: parseInt(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 text-slate-800"
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                  <div>
                    <div className="text-sm font-bold text-slate-800">Working Day Mode</div>
                    <div className="text-xs text-slate-500">Toggle if today is a holiday/weekend</div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, isWorkingDay: !settings.isWorkingDay })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.isWorkingDay ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.isWorkingDay ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                  <div>
                    <div className="text-sm font-bold text-slate-800">Placement Season Active</div>
                    <div className="text-xs text-slate-500">Enables Placement Officer approval requirement</div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, isPlacementActive: !settings.isPlacementActive })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.isPlacementActive ? 'bg-emerald-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.isPlacementActive ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Settings
              </button>
              {settingsMsg && <div className="text-center text-sm font-semibold text-emerald-600">{settingsMsg}</div>}
            </div>

            {/* System info */}
            <div className="bg-slate-900 text-slate-300 rounded-2xl p-5 text-xs space-y-2 font-mono">
              <div className="text-slate-400 font-bold uppercase tracking-wider mb-3">System Info</div>
              <div>🖥️ Mode: <span className="text-emerald-400">Intranet / Single-Port</span></div>
              <div>🔌 Port: <span className="text-indigo-400">3000</span></div>
              <div>🗄️ DB: <span className="text-amber-400">Local PostgreSQL (hostel_db)</span></div>
              <div>🔐 Auth: <span className="text-blue-400">JWT (24h expiry)</span></div>
              <div>📡 Realtime: <span className="text-purple-400">Socket.IO (same port)</span></div>
            </div>
          </div>
        )}
      </main>

      {/* ════════════════════════ ACTION MODAL ════════════════════════ */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-base">Review Leave Request</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedRequest.ticketCode || selectedRequest.id}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-white text-lg leading-none">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Student info */}
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-slate-400 font-bold uppercase mb-1">Student</div><div className="font-bold">{selectedRequest.student?.name}</div><div className="text-xs text-slate-500">{selectedRequest.student?.rollNumber} · Rm {selectedRequest.student?.room?.roomNumber || '—'}</div></div>
                <div><div className="text-xs text-slate-400 font-bold uppercase mb-1">Destination</div><div className="font-bold">{selectedRequest.place}</div></div>
                <div><div className="text-xs text-slate-400 font-bold uppercase mb-1">Type</div><span className="text-xs font-black">{selectedRequest.type}</span></div>
                <div><div className="text-xs text-slate-400 font-bold uppercase mb-1">Status</div><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[selectedRequest.status]}`}>{selectedRequest.status.replace(/_/g,' ')}</span></div>
                
                {selectedRequest.isEmergency && (
                  <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> EMERGENCY PRIORITY
                  </div>
                )}
                
                <div className="col-span-2"><div className="text-xs text-slate-400 font-bold uppercase mb-1">Reason</div><div className="text-sm">{selectedRequest.reason}</div></div>
                <div><div className="text-xs text-slate-400 font-bold uppercase mb-1">Out</div><div className="text-xs font-semibold">{format(new Date(selectedRequest.outDatetime), 'MMM d, h:mm a')}</div></div>
                <div><div className="text-xs text-slate-400 font-bold uppercase mb-1">Expected Return</div><div className="text-xs font-semibold">{format(new Date(selectedRequest.expectedReturnDatetime), 'MMM d, h:mm a')}</div></div>
                
                <div className="col-span-2 mt-2 pt-2 border-t border-slate-200 flex gap-4">
                  <div className="flex items-center gap-2">
                    {selectedRequest.hasHodLetter ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                    <span className="text-xs text-slate-600 font-medium">HOD Letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRequest.submittedPhysicalCopy ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                    <span className="text-xs text-slate-600 font-medium">Physical Copy</span>
                  </div>
                </div>
              </div>

              {/* Actions — only for pending */}
              {selectedRequest.status === 'PENDING_APPROVALS' && (
                <div className="space-y-4">
                  <div className="border-t border-slate-100 pt-4">
                    <div className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-3">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" />
                      Parent Verification — {selectedRequest.student?.fatherPhone || 'No number'}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button disabled={isProcessing} onClick={() => handleParentCall(selectedRequest.id, 'REJECTED')}
                        className="flex flex-col items-center gap-1.5 py-3 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs rounded-xl transition-colors disabled:opacity-50">
                        <XCircle className="w-5 h-5" /> Rejected
                      </button>
                      <button disabled={isProcessing} onClick={() => handleParentCall(selectedRequest.id, 'NO_ANSWER')}
                        className="flex flex-col items-center gap-1.5 py-3 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs rounded-xl transition-colors disabled:opacity-50">
                        <Phone className="w-5 h-5" /> No Answer
                      </button>
                      <button disabled={isProcessing} onClick={() => handleParentCall(selectedRequest.id, 'APPROVED')}
                        className="flex flex-col items-center gap-1.5 py-3 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-colors disabled:opacity-50">
                        <CheckCircle className="w-5 h-5" /> Approved
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-wider">Direct Override</div>
                    {showRejectInput && (
                      <div>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Enter rejection reason (required)..."
                          rows={2}
                          className="w-full border border-red-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400 resize-none"
                        />
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button disabled={isProcessing} onClick={() => handleReject(selectedRequest.id)}
                        className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50">
                        {showRejectInput ? 'Confirm Reject' : 'Reject'}
                      </button>
                      <button disabled={isProcessing} onClick={() => handleApprove(selectedRequest.id)}
                        className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ EMAIL CREDENTIALS MODAL ════════════════════════ */}
      {showCredsModal && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" /> Google Mail Setup
                </h3>
              </div>
              <button onClick={() => setShowCredsModal(false)} className="text-slate-400 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4 text-center">
              {googleEmail ? (
                <>
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-sm font-semibold">
                    ✅ Connected as:<br/>
                    <span className="font-black mt-1 block">{googleEmail}</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await api.delete('/auth/google/disconnect');
                        setGoogleEmail(null);
                        setShowCredsModal(false);
                        alert("Google Account disconnected.");
                      } catch (err) {
                        alert("Failed to disconnect.");
                      }
                    }}
                    className="w-full px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl border border-red-200 transition-colors"
                  >
                    Disconnect Account
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-4 rounded-xl text-xs font-semibold leading-relaxed mb-6">
                    Connect your Google Workspace or Gmail account to automatically send approval and rejection emails to students with gate passes.
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get('/auth/google/url');
                        window.location.href = res.data.data.url;
                      } catch (err) {
                        alert("Failed to initiate Google Login.");
                      }
                    }}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-300 shadow-sm transition-all"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign in with Google
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
