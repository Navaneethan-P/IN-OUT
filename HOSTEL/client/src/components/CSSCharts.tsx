import React from 'react';

interface CircularGaugeProps {
  value: number;
  max: number;
  label: string;
  subLabel?: string;
  colorClass?: string; // e.g. "stroke-emerald-400"
  bgStrokeClass?: string; // e.g. "stroke-slate-800"
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  max,
  label,
  subLabel,
  colorClass = 'stroke-indigo-500',
  bgStrokeClass = 'stroke-slate-800/40'
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl w-full max-w-[240px] text-center transition-all hover:border-slate-700/60">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            className={`${bgStrokeClass} fill-transparent`}
            strokeWidth={strokeWidth}
            r={radius}
            cx="60"
            cy="60"
          />
          {/* Foreground progress circle */}
          <circle
            className={`${colorClass} fill-transparent transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx="60"
            cy="60"
          />
        </svg>
        {/* Inner Centered Metrics text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black font-mono text-slate-100 tracking-tight">
            {value}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-0.5">
            of {max}
          </span>
        </div>
      </div>
      <div className="mt-4">
        <h5 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{label}</h5>
        {subLabel && <p className="text-xs text-slate-400 mt-1 font-medium">{subLabel}</p>}
      </div>
    </div>
  );
};

interface BarIndicatorProps {
  value: number;
  max: number;
  label: string;
  colorClass?: string; // e.g. "bg-emerald-500"
}

export const BarIndicator: React.FC<BarIndicatorProps> = ({
  value,
  max,
  label,
  colorClass = 'bg-indigo-500'
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-xl w-full transition-all hover:border-slate-700/60">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{label}</span>
        <span className="text-sm font-black font-mono text-slate-100 bg-slate-800/60 px-2.5 py-0.5 rounded border border-slate-700/30">
          {value} / {max} <span className="text-xs font-bold text-slate-500">({Math.round(percentage)}%)</span>
        </span>
      </div>
      <div className="w-full h-3 bg-slate-850 border border-slate-800/60 rounded-full overflow-hidden p-[2px]">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
