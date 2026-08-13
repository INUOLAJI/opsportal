import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle, Clock, AlertTriangle, ArrowRight, Plus, Filter, Menu, Bell,
  Search, Moon, Sun, MessageSquare, X, ChevronDown, LogOut, Check, Loader2
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { tasksService, activityService, usersService, getWebSocketUrl } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const STATUS_OPTIONS = ['All', 'Pending', 'In Progress', 'Overdue', 'Complete'];

// Matches Task.STATUS_CHOICES in models.py exactly: pending / in_progress / overdue / complete
const STATUS_TO_BACKEND = {
  'Pending': 'pending',
  'In Progress': 'in_progress',
  'Overdue': 'overdue',
  'Complete': 'complete',
};

function normalizeStatus(raw) {
  switch (raw) {
    case 'overdue': return { label: 'Overdue', color: '#EF4444' };
    case 'complete': return { label: 'Complete', color: '#10B981' };
    case 'pending': return { label: 'Pending', color: '#64748B' };
    case 'in_progress':
    default:
      return { label: 'In Progress', color: '#F59E0B' };
  }
}

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
  return `${days}d ago`;
}

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#10B981'];
function colorForString(str) {
  const s = String(str || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function mapTask(t) {
  const { label, color } = normalizeStatus(t.status);
  return {
    id: t.id,
    title: t.title,
    tag: t.tag || 'General',
    assignee: t.assignee,
    assigneeInitials: t.assignee_initials || (t.assignee_name ? t.assignee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '—'),
    status: label,
    statusColor: color,
    rawStatus: t.status,
    priority: t.priority || 'medium',
    completionRequested: !!t.completion_requested,
    dueDate: t.due_date || null,
  };
}

function mapActivity(a) {
  return {
    id: a.id,
    name: a.user_name || 'Someone',
    initials: a.user_initials || (a.user_name ? a.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'),
    action: a.action,
    time: formatRelativeTime(a.created_at),
    avatarBg: colorForString(a.user_name || a.user),
    statusColor: colorForString(a.action),
    isRead: !!a.is_read,
  };
}

export default function OperationsDashboard() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 576 : false
  );

  // Task queue state — backed by the API
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  // Create task modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTag, setNewTaskTag] = useState('Backend');
  const [creatingTask, setCreatingTask] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamUsersLoading, setTeamUsersLoading] = useState(false);
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [requestingCompletionId, setRequestingCompletionId] = useState(null);
  const [requestCompletionError, setRequestCompletionError] = useState(null);

  // Notifications / activity feed — backed by the API. Read state is now
  // real (persisted server-side via ActivityLog.read_by), not local-only.
  const [notifications, setNotifications] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Profile dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const filterRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const queueRef = useRef(null);
  const wsRef = useRef(null);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await tasksService.getAll();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setTasks(list.map(mapTask));
    } catch (err) {
      setTasksError('Could not load tasks. Check your connection and try again.');
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const data = await activityService.getAll();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setNotifications(list.map(mapActivity));
    } catch (err) {
      setActivityError('Could not load activity.');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadActivity();
  }, [loadTasks, loadActivity]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 576);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time updates over WebSocket — no more reloading to see new/updated
  // tasks or activity. Reconnects automatically if the connection drops.
  useEffect(() => {
    let socket;
    let reconnectTimer;
    let stopped = false;

    function connect() {
      socket = new WebSocket(getWebSocketUrl());
      wsRef.current = socket;

      socket.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }

        if (payload.type === 'task_created') {
          const mapped = mapTask(payload.task);
          setTasks(prev => (prev.some(t => t.id === mapped.id) ? prev : [mapped, ...prev]));
        } else if (payload.type === 'task_updated') {
          const mapped = mapTask(payload.task);
          setTasks(prev => {
            const exists = prev.some(t => t.id === mapped.id);
            return exists ? prev.map(t => (t.id === mapped.id ? mapped : t)) : [mapped, ...prev];
          });
          setSelectedTask(prev => (prev && prev.id === mapped.id ? mapped : prev));
        } else if (payload.type === 'activity_created') {
          const mapped = mapActivity(payload.activity);
          setNotifications(prev => (prev.some(n => n.id === mapped.id) ? prev : [mapped, ...prev]));
        }
      };

      socket.onclose = () => {
        if (!stopped) reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email ? user.email[0].toUpperCase() : 'U');

  const userName = user?.full_name || user?.email || 'User';
  const isAdmin = user?.role === 'admin';
  const userRole = isAdmin ? 'Operations Admin' : 'Staff Member';

  const loadTeamUsers = useCallback(async () => {
    setTeamUsersLoading(true);
    try {
      const data = await usersService.getAll();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setTeamUsers(list);
    } catch (err) {
      setTeamUsers([]);
    } finally {
      setTeamUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && showCreateModal && teamUsers.length === 0 && !teamUsersLoading) {
      loadTeamUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, showCreateModal]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));
  const unreadCount = visibleNotifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    // Optimistic update so the UI feels instant; reconciled against the
    // server response (or rolled back on failure).
    const previous = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await activityService.markAllRead();
    } catch (err) {
      setNotifications(previous);
      setActivityError('Could not mark notifications as read. Please try again.');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDismissNotification = (id) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const handleSignOut = () => {
    setShowProfileMenu(false);
    logout();
    window.location.href = '/signin';
  };

  const handleViewBoard = (e) => {
    e.preventDefault();
    queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskAssignee) return;
    setCreatingTask(true);
    setCreateError(null);
    try {
      const payload = {
        title: newTaskTitle.trim(),
        tag: newTaskTag,
        status: 'pending',
        priority: newTaskPriority,
        assignee: Number(newTaskAssignee),
      };
      if (newTaskDueDate) payload.due_date = newTaskDueDate;
      const created = await tasksService.create(payload);
      setTasks(prev => [mapTask(created), ...prev]);
      setNewTaskTitle('');
      setNewTaskTag('Backend');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      setNewTaskPriority('medium');
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err.message || 'Could not create the task. Please try again.');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleMarkComplete = async (id) => {
    setCompletingId(id);
    try {
      const updated = await tasksService.update(id, { status: STATUS_TO_BACKEND['Complete'] });
      const mapped = mapTask(updated);
      setTasks(prev => prev.map(t => t.id === id ? mapped : t));
      setSelectedTask(prev => (prev && prev.id === id ? mapped : prev));
    } catch (err) {
      setTasksError('Could not update that task. Please try again.');
    } finally {
      setCompletingId(null);
    }
  };

  const handleRequestCompletion = async (id) => {
    setRequestingCompletionId(id);
    setRequestCompletionError(null);
    try {
      const updated = await tasksService.requestCompletion(id);
      const mapped = mapTask(updated);
      setTasks(prev => prev.map(t => t.id === id ? mapped : t));
      setSelectedTask(prev => (prev && prev.id === id ? mapped : prev));
    } catch (err) {
      setRequestCompletionError(err.message || 'Could not notify the administrator. Please try again.');
    } finally {
      setRequestingCompletionId(null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const taskMetrics = [
    { id: 1, label: 'Tasks Completed', value: String(tasks.filter(t => t.status === 'Complete').length), icon: <CheckCircle className="text-success" size={20} />, bgColor: 'rgba(16, 185, 129, 0.1)' },
    { id: 2, label: 'Pending Items', value: String(tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length), icon: <Clock className="text-warning" size={20} />, bgColor: 'rgba(245, 158, 11, 0.1)' },
    { id: 3, label: 'Urgent Alerts', value: String(tasks.filter(t => t.priority === 'urgent' && t.status !== 'Complete').length), icon: <AlertTriangle className="text-danger" size={20} />, bgColor: 'rgba(239, 68, 68, 0.1)' },
  ];

  // Real progress data for the overview card — derived from actual tasks
  // instead of the hardcoded "Core Deployment Phase 65%" placeholder.
  const totalTaskCount = tasks.length;
  const completedTaskCount = tasks.filter(t => t.status === 'Complete').length;
  const completionPercent = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
  const overdueTasksList = tasks.filter(t => t.status === 'Overdue');
  const awaitingReviewCount = tasks.filter(t => t.completionRequested && t.status !== 'Complete').length;

  // Sort open (non-complete) tasks by due date — undated tasks sort last,
  // since there's nothing to prioritize them by.
  const byDueDate = (a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  };
  const openTasksSorted = tasks
    .filter(t => t.status !== 'Complete')
    .sort(byDueDate);

  // Most urgent: earliest-due overdue task if any exist, otherwise the
  // earliest-due open task of any status.
  const mostUrgentTask = overdueTasksList.slice().sort(byDueDate)[0] || openTasksSorted[0] || null;
  const nextUpTask = openTasksSorted.find(t => t.id !== mostUrgentTask?.id) || null;

  const bgColor = darkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = darkMode ? '#1E293B' : '#FFFFFF';
  const textPrimary = darkMode ? '#F1F5F9' : '#0F172A';
  const textSecondary = darkMode ? '#CBD5E1' : '#64748B';
  const borderColor = darkMode ? '#334155' : '#E2E8F0';

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
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
      />

      {/* MAIN VIEWPORT LAYOUT WRAPPER */}
      <div
        className="flex-grow-1 d-flex flex-column min-w-0"
        id="main-content-wrapper"
        style={{ transition: 'margin-left 0.2s ease-in-out' }}
      >

        {/* TOP RESPONSIVE NAVBAR */}
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
                aria-label="Toggle sidebar"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Menu size={20} />
              </button>

              {/* Enhanced Search Input */}
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
                  placeholder="Search operational logs..."
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

            {/* Right Nav Profiling & Notifications */}
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
              <div className="position-relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(prev => !prev)}
                  className="btn position-relative p-2 rounded-circle border-0"
                  style={{
                    transition: 'all 0.15s ease',
                    backgroundColor: showNotifications ? (darkMode ? '#334155' : '#F1F5F9') : 'transparent',
                    color: showNotifications ? textPrimary : textSecondary
                  }}
                  aria-label="View notifications"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9';
                    e.currentTarget.style.color = textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = showNotifications ? (darkMode ? '#334155' : '#F1F5F9') : 'transparent';
                    e.currentTarget.style.color = showNotifications ? textPrimary : textSecondary;
                  }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
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
                  )}
                </button>

                {showNotifications && (
                  <div
                    className="position-absolute rounded-3 overflow-hidden"
                    style={{
                      top: '46px',
                      right: 0,
                      width: '300px',
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      zIndex: 1040
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center p-3" style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <span className="fw-bold small" style={{ color: textPrimary }}>Notifications</span>
                      <button
                        onClick={handleMarkAllRead}
                        disabled={markingAllRead || unreadCount === 0}
                        className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-1"
                        style={{ fontSize: '11px', color: '#3B82F6', opacity: unreadCount === 0 ? 0.5 : 1 }}
                      >
                        {markingAllRead && <Loader2 size={12} className="spin" />}
                        Mark all read
                      </button>
                    </div>
                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      {activityLoading && (
                        <p className="text-center small p-3 mb-0 d-flex align-items-center justify-content-center gap-2" style={{ color: textSecondary }}>
                          <Loader2 size={14} className="spin" /> Loading...
                        </p>
                      )}
                      {activityError && !activityLoading && (
                        <p className="text-center small p-3 mb-0" style={{ color: '#EF4444' }}>{activityError}</p>
                      )}
                      {!activityLoading && !activityError && visibleNotifications.length === 0 && (
                        <p className="text-center small p-3 mb-0" style={{ color: textSecondary }}>You're all caught up.</p>
                      )}
                      {visibleNotifications.map(n => (
                        <div
                          key={n.id}
                          className="d-flex gap-2 align-items-start p-2 px-3"
                          style={{
                            backgroundColor: n.isRead ? 'transparent' : (darkMode ? '#1E293B' : '#EFF6FF'),
                            borderBottom: `1px solid ${borderColor}`
                          }}
                        >
                          <div
                            className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                            style={{ width: '28px', height: '28px', backgroundColor: n.avatarBg, fontSize: '10px' }}
                          >
                            {n.initials}
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <p className="mb-0" style={{ fontSize: '12px', color: textPrimary }}>
                              <span className="fw-bold">{n.name}</span>{' '}
                              <span style={{ color: textSecondary }}>{n.action}</span>
                            </p>
                            <span style={{ fontSize: '10px', color: textSecondary }}>{n.time}</span>
                          </div>
                          <button
                            onClick={() => handleDismissNotification(n.id)}
                            className="btn btn-link p-0 flex-shrink-0"
                            style={{ color: textSecondary }}
                            aria-label="Dismiss notification"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                className="vr opacity-25 my-auto"
                style={{
                  height: '24px',
                  backgroundColor: borderColor
                }}
              ></div>

              {/* User Profile */}
              <div className="position-relative" ref={profileRef}>
                <div
                  className="d-flex align-items-center gap-2 ps-1"
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                  onClick={() => setShowProfileMenu(prev => !prev)}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <div
                    className="rounded-circle text-white d-flex align-items-center justify-content-center font-semibold flex-shrink-0"
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
                  <ChevronDown size={14} className="d-none d-sm-block" style={{ color: textSecondary }} />
                </div>

                {showProfileMenu && (
                  <div
                    className="position-absolute rounded-3 overflow-hidden"
                    style={{
                      top: '48px',
                      right: 0,
                      width: '180px',
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      zIndex: 1040
                    }}
                  >
                    <button
                      onClick={handleSignOut}
                      className="btn w-100 d-flex align-items-center gap-2 rounded-0 border-0 px-3 py-2"
                      style={{ color: '#EF4444', fontSize: '13px', textAlign: 'left' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </header>

        {/* PORTAL BODY CONTAINER */}
        <main className="p-3 p-md-4 flex-grow-1" style={{ paddingTop: 'calc(64px + 1.5rem)' }}>

          {/* HEADER ACTIONS */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3 mb-4 mt-5">
            <div>
              <h1 className="h3 fw-bold mb-1" style={{ color: textPrimary }}>Operations Dashboard</h1>
              <p className="small mb-0" style={{ color: textSecondary }}>Real-time performance metrics and active workflows.</p>
            </div>
            <div className="d-flex gap-2 w-100 w-sm-auto justify-content-sm-end">
              <div className="position-relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilterMenu(prev => !prev)}
                  className="btn btn-sm border d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0 header-action-btn"
                  style={{
                    backgroundColor: showFilterMenu ? (darkMode ? '#334155' : '#F1F5F9') : cardBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    transition: 'all 0.15s ease',
                    minHeight: isMobileView ? '34px' : undefined,
                    padding: isMobileView ? '7px 10px' : undefined,
                    fontSize: isMobileView ? '11px' : undefined,
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = showFilterMenu ? (darkMode ? '#334155' : '#F1F5F9') : cardBg;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Filter size={14} />
                  Filter{filterStatus !== 'All' ? `: ${filterStatus}` : ''}
                </button>

                {showFilterMenu && (
                  <div
                    className="position-absolute rounded-3 overflow-hidden filter-dropdown-menu"
                    style={{
                      top: '42px',
                      right: isMobileView ? 'auto' : '0',
                      left: isMobileView ? '0' : undefined,
                      width: isMobileView ? 'min(92vw, 210px)' : '170px',
                      maxWidth: isMobileView ? 'calc(100vw - 16px)' : '170px',
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      zIndex: 1040
                    }}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setFilterStatus(opt); setShowFilterMenu(false); }}
                        className="btn w-100 d-flex align-items-center justify-content-between rounded-0 border-0 px-3 py-2"
                        style={{ fontSize: '13px', color: textPrimary, textAlign: 'left' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt}
                        {filterStatus === opt && <Check size={14} color="#3B82F6" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-sm text-white d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0 header-action-btn"
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
                  Create Task
                </button>
              )}
            </div>
          </div>

          {tasksError && (
            <div className="alert alert-danger py-2 px-3 small d-flex justify-content-between align-items-center mb-3" role="alert">
              {tasksError}
              <button className="btn btn-sm btn-link p-0 text-decoration-underline" onClick={loadTasks}>Retry</button>
            </div>
          )}

          {/* KPI METRIC CARDS */}
          <div className="row g-3 mb-4">
            {taskMetrics.map((metric) => (
              <div
                key={metric.id}
                className="col-12 col-sm-6 col-md-4"
                style={isMobileView ? { width: '100%', maxWidth: '100%', flex: '0 0 100%' } : undefined}
              >
                <div
                  className="card border-0 h-100 kpi-card"
                  style={{
                    backgroundColor: cardBg,
                    color: textPrimary,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    width: isMobileView ? '100%' : undefined,
                    maxWidth: isMobileView ? '100%' : undefined
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
                  <div className="card-body d-flex justify-content-between align-items-start p-3 p-md-4 kpi-card-body">
                    <div>
                      <p
                        className="text-uppercase fw-bold small mb-1"
                        style={{
                          letterSpacing: '0.05em',
                          fontSize: '11px',
                          color: textSecondary
                        }}
                      >
                        {metric.label}
                      </p>
                      <h3 className="fw-bold mb-0 kpi-value" style={{ color: textPrimary, fontSize: '28px' }}>
                        {tasksLoading ? '—' : metric.value}
                      </h3>
                    </div>
                    <div
                      className="rounded-3 p-2.5 d-flex align-items-center justify-content-center kpi-icon-wrap"
                      style={{
                        backgroundColor: metric.bgColor,
                        width: '48px',
                        height: '48px'
                      }}
                    >
                      {metric.icon}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* MAIN GRID BLOCK */}
          <div className="row g-3 g-md-4">

            {/* LEFT GRID PANELS */}
            <div className="col-12 col-lg-8">

              {/* ACTIVE PROGRESS TRACKER */}
              <div
                className="card mb-3 mb-md-4 border-0 compact-card"
                style={{
                  backgroundColor: cardBg,
                  color: textPrimary,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  width: isMobileView ? '100%' : undefined,
                  maxWidth: isMobileView ? '100%' : undefined
                }}
              >
                <div className="card-body p-3 p-md-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title fw-bold mb-0" style={{ color: textPrimary, fontSize: '15px' }}>
                      Active Process Management
                    </h5>
                    {totalTaskCount === 0 ? (
                      <span
                        className="badge fw-semibold"
                        style={{ backgroundColor: 'rgba(100, 116, 139, 0.12)', color: textSecondary, fontSize: '10px', padding: '4px 8px' }}
                      >
                        No tasks yet
                      </span>
                    ) : overdueTasksList.length > 0 ? (
                      <span
                        className="badge fw-semibold"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '10px', padding: '4px 8px' }}
                      >
                        {overdueTasksList.length} Overdue
                      </span>
                    ) : awaitingReviewCount > 0 ? (
                      <span
                        className="badge fw-semibold"
                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontSize: '10px', padding: '4px 8px' }}
                      >
                        {awaitingReviewCount} Awaiting Review
                      </span>
                    ) : (
                      <span
                        className="badge fw-semibold"
                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: '10px', padding: '4px 8px' }}
                      >
                        All Caught Up
                      </span>
                    )}
                  </div>

                  <div className="d-flex flex-column gap-3">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="d-flex align-items-center gap-2 small fw-medium text-truncate">
                          <span
                            className="rounded-circle d-inline-block flex-shrink-0"
                            style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#3B82F6'
                            }}
                          ></span>
                          Task Completion
                        </span>
                        <span className="fw-bold small ms-2 flex-shrink-0">{completionPercent}%</span>
                      </div>
                      <div
                        className="progress rounded-pill overflow-hidden"
                        style={{ height: '8px', backgroundColor: darkMode ? '#334155' : '#E2E8F0' }}
                      >
                        <div
                          className="progress-bar rounded-pill"
                          role="progressbar"
                          style={{
                            width: `${completionPercent}%`,
                            background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
                            transition: 'width 0.3s ease'
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="row g-2 pt-2" style={{ borderTop: `1px solid ${borderColor}` }}>
                      <div className="col-6">
                        <p className="fw-bold mb-1" style={{ fontSize: '10px', color: textSecondary }}>
                          MOST URGENT
                        </p>
                        <p className="fw-semibold mb-0 text-truncate" style={{ fontSize: '13px', color: textPrimary }}>
                          {mostUrgentTask ? mostUrgentTask.title : 'Nothing urgent'}
                        </p>
                      </div>
                      <div className="col-6">
                        <p className="fw-bold mb-1" style={{ fontSize: '10px', color: textSecondary }}>
                          NEXT UP
                        </p>
                        <p className="fw-semibold mb-0 text-truncate" style={{ fontSize: '13px', color: textPrimary }}>
                          {nextUpTask ? nextUpTask.title : 'Nothing scheduled'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HIGH PRIORITY TASK QUEUE */}
              <div
                ref={queueRef}
                className="card border-0 overflow-hidden compact-card"
                style={{
                  backgroundColor: cardBg,
                  color: textPrimary,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  width: isMobileView ? '100%' : undefined,
                  maxWidth: isMobileView ? '100%' : undefined
                }}
              >
                <div
                  className="card-header d-flex justify-content-between align-items-center py-3 border-bottom"
                  style={{
                    backgroundColor: cardBg,
                    color: textPrimary,
                    borderColor: borderColor
                  }}
                >
                  <h5 className="card-title fw-bold mb-0" style={{ color: textPrimary, fontSize: '15px' }}>
                    High Priority Queue
                  </h5>
                  <a
                    href="#queue"
                    onClick={handleViewBoard}
                    className="text-decoration-none small fw-bold d-flex align-items-center gap-1"
                    style={{
                      color: '#3B82F6',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    View Board <ArrowRight size={12} />
                  </a>
                </div>
                <div className="card-body p-0">
                  {tasksLoading && (
                    <p className="text-center small p-4 mb-0 d-flex align-items-center justify-content-center gap-2" style={{ color: textSecondary }}>
                      <Loader2 size={14} className="spin" /> Loading tasks...
                    </p>
                  )}
                  {!tasksLoading && filteredTasks.length === 0 && (
                    <p className="text-center small p-4 mb-0" style={{ color: textSecondary }}>
                      No tasks match your search or filter.
                    </p>
                  )}
                  {!tasksLoading && filteredTasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      title={t.title}
                      tag={t.tag}
                      assignee={t.assigneeInitials}
                      status={t.status}
                      statusColor={t.statusColor}
                      borderLeftColor={t.statusColor}
                      priority={t.priority}
                      completionRequested={t.completionRequested}
                      darkMode={darkMode}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      borderColor={borderColor}
                      onClick={() => setSelectedTask(t)}
                    />
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT GRID PANELS */}
            <div className="col-12 col-lg-4">
              <div
                className="card border-0 h-100 compact-card"
                style={{
                  backgroundColor: cardBg,
                  color: textPrimary,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  width: isMobileView ? '100%' : undefined,
                  maxWidth: isMobileView ? '100%' : undefined
                }}
              >
                <div className="card-body p-3 p-md-4">
                  <h5 className="card-title fw-bold mb-1" style={{ color: textPrimary, fontSize: '15px' }}>
                    Team Efficiency Feed
                  </h5>
                  <p className="small mb-3" style={{ color: textSecondary }}>
                    Live updates from your workspace
                  </p>

                  {activityLoading && (
                    <p className="text-center small py-3 mb-0 d-flex align-items-center justify-content-center gap-2" style={{ color: textSecondary }}>
                      <Loader2 size={14} className="spin" /> Loading...
                    </p>
                  )}
                  {activityError && !activityLoading && (
                    <p className="text-center small py-3 mb-0" style={{ color: '#EF4444' }}>{activityError}</p>
                  )}
                  {!activityLoading && !activityError && visibleNotifications.length === 0 && (
                    <p className="text-center small py-3 mb-0" style={{ color: textSecondary }}>No recent activity.</p>
                  )}

                  <div className="d-flex flex-column gap-2.5">
                    {visibleNotifications.map((activity) => (
                      <div
                        key={activity.id}
                        className="d-flex gap-2.5 align-items-start p-2 rounded-2"
                        style={{
                          transition: 'all 0.15s ease',
                          backgroundColor: 'transparent',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#F1F5F9';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0 mt-0.5">
                          <div
                            className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold text-nowrap"
                            style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: activity.avatarBg,
                              fontSize: '11px',
                              boxShadow: `0 2px 6px ${activity.avatarBg}40`,
                              flexShrink: 0
                            }}
                          >
                            {activity.initials}
                          </div>
                        </div>

                        {/* Activity Content (Wrapped safely) */}
                        <div className="flex-grow-1 min-w-0">
                          <p
                            className="mb-1"
                            style={{
                              fontSize: '12px',
                              color: textPrimary,
                              lineHeight: '1.35',
                              wordBreak: 'break-word'
                            }}
                          >
                            <span className="fw-bold">{activity.name}</span>
                            <span style={{ color: textSecondary }}> {activity.action}</span>
                          </p>
                          <div className="d-flex align-items-center gap-1.5">
                            <span
                              className="d-inline-block rounded-circle flex-shrink-0"
                              style={{
                                width: '6px',
                                height: '6px',
                                backgroundColor: activity.statusColor
                              }}
                            ></span>
                            <span className="d-block" style={{ fontSize: '11px', color: textSecondary }}>
                              {activity.time}
                            </span>
                          </div>
                        </div>

                        {/* Action Icon */}
                        <button
                          onClick={() => setShowNotifications(true)}
                          className="btn btn-link flex-shrink-0 mt-1 ms-1 p-0"
                          aria-label="Open notifications"
                        >
                          <MessageSquare
                            size={14}
                            style={{
                              color: textSecondary,
                              opacity: 0.5,
                              transition: 'all 0.15s ease'
                            }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>

      {/* CREATE TASK MODAL (admin only) */}
      {isAdmin && showCreateModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1050 }}
          onClick={() => !creatingTask && setShowCreateModal(false)}
        >
          <div
            className="rounded-4 p-4 w-100"
            style={{ maxWidth: '420px', backgroundColor: cardBg, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0" style={{ color: textPrimary }}>Create Task</h5>
              <button className="btn btn-link p-0" style={{ color: textSecondary }} onClick={() => setShowCreateModal(false)} aria-label="Close" disabled={creatingTask}>
                <X size={18} />
              </button>
            </div>
            {createError && (
              <div className="alert alert-danger py-2 px-3 small mb-3">{createError}</div>
            )}
            <form onSubmit={handleCreateTask}>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Task title</label>
                <input
                  type="text"
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Rotate API credentials"
                  className="form-control"
                  disabled={creatingTask}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Assign to</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="form-select"
                  disabled={creatingTask || teamUsersLoading}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                >
                  <option value="">
                    {teamUsersLoading ? 'Loading team...' : 'Select a team member'}
                  </option>
                  {teamUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email} {u.role ? `(${u.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Category</label>
                <select
                  value={newTaskTag}
                  onChange={(e) => setNewTaskTag(e.target.value)}
                  className="form-select"
                  disabled={creatingTask}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                >
                  <option>Backend</option>
                  <option>Security</option>
                  <option>UI/UX</option>
                  <option>Infrastructure</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="form-select"
                  disabled={creatingTask}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <p className="small mt-1 mb-0" style={{ color: textSecondary, fontSize: '11px' }}>
                  Urgent tasks count toward the "Urgent Alerts" card on the assignee's dashboard.
                </p>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Due date (optional)</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="form-control"
                  disabled={creatingTask}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                />
                <p className="small mt-1 mb-0" style={{ color: textSecondary, fontSize: '11px' }}>
                  Used to determine what shows as "Most Urgent" and "Next Up" on the dashboard.
                </p>
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setNewTaskAssignee(''); setNewTaskDueDate(''); setNewTaskPriority('medium'); }}
                  className="btn btn-sm border"
                  disabled={creatingTask}
                  style={{ color: textPrimary, borderColor: borderColor, backgroundColor: cardBg }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white d-flex align-items-center gap-2"
                  style={{ backgroundColor: '#3B82F6' }}
                  disabled={!newTaskTitle.trim() || !newTaskAssignee || creatingTask}
                >
                  {creatingTask && <Loader2 size={14} className="spin" />}
                  {creatingTask ? 'Creating...' : 'Create task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1050 }}
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="rounded-4 p-4 w-100"
            style={{ maxWidth: '420px', backgroundColor: cardBg, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h5 className="fw-bold mb-0" style={{ color: textPrimary }}>{selectedTask.title}</h5>
              <button className="btn btn-link p-0" style={{ color: textSecondary }} onClick={() => setSelectedTask(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="d-flex gap-2 mb-3">
              <span
                className="badge px-2 py-1 fw-semibold text-uppercase"
                style={{ fontSize: '9px', backgroundColor: darkMode ? '#334155' : '#F1F5F9', color: textSecondary }}
              >
                {selectedTask.tag}
              </span>
              <span
                className="badge px-2 py-1 fw-semibold"
                style={{ fontSize: '10px', backgroundColor: `${selectedTask.statusColor}20`, color: selectedTask.statusColor }}
              >
                {selectedTask.status}
              </span>
              {selectedTask.completionRequested && selectedTask.status !== 'Complete' && (
                <span
                  className="badge px-2 py-1 fw-semibold"
                  style={{ fontSize: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}
                >
                  Awaiting review
                </span>
              )}
            </div>
            <p className="small mb-3" style={{ color: textSecondary }}>
              Assigned to <span className="fw-bold" style={{ color: textPrimary }}>{selectedTask.assigneeInitials}</span>
              {selectedTask.dueDate && (
                <>
                  {' · Due '}
                  <span className="fw-bold" style={{ color: textPrimary }}>
                    {new Date(selectedTask.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
            </p>
            {requestCompletionError && (
              <div className="alert alert-danger py-2 px-3 small mb-3">{requestCompletionError}</div>
            )}
            <div className="d-flex gap-2 justify-content-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="btn btn-sm border"
                style={{ color: textPrimary, borderColor: borderColor, backgroundColor: cardBg }}
              >
                Close
              </button>

              {/* Admins confirm completion directly */}
              {isAdmin && selectedTask.status !== 'Complete' && (
                <button
                  onClick={() => handleMarkComplete(selectedTask.id)}
                  className="btn btn-sm text-white d-flex align-items-center gap-1"
                  style={{ backgroundColor: '#10B981' }}
                  disabled={completingId === selectedTask.id}
                >
                  {completingId === selectedTask.id ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  Mark complete
                </button>
              )}

              {/* Staff can only flag their task as done for admin review */}
              {!isAdmin && selectedTask.status !== 'Complete' && (
                <button
                  onClick={() => handleRequestCompletion(selectedTask.id)}
                  className="btn btn-sm text-white d-flex align-items-center gap-1"
                  style={{ backgroundColor: selectedTask.completionRequested ? '#94A3B8' : '#3B82F6' }}
                  disabled={requestingCompletionId === selectedTask.id || selectedTask.completionRequested}
                >
                  {requestingCompletionId === selectedTask.id ? <Loader2 size={14} className="spin" /> : <Bell size={14} />}
                  {selectedTask.completionRequested ? 'Admin notified' : 'Notify admin — task done'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESPONSIVE LAYOUT & ANIMATIONS */}
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

        /* Moderate/compact sizing on mobile — header buttons, KPI cards,
           the three main content cards, and the filter dropdown all felt
           oversized on small screens, so trim them down under 576px. */
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
            max-width: calc(100vw - 16px) !important;
            right: auto !important;
            left: 0 !important;
            transform: none !important;
          }
          .filter-dropdown-menu button {
            font-size: 12px !important;
            padding: 8px 10px !important;
          }

          .row.g-3 > [class*="col-"],
          .row.g-3.g-md-4 > [class*="col-"] {
            width: 100% !important;
            max-width: 100% !important;
            flex: 0 0 100% !important;
          }

          .kpi-card,
          .compact-card {
            width: 100% !important;
            max-width: 100% !important;
          }

          .kpi-card-body {
            padding: 12px !important;
          }
          .kpi-value {
            font-size: 18px !important;
          }
          .kpi-icon-wrap {
            width: 34px !important;
            height: 34px !important;
          }
          .kpi-icon-wrap svg {
            width: 14px !important;
            height: 14px !important;
          }

          .compact-card .card-body {
            padding: 12px !important;
          }
          .compact-card .card-header {
            padding: 10px 12px !important;
          }
          .compact-card .card-title {
            font-size: 13px !important;
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

        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Smooth Transitions */
        button {
          transition: all 0.15s ease !important;
        }

        a {
          transition: all 0.15s ease !important;
        }

        .card {
          transition: all 0.2s ease !important;
        }

        /* Input Focus Enhancement */
        input:focus {
          outline: none !important;
        }

        /* Better Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
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

function TaskRow({
  title,
  tag,
  assignee,
  status,
  statusColor,
  borderLeftColor,
  completionRequested,
  darkMode,
  textPrimary,
  textSecondary,
  borderColor,
  onClick
}) {
  const cardBg = darkMode ? '#1E293B' : '#FFFFFF';
  const hoverBg = darkMode ? '#334155' : '#F8FAFC';

  return (
    <div
      onClick={onClick}
      className="p-3 d-flex justify-content-between align-items-center gap-2"
      style={{
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${borderLeftColor}`,
        backgroundColor: cardBg,
        transition: 'all 0.15s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg;
        e.currentTarget.style.paddingLeft = 'calc(1rem + 2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = cardBg;
        e.currentTarget.style.paddingLeft = '1rem';
      }}
    >
      <div className="text-truncate min-w-0">
        <h6 className="mb-1 fw-bold text-truncate" style={{ fontSize: '13px', color: textPrimary }}>
          {title}
        </h6>
        <span
          className="badge px-2 py-1 fw-semibold text-uppercase"
          style={{
            fontSize: '9px',
            backgroundColor: darkMode ? '#334155' : '#F1F5F9',
            color: textSecondary
          }}
        >
          {tag}
        </span>
      </div>
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        {completionRequested && status !== 'Complete' && (
          <span
            title="Awaiting admin review"
            className="rounded-circle d-inline-block flex-shrink-0"
            style={{ width: '8px', height: '8px', backgroundColor: '#3B82F6' }}
          ></span>
        )}
        <span
          className="badge px-2 py-1 fw-semibold text-nowrap"
          style={{
            fontSize: '10px',
            backgroundColor: `${statusColor}20`,
            color: statusColor
          }}
        >
          {status}
        </span>
        <div
          className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-sm text-nowrap"
          style={{
            width: '28px',
            height: '28px',
            fontSize: '10px',
            backgroundColor: '#8B5CF6',
            boxShadow: '0 2px 6px rgba(139, 92, 246, 0.3)',
            flexShrink: 0
          }}
        >
          {assignee}
        </div>
      </div>
    </div>
  );
}