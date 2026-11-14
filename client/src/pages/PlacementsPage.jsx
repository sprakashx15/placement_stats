import React from 'react';
import {
  Users, Award, TrendingUp, DollarSign, CheckCircle2,
  BarChart3, Layers, Building2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import MetricCard from '../components/MetricCard';

const TIER_COLORS = ['#94a3b8', '#38bdf8', '#6366f1', '#a855f7', '#ec4899'];

export default function PlacementsPage({ stats }) {
  const kpis = stats?.kpis || {};
  const branchStats = stats?.branch_statistics || [];
  const tierDistribution = stats?.tier_distribution || [];
  const offerTypeBreakdown = stats?.offer_type_breakdown || [];
  const totalOffers = kpis.total_offers || 0;

  const displayYear = stats?.academic_year === 'ALL'
    ? 'All Batches'
    : stats?.academic_year
    ? `Batch ${stats.academic_year}`
    : 'No Active Batch';

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/15">
          <Award className="w-3.5 h-3.5 text-amber-300" />
          <span>Academic Session: {displayYear}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Placement Stats — IIT Patna
        </h1>
        <p className="text-indigo-200 text-sm mt-1 max-w-2xl">
          Comprehensive campus recruitment data: companies visited, total offers, students placed, average & median CTC, and branch-wise breakdown.
        </p>
      </div>

      {/* KPI Metrics Grid with No. of Companies, Offers, and Placed Students */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {/* 1. Companies Visited */}
        <MetricCard
          title="Companies Visited"
          value={kpis.total_companies || 0}
          subtitle="Recruiting partners"
          icon={Building2}
          iconColor="bg-cyan-50 text-cyan-600"
          badgeText="Visiting Head"
          badgeColor="bg-cyan-50 text-cyan-700 border-cyan-200"
        />

        {/* 2. Total Offers */}
        <MetricCard
          title="Total Offers"
          value={kpis.total_offers || 0}
          subtitle="Offers released"
          icon={Award}
          iconColor="bg-amber-50 text-amber-600"
          badgeText="All Types"
          badgeColor="bg-amber-50 text-amber-700 border-amber-200"
        />

        {/* 3. Students Placed */}
        <MetricCard
          title="Students Placed"
          value={kpis.total_placed || 0}
          subtitle={`of ${kpis.total_eligible || 0} eligible`}
          icon={CheckCircle2}
          iconColor="bg-emerald-50 text-emerald-600"
          badgeText={`${kpis.placement_rate || 0}% Placed`}
          badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
          progressPercent={kpis.placement_rate || 0}
        />

        {/* 4. Average CTC */}
        <MetricCard
          title="Average CTC"
          value={`₹${kpis.average_ctc || 0}`}
          suffix="LPA"
          subtitle="Weighted mean"
          icon={DollarSign}
          iconColor="bg-indigo-50 text-indigo-600"
          badgeText="Mean"
          badgeColor="bg-indigo-50 text-indigo-700 border-indigo-200"
        />

        {/* 5. Median CTC */}
        <MetricCard
          title="Median CTC"
          value={`₹${kpis.median_ctc || 0}`}
          suffix="LPA"
          subtitle="50th percentile"
          icon={TrendingUp}
          iconColor="bg-violet-50 text-violet-600"
          badgeText="P50"
          badgeColor="bg-violet-50 text-violet-700 border-violet-200"
        />

        {/* 6. Highest CTC */}
        <MetricCard
          title="Highest CTC"
          value={`₹${kpis.highest_ctc || 0}`}
          suffix="LPA"
          subtitle="Top package"
          icon={Award}
          iconColor="bg-rose-50 text-rose-600"
          badgeText="Peak"
          badgeColor="bg-rose-50 text-rose-700 border-rose-200"
        />

        {/* 7. Eligible Pool */}
        <MetricCard
          title="Eligible Pool"
          value={kpis.total_eligible || 0}
          subtitle="Registered batch"
          icon={Users}
          iconColor="bg-blue-50 text-blue-600"
          badgeText="Batch Size"
          badgeColor="bg-blue-50 text-blue-700 border-blue-200"
        />
      </div>

      {/* Offer Type Breakdown Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-lg font-extrabold text-indigo-600">{kpis.fte_count || 0}</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Direct Full-Time (FTE)</div>
            <div className="text-xs text-slate-500">Campus placement offers</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-lg font-extrabold text-emerald-600">{kpis.ppo_count || 0}</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Pre-Placement Offer (PPO)</div>
            <div className="text-xs text-slate-500">Summer intern conversions</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <span className="text-lg font-extrabold text-amber-600">{kpis.sixm_ppo_count || 0}</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">6-Month Intern + PPO</div>
            <div className="text-xs text-slate-500">Semester intern conversions</div>
          </div>
        </div>
      </div>

      {/* Charts Row: Branch Performance & CTC Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch-wise Placement % & Avg CTC */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Branch-wise Placement % & Avg CTC</h2>
              <p className="text-xs text-slate-500">Success rate and compensation across engineering disciplines</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="h-80 w-full">
            {branchStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="branch" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} unit="%" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={12} tickLine={false} unit="L" />
                  <Tooltip
                    formatter={(v, n) => [n === 'Placement Rate' ? `${v}%` : `₹${v} LPA`, n]}
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '12px', border: 'none' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="placement_percentage" name="Placement Rate" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="average_ctc" name="Average CTC (LPA)" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No branches configured for this batch yet.
              </div>
            )}
          </div>
        </div>

        {/* CTC Tier Distribution + Offer Type */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">CTC Package Distribution</h2>
              <p className="text-xs text-slate-500">Offer counts across salary brackets</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="h-80 w-full flex flex-col md:flex-row items-center">
            <div className="h-64 w-full md:w-1/2 flex items-center justify-center">
              {totalOffers > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {tierDistribution.map((e, i) => (
                        <Cell key={`c-${i}`} fill={e.color || TIER_COLORS[i % TIER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n, item) => [`${v} offers (${item.payload.percentage || 0}%)`, n]}
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '12px', border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-200 mx-auto mb-2 flex items-center justify-center text-xs font-bold text-slate-300">
                    0
                  </div>
                  <p className="text-xs font-medium">No offers recorded yet</p>
                </div>
              )}
            </div>
            <div className="w-full md:w-1/2 space-y-2 pl-0 md:pl-4">
              {tierDistribution.map((tier, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                    <span className="text-xs font-semibold text-slate-700">{tier.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900">{tier.count}</span>
                    <span className="text-[11px] text-slate-400 ml-1 font-medium">({tier.percentage}%)</span>
                  </div>
                </div>
              ))}
              {/* Offer type mini summary */}
              <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">By Offer Type</span>
                {offerTypeBreakdown.map((o, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                      <span className="font-semibold text-slate-700">{o.type}</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {o.count} <span className="text-slate-400 font-medium">({o.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Branch-Wise Performance Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Branch-Wise Placement Breakdown</h2>
            <p className="text-xs text-slate-500">Eligible strength, offers, placement %, average and median CTC per branch</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            {branchStats.length} Disciplines
          </span>
        </div>
        <div className="overflow-x-auto">
          {branchStats.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Branch</th>
                  <th className="py-3.5 px-4 text-center">Eligible</th>
                  <th className="py-3.5 px-4 text-center">Total Offers</th>
                  <th className="py-3.5 px-4 text-center">Placed</th>
                  <th className="py-3.5 px-6">Placement %</th>
                  <th className="py-3.5 px-4 text-right">Avg CTC</th>
                  <th className="py-3.5 px-4 text-right">Median CTC</th>
                  <th className="py-3.5 px-6 text-right">Highest CTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {branchStats.map((b) => (
                  <tr key={b.branch} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span>{b.branch}</span>
                    </td>
                    <td className="py-4 px-4 text-center font-medium text-slate-600">{b.eligible}</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-800">{b.offers}</td>
                    <td className="py-4 px-4 text-center font-semibold text-emerald-700">{b.placed}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-extrabold text-slate-900 w-12">{b.placement_percentage}%</span>
                        <div className="w-full max-w-[120px] bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              b.placement_percentage >= 80 ? 'bg-emerald-500' :
                              b.placement_percentage >= 60 ? 'bg-indigo-500' :
                              b.placement_percentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${b.placement_percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800">₹{b.average_ctc} LPA</td>
                    <td className="py-4 px-4 text-right font-bold text-indigo-700">₹{b.median_ctc} LPA</td>
                    <td className="py-4 px-6 text-right font-extrabold text-emerald-600">₹{b.highest_ctc} LPA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No branch statistics available. Add a batch or drive in the Admin panel to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
