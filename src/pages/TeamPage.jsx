import React, { useState, useEffect } from 'react';
import { 
  Mail, Phone, Shield, Plus, Search, MoreVertical, Filter, 
  Menu, Bell, Moon, Sun 
} from 'lucide-react';
import Sidebar from '../components/Sidebar'; 
import { useAuth } from '../context/AuthContext';
import { usersService } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

function TeamPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  const userInitials = user?.full_name 
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) 
    : (user?.email ? user.email[0].toUpperCase() : 'U');

  const userName = user?.full_name || user?.email || 'User';
  const userRole = user?.role === 'admin' ? 'Operations Admin' : 'Staff Member';

  useEffect(() => {
    async function fetchTeam() {
      try {
        const users = await usersService.getAll();
        if (Array.isArray(users) && users.length > 0) {
          setTeamMembers(users.map(u => ({
            id: u.id,
            name: u.full_name,
            role: u.role === 'admin' ? 'Operations Admin' : 'Staff Member',
            email: u.email,
            phone: '+1 (555) 019-2834',
            initials: u.full_name ? u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : u.email[0].toUpperCase(),
            color: u.role === 'admin' ? '#8B5CF6' : '#3B82F6',
            status: 'Active'
          })));
        } else {
          setTeamMembers([
            { id: 1, name: 'John Doe', role: 'Operations Admin', email: 'john.doe@opsportal.com', phone: '+1 (555) 019-2834', initials: 'JD', color: '#8B5CF6', status: 'Active' },
            { id: 2, name: 'Marcus Chang', role: 'DevOps Lead', email: 'm.chang@opsportal.com', phone: '+1 (555) 014-4921', initials: 'MC', color: '#10B981', status: 'Active' },
            { id: 3, name: 'Sarah Jenkins', role: 'Security Engineer', email: 's.jenkins@opsportal.com', phone: '+1 (555) 017-8832', initials: 'SJ', color: '#EC4899', status: 'On Break' },
            { id: 4, name: 'Brandon Bell', role: 'UI/UX Designer', email: 'b.bell@opsportal.com', phone: '+1 (555) 012-3341', initials: 'BB', color: '#3B82F6', status: 'Active' },
          ]);
        }
      } catch (err) {
        setTeamMembers([
          { id: 1, name: 'John Doe', role: 'Operations Admin', email: 'john.doe@opsportal.com', phone: '+1 (555) 019-2834', initials: 'JD', color: '#8B5CF6', status: 'Active' },
          { id: 2, name: 'Marcus Chang', role: 'DevOps Lead', email: 'm.chang@opsportal.com', phone: '+1 (555) 014-4921', initials: 'MC', color: '#10B981', status: 'Active' },
        ]);
      }
    }
    fetchTeam();
  }, []);

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

  // Team data
  const teamData = [
    { 
      id: 1, 
      name: 'John Doe', 
      role: 'Operations Admin', 
      email: 'john.doe@opsportal.com', 
      phone: '+1 (555) 019-2834', 
      initials: 'JD', 
      color: '#8B5CF6', 
      status: 'Active' 
    },
    { 
      id: 2, 
      name: 'Marcus Chang', 
      role: 'DevOps Lead', 
      email: 'm.chang@opsportal.com', 
      phone: '+1 (555) 014-4921', 
      initials: 'MC', 
      color: '#10B981', 
      status: 'Active' 
    },
    { 
      id: 3, 
      name: 'Sarah Jenkins', 
      role: 'Security Engineer', 
      email: 's.jenkins@opsportal.com', 
      phone: '+1 (555) 017-8832', 
      initials: 'SJ', 
      color: '#EC4899', 
      status: 'On Break' 
    },
    { 
      id: 4, 
      name: 'Brandon Bell', 
      role: 'UI/UX Designer', 
      email: 'b.bell@opsportal.com', 
      phone: '+1 (555) 012-3341', 
      initials: 'BB', 
      color: '#3B82F6', 
      status: 'Active' 
    },
    { 
      id: 5, 
      name: 'Elena Rostova', 
      role: 'Backend Engineer', 
      email: 'e.rostova@opsportal.com', 
      phone: '+1 (555) 015-9902', 
      initials: 'ER', 
      color: '#06B6D4', 
      status: 'Remote' 
    },
    { 
      id: 6, 
      name: 'David Kim', 
      role: 'QA & Automation', 
      email: 'd.kim@opsportal.com', 
      phone: '+1 (555) 011-7726', 
      initials: 'DK', 
      color: '#F59E0B', 
      status: 'Offline' 
    },
  ];

  // Filter team members
  const filteredTeam = teamData.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Active': { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
      'On Break': { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
      'Remote': { color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)' },
      'Offline': { color: textSecondary, bg: hoverBg }
    };
    const config = statusConfig[status] || statusConfig['Offline'];
    
    return (
      <span 
        className="badge px-2 py-1 fw-semibold text-nowrap"
        style={{ 
          fontSize: '11px',
          backgroundColor: config.bg,
          color: config.color
        }}
      >
        {status}
      </span>
    );
  };

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
              
              {/* Quick Global Search Input */}
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
                  placeholder="Search team globally..." 
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
                  {userInitials}
                </div>
                <div className="d-none d-sm-block text-start">
                  <p className="mb-0 small fw-bold" style={{ color: textPrimary }}>{userName}</p>
                  <span className="d-block" style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>
                    {userRole}
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
                Team Directory
              </h1>
              <p className="small mb-0" style={{ color: textSecondary }}>
                Manage team members, assign permissions, and check availability.
              </p>
            </div>
            <div className="d-flex gap-2 w-100 w-sm-auto justify-content-sm-end">
              <button 
                className="btn btn-sm border d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0"
                style={{ 
                  backgroundColor: cardBg,
                  color: textPrimary,
                  borderColor: borderColor,
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
                <Filter size={14} />
                Filter
              </button>
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
                <Plus size={14} />
                Invite Member
              </button>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div 
            className="card border-0 mb-4"
            style={{ 
              backgroundColor: cardBg,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="card-body p-3 p-md-4">
              <div className="position-relative">
                <Search 
                  className="position-absolute" 
                  size={18} 
                  style={{ 
                    left: '16px', 
                    top: '12px',
                    color: textSecondary,
                    transition: 'color 0.15s ease'
                  }} 
                />
                <input 
                  type="text" 
                  placeholder="Search by name, role, or specialty..." 
                  className="form-control border-0 ps-5 py-2 shadow-none"
                  style={{ 
                    backgroundColor: hoverBg,
                    color: textPrimary,
                    fontSize: '14px',
                    transition: 'all 0.15s ease'
                  }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.borderColor = '#3B82F6';
                    e.currentTarget.style.border = '1px solid #3B82F6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.border = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* TEAM MEMBERS GRID */}
          <div className="row g-3 g-md-4">
            {filteredTeam.map(member => (
              <div key={member.id} className="col-12 col-md-6 col-xl-4">
                <div 
                  className="card border-0 h-100"
                  style={{ 
                    backgroundColor: cardBg,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative'
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
                  {/* More Options Button */}
                  <button 
                    className="btn p-1 border-0 rounded-2"
                    style={{ 
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'transparent',
                      color: textSecondary,
                      transition: 'all 0.15s ease',
                      zIndex: 10
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = hoverBg;
                      e.currentTarget.style.color = textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = textSecondary;
                    }}
                    aria-label="More options"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Card Body */}
                  <div className="card-body p-4 d-flex flex-column h-100">
                    
                    {/* User Header */}
                    <div className="d-flex align-items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <div 
                        className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0" 
                        style={{ 
                          width: '48px', 
                          height: '48px', 
                          backgroundColor: member.color, 
                          fontSize: '16px',
                          boxShadow: `0 2px 8px ${member.color}40`
                        }}
                      >
                        {member.initials}
                      </div>
                      <div className="min-w-0 flex-grow-1">
                        <h6 className="fw-bold mb-0 text-truncate" style={{ fontSize: '14px', color: textPrimary }}>
                          {member.name}
                        </h6>
                        <span 
                          className="small d-flex align-items-center gap-1 mt-1 text-truncate"
                          style={{ color: textSecondary, fontSize: '12px' }}
                        >
                          <Shield size={12} style={{ color: '#3B82F6', flexShrink: 0 }} /> 
                          {member.role}
                        </span>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="d-flex flex-column gap-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <div className="d-flex align-items-center gap-2 text-truncate" style={{ color: textSecondary, fontSize: '12px' }}>
                        <Mail size={13} style={{ flexShrink: 0 }} />
                        <span className="text-truncate">{member.email}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2" style={{ color: textSecondary, fontSize: '12px' }}>
                        <Phone size={13} style={{ flexShrink: 0 }} />
                        <span>{member.phone}</span>
                      </div>
                    </div>

                    {/* Status Footer */}
                    <div className="mt-auto d-flex justify-content-between align-items-center pt-2">
                      <span className="small" style={{ color: textSecondary, fontSize: '11px' }}>
                        Status
                      </span>
                      {getStatusBadge(member.status)}
                    </div>

                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {filteredTeam.length === 0 && (
              <div className="col-12 text-center py-5">
                <p className="small" style={{ color: textSecondary }}>
                  No team members match your search criteria.
                </p>
              </div>
            )}
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

        /* Input Focus */
        input:focus {
          outline: none !important;
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

export default TeamPage;