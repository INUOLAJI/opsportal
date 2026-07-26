import React, { useState } from 'react';
import { 
  TrendingUp, Download, Calendar, Filter, Activity, Users, FileText, Clock,
  Menu, Bell, Search, Moon, Sun 
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Sidebar from '../components/Sidebar'; 
import 'bootstrap/dist/css/bootstrap.min.css';

function AnalyticsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [dateRange, setDateRange] = useState('week');
  const [searchFocused, setSearchFocused] = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  // Color system
  const bgColor = darkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = darkMode ? '#1E293B' : '#FFFFFF';
  const textPrimary = darkMode ? '#F1F5F9' : '#0F172A';
  const textSecondary = darkMode ? '#CBD5E1' : '#64748B';
  const borderColor = darkMode ? '#334155' : '#E2E8F0';
  const hoverBg = darkMode ? '#334155' : '#F8FAFC';

  // KPI Metrics
  const metrics = [
    { label: 'Total Documents', value: '324', change: '+12%', icon: <FileText size={20} />, color: '#3B82F6' },
    { label: 'Active Users', value: '48', change: '+5%', icon: <Users size={20} />, color: '#10B981' },
    { label: 'Avg. Response Time', value: '234ms', change: '-8%', icon: <Clock size={20} />, color: '#F59E0B' },
    { label: 'System Activity', value: '2.4k', change: '+18%', icon: <Activity size={20} />, color: '#8B5CF6' },
  ];

  // Chart data - Activity trend
  const activityData = [
    { name: 'Mon', documents: 45, users: 32, uploads: 28 },
    { name: 'Tue', documents: 52, users: 38, uploads: 35 },
    { name: 'Wed', documents: 48, users: 35, uploads: 32 },
    { name: 'Thu', documents: 61, users: 42, uploads: 40 },
    { name: 'Fri', documents: 55, users: 38, uploads: 36 },
    { name: 'Sat', documents: 32, users: 25, uploads: 20 },
    { name: 'Sun', documents: 28, users: 20, uploads: 18 },
  ];

  // Chart data - Document types
  const documentTypes = [
    { name: 'Architecture Guides', value: 120, color: '#3B82F6' },
    { name: 'Runbooks', value: 95, color: '#10B981' },
    { name: 'Security Docs', value: 78, color: '#EF4444' },
    { name: 'Onboarding', value: 65, color: '#F59E0B' },
    { name: 'Other', value: 32, color: '#8B5CF6' },
  ];

  // Recent activity
  const recentActivity = [
    { id: 1, action: 'Document Created', user: 'John Doe', time: '2 hours ago', type: 'create' },
    { id: 2, action: 'User Invited', user: 'Sarah Jenkins', time: '4 hours ago', type: 'user' },
    { id: 3, action: 'Document Updated', user: 'Marcus Chang', time: '1 day ago', type: 'update' },
    { id: 4, action: 'Team Member Added', user: 'Elena Rostova', time: '2 days ago', type: 'user' },
    { id: 5, action: 'Report Generated', user: 'David Kim', time: '3 days ago', type: 'report' },
  ];

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
                style={{ 
                  color: textPrimary,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Menu size={20} />
              </button>
              
              {/* Quick Search Input */}
              <div className="position-relative d-none d-md-block">
                <Search 
                  className="position-absolute" 
                  size={16} 
                  style={{ 
                    left: '12px', 
                    top: '10px',
                    color: textSecondary,
                    transition: 'color 0.15s ease'
                  }} 
                />
                <input 
                  type="text" 
                  placeholder="Search analytics & logs..." 
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
                style={{ 
                  transition: 'all 0.15s ease',
                  backgroundColor: darkMode ? '#334155' : '#F1F5F9',
                  color: textPrimary
                }}
                aria-label="Toggle dark mode"
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications Bell */}
              <button 
                className="btn position-relative p-2 rounded-circle border-0"
                style={{ 
                  transition: 'all 0.15s ease',
                  backgroundColor: 'transparent',
                  color: textSecondary
                }}
                aria-label="View notifications"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9';
                  e.currentTarget.style.color = textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = textSecondary;
                }}
              >
                <Bell size={18} />
                <span 
                  className="position-absolute rounded-circle" 
                  style={{ 
                    top: '6px', 
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#EF4444',
                    boxShadow: '0 0 0 2px ' + cardBg,
                    animation: 'pulse 2s infinite'
                  }}
                ></span>
              </button>
              
              <div 
                className="vr opacity-25 my-auto" 
                style={{ 
                  height: '24px',
                  backgroundColor: borderColor
                }}
              ></div>
              
              {/* User Profile */}
              <div className="d-flex align-items-center gap-2 ps-1" style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <div 
                  className="rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0" 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    backgroundColor: '#8B5CF6',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  JD
                </div>
                <div className="d-none d-sm-block text-start">
                  <p className="mb-0 small fw-bold" style={{ color: textPrimary }}>John Doe</p>
                  <span className="d-block" style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>
                    Operations Admin
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
              <div 
                className="btn btn-sm border d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0"
                style={{ 
                  backgroundColor: cardBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hoverBg;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = cardBg;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Calendar size={14} />
                {dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'This Year'}
              </div>
              <button 
                className="btn btn-sm text-white d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0"
                style={{ 
                  backgroundColor: '#3B82F6',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Download size={14} />
                Export Report
              </button>
            </div>
          </div>

          {/* KPI METRICS */}
          <div className="row g-3 mb-4">
            {metrics.map((metric, idx) => (
              <div key={idx} className="col-12 col-sm-6 col-md-3">
                <div 
                  className="card border-0 h-100"
                  style={{ 
                    backgroundColor: cardBg,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="small mb-1" style={{ color: textSecondary, fontSize: '12px' }}>
                          {metric.label}
                        </p>
                        <h5 className="fw-bold mb-0" style={{ color: textPrimary, fontSize: '28px' }}>
                          {metric.value}
                        </h5>
                      </div>
                      <div 
                        style={{ 
                          backgroundColor: `${metric.color}15`,
                          color: metric.color,
                          padding: '8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {metric.icon}
                      </div>
                    </div>
                    <div style={{ color: '#10B981', fontSize: '12px', fontWeight: 500 }}>
                      {metric.change} from last period
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CHARTS GRID */}
          <div className="row g-3 g-md-4 mb-4">
            {/* Activity Line Chart */}
            <div className="col-12 col-lg-8">
              <div 
                className="card border-0"
                style={{ 
                  backgroundColor: cardBg,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3" style={{ color: textPrimary, fontSize: '15px' }}>
                    Weekly Activity Trend
                  </h6>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                      <XAxis stroke={textSecondary} />
                      <YAxis stroke={textSecondary} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: cardBg, 
                          border: `1px solid ${borderColor}`,
                          color: textPrimary
                        }} 
                      />
                      <Legend wrapperStyle={{ color: textSecondary }} />
                      <Line 
                        type="monotone" 
                        dataKey="documents" 
                        stroke="#3B82F6" 
                        name="Documents"
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#10B981" 
                        name="Active Users"
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="uploads" 
                        stroke="#F59E0B" 
                        name="Uploads"
                        strokeWidth={2}
                        dot={{ fill: '#F59E0B', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Document Types Pie Chart */}
            <div className="col-12 col-lg-4">
              <div 
                className="card border-0"
                style={{ 
                  backgroundColor: cardBg,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3" style={{ color: textPrimary, fontSize: '15px' }}>
                    Document Distribution
                  </h6>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={documentTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {documentTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: cardBg, 
                          border: `1px solid ${borderColor}`,
                          color: textPrimary
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div 
            className="card border-0 overflow-hidden"
            style={{ 
              backgroundColor: cardBg,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div 
              className="px-4 py-3 border-bottom"
              style={{ 
                backgroundColor: cardBg,
                borderColor: borderColor
              }}
            >
              <h6 className="fw-bold mb-0" style={{ color: textPrimary, fontSize: '15px' }}>
                Recent Activity
              </h6>
            </div>

            <div className="list-group list-group-flush">
              {recentActivity.map((activity) => (
                <div 
                  key={activity.id}
                  className="list-group-item border-0 px-4 py-3"
                  style={{ 
                    backgroundColor: cardBg,
                    borderBottom: `1px solid ${borderColor}`,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = cardBg;
                  }}
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

        /* Input Placeholder Darkmode Fix */
        input::placeholder {
          color: ${textSecondary} !important;
          opacity: 0.7;
        }

        /* Pulse Animation for Notification Badge */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Smooth Transitions */
        button {
          transition: all 0.15s ease !important;
        }

        /* Recharts Custom Styling */
        .recharts-surface {
          border-radius: 8px;
        }

        /* Scrollbar */
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