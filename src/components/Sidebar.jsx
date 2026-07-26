import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Users, BarChart3, Settings, 
  LogOut, X, Moon, Sun 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ 
  mobileOpen, 
  setMobileOpen, 
  desktopCollapsed, 
  darkMode = false,
  onDarkModeChange = () => {}
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const toggleDarkMode = () => {
    onDarkModeChange(!darkMode);
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  // Color system derived directly from props
  const sidebarBg = darkMode ? '#1E293B' : '#FFFFFF';
  const sidebarText = darkMode ? '#F1F5F9' : '#0F172A';
  const sidebarBorder = darkMode ? '#334155' : '#E2E8F0';
  const sidebarHover = darkMode ? '#334155' : '#F8FAFC';
  const sidebarActive = '#3B82F6';

  const menuItems = [
    { id: 1, label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 2, label: 'Documents', path: '/documents', icon: <FileText size={20} /> },
    { id: 3, label: 'Team', path: '/team', icon: <Users size={20} /> },
    { id: 4, label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
    { id: 5, label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* MOBILE BACKDROP OVERLAY */}
      {mobileOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-lg-none" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1040,
            transition: 'opacity 0.2s ease'
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside 
        className="d-flex flex-column position-fixed h-100"
        style={{ 
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          backgroundColor: sidebarBg,
          color: sidebarText,
          transition: 'all 0.2s ease-in-out',
          left: 0,
          top: 0,
          zIndex: 1050,
          boxShadow: '1px 0 3px rgba(0, 0, 0, 0.05)',
          borderRight: `1px solid ${sidebarBorder}`,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
        id="sidebar-container"
      >
        {/* SIDEBAR HEADER - LOGO */}
        <div 
          className="d-flex align-items-center justify-content-between flex-shrink-0 px-3"
          style={{ 
            height: '64px',
            borderBottom: `1px solid ${sidebarBorder}`,
            transition: 'all 0.2s ease'
          }}
        >
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div 
              className="rounded d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0" 
              style={{ 
                width: '36px', 
                height: '36px', 
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                fontSize: '16px'
              }}
            >
              OP
            </div>
            <span 
              className="fw-bold sidebar-text" 
              style={{ 
                fontSize: '15px',
                transition: 'opacity 0.2s ease',
                opacity: desktopCollapsed ? 0 : 1,
                whiteSpace: 'nowrap'
              }}
            >
              OpsPortal
            </span>
          </div>
          <button 
            className="btn btn-link d-lg-none p-0 flex-shrink-0" 
            onClick={() => setMobileOpen(false)}
            style={{ color: sidebarText }}
          >
            <X size={20} />
          </button>
        </div>

        {/* SIDEBAR MENU */}
        <nav className="flex-grow-1 overflow-y-auto p-2 d-flex flex-column gap-1" style={{ marginTop: '8px' }}>
          {menuItems.map((item) => (
            <Link 
              key={item.id}
              to={item.path} 
              style={{ textDecoration: 'none' }}
              onClick={() => mobileOpen && setMobileOpen(false)}
            >
              <SidebarLink 
                icon={item.icon} 
                label={item.label} 
                active={location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/')}
                showText={!desktopCollapsed}
                sidebarActive={sidebarActive}
                sidebarHover={sidebarHover}
                sidebarText={sidebarText}
              />
            </Link>
          ))}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div 
          className="flex-shrink-0 p-2 d-flex flex-column gap-1"
          style={{ 
            borderTop: `1px solid ${sidebarBorder}`,
            marginTop: 'auto'
          }}
        >
          {/* User badge preview */}
          {user && !desktopCollapsed && (
            <div className="px-2 py-1 mb-1 rounded small" style={{ backgroundColor: sidebarHover }}>
              <div className="fw-bold text-truncate" style={{ fontSize: '12px' }}>{user.full_name}</div>
              <div className="text-muted text-truncate" style={{ fontSize: '11px' }}>{user.email} ({user.role})</div>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="btn w-100 d-flex align-items-center gap-2 rounded-2 border-0"
            style={{
              backgroundColor: sidebarHover,
              color: sidebarText,
              padding: '10px 12px',
              transition: 'all 0.15s ease',
              justifyContent: desktopCollapsed ? 'center' : 'flex-start',
              fontSize: '13px',
              fontWeight: 500
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = sidebarActive;
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = sidebarHover;
              e.currentTarget.style.color = sidebarText;
            }}
            title={desktopCollapsed ? (darkMode ? 'Light Mode' : 'Dark Mode') : ''}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {!desktopCollapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="btn w-100 d-flex align-items-center gap-2 rounded-2 border-0"
            style={{
              backgroundColor: 'transparent',
              color: sidebarText,
              padding: '10px 12px',
              transition: 'all 0.15s ease',
              justifyContent: desktopCollapsed ? 'center' : 'flex-start',
              fontSize: '13px',
              fontWeight: 500
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#EF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = sidebarText;
            }}
            title={desktopCollapsed ? 'Logout' : ''}
          >
            <LogOut size={18} />
            {!desktopCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        #sidebar-container {
          width: 240px;
          transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'};
        }

        @media (min-width: 992px) {
          #sidebar-container {
            transform: translateX(0) !important;
            width: ${desktopCollapsed ? '70px' : '240px'} !important;
          }
        }

        /* Scrollbar Styling */
        #sidebar-container::-webkit-scrollbar {
          width: 6px;
        }

        #sidebar-container::-webkit-scrollbar-track {
          background: transparent;
        }

        #sidebar-container::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#475569' : '#cbd5e1'};
          border-radius: 3px;
        }

        #sidebar-container::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#64748b' : '#94a3b8'};
        }

        .sidebar-text {
          transition: opacity 0.2s ease !important;
        }
      `}</style>
    </>
  );
}

function SidebarLink({ 
  icon, 
  label, 
  active = false, 
  showText = true,
  sidebarActive,
  sidebarHover,
  sidebarText
}) {
  const bgColor = active ? sidebarActive : 'transparent';
  const textColor = active ? '#FFFFFF' : sidebarText;

  return (
    <div 
      className="d-flex align-items-center rounded-2 text-decoration-none overflow-hidden"
      style={{ 
        backgroundColor: bgColor,
        color: textColor,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        justifyContent: showText ? 'flex-start' : 'center',
        gap: '12px'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = sidebarHover;
          e.currentTarget.style.color = sidebarText;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = sidebarText;
        }
      }}
    >
      <div className="flex-shrink-0 d-flex align-items-center justify-content-center">
        {icon}
      </div>
      {showText && (
        <span 
          className="sidebar-text"
          style={{ 
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            opacity: showText ? 1 : 0,
            transition: 'opacity 0.2s ease'
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}