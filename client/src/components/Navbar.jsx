import React from 'react';
import { GraduationCap, RefreshCw } from 'lucide-react';

export default function Navbar({ 
  selectedYear, 
  setSelectedYear, 
  batches = [], 
  onRefresh, 
  isLoading 
}) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
              Placement Stats IIT Patna
            </span>
          </div>

          {/* Right Action Tools: Year Selector & Refresh */}
          <div className="flex items-center space-x-3">
            {/* Academic Batch Filter */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {batches.map((b) => (
                  <option key={b.academic_year} value={b.academic_year}>
                    {b.academic_year}
                  </option>
                ))}
                <option value="ALL">All Batches</option>
              </select>
            </div>

            {/* Refresh live stats */}
            <button
              onClick={onRefresh}
              title="Refresh Stats"
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
