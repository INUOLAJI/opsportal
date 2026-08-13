import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Download, Calendar, Activity, Users, FileText, Clock,
  Menu, Bell, Search, Moon, Sun, ChevronDown, Check, Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { tasksService, documentsService, usersService, activityService } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const RANGE_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

// Cosmetic-only palette — cycles for any category the backend returns,
// since Document.category is free text (mirrors DocsPage's approach).
const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function isWithin(dateStr, start, end) {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return t >= start.getTime() && t < end.getTime();
}

// { value, direction } — null when there's no comparable prior period
// (e.g. not enough history yet), so the UI can skip the delta instead of
// showing a fabricated number.
function percentChange(current, previous) {
  if (previous === 0) {
    if (current === 0) return null;
    return { value: 100, direction: 'up' };
  }
  const diff = ((current - previous) / previous) * 100;
  return { value: Math.abs(Math.round(diff)), direction: diff >= 0 ? 'up' : 'down' };
}

// Buckets documents/tasks/activity into day-of-week counts for the last 7
// days, oldest first, ending today.
function buildWeeklyTrend(documents, tasks, activityLogs) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const start = daysAgo(i);
    const end = daysAgo(i - 1);
    days.push({
      name: start.toLocaleDateString(undefined, { weekday: 'short' }),
      documents: documents.filter(d => isWithin(d.uploaded_at, start, end)).length,
      tasks: tasks.filter(t => isWithin(t.created_at, start, end)).length,
      activity: activityLogs.filter(a => isWithin(a.created_at, start, end)).length,
    });
  }
  return days;
}

// Buckets into ~4 weekly chunks over the last 28 days.
function buildMonthlyTrend(documents, tasks, activityLogs) {
  const weeks = [];
  for (let w = 3; w >= 0; w--) {
    const start = daysAgo(w * 7 + 6);
    const end = daysAgo(w * 7 - 1);
    weeks.push({
      name: w === 0 ? 'This week' : `${w + 1}w ago`,
      documents: documents.filter(d => isWithin(d.uploaded_at, start, end)).length,
      tasks: tasks.filter(t => isWithin(t.created_at, start, end)).length,
      activity: activityLogs.filter(a => isWithin(a.created_at, start, end)).length,
    });
  }
  return weeks;
}

// Buckets into calendar months for the last 12 months.
function buildYearlyTrend(documents, tasks, activityLogs) {
  const months = [];
  const now = new Date();
  for (let m = 11; m >= 0; m--) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
    months.push({
      name: start.toLocaleDateString(undefined, { month: 'short' }),
      documents: documents.filter(d => isWithin(d.uploaded_at, start, end)).length,
      tasks: tasks.filter(t => isWithin(t.created_at, start, end)).length,
      activity: activityLogs.filter(a => isWithin(a.created_at, start, end)).length,
    });
  }
  return months;
}

