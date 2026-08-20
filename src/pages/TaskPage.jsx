import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, Filter, Search, MoreVertical, Calendar, CheckCircle2, Clock,
  AlertTriangle, X, Trash2, Pencil, Send, Loader2, Paperclip,
  Menu, Bell, Moon, Sun, ChevronDown, LogOut, Download
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { tasksService, usersService, activityService, getWebSocketUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'complete', label: 'Complete' },
];

// ];

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#10B981'];
function colorForString(str) {
  const s = String(str || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'No date';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// <input type="date"> needs a plain YYYY-MM-DD value, not a full ISO datetime.
function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
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

function mapTask(t) {
  return {
    id: t.id,
    title: t.title,
    tag: t.tag || 'General',
    status: t.status || 'pending',
    priority: t.priority || 'medium',
    dueDateRaw: t.due_date || null,
    date: formatDate(t.due_date),
    assigneeId: t.assignee ?? null,
    assigneeName: t.assignee_name || null,
    assignee: t.assignee_initials || '—',
    assignees: t.assignees_detail || [],
    completionRequested: !!t.completion_requested,
    attachments: t.attachments || [],
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
    isRead: !!a.is_read,
  };
}

// pending/overdue both live in the "To Do" lane; overdue gets a distinct
// red treatment on the card itself rather than its own column, so the
// 3-lane board stays intact.
function bucketOf(status) {
  if (status === 'in_progress') return 'in-progress';
  if (status === 'complete') return 'completed';
  return 'todo';
}

function TaskPage() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Auto-open create modal if passed from dashboard
  useEffect(() => {
    if (location.state?.openCreateModal) {
      setShowTicketModal(true);
      // Clean up the state to prevent re-opening on back/forward
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 576 : false
  );

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [users, setUsers] = useState([]);

  // Filter Lanes popover
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const filterRef = useRef(null);

  // Per-card kebab menu
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Create/Edit modal (admin only)
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ title: '', tag: '', assigneeIds: [], priority: 'medium', dueDate: '', status: 'pending' });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Attachment modal
  const [attachmentTask, setAttachmentTask] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachError, setAttachError] = useState(null);
  const attachInputRef = useRef(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Request-completion (staff)
  const [requestingId, setRequestingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Notifications / activity feed
  const [notifications, setNotifications] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Profile dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  const wsRef = useRef(null);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setLoadError(null);
    try {
      const data = await tasksService.getAll();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setTasks(list.map(mapTask));
    } catch (err) {
      setLoadError('Could not reach the server. Please check your connection.');
      setTasks([]);
    } finally {
      setLoadingTasks(false);
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
    setTasks([]);
    setNotifications([]);
    loadTasks();
    loadActivity();
  }, [user?.id, loadTasks, loadActivity]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 576);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const data = await usersService.getAll('staff');
        let allUsers = Array.isArray(data) ? data : (data?.results || []);
        
        // Filter users to strictly only show those from the same company
        const userCompanyId = user?.company_id || user?.company;
        if (userCompanyId) {
          allUsers = allUsers.filter(u => (u.company_id === userCompanyId || u.company === userCompanyId));
        }

        setUsers(allUsers);
      } catch (err) {
        // Non-fatal — the assignee dropdown just falls back to unassigned.
      }
    })();
  }, [isAdmin, user?.company_id, user?.company]);

  // Real-time updates over WebSocket — new/updated tasks and activity land
  // without a manual refresh. Reconnects automatically if the connection drops.
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

  // Close popovers/dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterMenu(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
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
  const userRole = isAdmin ? 'Operations Admin' : 'Staff Member';

  const togglePriorityFilter = (value) => {
    setSelectedPriorities(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    );
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = selectedPriorities.length === 0 || selectedPriorities.includes(t.priority);
    return matchesSearch && matchesPriority;
  });

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));
  const unreadCount = visibleNotifications.filter(n => !n.isRead).length;

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent': return <span className="badge bg-danger bg-opacity-10 text-danger px-2 py-1" style={{ fontSize: '11px' }}>Urgent</span>;
      case 'high': return <span className="badge bg-warning bg-opacity-10 px-2 py-1" style={{ fontSize: '11px', color: '#D97706' }}>High Priority</span>;
      case 'low': return <span className="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1" style={{ fontSize: '11px' }}>Low</span>;
      default: return <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1" style={{ fontSize: '11px' }}>Medium</span>;
    }
  };

  // --- Create / Edit ---------------------------------------------------

  const openCreateModal = () => {
    setEditingTask(null);
    setForm({ title: '', tag: '', assigneeIds: [], priority: 'medium', dueDate: '', status: 'pending' });
    setFormError(null);
    setShowTicketModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      tag: task.tag === 'General' ? '' : task.tag,
      assigneeIds: task.assignees.map(a => a.id),
      priority: task.priority,
      dueDate: toDateInputValue(task.dueDateRaw),
      status: task.status,
    });
    setFormError(null);
    setShowTicketModal(true);
    setOpenMenuId(null);
  };

  const closeTicketModal = () => {
    if (submitting) return;
    setShowTicketModal(false);
    setEditingTask(null);
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Give the task a title.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      tag: form.tag.trim(),
      assignees: form.assigneeIds,
      priority: form.priority,
      due_date: form.dueDate || null,
      status: form.status,
    };
    try {
      if (editingTask) {
        const updated = await tasksService.update(editingTask.id, payload);
        setTasks(prev => prev.map(t => (t.id === editingTask.id ? mapTask(updated) : t)));
      } else {
        const created = await tasksService.create(payload);
        setTasks(prev => [mapTask(created), ...prev]);
      }
      setShowTicketModal(false);
      setEditingTask(null);
    } catch (err) {
      setFormError(err.message || 'Could not save the task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (id) => {
    setForm(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(id)
        ? prev.assigneeIds.filter(x => x !== id)
        : [...prev.assigneeIds, id],
    }));
  };

  // --- Attachments ---
  const openAttachmentModal = (task) => {
    setAttachmentTask(task);
    setAttachError(null);
    setOpenMenuId(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !attachmentTask) return;
    setUploadingFile(true);
    setAttachError(null);
    try {
      const att = await tasksService.uploadAttachment(attachmentTask.id, file);
      setTasks(prev => prev.map(t =>
        t.id === attachmentTask.id
          ? { ...t, attachments: [...t.attachments, att] }
          : t
      ));
      setAttachmentTask(prev => ({ ...prev, attachments: [...prev.attachments, att] }));
    } catch (err) {
      setAttachError(err.message || 'Upload failed.');
    } finally {
      setUploadingFile(false);
      if (attachInputRef.current) attachInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!attachmentTask) return;
    try {
      await tasksService.deleteAttachment(attachmentTask.id, attId);
      const updated = attachmentTask.attachments.filter(a => a.id !== attId);
      setTasks(prev => prev.map(t =>
        t.id === attachmentTask.id ? { ...t, attachments: updated } : t
      ));
      setAttachmentTask(prev => ({ ...prev, attachments: updated }));
    } catch (err) {
      setAttachError(err.message || 'Could not delete attachment.');
    }
  };

  // --- Quick status change (admin) -------------------------------------

  const handleStatusChange = async (task, newStatus) => {
    setOpenMenuId(null);
    if (newStatus === task.status) return;
    setActionError(null);
    try {
      const updated = await tasksService.update(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => (t.id === task.id ? mapTask(updated) : t)));
    } catch (err) {
      setActionError(err.message || 'Could not update the task status.');
    }
  };

  // --- Delete ------------------------------------------------------------

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await tasksService.delete(confirmDeleteId);
      setTasks(prev => prev.filter(t => t.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err) {
      setActionError(err.message || 'Could not delete the task.');
    } finally {
      setDeleting(false);
    }
  };

  // --- Request completion (staff) -----------------------------------------

  const handleRequestCompletion = async (task) => {
    setOpenMenuId(null);
    setRequestingId(task.id);
    setActionError(null);
    try {
      const updated = await tasksService.requestCompletion(task.id);
      setTasks(prev => prev.map(t => (t.id === task.id ? mapTask(updated) : t)));
    } catch (err) {
      setActionError(err.message || 'Could not request a completion review.');
    } finally {
      setRequestingId(null);
    }
  };

  // --- Notifications -------------------------------------------------------

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
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

  // --- Theme ---------------------------------------------------------------

  const bgColor = darkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = darkMode ? '#1E293B' : '#FFFFFF';
  const textPrimary = darkMode ? '#F1F5F9' : '#0F172A';
  const textSecondary = darkMode ? '#CBD5E1' : '#64748B';
  const borderColor = darkMode ? '#334155' : '#E2E8F0';
  const inputBg = darkMode ? '#334155' : '#F8FAFC';

  // --- Card renderer ----------------------------------------------------

  const avatarColorFor = (bucket) => {
    if (bucket === 'in-progress') return '#3B82F6';
    if (bucket === 'completed') return '#10B981';
    return '#8B5CF6';
  };

  const renderCard = (task) => {
    const bucket = bucketOf(task.status);
    const isOverdue = task.status === 'overdue';
    const isComplete = task.status === 'complete';
    const canManage = isAdmin;
    const canRequestCompletion = !isAdmin && !isComplete && !task.completionRequested;

    return (
      <div
        key={task.id}
        className="card border-0 shadow-sm p-3 rounded-3 hover-card transition-all"
        style={{
          backgroundColor: cardBg,
          opacity: isComplete ? 0.85 : 1,
          borderLeft: isOverdue ? '3px solid #DC2626' : (bucket === 'in-progress' ? `3px solid ${avatarColorFor(bucket)}` : 'none'),
        }}
      >
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <span className="badge border uppercase px-2 py-0.5" style={{ fontSize: '10px', backgroundColor: darkMode ? '#334155' : '#F1F5F9', color: textSecondary, borderColor: borderColor }}>{task.tag}</span>
          <div className="position-relative">
            <button
              className="btn p-0 border-0 bg-transparent"
              style={{ color: textSecondary }}
              onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
            >
              <MoreVertical size={14} />
            </button>
            {openMenuId === task.id && (
              <div
                ref={menuRef}
                className="position-absolute shadow rounded-3 border p-1 admin-actions-menu"
                style={{ right: 0, top: '20px', minWidth: '190px', zIndex: 20, backgroundColor: cardBg, borderColor: borderColor }}
              >
                {canManage && (
                  <>
                    <button className="btn btn-sm w-100 text-start d-flex align-items-center gap-2 px-2 py-1" style={{ color: textPrimary }} onClick={() => openEditModal(task)}>
                      <Pencil size={13} /> Edit task
                    </button>
                    <button className="btn btn-sm w-100 text-start d-flex align-items-center gap-2 px-2 py-1" style={{ color: textPrimary }} onClick={() => openAttachmentModal(task)}>
                      <Paperclip size={13} /> Attachments {task.attachments.length > 0 && `(${task.attachments.length})`}
                    </button>
                    <div className="px-2 py-1 small" style={{ fontSize: '10px', color: textSecondary }}>MOVE TO</div>
                    {STATUS_OPTIONS.filter(s => s.value !== task.status).map(s => (
                      <button
                        key={s.value}
                        className="btn btn-sm w-100 text-start px-2 py-1"
                        style={{ color: textPrimary }}
                        onClick={() => handleStatusChange(task, s.value)}
                      >
                        {s.label}
                      </button>
                    ))}
                    <hr className="my-1" style={{ borderColor: borderColor }} />
                    <button
                      className="btn btn-sm w-100 text-start d-flex align-items-center gap-2 px-2 py-1 text-danger"
                      onClick={() => { setOpenMenuId(null); setConfirmDeleteId(task.id); }}
                    >
                      <Trash2 size={13} /> Delete task
                    </button>
                  </>
                )}
                {canRequestCompletion && (
                  <button
                    className="btn btn-sm w-100 text-start d-flex align-items-center gap-2 px-2 py-1"
                    style={{ color: textPrimary }}
                    onClick={() => handleRequestCompletion(task)}
                    disabled={requestingId === task.id}
                  >
                    {requestingId === task.id ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                    Request completion review
                  </button>
                )}
                {!isAdmin && (
                  <button className="btn btn-sm w-100 text-start d-flex align-items-center gap-2 px-2 py-1" style={{ color: textPrimary }} onClick={() => openAttachmentModal(task)}>
                    <Paperclip size={13} /> Attachments {task.attachments.length > 0 && `(${task.attachments.length})`}
                  </button>
                )}
                {!canManage && !canRequestCompletion && (
                  <div className="px-2 py-1 small" style={{ color: textSecondary }}>No actions available</div>
                )}
              </div>
            )}
          </div>
        </div>

        <h6 className="fw-semibold mb-3 lh-sm" style={{ fontSize: '13.5px', color: isComplete ? textSecondary : textPrimary, textDecoration: isComplete ? 'line-through' : 'none' }}>
          {task.title}
        </h6>

        {task.completionRequested && !isComplete && (
          <div className="d-flex align-items-center gap-1 text-primary small fw-semibold mb-2" style={{ fontSize: '11px' }}>
            <Send size={12} /> Review requested
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center pt-2" style={{ borderTop: `1px solid ${borderColor}` }}>
          <div className={`d-flex align-items-center gap-1 small ${isOverdue ? 'text-danger fw-semibold' : ''}`} style={{ fontSize: '11px', color: isOverdue ? undefined : textSecondary }}>
            {isOverdue ? <AlertTriangle size={12} /> : (bucket === 'in-progress' ? <Clock size={12} /> : <Calendar size={12} />)}
            {isOverdue ? `Overdue · ${task.date}` : task.date}
            {task.attachments.length > 0 && (
              <span className="ms-1 d-flex align-items-center gap-1" style={{ color: textSecondary }}>
                <Paperclip size={11} />{task.attachments.length}
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-1">
            {isComplete ? (
              <span className="text-success d-flex align-items-center gap-1 small fw-semibold" style={{ fontSize: '11px' }}>
                <CheckCircle2 size={12} /> Verified
              </span>
            ) : getPriorityBadge(task.priority)}
            <div className="d-flex ms-1">
              {task.assignees.length > 0
                ? task.assignees.slice(0, 3).map((a, i) => (
                    <div
                      key={a.id}
                      className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: '24px', height: '24px', fontSize: '9px', backgroundColor: colorForString(a.full_name), marginLeft: i > 0 ? '-6px' : 0, border: `2px solid ${cardBg}` }}
                      title={a.full_name}
                    >{a.initials}</div>
                  ))
                : <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '24px', height: '24px', fontSize: '9px', backgroundColor: avatarColorFor(bucket) }} title="Unassigned">—</div>
              }
            </div>
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    { key: 'todo', label: 'Backlog / To Do', dotColor: '#64748B', tint: 'rgba(100, 116, 139, 0.15)' },
    { key: 'in-progress', label: 'In Active Progress', dotColor: '#3B82F6', tint: 'rgba(59, 130, 246, 0.15)' },
    { key: 'completed', label: 'Done / Closed', dotColor: '#10B981', tint: 'rgba(16, 185, 129, 0.15)' },
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
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        onToggleSidebar={handleToggleSidebar}
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
                style={{ color: textPrimary, transition: 'all 0.15s ease' }}
                aria-label="Toggle sidebar"
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
                  placeholder="Search across active tasks and backlogs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control form-control-sm border-0 ps-5 rounded-3"
                  style={{
                    width: '260px',
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
                style={{ transition: 'all 0.15s ease', backgroundColor: darkMode ? '#334155' : '#F1F5F9', color: textPrimary }}
                aria-label="Toggle dark mode"
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
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span
                      className="position-absolute rounded-circle"
                      style={{
                        top: '6px', right: '6px', width: '8px', height: '8px',
                        backgroundColor: '#EF4444', boxShadow: '0 0 0 2px ' + cardBg, animation: 'pulse 2s infinite'
                      }}
                    ></span>
                  )}
                </button>

                {showNotifications && (
                  <div
                    className="position-absolute rounded-3 overflow-hidden"
                    style={{
                      top: '46px', right: 0, width: '300px', backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 1040
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

              <div className="vr opacity-25 my-auto" style={{ height: '24px', backgroundColor: borderColor }}></div>

              {/* User Profile */}
              <div className="position-relative" ref={profileRef}>
                <div
                  className="d-flex align-items-center gap-2 ps-1"
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                  onClick={() => setShowProfileMenu(prev => !prev)}
                >
                  <div
                    className="rounded-circle text-white d-flex align-items-center justify-content-center font-semibold flex-shrink-0"
                    style={{
                      width: '36px', height: '36px', backgroundColor: '#8B5CF6', fontSize: '13px', fontWeight: 600,
                      letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)', transition: 'all 0.15s ease'
                    }}
                  >
                    {userInitials}
                  </div>
                  <div className="d-none d-sm-block text-start">
                    <p className="mb-0 small fw-bold" style={{ color: textPrimary }}>{userName}</p>
                    <span className="d-block" style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>{userRole}</span>
                  </div>
                  <ChevronDown size={14} className="d-none d-sm-block" style={{ color: textSecondary }} />
                </div>

                {showProfileMenu && (
                  <div
                    className="position-absolute rounded-3 overflow-hidden"
                    style={{
                      top: '48px', right: 0, width: '180px', backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 1040
                    }}
                  >
                    <button
                      onClick={handleSignOut}
                      className="btn w-100 d-flex align-items-center gap-2 rounded-0 border-0 px-3 py-2"
                      style={{ color: '#EF4444', fontSize: '13px', textAlign: 'left' }}
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </header>

        <main className="p-3 p-md-4 flex-grow-1" style={{ paddingTop: 'calc(64px + 1.5rem)' }}>

          {/* PAGE HEADER BLOCK */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3 mb-4 mt-5">
            <div>
              <h1 className="h3 fw-bold mb-1" style={{ color: textPrimary }}>Workspace Tasks</h1>
              <p className="small mb-0" style={{ color: textSecondary }}>
                {isAdmin
                  ? 'Manage deployment items, review backlog pipelines, and assign workloads.'
                  : 'Your assigned tasks — flag a task for review once you\u2019re done.'}
              </p>
            </div>
            <div className="d-flex gap-2 w-100 w-sm-auto justify-content-sm-end">
              <div className="position-relative" ref={filterRef}>
                <button
                  className="btn btn-sm border d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0 py-2 px-3 rounded-3 header-action-btn"
                  style={{ backgroundColor: showFilterMenu ? (darkMode ? '#334155' : '#F1F5F9') : cardBg, color: textPrimary, borderColor: borderColor }}
                  onClick={() => setShowFilterMenu(v => !v)}
                >
                  <Filter size={14} />
                  Filter Lanes {selectedPriorities.length > 0 && `(${selectedPriorities.length})`}
                </button>
                {showFilterMenu && (
                  <div className="position-absolute shadow rounded-3 border p-3 filter-dropdown-menu" style={{ right: isMobileView ? 'auto' : 0, left: isMobileView ? 0 : 'auto', top: '42px', minWidth: '200px', zIndex: 20, backgroundColor: cardBg, borderColor: borderColor }}>
                    <div className="small fw-semibold mb-2" style={{ fontSize: '11px', color: textSecondary }}>PRIORITY</div>
                    {PRIORITY_OPTIONS.map(opt => (
                      <div className="form-check mb-1" key={opt.value}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`filter-${opt.value}`}
                          checked={selectedPriorities.includes(opt.value)}
                          onChange={() => togglePriorityFilter(opt.value)}
                        />
                        <label className="form-check-label small" style={{ color: textPrimary }} htmlFor={`filter-${opt.value}`}>{opt.label}</label>
                      </div>
                    ))}
                    {selectedPriorities.length > 0 && (
                      <button className="btn btn-sm btn-link p-0 mt-1" onClick={() => setSelectedPriorities([])}>Clear all</button>
                    )}
                  </div>
                )}
              </div>
              {isAdmin && (
                <button
                  className="btn btn-sm text-white d-flex align-items-center justify-content-center gap-2 shadow-sm flex-grow-1 flex-sm-grow-0 py-2 px-3 rounded-3 header-action-btn"
                  style={{ backgroundColor: '#3B82F6', border: 'none' }}
                  onClick={openCreateModal}
                >
                  <Plus size={14} />
                  Create Ticket
                </button>
              )}
            </div>
          </div>

          {loadError && (
            <div className="alert alert-warning py-2 px-3 small mb-3">{loadError}</div>
          )}
          {actionError && (
            <div className="alert alert-danger py-2 px-3 small mb-3 d-flex justify-content-between align-items-center">
              {actionError}
              <button className="btn-close btn-sm" onClick={() => setActionError(null)}></button>
            </div>
          )}

          {loadingTasks ? (
            <div className="text-center py-5" style={{ color: textSecondary }}>
              <Loader2 className="spin" size={24} />
              <div className="small mt-2">Loading tasks…</div>
            </div>
          ) : (
            <div className="row g-3 g-xl-4 align-items-start">
              {columns.map(col => {
                const colTasks = filteredTasks.filter(t => bucketOf(t.status) === col.key);
                return (
                  <div className="col-12 col-lg-4" key={col.key}>
                    <div className="card border-0 p-2 rounded-3" style={{ backgroundColor: darkMode ? 'rgba(51, 65, 85, 0.35)' : '#F1F5F9' }}>
                      <div className="d-flex justify-content-between align-items-center px-2 py-1 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: col.dotColor }}></span>
                          <h5 className="mb-0 fw-bold" style={{ fontSize: '14px', color: textPrimary }}>{col.label}</h5>
                        </div>
                        <span className="badge rounded-pill px-2" style={{ backgroundColor: col.tint, color: col.dotColor }}>
                          {colTasks.length}
                        </span>
                      </div>
                      <div className="d-flex flex-column gap-2.5">
                        {colTasks.length === 0 ? (
                          <div className="text-center small py-4" style={{ fontSize: '12px', color: textSecondary }}>No tasks here</div>
                        ) : colTasks.map(renderCard)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* CREATE / EDIT TICKET MODAL */}
      {showTicketModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: 'rgba(15, 23, 42, 0.55)', zIndex: 1050 }}
          onClick={closeTicketModal}
        >
          <div
            className="rounded-4 shadow-lg p-4"
            style={{ width: '480px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', backgroundColor: cardBg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0" style={{ color: textPrimary }}>{editingTask ? 'Edit Task' : 'Create Ticket'}</h5>
              <button className="btn p-0 border-0 bg-transparent" style={{ color: textSecondary }} onClick={closeTicketModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitTicket}>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Fix pagination bug on Docs page"
                  autoFocus
                  style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Tag / Project</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    placeholder="Backend, UI/UX…"
                    style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Priority</label>
                  <select
                    className="form-select"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                  >
                    {PRIORITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Assignees</label>
                <div className="rounded-3 p-2" style={{ backgroundColor: inputBg, border: `1px solid ${borderColor}`, maxHeight: '120px', overflowY: 'auto' }}>
                  {users.length === 0 && <p className="small mb-0" style={{ color: textSecondary }}>No staff members found.</p>}
                  {users.map(u => (
                    <div key={u.id} className="form-check mb-1">
                      <input className="form-check-input" type="checkbox" id={`assignee-${u.id}`} checked={form.assigneeIds.includes(u.id)} onChange={() => toggleAssignee(u.id)} />
                      <label className="form-check-label small" style={{ color: textPrimary }} htmlFor={`assignee-${u.id}`}>{u.full_name}</label>
                    </div>
                  ))}
                </div>
                {form.assigneeIds.length > 0 && <p className="small mt-1 mb-0" style={{ color: textSecondary }}>{form.assigneeIds.length} selected</p>}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Due date</label>
                <input type="date" className="form-control" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }} />
              </div>

              {editingTask && (
                <div className="mb-3">
                  <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                  >
                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              )}

              {formError && <div className="alert alert-danger py-2 px-3 small">{formError}</div>}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" className="btn border" style={{ color: textPrimary, borderColor: borderColor, backgroundColor: cardBg }} onClick={closeTicketModal} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn text-white" style={{ backgroundColor: '#3B82F6' }} disabled={submitting}>
                  {submitting ? 'Saving…' : (editingTask ? 'Save changes' : 'Create ticket')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTACHMENTS MODAL */}
      {attachmentTask && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: 'rgba(15, 23, 42, 0.55)', zIndex: 1050 }}
          onClick={() => setAttachmentTask(null)}
        >
          <div
            className="rounded-4 shadow-lg p-4"
            style={{ width: '480px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', backgroundColor: cardBg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: textPrimary }}>
                <Paperclip size={16} /> Attachments
              </h5>
              <button className="btn p-0 border-0 bg-transparent" style={{ color: textSecondary }} onClick={() => setAttachmentTask(null)}><X size={18} /></button>
            </div>
            <p className="small mb-3" style={{ color: textSecondary }}>{attachmentTask.title}</p>

            {attachError && <div className="alert alert-danger py-2 px-3 small mb-3">{attachError}</div>}

            <div
              className="rounded-3 p-3 mb-3 text-center"
              style={{ border: `2px dashed ${borderColor}`, backgroundColor: inputBg, cursor: 'pointer' }}
              onClick={() => attachInputRef.current?.click()}
            >
              <input ref={attachInputRef} type="file" className="d-none" onChange={handleFileUpload} />
              {uploadingFile
                ? <><Loader2 size={16} className="spin me-1" /><span className="small" style={{ color: textSecondary }}>Uploading...</span></>
                : <><Paperclip size={15} className="me-1" style={{ color: textSecondary }} /><span className="small" style={{ color: textSecondary }}>Click to attach a file (max 10MB)</span></>
              }
            </div>

            {attachmentTask.attachments.length === 0
              ? <p className="small text-center mb-0" style={{ color: textSecondary }}>No attachments yet.</p>
              : (
                <div className="d-flex flex-column gap-2">
                  {attachmentTask.attachments.map(att => (
                    <div key={att.id} className="d-flex align-items-center justify-content-between p-2 px-3 rounded-3" style={{ backgroundColor: inputBg, border: `1px solid ${borderColor}` }}>
                      <div className="d-flex align-items-center gap-2 min-w-0">
                        <Paperclip size={13} style={{ color: textSecondary, flexShrink: 0 }} />
                        <span className="small text-truncate" style={{ color: textPrimary }}>{att.filename}</span>
                        {att.file_size_mb && <span className="small flex-shrink-0" style={{ color: textSecondary }}>{att.file_size_mb}MB</span>}
                      </div>
                      <div className="d-flex gap-1 flex-shrink-0">
                        <a href={att.file_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-link p-1" style={{ color: textSecondary }} title="Download"><Download size={13} /></a>
                        <button className="btn btn-sm btn-link p-1 text-danger" onClick={() => handleDeleteAttachment(att.id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {confirmDeleteId && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ background: 'rgba(15, 23, 42, 0.55)', zIndex: 1050 }}
          onClick={() => !deleting && setConfirmDeleteId(null)}
        >
          <div className="rounded-4 shadow-lg p-4" style={{ width: '360px', maxWidth: '92vw', backgroundColor: cardBg }} onClick={(e) => e.stopPropagation()}>
            <h6 className="fw-bold mb-2" style={{ color: textPrimary }}>Delete this task?</h6>
            <p className="small mb-4" style={{ color: textSecondary }}>This can't be undone.</p>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn border" style={{ color: textPrimary, borderColor: borderColor, backgroundColor: cardBg }} onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
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

        .hover-card {
          cursor: default;
          border: 1px solid transparent !important;
        }
        .hover-card:hover {
          transform: translateY(-2px);
          border-color: ${borderColor} !important;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08) !important;
        }
        .transition-all {
          transition: all 0.2s ease-in-out;
        }
        .bg-opacity-15 {
          --bs-bg-opacity: 0.15;
        }
        .bg-opacity-10 {
          --bs-bg-opacity: 0.10;
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
          .filter-dropdown-menu,
          .admin-actions-menu,
          .range-dropdown-menu {
            width: min(92vw, 210px) !important;
            right: auto !important;
            left: 0 !important;
          }
          .filter-dropdown-menu button,
          .admin-actions-menu button,
          .range-dropdown-menu button {
            font-size: 12px !important;
            padding: 8px 10px !important;
          }
          .admin-actions-menu {
            min-width: 160px !important;
            right: 0 !important;
            left: auto !important;
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

export default TaskPage;