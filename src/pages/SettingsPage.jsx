import React, { useState } from 'react';
import { 
  Settings, Shield, Bell, Key, Save, RefreshCw, Layers, 
  Menu, Search, Moon, Sun 
} from 'lucide-react';
import Sidebar from '../components/Sidebar'; 
import 'bootstrap/dist/css/bootstrap.min.css';

function SettingsPage() {
  // Layout state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Settings configuration state
  const [activeTab, setActiveTab] = useState('general');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackWebhooks, setSlackWebhooks] = useState(false);
  const [mfaStatus, setMfaStatus] = useState(true);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  // Dynamic theme colors
  const bgColor = darkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = darkMode ? '#1E293B' : '#FFFFFF';
  const textPrimary = darkMode ? '#F1F5F9' : '#0F172A';
  const textSecondary = darkMode ? '#CBD5E1' : '#64748B';
  const borderColor = darkMode ? '#334155' : '#E2E8F0';
  const hoverBg = darkMode ? '#334155' : '#F8FAFC';
  const inputBg = darkMode ? '#334155' : '#F1F5F9';

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
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Menu size={20} />
              </button>
              
              {/* Global Search Input */}
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
                  placeholder="Search settings..." 
                  className="form-control form-control-sm border-0 ps-5 rounded-3"
                  style={{ 
                    width: '240px', 
                    height: '36px',
                    backgroundColor: inputBg,
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

            {/* Right Nav Controls */}
            <div className="d-flex align-items-center gap-2 gap-sm-3">
              
              {/* Dark Mode Toggle */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="btn p-2 rounded-circle border-0"
                style={{ 
                  transition: 'all 0.15s ease',
                  backgroundColor: inputBg,
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
                  e.currentTarget.style.backgroundColor = hoverBg;
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

        {/* MAIN SCROLLABLE CONTAINER */}
        <main className="p-3 p-md-4 flex-grow-1" style={{ paddingTop: 'calc(64px + 1.5rem)' }}>
          
          {/* PAGE HEADER BLOCK */}
          <div className="d-flex flex-column sm:flex-row justify-content-between align-items-start gap-3 mb-4 mt-5">
            <div>
              <h1 className="h3 fw-bold mb-1" style={{ color: textPrimary }}>System Settings</h1>
              <p className="small mb-0" style={{ color: textSecondary }}>Configure system parameters, alert channels, webhook registries, and administrative overrides.</p>
            </div>
          </div>

          <div className="row g-4">
            
            {/* LEFT COLUMN: NAVIGATION TABS */}
            <div className="col-12 col-md-3">
              <div className="card border-0 p-2 rounded-3" style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <div className="nav flex-column nav-pills gap-1">
                  <button 
                    className={`nav-link text-start d-flex align-items-center gap-2 py-2 px-3 border-0 rounded-3 transition-all ${activeTab === 'general' ? 'bg-primary text-white' : 'style-tab-btn'}`}
                    style={activeTab !== 'general' ? { backgroundColor: 'transparent', color: textSecondary } : {}}
                    onClick={() => setActiveTab('general')}
                  >
                    <Settings size={16} /> <span className="small fw-medium">General Platform</span>
                  </button>
                  <button 
                    className={`nav-link text-start d-flex align-items-center gap-2 py-2 px-3 border-0 rounded-3 transition-all ${activeTab === 'notifications' ? 'bg-primary text-white' : 'style-tab-btn'}`}
                    style={activeTab !== 'notifications' ? { backgroundColor: 'transparent', color: textSecondary } : {}}
                    onClick={() => setActiveTab('notifications')}
                  >
                    <Bell size={16} /> <span className="small fw-medium">Alert Dispatches</span>
                  </button>
                  <button 
                    className={`nav-link text-start d-flex align-items-center gap-2 py-2 px-3 border-0 rounded-3 transition-all ${activeTab === 'security' ? 'bg-primary text-white' : 'style-tab-btn'}`}
                    style={activeTab !== 'security' ? { backgroundColor: 'transparent', color: textSecondary } : {}}
                    onClick={() => setActiveTab('security')}
                  >
                    <Shield size={16} /> <span className="small fw-medium">Security & Access</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: DYNAMIC PANEL CONTAINER */}
            <div className="col-12 col-md-9">
              <div className="card border-0 p-4 rounded-3" style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                
                {/* GENERAL SETTINGS RENDER */}
                {activeTab === 'general' && (
                  <div>
                    <h5 className="fw-bold mb-1" style={{ fontSize: '15px', color: textPrimary }}>General Infrastructure Settings</h5>
                    <p className="small mb-4" style={{ color: textSecondary }}>Manage baseline metadata parameters across active cluster orchestration nodes.</p>
                    
                    <div className="row g-3">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" style={{ color: textSecondary }}>Workspace App Title</label>
                        <input 
                          type="text" 
                          className="form-control form-control-sm border shadow-none py-2 rounded-3" 
                          style={{ backgroundColor: inputBg, color: textPrimary, borderColor: borderColor }}
                          defaultValue="OpsPortal Enterprise" 
                        />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" style={{ color: textSecondary }}>Environment Stage Scope</label>
                        <select 
                          className="form-select form-select-sm border shadow-none py-2 rounded-3"
                          style={{ backgroundColor: inputBg, color: textPrimary, borderColor: borderColor }}
                        >
                          <option value="prod">Production (Live Webhooks)</option>
                          <option value="staging">Staging Canary</option>
                          <option value="dev">Development Sandbox</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold mb-1" style={{ color: textSecondary }}>Global Fallback API Endpoint URL</label>
                        <input 
                          type="url" 
                          className="form-control form-control-sm border shadow-none py-2 rounded-3" 
                          style={{ backgroundColor: inputBg, color: textPrimary, borderColor: borderColor }}
                          defaultValue="https://api.opsportal.internal/v1/stream" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS SETTINGS RENDER */}
                {activeTab === 'notifications' && (
                  <div>
                    <h5 className="fw-bold mb-1" style={{ fontSize: '15px', color: textPrimary }}>Alert & Incident Routing Pipes</h5>
                    <p className="small mb-4" style={{ color: textSecondary }}>Control escalation triggers and downstream system logging notifications.</p>
                    
                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ backgroundColor: hoverBg }}>
                        <div>
                          <h6 className="fw-semibold mb-0 small" style={{ color: textPrimary }}>Critical Error Email Logs</h6>
                          <p className="small mb-0" style={{ fontSize: '11px', color: textSecondary }}>Dispatches comprehensive stack traces directly to verified admins.</p>
                        </div>
                        <div className="form-check form-switch m-0">
                          <input className="form-check-input cursor-pointer shadow-none" type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} />
                        </div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ backgroundColor: hoverBg }}>
                        <div>
                          <h6 className="fw-semibold mb-0 small" style={{ color: textPrimary }}>Slack Incident Synchronization Channel</h6>
                          <p className="small mb-0" style={{ fontSize: '11px', color: textSecondary }}>Streams automated warning telemetry signals directly to #ops-pipeline.</p>
                        </div>
                        <div className="form-check form-switch m-0">
                          <input className="form-check-input cursor-pointer shadow-none" type="checkbox" checked={slackWebhooks} onChange={() => setSlackWebhooks(!slackWebhooks)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECURITY SETTINGS RENDER */}
                {activeTab === 'security' && (
                  <div>
                    <h5 className="fw-bold mb-1" style={{ fontSize: '15px', color: textPrimary }}>Access Control List (ACL) Rules</h5>
                    <p className="small mb-4" style={{ color: textSecondary }}>Review identity constraints and rotate active application token scopes.</p>
                    
                    <div className="d-flex align-items-center justify-content-between p-3 rounded-3 mb-4" style={{ backgroundColor: hoverBg }}>
                      <div className="d-flex align-items-start gap-2.5">
                        <Key size={16} className="text-primary mt-1 flex-shrink-0" />
                        <div>
                          <h6 className="fw-semibold mb-0 small" style={{ color: textPrimary }}>Two-Factor Security Authentication (2FA)</h6>
                          <p className="small mb-0" style={{ fontSize: '11px', color: textSecondary }}>Enforces TOTP hardware token entry during administrative authorization routines.</p>
                        </div>
                      </div>
                      <div className="form-check form-switch m-0">
                        <input className="form-check-input cursor-pointer shadow-none" type="checkbox" checked={mfaStatus} onChange={() => setMfaStatus(!mfaStatus)} />
                      </div>
                    </div>

                    <div className="pt-3 border-top d-flex justify-content-between align-items-center" style={{ borderColor: borderColor }}>
                      <div>
                        <span className="d-block fw-semibold small" style={{ color: textPrimary }}>Platform Master Secret Key</span>
                        <span style={{ fontSize: '11px', color: textSecondary }}>Last structural token refresh occurred 18 days ago.</span>
                      </div>
                      <button 
                        className="btn btn-sm border d-flex align-items-center gap-2 shadow-sm py-1.5 px-3 rounded-3" 
                        style={{ backgroundColor: cardBg, color: textPrimary, borderColor: borderColor, fontSize: '12px' }}
                      >
                        <RefreshCw size={12} /> Rotate Token
                      </button>
                    </div>
                  </div>
                )}

                {/* FOOTER ACTION PANEL */}
                <div className="mt-5 pt-3 border-top d-flex justify-content-end gap-2" style={{ borderColor: borderColor }}>
                  <button className="btn btn-link btn-sm text-decoration-none shadow-none px-3" style={{ color: textSecondary }}>
                    Discard Modifications
                  </button>
                  <button className="btn btn-sm text-white d-flex align-items-center gap-2 shadow-sm py-2 px-3 rounded-3" style={{ backgroundColor: '#3B82F6', border: 'none' }}>
                    <Save size={14} /> Save Configuration
                  </button>
                </div>

              </div>
            </div>

          </div>

        </main>
      </div>

      {/* RESPONSIVE LAYOUT ENGINE OVERRIDES */}
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

        .style-tab-btn:hover {
          background-color: ${hoverBg} !important;
          color: ${textPrimary} !important;
        }

        .cursor-pointer {
          cursor: pointer;
        }

        .transition-all {
          transition: all 0.2s ease-in-out;
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

export default SettingsPage;