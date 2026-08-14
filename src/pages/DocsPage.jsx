import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Folder, BookOpen, Terminal, Search,
  ArrowRight, CornerDownRight, Filter, Plus,
  Menu, Bell, Moon, Sun, X, Loader2, Upload, Trash2, Check, Eye, Download
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { documentsService, usersService } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

// Mirrors DocumentSerializer.validate_file in the backend, so bad uploads
// get caught client-side before hitting the network — the server still
// re-validates and is the actual source of truth.
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.txt', '.csv', '.xlsx'];

// Cosmetic-only mapping — falls back to a generic icon/color for any
// category the backend doesn't recognize, since categories are free text.
const CATEGORY_STYLES = {
  'Architecture Guides': { icon: <Terminal size={22} />, color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  'Onboarding & Setup': { icon: <BookOpen size={22} />, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  'Security Protocols': { icon: <FileText size={22} />, color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
};
const DEFAULT_CATEGORY_STYLE = { icon: <Folder size={22} />, color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' };

function formatRelativeDate(dateString) {
  if (!dateString) return '';
  const then = new Date(dateString);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return then.toLocaleDateString();
}

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#10B981'];
function colorForString(str) {
  const s = String(str || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getUrlExtension(url) {
  if (!url) return '';
  const clean = url.split('?')[0];
  const last = clean.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  return dot >= 0 ? last.slice(dot + 1) : '';
}

function sanitizeFilename(str) {
  return String(str || 'document').trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_') || 'document';
}

// Cloudinary's 'raw' resource type (which we use for all documents, since it's
// the only type that accepts non-media formats like .docx/.xlsx) defaults to
// forcing a download (Content-Disposition: attachment) for every file,
// regardless of type. fl_attachment:false explicitly overrides that default
// so browsers that CAN render the format (PDF, images, text) show it inline
// instead of downloading it.
function buildInlineUrl(fileUrl) {
  if (!fileUrl) return null;
  const marker = '/upload/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return fileUrl;
  const insertAt = idx + marker.length;
  return `${fileUrl.slice(0, insertAt)}fl_attachment:false/${fileUrl.slice(insertAt)}`;
}

// Cloudinary raw-delivery URLs preview inline by default for formats browsers
// can render (PDF, images, text) — that's true "Preview". For a guaranteed
// download with a readable filename (instead of Cloudinary's internal name),
// we inject the fl_attachment:<name> transformation flag right after
// '/upload/' in the URL, which tells Cloudinary to force
// Content-Disposition: attachment for that specific request.
function buildDownloadUrl(fileUrl, title) {
  if (!fileUrl) return null;
  const ext = getUrlExtension(fileUrl);
  const filename = sanitizeFilename(title) + (ext ? `.${ext}` : '');
  const marker = '/upload/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return fileUrl;
  const insertAt = idx + marker.length;
  return `${fileUrl.slice(0, insertAt)}fl_attachment:${encodeURIComponent(filename)}/${fileUrl.slice(insertAt)}`;
}

// Triggers a download without opening a confusing blank tab — an off-screen
// anchor click causes the browser to save the file directly.
function triggerDownload(url) {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function mapDocument(d) {
  return {
    id: d.id,
    docLabel: `DOC-${d.id}`,
    title: d.title,
    category: d.category || 'Uncategorized',
    updated: formatRelativeDate(d.uploaded_at),
    author: d.uploaded_by_name
      ? d.uploaded_by_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '—',
    avatarBg: colorForString(d.uploaded_by_name || d.uploaded_by),
    fileUrl: d.file || null,
    uploadedById: d.uploaded_by,
    assignedToId: d.assigned_to,
    assignedToInitials: d.assigned_to_initials || null,
  };
}

function DocsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const isAdmin = user?.role === 'admin';
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamUsersLoading, setTeamUsersLoading] = useState(false);
  const [uploadAssignee, setUploadAssignee] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadFileObj, setUploadFileObj] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const [deletingId, setDeletingId] = useState(null);

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

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await documentsService.getAll();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setDocuments(list.map(mapDocument));
    } catch (err) {
      setLoadError('Could not load documents. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDocuments([]);
    loadDocuments();
  }, [user?.id, loadDocuments]);

  const loadTeamUsers = useCallback(async () => {
    setTeamUsersLoading(true);
    try {
      const data = await usersService.getAll();
      let list = Array.isArray(data) ? data : (data?.results || []);
      const userCompanyId = user?.company_id || user?.company;
      if (userCompanyId) {
        list = list.filter(u => (u.company_id === userCompanyId || u.company === userCompanyId));
      }
      setTeamUsers(list);
    } catch (err) {
      setTeamUsers([]);
    } finally {
      setTeamUsersLoading(false);
    }
  }, [user?.company_id, user?.company]);

  useEffect(() => {
    if (isAdmin && showUploadModal && teamUsers.length === 0 && !teamUsersLoading) {
      loadTeamUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, showUploadModal]);

  // Real categories + counts, derived from the actual documents we have —
  // not hardcoded, so this stays accurate as documents are added or removed.
  const documentCategories = React.useMemo(() => {
    const counts = {};
    documents.forEach(d => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      ...(CATEGORY_STYLES[name] || DEFAULT_CATEGORY_STYLE),
    }));
  }, [documents]);

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const validateFile = (file) => {
    if (!file) return 'Please choose a file.';
    if (file.size > MAX_UPLOAD_SIZE_BYTES) return 'File size exceeds the 10MB limit.';
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) return `File type ${ext} isn't supported.`;
    return null;
  };

  const resetUploadForm = () => {
    setUploadTitle('');
    setUploadCategory('');
    setUploadFileObj(null);
    setUploadAssignee('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const fileErr = validateFile(uploadFileObj);
    if (!uploadTitle.trim() || fileErr) {
      setUploadError(fileErr || 'Please enter a title.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('title', uploadTitle.trim());
      formData.append('category', uploadCategory.trim());
      formData.append('file', uploadFileObj);
      if (isAdmin && uploadAssignee) formData.append('assigned_to', uploadAssignee);
      const created = await documentsService.create(formData);
      setDocuments(prev => [mapDocument(created), ...prev]);
      resetUploadForm();
      setShowUploadModal(false);
    } catch (err) {
      setUploadError(err.message || 'Could not upload the document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await documentsService.delete(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      setLoadError('Could not delete that document. Please try again.');
    } finally {
      setDeletingId(null);
    }
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
                  style={{ left: '12px', top: '10px', color: textSecondary }}
                />
                <input
                  type="text"
                  placeholder="Search docs globally..."
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

            <div className="d-flex align-items-center gap-2 gap-sm-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="btn p-2 rounded-circle border-0"
                style={{ backgroundColor: darkMode ? '#334155' : '#F1F5F9', color: textPrimary }}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                className="btn position-relative p-2 rounded-circle border-0"
                style={{ backgroundColor: 'transparent', color: textSecondary }}
                aria-label="View notifications"
              >
                <Bell size={18} />
              </button>
            </div>

          </div>
        </header>

        {/* MAIN CONTAINER */}
        <main className="p-3 p-md-4 flex-grow-1" style={{ paddingTop: 'calc(64px + 1.5rem)' }}>

          {/* PAGE HEADER */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3 mb-4 mt-5">
            <div>
              <h1 className="h3 fw-bold mb-1" style={{ color: textPrimary }}>
                Documents
              </h1>
              <p className="small mb-0" style={{ color: textSecondary }}>
                Access guides, runbooks, and team knowledge base.
              </p>
            </div>
            <div className="d-flex gap-2 w-100 w-sm-auto justify-content-sm-end">
              {categoryFilter !== 'All' && (
                <button
                  onClick={() => setCategoryFilter('All')}
                  className="btn btn-sm border d-flex align-items-center justify-content-center gap-2"
                  style={{ backgroundColor: cardBg, color: textPrimary, borderColor: borderColor }}
                >
                  <Filter size={14} />
                  {categoryFilter} <X size={12} />
                </button>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-sm text-white d-flex align-items-center justify-content-center gap-2 flex-grow-1 flex-sm-grow-0"
                style={{ backgroundColor: '#3B82F6' }}
              >
                <Plus size={14} />
                Add Document
              </button>
            </div>
          </div>

          {loadError && (
            <div className="alert alert-danger py-2 px-3 small d-flex justify-content-between align-items-center mb-3" role="alert">
              {loadError}
              <button className="btn btn-sm btn-link p-0 text-decoration-underline" onClick={loadDocuments}>Retry</button>
            </div>
          )}

          {/* CATEGORY CARDS */}
          {documentCategories.length > 0 && (
            <div className="row g-3 mb-4">
              {documentCategories.map((category) => {
                const isActive = categoryFilter === category.name;
                return (
                  <div key={category.name} className="col-12 col-sm-6 col-md-4">
                    <div
                      onClick={() => setCategoryFilter(isActive ? 'All' : category.name)}
                      className="card border-0 h-100"
                      style={{
                        backgroundColor: cardBg,
                        boxShadow: isActive ? `0 0 0 2px ${category.color}` : '0 1px 3px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${category.color}`
                      }}
                    >
                      <div className="card-body p-3 p-md-4 d-flex align-items-center gap-3">
                        <div
                          className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 p-2"
                          style={{
                            backgroundColor: category.bgColor,
                            color: category.color,
                            width: '48px',
                            height: '48px'
                          }}
                        >
                          {category.icon}
                        </div>
                        <div className="min-w-0 flex-grow-1">
                          <h6 className="fw-bold mb-0 text-truncate" style={{ fontSize: '14px', color: textPrimary }}>
                            {category.name}
                          </h6>
                          <p className="small mb-0 mt-1" style={{ color: textSecondary, fontSize: '12px' }}>
                            {category.count} {category.count === 1 ? 'Doc' : 'Docs'}
                          </p>
                        </div>
                        <ArrowRight size={16} style={{ color: textSecondary }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SEARCH BAR */}
          <div className="card border-0 mb-4" style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
            <div className="card-body p-3 p-md-4">
              <div className="position-relative">
                <Search className="position-absolute" size={18} style={{ left: '16px', top: '12px', color: textSecondary }} />
                <input
                  type="text"
                  placeholder="Search documents, guides, and runbooks..."
                  className="form-control border-0 ps-5 py-2 shadow-none"
                  style={{ backgroundColor: hoverBg, color: textPrimary, fontSize: '14px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* DOCUMENTS LIST */}
          <div className="card border-0 overflow-hidden" style={{ backgroundColor: cardBg, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
            <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center" style={{ backgroundColor: cardBg, borderColor }}>
              <span className="fw-bold small" style={{ color: textPrimary, fontSize: '13px' }}>
                All Documents
              </span>
              <span className="badge rounded-pill px-2 fw-semibold" style={{ fontSize: '11px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                {filteredDocuments.length} Found
              </span>
            </div>

            {loading && (
              <p className="text-center small p-4 mb-0 d-flex align-items-center justify-content-center gap-2" style={{ color: textSecondary }}>
                <Loader2 size={14} className="spin" /> Loading documents...
              </p>
            )}

            {!loading && (
              <div className="list-group list-group-flush">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="list-group-item border-0 px-4 py-3"
                    style={{ backgroundColor: cardBg, borderBottom: `1px solid ${borderColor}` }}
                  >
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3">
                      <div className="d-flex align-items-start gap-3 min-w-0 flex-grow-1">
                        <Folder size={18} style={{ color: textSecondary, marginTop: '2px', flexShrink: 0, opacity: 0.6 }} />
                        <div className="min-w-0">
                          <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                            <h6 className="fw-semibold mb-0 text-truncate" style={{ fontSize: '14px', color: textPrimary }}>
                              {doc.title}
                            </h6>
                            <span className="badge px-2 py-1 fw-semibold text-nowrap" style={{ fontSize: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                              {doc.docLabel}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2 small" style={{ color: textSecondary, fontSize: '12px' }}>
                            <CornerDownRight size={12} style={{ opacity: 0.75 }} />
                            <span style={{ color: '#3B82F6', fontWeight: 500 }}>
                              {doc.category}
                            </span>
                            {doc.assignedToInitials && (
                              <span
                                className="badge px-2 py-1 fw-semibold"
                                style={{ fontSize: '10px', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}
                              >
                                Assigned to {doc.assignedToInitials}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-3 justify-content-between w-100 w-sm-auto text-nowrap" style={{ fontSize: '12px' }}>
                        <span style={{ color: textSecondary }}>
                          Updated {doc.updated}
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: '28px', height: '28px', fontSize: '10px', backgroundColor: doc.avatarBg }}
                          >
                            {doc.author}
                          </div>
                          <button
                            onClick={() => {
                              const url = buildInlineUrl(doc.fileUrl);
                              if (url) window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            disabled={!doc.fileUrl}
                            className="btn p-1 border-0 rounded-2"
                            style={{ backgroundColor: 'transparent', color: textSecondary, opacity: doc.fileUrl ? 1 : 0.4 }}
                            title={doc.fileUrl ? 'Preview in new tab' : 'File unavailable'}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => triggerDownload(buildDownloadUrl(doc.fileUrl, doc.title))}
                            disabled={!doc.fileUrl}
                            className="btn p-1 border-0 rounded-2"
                            style={{ backgroundColor: 'transparent', color: textSecondary, opacity: doc.fileUrl ? 1 : 0.4 }}
                            title={doc.fileUrl ? 'Download' : 'File unavailable'}
                          >
                            <Download size={14} />
                          </button>
                          {(isAdminUser(user) || doc.uploadedById === user?.id) && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={deletingId === doc.id}
                              className="btn p-1 border-0 rounded-2"
                              style={{ backgroundColor: 'transparent', color: '#EF4444' }}
                              title="Delete document"
                            >
                              {deletingId === doc.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}

                {filteredDocuments.length === 0 && (
                  <div className="text-center py-5" style={{ color: textSecondary }}>
                    <FileText size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
                    <p className="small mb-0">
                      {documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your search or filter.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </main>
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1050 }}
          onClick={() => !uploading && setShowUploadModal(false)}
        >
          <div
            className="rounded-4 p-4 w-100"
            style={{ maxWidth: '440px', backgroundColor: cardBg, boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0" style={{ color: textPrimary }}>Add Document</h5>
              <button
                className="btn btn-link p-0"
                style={{ color: textSecondary }}
                onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                disabled={uploading}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {uploadError && (
              <div className="alert alert-danger py-2 px-3 small mb-3">{uploadError}</div>
            )}
            <form onSubmit={handleUpload}>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Title</label>
                <input
                  type="text"
                  autoFocus
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Onboarding checklist for new hires"
                  className="form-control"
                  disabled={uploading}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>Category</label>
                <input
                  type="text"
                  list="doc-category-options"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  placeholder="e.g. Architecture Guides"
                  className="form-control"
                  disabled={uploading}
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                />
                <datalist id="doc-category-options">
                  {documentCategories.map(c => <option key={c.name} value={c.name} />)}
                </datalist>
              </div>
              {isAdmin && (
                <div className="mb-3">
                  <label className="form-label small fw-semibold" style={{ color: textSecondary }}>
                    Assign to (optional)
                  </label>
                  <select
                    value={uploadAssignee}
                    onChange={(e) => setUploadAssignee(e.target.value)}
                    className="form-select"
                    disabled={uploading || teamUsersLoading}
                    style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', color: textPrimary, border: `1px solid ${borderColor}` }}
                  >
                    <option value="">
                      {teamUsersLoading ? 'Loading team...' : 'No one — just visible to me'}
                    </option>
                    {teamUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} {u.role ? `(${u.role})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="small mt-1 mb-0" style={{ color: textSecondary, fontSize: '11px' }}>
                    Shares this document into that team member's Documents list.
                  </p>
                </div>
              )}
              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: textSecondary }}>File</label>
                <div
                  className="d-flex align-items-center gap-2 rounded-3 px-3 py-2"
                  style={{ backgroundColor: darkMode ? '#334155' : '#F8FAFC', border: `1px dashed ${borderColor}` }}
                >
                  <Upload size={16} style={{ color: textSecondary }} />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_EXTENSIONS.join(',')}
                    onChange={(e) => setUploadFileObj(e.target.files?.[0] || null)}
                    disabled={uploading}
                    className="form-control form-control-sm border-0 bg-transparent p-0"
                    style={{ color: textPrimary }}
                  />
                </div>
                <p className="small mt-1 mb-0" style={{ color: textSecondary, fontSize: '11px' }}>
                  Max 10MB. Allowed: {ALLOWED_EXTENSIONS.join(', ')}
                </p>
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                  className="btn btn-sm border"
                  disabled={uploading}
                  style={{ color: textPrimary, borderColor: borderColor, backgroundColor: cardBg }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white d-flex align-items-center gap-2"
                  style={{ backgroundColor: '#3B82F6' }}
                  disabled={uploading || !uploadTitle.trim() || !uploadFileObj}
                >
                  {uploading && <Loader2 size={14} className="spin" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        #main-content-wrapper { margin-left: 0 !important; }
        #global-header { left: 0; }
        @media (min-width: 992px) {
          #main-content-wrapper { margin-left: ${desktopCollapsed ? '70px' : '240px'} !important; }
          #global-header { left: ${desktopCollapsed ? '70px' : '240px'} !important; }
        }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function isAdminUser(user) {
  return user?.role === 'admin';
}

export default DocsPage;