function buildDocumentDistribution(documents) {
  const counts = {};
  documents.forEach(d => {
    const key = d.category || 'Uncategorized';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], idx) => ({ name, value, color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }));
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function AnalyticsPage() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [dateRange, setDateRange] = useState('week');
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 576 : false
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const rangeRef = useRef(null);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [docsRes, usersRes, tasksRes, activityRes] = await Promise.all([
        documentsService.getAll(),
        usersService.getAll(),
        tasksService.getAll(),
        activityService.getAll(),
      ]);
      setDocuments(Array.isArray(docsRes) ? docsRes : (docsRes?.results || []));
      setUsers(Array.isArray(usersRes) ? usersRes : (usersRes?.results || []));
      setTasks(Array.isArray(tasksRes) ? tasksRes : (tasksRes?.results || []));
      setActivityLogs(Array.isArray(activityRes) ? activityRes : (activityRes?.results || []));
    } catch (err) {
      setLoadError('Could not load analytics data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 576);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rangeRef.current && !rangeRef.current.contains(e.target)) setShowRangeMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Color system
  const bgColor = darkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = darkMode ? '#1E293B' : '#FFFFFF';
  const textPrimary = darkMode ? '#F1F5F9' : '#0F172A';
  const textSecondary = darkMode ? '#CBD5E1' : '#64748B';
  const borderColor = darkMode ? '#334155' : '#E2E8F0';
  const hoverBg = darkMode ? '#334155' : '#F8FAFC';

  // --- Real KPI metrics -------------------------------------------------

  const week0Start = daysAgo(7), week0End = daysAgo(0);
  const week1Start = daysAgo(14), week1End = daysAgo(7);

  const docsThisWeek = documents.filter(d => isWithin(d.uploaded_at, week0Start, week0End)).length;
  const docsPrevWeek = documents.filter(d => isWithin(d.uploaded_at, week1Start, week1End)).length;
  const docsDelta = percentChange(docsThisWeek, docsPrevWeek);

  const activeUsers = users.filter(u => u.is_active !== false).length;

  const openTasks = tasks.filter(t => t.status !== 'complete').length;
  const tasksThisWeek = tasks.filter(t => isWithin(t.created_at, week0Start, week0End)).length;
  const tasksPrevWeek = tasks.filter(t => isWithin(t.created_at, week1Start, week1End)).length;
  const tasksDelta = percentChange(tasksThisWeek, tasksPrevWeek);

  const activityThisWeek = activityLogs.filter(a => isWithin(a.created_at, week0Start, week0End)).length;
  const activityPrevWeek = activityLogs.filter(a => isWithin(a.created_at, week1Start, week1End)).length;
  const activityDelta = percentChange(activityThisWeek, activityPrevWeek);

  const metrics = [
    {
      label: 'Total Documents', value: String(documents.length), icon: <FileText size={20} />, color: '#3B82F6',
      delta: docsDelta, deltaNote: 'documents this week',
    },
    {
      label: 'Active Users', value: String(activeUsers), icon: <Users size={20} />, color: '#10B981',
      delta: null, deltaNote: `of ${users.length} total`,
    },
    {
      label: 'Open Tasks', value: String(openTasks), icon: <Clock size={20} />, color: '#F59E0B',
      delta: tasksDelta, deltaNote: 'tasks created this week',
    },
    {
      label: 'Team Activity', value: String(activityThisWeek), icon: <Activity size={20} />, color: '#8B5CF6',
      delta: activityDelta, deltaNote: 'events this week',
    },
  ];

  // --- Trend chart, keyed off the selected range -------------------------

  const trendData = dateRange === 'year'
    ? buildYearlyTrend(documents, tasks, activityLogs)
    : dateRange === 'month'
      ? buildMonthlyTrend(documents, tasks, activityLogs)
      : buildWeeklyTrend(documents, tasks, activityLogs);

  const documentTypes = buildDocumentDistribution(documents);

  // --- Recent activity, real feed ----------------------------------------

  const recentActivity = activityLogs
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)
    .map(a => ({
      id: a.id,
      action: a.action,
      user: a.user_name || 'Someone',
      time: formatRelativeTime(a.created_at),
    }));

  const filteredActivity = searchQuery
    ? recentActivity.filter(a =>
      a.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : recentActivity;

  const handleExportReport = () => {
    const rangeLabel = RANGE_OPTIONS.find(r => r.value === dateRange)?.label || 'This Week';
    const rows = [
      [`Analytics export — ${rangeLabel}`, new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ...metrics.map(m => [m.label, m.value]),
      [],
      ['Trend', 'Documents', 'Tasks Created', 'Activity Events'],
      ...trendData.map(row => [row.name, row.documents, row.tasks, row.activity]),
      [],
      ['Document category', 'Count'],
      ...documentTypes.map(d => [d.name, d.value]),
    ];
    downloadCsv(`analytics-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const rangeLabel = RANGE_OPTIONS.find(r => r.value === dateRange)?.label || 'This Week';

  return (
    <div
      className="d-flex min-vh-100"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundColor: bgColor,
        color: textPrimary,
        transition: 'background-color 0.3s ease, color 0.3s ease',
        overflowX: 'hidden'
      }}
    >

      {/* SIDEBAR */}
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        desktopCollapsed={desktopCollapsed}
        onToggleSidebar={handleToggleSidebar}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
      />

      {/* MAIN CONTENT WRAPPER */}
      <div
        className="flex-grow-1 d-flex flex-column min-w-0"
        id="main-content-wrapper"
        style={{ transition: 'margin-left 0.2s ease-in-out' }}
      >

        {/* TOP NAVBAR */}
        <header
          className="navbar navbar-expand fixed-top px-3 px-md-4"
          id="global-header"
          style={{
            height: '64px',
            zIndex: 1030,
            transition: 'all 0.2s ease-in-out',
            backgroundColor: cardBg,
            borderBottom: `1px solid ${borderColor}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="container-fluid d-flex justify-content-between align-items-center p-0">

            {/* Left Nav Controls */}
            <div className="d-flex align-items-center gap-2 gap-md-3">
              <button
                onClick={handleToggleSidebar}
                className="btn btn-link p-1 text-decoration-none shadow-none border-0"
                style={{ color: textPrimary, transition: 'all 0.15s ease' }}
              >
                <Menu size={20} />
              </button>

              <div className="position-relative d-none d-md-block">
                <Search
                  className="position-absolute"
                  size={16}
                  style={{ left: '12px', top: '10px', color: textSecondary, transition: 'color 0.15s ease' }}
                />
                <input
                  type="text"
                  placeholder="Search recent activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control form-control-sm border-0 ps-5 rounded-3"
                  style={{
                    width: '240px',
                    height: '36px',
                    backgroundColor: darkMode ? '#334155' : '#F1F5F9',
                    color: textPrimary,
                    transition: 'all 0.15s ease',
                    border: searchFocused ? `2px solid #3B82F6` : 'none',
                    boxShadow: searchFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none'
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </div>
            </div>

            {/* Right Nav Profiling & Controls */}
            <div className="d-flex align-items-center gap-2 gap-sm-3">

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="btn p-2 rounded-circle border-0"
                style={{ transition: 'all 0.15s ease', backgroundColor: darkMode ? '#334155' : '#F1F5F9', color: textPrimary }}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications Bell */}
              <button
                className="btn position-relative p-2 rounded-circle border-0"
                style={{ transition: 'all 0.15s ease', backgroundColor: 'transparent', color: textSecondary }}
                aria-label="View notifications"
              >
                <Bell size={18} />
                {activityThisWeek > 0 && (
                  <span
                    className="position-absolute rounded-circle"
                    style={{
                      top: '6px', right: '6px', width: '8px', height: '8px',
                      backgroundColor: '#EF4444', boxShadow: '0 0 0 2px ' + cardBg, animation: 'pulse 2s infinite'
                    }}
                  ></span>
                )}
              </button>

              <div className="vr opacity-25 my-auto" style={{ height: '24px', backgroundColor: borderColor }}></div>

              {/* User Profile */}
              <div className="d-flex align-items-center gap-2 ps-1" style={{ cursor: 'default' }}>
                <div
                  className="rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: '36px', height: '36px', backgroundColor: '#8B5CF6', fontSize: '13px', fontWeight: 600,
                    letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </div>
                <div className="d-none d-sm-block text-start">
                  <p className="mb-0 small fw-bold" style={{ color: textPrimary }}>{user?.full_name || user?.email || 'User'}</p>
                  <span className="d-block" style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>
                    {user?.role === 'admin' ? 'Operations Admin' : 'Staff Member'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </header>

        {/* MAIN CONTAINER */}
        <main className="p-3 p-md-4 flex-grow-1" style={{ paddingTop: 'calc(64px + 1.5rem)' }}>

          {/* PAGE HEADER */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3 mb-4 mt-5">
            <div>
              <h1 className="h3 fw-bold mb-1" style={{ color: textPrimary }}>
                Analytics & Reports
              </h1>
              <p className="small mb-0" style={{ color: textSecondary }}>
                Track usage, performance metrics, and team activity.
              </p>
            </div>
            <div className="d-flex gap-2 w-100 w-sm-auto justify-content-sm-end">
              <div className="position-relative" ref={rangeRef}>
                <button
                  onClick={() => setShowRangeMenu(v => !v)}
                  className="btn btn-sm border d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0 header-action-btn"
                  style={{ backgroundColor: showRangeMenu ? hoverBg : cardBg, color: textPrimary, borderColor: borderColor }}
                >
                  <Calendar size={14} />
                  {rangeLabel}
                  <ChevronDown size={12} />
                </button>
                {showRangeMenu && (
                  <div
                    className="position-absolute rounded-3 overflow-hidden range-dropdown-menu"
                    style={{ top: '38px', right: isMobileView ? 'auto' : 0, left: isMobileView ? 0 : 'auto', width: '160px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 1040 }}
                  >
                    {RANGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setDateRange(opt.value); setShowRangeMenu(false); }}
                        className="btn w-100 d-flex align-items-center justify-content-between rounded-0 border-0 px-3 py-2"
                        style={{ fontSize: '13px', color: textPrimary, textAlign: 'left' }}
                      >
                        {opt.label}
                        {dateRange === opt.value && <Check size={14} color="#3B82F6" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleExportReport}
                disabled={loading}
                className="btn btn-sm text-white d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0 header-action-btn"
                style={{ backgroundColor: '#3B82F6', transition: 'all 0.15s ease' }}
              >
                <Download size={14} />
                Export Report
              </button>
            </div>
          </div>

          {loadError && (
            <div className="alert alert-danger py-2 px-3 small d-flex justify-content-between align-items-center mb-3">
              {loadError}
              <button className="btn btn-sm btn-link p-0 text-decoration-underline" onClick={loadAll}>Retry</button>
            </div>
          )}

          {/* KPI METRICS */}
          <div className="row g-3 mb-4">
            {metrics.map((metric, idx) => (
              <div key={idx} className="col-12 col-sm-6 col-md-3">
                <div
                  className="card border-0 h-100"
                  style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', transition: 'all 0.2s ease' }}
                >
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="small mb-1" style={{ color: textSecondary, fontSize: '12px' }}>
                          {metric.label}
                        </p>
                        <h5 className="fw-bold mb-0" style={{ color: textPrimary, fontSize: '28px' }}>
                          {loading ? '—' : metric.value}
                        </h5>
                      </div>
                      <div
                        style={{
                          backgroundColor: `${metric.color}15`, color: metric.color, padding: '8px',
                          borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {metric.icon}
                      </div>
                    </div>
                    {!loading && metric.delta ? (
                      <div className="d-flex align-items-center gap-1" style={{ color: metric.delta.direction === 'up' ? '#10B981' : '#EF4444', fontSize: '12px', fontWeight: 500 }}>
                        {metric.delta.direction === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {metric.delta.value}% · {metric.deltaNote}
                      </div>
                    ) : (
                      <div style={{ color: textSecondary, fontSize: '12px', fontWeight: 500 }}>
                        {loading ? '\u00A0' : metric.deltaNote}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CHARTS GRID */}
          <div className="row g-3 g-md-4 mb-4">
            {/* Activity Line Chart */}
            <div className="col-12 col-lg-8">
              <div className="card border-0" style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3" style={{ color: textPrimary, fontSize: '15px' }}>
                    Activity Trend — {rangeLabel}
                  </h6>
                  {loading ? (
                    <div className="text-center py-5" style={{ color: textSecondary }}>
                      <Loader2 className="spin" size={22} />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                        <XAxis dataKey="name" stroke={textSecondary} />
                        <YAxis stroke={textSecondary} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, color: textPrimary }} />
                        <Legend wrapperStyle={{ color: textSecondary }} />
                        <Line type="monotone" dataKey="documents" stroke="#3B82F6" name="Documents" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
                        <Line type="monotone" dataKey="tasks" stroke="#F59E0B" name="Tasks Created" strokeWidth={2} dot={{ fill: '#F59E0B', r: 4 }} />
                        <Line type="monotone" dataKey="activity" stroke="#10B981" name="Activity Events" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Document Types Pie Chart */}
            <div className="col-12 col-lg-4">
              <div className="card border-0" style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3" style={{ color: textPrimary, fontSize: '15px' }}>
                    Document Distribution
                  </h6>
                  {loading ? (
                    <div className="text-center py-5" style={{ color: textSecondary }}>
                      <Loader2 className="spin" size={22} />
                    </div>
                  ) : documentTypes.length === 0 ? (
                    <p className="text-center small py-5 mb-0" style={{ color: textSecondary }}>No documents yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={documentTypes}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {documentTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, color: textPrimary }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="card border-0 overflow-hidden" style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
            <div className="px-4 py-3 border-bottom" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
              <h6 className="fw-bold mb-0" style={{ color: textPrimary, fontSize: '15px' }}>
                Recent Activity
              </h6>
            </div>

            <div className="list-group list-group-flush">
              {loading && (
                <p className="text-center small p-4 mb-0 d-flex align-items-center justify-content-center gap-2" style={{ color: textSecondary }}>
                  <Loader2 size={14} className="spin" /> Loading...
                </p>
              )}
              {!loading && filteredActivity.length === 0 && (
                <p className="text-center small p-4 mb-0" style={{ color: textSecondary }}>
                  {searchQuery ? 'No activity matches your search.' : 'No recent activity.'}
                </p>
              )}
              {!loading && filteredActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="list-group-item border-0 px-4 py-3"
                  style={{ backgroundColor: cardBg, borderBottom: `1px solid ${borderColor}`, transition: 'all 0.15s ease' }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: '14px', color: textPrimary }}>
                        {activity.action}
                      </h6>
                      <p className="small mb-0" style={{ color: textSecondary, fontSize: '12px' }}>
                        by {activity.user}
                      </p>
                    </div>
                    <span className="small" style={{ color: textSecondary, fontSize: '12px' }}>
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>

      {/* STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        #main-content-wrapper {
          margin-left: 0 !important;
        }

        #global-header {
          left: 0;
        }

        @media (min-width: 992px) {
          #main-content-wrapper {
            margin-left: ${desktopCollapsed ? '70px' : '240px'} !important;
          }
          #global-header {
            left: ${desktopCollapsed ? '70px' : '240px'} !important;
          }
        }

        input::placeholder {
          color: ${textSecondary} !important;
          opacity: 0.7;
        }

        @media (max-width: 575.98px) {
          main {
            padding-top: 12px !important;
          }
          .header-action-btn {
            font-size: 11px !important;
            padding: 7px 10px !important;
            gap: 5px !important;
            min-height: 34px !important;
            white-space: nowrap !important;
          }
          .header-action-btn svg {
            width: 12px !important;
            height: 12px !important;
          }
          .range-dropdown-menu {
            width: min(92vw, 210px) !important;
            right: auto !important;
            left: 0 !important;
          }
          .range-dropdown-menu button {
            font-size: 12px !important;
            padding: 8px 10px !important;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        button {
          transition: all 0.15s ease !important;
        }

        .recharts-surface {
          border-radius: 8px;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#475569' : '#cbd5e1'};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#64748b' : '#94a3b8'};
        }
      `}</style>
    </div>
  );
}

export default AnalyticsPage;