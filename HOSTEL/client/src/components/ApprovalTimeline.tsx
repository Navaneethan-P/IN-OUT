import { Clock, CheckCircle, XCircle, ShieldAlert, BookOpen, Briefcase } from 'lucide-react';

export interface RequestApproval {
  id: string;
  requestId: string;
  approvalType: 'WARDEN' | 'HOD' | 'PLACEMENT' | 'PARENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';
  rejectionReason?: string | null;
  approvedAt?: string | null;
  approvedBy?: { name: string } | null;
}

interface ApprovalTimelineProps {
  approvals: RequestApproval[];
}

export default function ApprovalTimeline({ approvals }: ApprovalTimelineProps) {
  if (!approvals || approvals.length === 0) {
    return (
      <div className="text-sm text-slate-400 font-medium py-2">
        No approvals configured for this request type.
      </div>
    );
  }

  // Icons map based on approval role
  const getRoleIcon = (type: string) => {
    switch (type) {
      case 'WARDEN':
        return <ShieldAlert className="w-5 h-5 text-indigo-500" />;
      case 'HOD':
        return <BookOpen className="w-5 h-5 text-amber-500" />;
      case 'PLACEMENT':
        return <Briefcase className="w-5 h-5 text-rose-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  // Status badges
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
            <CheckCircle className="w-3.5 h-3.5" /> APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            <XCircle className="w-3.5 h-3.5" /> REJECTED
          </span>
        );
      case 'NOT_REQUIRED':
        return (
          <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
            NOT REQUIRED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded animate-pulse">
            <Clock className="w-3.5 h-3.5" /> PENDING
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 p-4 space-y-4">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        Required Workflow Approvals
      </h4>
      <div className="relative border-l-2 border-slate-200 ml-3.5 pl-6 space-y-5">
        {approvals.map((app) => (
          <div key={app.approvalType} className="relative">
            {/* Timeline dot */}
            <span className="absolute -left-10 top-0.5 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
              {getRoleIcon(app.approvalType)}
            </span>
            
            <div className="flex justify-between items-start">
              <div>
                <h5 className="text-sm font-bold text-slate-800">
                  {app.approvalType} APPROVAL
                </h5>
                {app.status === 'APPROVED' && app.approvedBy && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Granted by {app.approvedBy.name}
                  </p>
                )}
                {app.status === 'REJECTED' && app.rejectionReason && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    Reason: "{app.rejectionReason}"
                  </p>
                )}
              </div>
              <div>{getStatusDisplay(app.status)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
