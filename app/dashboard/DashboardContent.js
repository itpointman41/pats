'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#0d8c40', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

export default function DashboardContent() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-[var(--color-text-muted)]">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="card p-6">
            <div className="text-red-600">{error || 'Failed to load dashboard data'}</div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const transmittalStatusData = [
    { name: 'Pending', value: stats.statusBreakdown.pending, color: '#f59e0b' },
    { name: 'Deployed', value: stats.statusBreakdown.deployed, color: '#0d8c40' },
    { name: 'For Encode', value: stats.statusBreakdown.encode, color: '#3b82f6' },
    { name: 'Process', value: stats.statusBreakdown.process, color: '#10b981' },
    { name: 'Other', value: stats.statusBreakdown.other, color: '#6b7280' },
    { name: 'Deployment', value: stats.statusBreakdown.deployment, color: '#863DA8' }
  ].filter(item => item.value > 0);

  const userRoleData = [
    { name: 'Admin', value: stats.roleBreakdown.admin },
    { name: 'HR', value: stats.roleBreakdown.hr },
    { name: 'Bio', value: stats.roleBreakdown.bio },
    { name: 'RO', value: stats.roleBreakdown.ro },
    { name: 'Staff', value: stats.roleBreakdown.staff }
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 sm:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-[var(--color-text-muted)] mb-2">
            Overview
          </p>
          <h1 className="text-3xl font-semibold text-[var(--color-text)]">Admin Dashboard</h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Applicants"
            value={stats.totals.applicants}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            href="/applicants"
            trend={stats.recent.applicants}
            trendLabel="Last 30 days"
          />
          <StatCard
            title="Total Transmittals"
            value={stats.totals.transmittals}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            href="/transmittal"
          />
          <StatCard
            title="Deployed"
            value={stats.statusBreakdown.deployed}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            href="/deployment"
            trend={stats.recent.deployments}
            trendLabel="Last 30 days"
            accent
          />
          <StatCard
            title="Total Users"
            value={stats.totals.users}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            href="/users"
          />
        </div>

        {/* Analytics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-6">Analytics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Applicants Over Time */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Applicants Over Time</h3>
              {stats.applicantsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.applicantsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7df" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#5f6d61"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#5f6d61"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #dfe7df',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#0d8c40" 
                      strokeWidth={2}
                      dot={{ fill: '#0d8c40', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
                  No data available
                </div>
              )}
            </div>

            {/* Deployments Over Time */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Deployments Over Time</h3>
              {stats.deploymentsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.deploymentsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7df" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#5f6d61"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#5f6d61"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #dfe7df',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="#0d8c40" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
                  No data available
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transmittal Status Distribution */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Transmittal Status Distribution</h3>
              {transmittalStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={transmittalStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {transmittalStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
                  No data available
                </div>
              )}
            </div>

            {/* User Role Distribution */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">User Role Distribution</h3>
              {userRoleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userRoleData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7df" />
                    <XAxis 
                      type="number"
                      stroke="#5f6d61"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      stroke="#5f6d61"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #dfe7df',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#0d8c40" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[var(--color-text-muted)]">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, href, trend, trendLabel, accent }) {
  return (
    <a
      href={href}
      className={`card p-6 hover:shadow-lg transition-all duration-200 group ${accent ? 'border-2 border-[var(--color-secondary)]' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${accent ? 'bg-[var(--color-secondary)]/10' : 'bg-[var(--surface-accent)]'}`}>
          <div className={accent ? 'text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)]'}>
            {icon}
          </div>
        </div>
        <svg 
          className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-secondary)] transition-colors" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div>
        <p className="text-sm text-[var(--color-text-muted)] mb-1">{title}</p>
        <p className={`text-3xl font-bold ${accent ? 'text-[var(--color-secondary)]' : 'text-[var(--color-text)]'}`}>
          {value.toLocaleString()}
        </p>
        {trend !== undefined && trendLabel && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            {trend} {trendLabel}
          </p>
        )}
      </div>
    </a>
  );
}

function QuickActionCard({ title, description, href, icon }) {
  return (
    <a
      href={href}
      className="card p-6 hover:shadow-lg transition-all duration-200 group"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">{title}</h3>
          <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
        </div>
        <div className="text-[var(--color-secondary)] group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
    </a>
  );
}

