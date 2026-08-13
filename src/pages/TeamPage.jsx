import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Mail, Calendar, Shield, Plus, Search, Filter,
  Menu, Bell, Moon, Sun, X, Loader2, Check, Trash2, AlertTriangle
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { usersService, authService } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const ROLE_OPTIONS = ['All', 'Admin', 'Staff'];

function formatJoinedDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function mapMember(u) {
  const roleLabel = u.role === 'admin' ? 'Operations Admin' : 'Staff Member';
  return {
    id: u.id,
    name: u.full_name || u.email,
    email: u.email,
    role: u.role,
    roleLabel,
    initials: u.full_name
      ? u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : (u.email ? u.email[0].toUpperCase() : '?'),
    color: u.role === 'admin' ? '#8B5CF6' : '#3B82F6',
    isActive: u.is_active !== false, // default true unless explicitly false
    isVerified: u.is_verified !== false, // default true unless explicitly false (admins always true)
    joined: formatJoinedDate(u.date_joined),
  };
}

function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 576 : false
  );

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [roleFilter, setRoleFilter] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  const [removeTarget, setRemoveTarget] = useState(null); // the member object pending confirmation
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email ? user.email[0].toUpperCase() : 'U');

  const userName = user?.full_name || user?.email || 'User';
  const userRole = isAdmin ? 'Operations Admin' : 'Staff Member';

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await usersService.getAll();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setTeamMembers(list.map(mapMember));
    } catch (err) {
      setLoadError('Could not load the team directory. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  // Opened via the sidebar's "Add Staff" shortcut — jump straight into the
  // invite flow, then clear the state so a refresh/back-nav doesn't reopen it.
  useEffect(() => {
    if (isAdmin && location.state?.openInvite) {
      setShowInviteModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [isAdmin, location.state, location.pathname, navigate]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 576);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  const resetInviteForm = () => {
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('');
    setInviteRole('staff');
    setInviteError(null);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim() || invitePassword.length < 8) {
      setInviteError('Please fill in a name, email, and a password of at least 8 characters.');
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      await authService.signUp(inviteName.trim(), inviteEmail.trim(), invitePassword, inviteRole);
      await loadTeam(); // refetch for canonical data (id, date_joined, etc.)
      resetInviteForm();
      setShowInviteModal(false);
    } catch (err) {
      const message = err.response?.data?.email?.[0] || err.message || 'Could not create the account. Please try again.';
      setInviteError(message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await usersService.remove(removeTarget.id);
      setTeamMembers(prev => prev.filter(m => m.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch (err) {
      setRemoveError(err.message || 'Could not remove this team member. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  // Color system
  const bgColor = darkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = darkMode ? '#1E293B' : '#FFFFFF';
  const textPrimary = darkMode ? '#F1F5F9' : '#0F172A';
  const textSecondary = darkMode ? '#CBD5E1' : '#64748B';
  const borderColor = darkMode ? '#334155' : '#E2E8F0';
  const hoverBg = darkMode ? '#334155' : '#F8FAFC';

  const filteredTeam = teamMembers.filter(member => {
    const matchesRole =
      roleFilter === 'All' ||
      (roleFilter === 'Admin' && member.role === 'admin') ||
      (roleFilter === 'Staff' && member.role === 'staff');
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.roleLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getStatusBadge = (isActive) => (
    <span
      className="badge px-2 py-1 fw-semibold text-nowrap"
      style={{
        fontSize: '11px',
        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : hoverBg,
        color: isActive ? '#10B981' : textSecondary
      }}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const getVerificationBadge = (isVerified) => {
    if (isVerified) return null;
    return (
      <span
        className="badge px-2 py-1 fw-semibold text-nowrap"
        style={{ fontSize: '11px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706' }}
        title="Hasn't clicked the verification link yet"
      >
        Pending Verification
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
                style={{ color: textPrimary, transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                  placeholder="Search team globally..."
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
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="btn p-2 rounded-circle border-0"
                style={{ transition: 'all 0.15s ease', backgroundColor: darkMode ? '#334155' : '#F1F5F9', color: textPrimary }}
                aria-label="Toggle dark mode"
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                className="btn position-relative p-2 rounded-circle border-0"
                style={{ transition: 'all 0.15s ease', backgroundColor: 'transparent', color: textSecondary }}
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
              </button>

              <div className="vr opacity-25 my-auto" style={{ height: '24px', backgroundColor: borderColor }}></div>

              <div className="d-flex align-items-center gap-2 ps-1" style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <div
                  className="rounded-circle text-white d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: '36px', height: '36px', backgroundColor: '#8B5CF6',
                    fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)', transition: 'all 0.15s ease'
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
              <div className="position-relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilterMenu(prev => !prev)}
                  className="btn btn-sm border d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0 header-action-btn"
                  style={{
                    backgroundColor: showFilterMenu ? hoverBg : cardBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Filter size={14} />
                  {roleFilter === 'All' ? 'Filter' : roleFilter}
                </button>
                {showFilterMenu && (
                  <div
                    className="position-absolute rounded-3 overflow-hidden filter-dropdown-menu"
                    style={{
                      top: '42px', right: isMobileView ? 'auto' : 0, left: isMobileView ? 0 : 'auto', width: '150px', backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 1040
                    }}
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setRoleFilter(opt); setShowFilterMenu(false); }}
                        className="btn w-100 d-flex align-items-center justify-content-between rounded-0 border-0 px-3 py-2"
                        style={{ fontSize: '13px', color: textPrimary, textAlign: 'left' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt}
                        {roleFilter === opt && <Check size={14} color="#3B82F6" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn btn-sm text-white d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0"
                  style={{ backgroundColor: '#3B82F6', transition: 'all 0.15s ease' }}
                >
                  <Plus size={14} />
                  Invite Member
                </button>
              )}
            </div>
          </div>

          {loadError && (
            <div className="alert alert-danger py-2 px-3 small d-flex justify-content-between align-items-center mb-3" role="alert">
              {loadError}
              <button className="btn btn-sm btn-link p-0 text-decoration-underline" onClick={loadTeam}>Retry</button>
            </div>
          )}

          {/* SEARCH BAR */}
          <div className="card border-0 mb-4" style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
            <div className="card-body p-3 p-md-4">
              <div className="position-relative">
                <Search className="position-absolute" size={18} style={{ left: '16px', top: '12px', color: textSecondary }} />
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  className="form-control border-0 ps-5 py-2 shadow-none"
                  style={{ backgroundColor: hoverBg, color: textPrimary, fontSize: '14px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading && (
            <p className="text-center small py-5 d-flex align-items-center justify-content-center gap-2" style={{ color: textSecondary }}>
              <Loader2 size={14} className="spin" /> Loading team directory...
            </p>
          )}

          {/* TEAM MEMBERS GRID */}
          {!loading && (
            <div className="row g-3 g-md-4">
              {filteredTeam.map(member => (
                <div key={member.id} className="col-12 col-md-6 col-xl-4">
                  <div
                    className="card border-0 h-100"
                    style={{
                      backgroundColor: cardBg,
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease',
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
                    <div className="card-body p-4 d-flex flex-column h-100">

                      {/* Remove (admin only, not for your own account) */}
                      {isAdmin && member.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => { setRemoveTarget(member); setRemoveError(null); }}
                          className="btn btn-sm border-0 p-1 rounded-2 position-absolute"
                          style={{ top: '12px', right: '12px', color: textSecondary, backgroundColor: 'transparent', lineHeight: 0 }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSecondary; }}
                          title="Remove staff member"
                          aria-label={`Remove ${member.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}

                      {/* User Header */}
                      <div className="d-flex align-items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                        <div
                          className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                          style={{ width: '48px', height: '48px', backgroundColor: member.color, fontSize: '16px', boxShadow: `0 2px 8px ${member.color}40` }}
                        >
                          {member.initials}
                        </div>
                        <div className="min-w-0 flex-grow-1">
                          <h6 className="fw-bold mb-0 text-truncate" style={{ fontSize: '14px', color: textPrimary }}>
                            {member.name}
                          </h6>
                          <span className="small d-flex align-items-center gap-1 mt-1 text-truncate" style={{ color: textSecondary, fontSize: '12px' }}>
                            <Shield size={12} style={{ color: '#3B82F6', flexShrink: 0 }} />
                            {member.roleLabel}
                          </span>
                        </div>
                      </div>

                      {/* Contact Information — only real fields */}
                      <div className="d-flex flex-column gap-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                        <a
                          href={`mailto:${member.email}`}
                          className="d-flex align-items-center gap-2 text-truncate text-decoration-none"
                          style={{ color: textSecondary, fontSize: '12px' }}
                        >
                          <Mail size={13} style={{ flexShrink: 0 }} />
                          <span className="text-truncate">{member.email}</span>
                        </a>
                        {member.joined && (
                          <div className="d-flex align-items-center gap-2" style={{ color: textSecondary, fontSize: '12px' }}>
                            <Calendar size={13} style={{ flexShrink: 0 }} />
                            <span>Joined {member.joined}</span>
                          </div>
                        )}
                      </div>

                      {/* Status Footer — real is_active field */}
                      <div className="mt-auto d-flex justify-content-between align-items-center pt-2">
                        <span className="small" style={{ color: textSecondary, fontSize: '11px' }}>
                          Status
                        </span>
                        <div className="d-flex align-items-center gap-1">
                          {getVerificationBadge(member.isVerified)}
                          {getStatusBadge(member.isActive)}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ))}

              {filteredTeam.length === 0 && (
                <div className="col-12 text-center py-5">
                  <p className="small" style={{ color: textSecondary }}>
                    {teamMembers.length === 0 ? 'No team members yet.' : 'No team members match your search or filter.'}
                  </p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* INVITE MEMBER MODAL (admin only) */}
      {isAdmin && showInviteModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1050 }}
          onClick={() => !inviting && setShowInviteModal(false)}
        >
          <div
            className="rounded-4 p-4 w-100"
            style={{ maxWidth: '420px', backgroundColor: cardBg, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0" style={{ color: textPrimary }}>Invite Member</h5>
              <button className="btn btn-link p-0" style={{ color: textSecondary }} onClick={() => { setShowInviteModal(false); resetInviteForm(); }} disabled={inviting} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="small mb-3" style={{ color: textSecondary }}>
              This creates the account with the password you set below. Staff accounts get a verification email and can't sign in until they click the link — admin accounts (if you invite one) can sign in right away.
            </p>
            {inviteError && <div className="alert alert-danger py-2 px-3 small mb-3">{inviteError}</div>}
            <form onSubmit={handleInvite}>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Full name</label>
                <input
                  type="text" autoFocus value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                  className="form-control" disabled={inviting}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Email</label>
                <input
                  type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  className="form-control" disabled={inviting}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Temporary password</label>
                <input
                  type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)}
                  className="form-control" disabled={inviting} placeholder="At least 8 characters"
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Role</label>
                <select
                  value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                  className="form-select" disabled={inviting}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button" onClick={() => { setShowInviteModal(false); resetInviteForm(); }}
                  className="btn btn-sm border" disabled={inviting}
                  style={{ color: textPrimary, borderColor: borderColor, backgroundColor: cardBg }}
                >
                  Cancel
                </button>
                <button
                  type="submit" className="btn btn-sm text-white d-flex align-items-center gap-2"
                  style={{ backgroundColor: '#3B82F6' }}
                  disabled={inviting || !inviteName.trim() || !inviteEmail.trim() || invitePassword.length < 8}
                >
                  {inviting && <Loader2 size={14} className="spin" />}
                  {inviting ? 'Creating...' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE STAFF CONFIRMATION MODAL (admin only) */}
      {isAdmin && removeTarget && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1050 }}
          onClick={() => !removing && setRemoveTarget(null)}
        >
          <div
            className="rounded-4 p-4 w-100"
            style={{ maxWidth: '420px', backgroundColor: cardBg, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: textPrimary }}>
                <AlertTriangle size={18} style={{ color: '#EF4444' }} />
                Remove {removeTarget.name}?
              </h5>
              <button className="btn btn-link p-0" style={{ color: textSecondary }} onClick={() => setRemoveTarget(null)} disabled={removing} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="small mb-3" style={{ color: textSecondary }}>
              They'll immediately lose access to the portal — this ends any active session and blocks future sign-ins.
              Their task, document, and activity history stays intact.
            </p>
            {removeError && <div className="alert alert-danger py-2 px-3 small mb-3">{removeError}</div>}
            <div className="d-flex gap-2 justify-content-end">
              <button
                type="button" onClick={() => setRemoveTarget(null)}
                className="btn btn-sm border" disabled={removing}
                style={{ color: textPrimary, borderColor: borderColor, backgroundColor: cardBg }}
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleRemove}
                className="btn btn-sm text-white d-flex align-items-center gap-2"
                style={{ backgroundColor: '#EF4444' }}
                disabled={removing}
              >
                {removing && <Loader2 size={14} className="spin" />}
                {removing ? 'Removing...' : 'Remove staff member'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          .filter-dropdown-menu {
            width: min(92vw, 210px) !important;
            right: auto !important;
            left: 0 !important;
          }
          .filter-dropdown-menu button {
            font-size: 12px !important;
            padding: 8px 10px !important;
          }
        }

        button {
          transition: all 0.15s ease !important;
        }

        input:focus {
          outline: none !important;
        }

        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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