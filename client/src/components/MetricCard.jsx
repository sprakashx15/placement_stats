import React from 'react';

export default function MetricCard({
  title,
  value,
  prefix = '',
  suffix = '',
  subtitle,
  icon: Icon,
  badgeText,
  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200',
  iconColor = 'bg-indigo-50 text-indigo-600',
  progressPercent
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className="mt-2 flex items-baseline space-x-1">
            {prefix && <span className="text-lg font-bold text-slate-500">{prefix}</span>}
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              {value}
            </span>
            {suffix && <span className="text-sm font-semibold text-slate-500">{suffix}</span>}
          </div>
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl ${iconColor} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Optional Progress Bar */}
      {progressPercent !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtitle & Badge */}
      <div className="mt-3 flex items-center justify-between text-xs">
        {subtitle && <span className="text-slate-500 font-medium truncate max-w-[70%]">{subtitle}</span>}
        {badgeText && (
          <span className={`px-2 py-0.5 rounded-full font-semibold border text-[11px] shrink-0 ${badgeColor}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}
