import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, MoreVertical, Calendar, CheckCircle2, Clock } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { tasksService } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

function TaskPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tasksData, setTasksData] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Layout engine state variables synced with the dashboard layout
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 992) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await tasksService.getAll();
        if (Array.isArray(data) && data.length > 0) {
          setTasksData(data.map(t => ({
            id: t.id,
            title: t.title,
            project: t.tag || 'General',
            status: t.status === 'in_progress' ? 'in-progress' : (t.status === 'complete' ? 'completed' : 'todo'),
            urgency: 'Medium',
            date: t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date',
            assignee: t.assignee_initials || 'ME',
            color: '#3B82F6'
          })));
        } else {
          // Fallback mock initial tasks if DB is empty
          setTasksData([
            { id: 1, title: 'Optimize database indexing schemas', project: 'Backend', status: 'todo', urgency: 'High', date: 'June 12', assignee: 'MC', color: '#EF4444' },
            { id: 2, title: 'Draft API system error definitions', project: 'Architecture', status: 'todo', urgency: 'Medium', date: 'June 15', assignee: 'JD', color: '#F59E0B' },
            { id: 3, title: 'Fix auth refresh-token memory leak', project: 'Security', status: 'in-progress', urgency: 'Urgent', date: 'June 10', assignee: 'SJ', color: '#DC2626' },
            { id: 4, title: 'Re-align layout grid constraints', project: 'UI/UX', status: 'in-progress', urgency: 'Low', date: 'June 18', assignee: 'BB', color: '#3B82F6' },
            { id: 5, title: 'Automate container image orchestration', project: 'DevOps', status: 'completed', urgency: 'High', date: 'June 08', assignee: 'MC', color: '#10B981' },
          ]);
        }
      } catch (err) {
        // Fallback for visual continuity if offline
        setTasksData([
          { id: 1, title: 'Optimize database indexing schemas', project: 'Backend', status: 'todo', urgency: 'High', date: 'June 12', assignee: 'MC', color: '#EF4444' },
          { id: 2, title: 'Draft API system error definitions', project: 'Architecture', status: 'todo', urgency: 'Medium', date: 'June 15', assignee: 'JD', color: '#F59E0B' },
          { id: 3, title: 'Fix auth refresh-token memory leak', project: 'Security', status: 'in-progress', urgency: 'Urgent', date: 'June 10', assignee: 'SJ', color: '#DC2626' },
          { id: 4, title: 'Re-align layout grid constraints', project: 'UI/UX', status: 'in-progress', urgency: 'Low', date: 'June 18', assignee: 'BB', color: '#3B82F6' },
          { id: 5, title: 'Automate container image orchestration', project: 'DevOps', status: 'completed', urgency: 'High', date: 'June 08', assignee: 'MC', color: '#10B981' },
        ]);
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchTasks();
  }, []);

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'Urgent': return <span className="badge bg-danger bg-opacity-10 text-danger px-2 py-1" style={{ fontSize: '11px' }}>Urgent</span>;
      case 'High': return <span className="badge bg-warning bg-opacity-10 text-warning px-2 py-1" style={{ fontSize: '11px', color: '#D97706' }}>High Priority</span>;
      case 'Medium': return <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1" style={{ fontSize: '11px' }}>Medium</span>;
      default: return <span className="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1" style={{ fontSize: '11px' }}>Low</span>;
    }
  };

  const filteredTasks = tasksData.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.project.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="d-flex min-vh-100 bg-light text-dark" style={{ fontFamily: 'sans-serif', overflowX: 'hidden' }}>
      
      {/* SIDEBAR */}
      <Sidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        desktopCollapsed={desktopCollapsed} 
        onToggleSidebar={handleToggleSidebar}
      />

      {/* PRIMARY SYSTEM WORKSPACE PANEL */}
      <div 
        className="flex-grow-1 d-flex flex-column min-w-0"
        id="main-content-wrapper"
        style={{ transition: 'margin-left 0.2s ease-in-out' }}
      >
        <main className="p-3 p-md-4 flex-grow-1" style={{ paddingTop: 'calc(64px + 1.5rem)' }}>
          
          {/* PAGE HEADER BLOCK */}
          <div className="d-flex flex-column sm:flex-row justify-content-between align-items-start gap-4 mb-4 mt-3">
            <div>
              <h1 className="h3 fw-bold mb-1 mt-5" style={{ color: '#0F172A' }}>Workspace Tasks</h1>
              <p className="text-muted small mb-0">Manage deployment items, review backlog pipelines, and assign workloads.</p>
            </div>
            <div className="d-flex gap-2 w-100 w-sm-auto justify-content-sm-end">
              <button className="btn btn-white btn-sm border d-flex align-items-center justify-content-center gap-2 bg-white shadow-sm flex-grow-1 flex-sm-grow-0 py-2 px-3 rounded-3 text-secondary">
                <Filter size={14} />
                Filter Lanes
              </button>
              <button className="btn btn-sm text-white d-flex align-items-center justify-content-center gap-2 shadow-sm flex-grow-1 flex-sm-grow-0 py-2 px-3 rounded-3" style={{ backgroundColor: '#3B82F6', border: 'none' }}>
                <Plus size={14} />
                Create Ticket
              </button>
            </div>
          </div>

          {/* FILTER & SEARCH SEARCH BAR UTILITIES */}
          <div className="card border-0 shadow-sm p-2 mb-4 bg-white rounded-3">
            <div className="position-relative w-100">
              <Search className="position-absolute text-muted opacity-50" size={18} style={{ left: '12px', top: '12px' }} />
              <input 
                type="text" 
                placeholder="Search across active tasks and backlogs..." 
                className="form-control border-0 bg-transparent ps-5 py-2 shadow-none"
                style={{ fontSize: '14px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* WORKSPACE STRATA BOARDS LAYOUT GRID */}
          <div className="row g-3 g-xl-4 align-items-start">
            
            {/* COLUMN 1: TO DO STRATUM */}
            <div className="col-12 col-lg-4">
              <div className="card bg-light border-0 p-2 rounded-3">
                <div className="d-flex justify-content-between align-items-center px-2 py-1 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: '#64748B' }}></span>
                    <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '14px' }}>Backlog / To Do</h5>
                  </div>
                  <span className="badge rounded-pill bg-secondary bg-opacity-15 text-secondary px-2">
                    {filteredTasks.filter(t => t.status === 'todo').length}
                  </span>
                </div>

                <div className="d-flex flex-column gap-2.5">
                  {filteredTasks.filter(t => t.status === 'todo').map(task => (
                    <div key={task.id} className="card border-0 shadow-sm p-3 bg-white rounded-3 hover-card transition-all">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span className="badge bg-light text-secondary border uppercase px-2 py-0.5" style={{ fontSize: '10px' }}>{task.project}</span>
                        <button className="btn p-0 border-0 bg-transparent text-muted"><MoreVertical size={14} /></button>
                      </div>
                      <h6 className="fw-semibold text-dark mb-3 lh-sm" style={{ fontSize: '13.5px' }}>{task.title}</h6>
                      <div className="d-flex justify-content-between align-items-center pt-2.5 border-top border-light">
                        <div className="d-flex align-items-center text-muted gap-1 small" style={{ fontSize: '11px' }}>
                          <Calendar size={12} /> {task.date}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {getUrgencyBadge(task.urgency)}
                          <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold text-center" style={{ width: '26px', height: '26px', fontSize: '10px', backgroundColor: '#8B5CF6' }}>
                            {task.assignee}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMN 2: IN PROGRESS STRATUM */}
            <div className="col-12 col-lg-4">
              <div className="card bg-light border-0 p-2 rounded-3">
                <div className="d-flex justify-content-between align-items-center px-2 py-1 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: '#3B82F6' }}></span>
                    <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '14px' }}>In Active Progress</h5>
                  </div>
                  <span className="badge rounded-pill bg-primary bg-opacity-15 text-primary px-2">
                    {filteredTasks.filter(t => t.status === 'in-progress').length}
                  </span>
                </div>

                <div className="d-flex flex-column gap-2.5">
                  {filteredTasks.filter(t => t.status === 'in-progress').map(task => (
                    <div key={task.id} className="card border-0 shadow-sm p-3 bg-white rounded-3 hover-card transition-all" style={{ borderLeft: `3px solid ${task.color}` }}>
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span className="badge bg-light text-secondary border uppercase px-2 py-0.5" style={{ fontSize: '10px' }}>{task.project}</span>
                        <button className="btn p-0 border-0 bg-transparent text-muted"><MoreVertical size={14} /></button>
                      </div>
                      <h6 className="fw-semibold text-dark mb-3 lh-sm" style={{ fontSize: '13.5px' }}>{task.title}</h6>
                      <div className="d-flex justify-content-between align-items-center pt-2.5 border-top border-light">
                        <div className="d-flex align-items-center text-muted gap-1 small" style={{ fontSize: '11px' }}>
                          <Clock size={12} /> {task.date}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {getUrgencyBadge(task.urgency)}
                          <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold text-center" style={{ width: '26px', height: '26px', fontSize: '10px', backgroundColor: '#3B82F6' }}>
                            {task.assignee}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMN 3: COMPLETED STRATUM */}
            <div className="col-12 col-lg-4">
              <div className="card bg-light border-0 p-2 rounded-3">
                <div className="d-flex justify-content-between align-items-center px-2 py-1 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: '#10B981' }}></span>
                    <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '14px' }}>Done / Closed</h5>
                  </div>
                  <span className="badge rounded-pill bg-success bg-opacity-15 text-success px-2">
                    {filteredTasks.filter(t => t.status === 'completed').length}
                  </span>
                </div>

                <div className="d-flex flex-column gap-2.5">
                  {filteredTasks.filter(t => t.status === 'completed').map(task => (
                    <div key={task.id} className="card border-0 shadow-sm p-3 bg-white rounded-3 opacity-85 hover-card transition-all">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span className="badge bg-light text-secondary border uppercase px-2 py-0.5" style={{ fontSize: '10px' }}>{task.project}</span>
                        <span className="text-success d-flex align-items-center gap-1 small fw-semibold" style={{ fontSize: '11px' }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      </div>
                      <h6 className="fw-semibold text-muted mb-3 lh-sm text-decoration-line-through" style={{ fontSize: '13.5px' }}>{task.title}</h6>
                      <div className="d-flex justify-content-between align-items-center pt-2.5 border-top border-light">
                        <div className="d-flex align-items-center text-muted gap-1 small" style={{ fontSize: '11px' }}>
                          <Calendar size={12} /> {task.date}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold text-center" style={{ width: '26px', height: '26px', fontSize: '10px', backgroundColor: '#10B981' }}>
                            {task.assignee}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      <style>{`
        #main-content-wrapper {
          margin-left: 0 !important;
        }
        @media (min-width: 992px) {
          #main-content-wrapper {
            margin-left: ${desktopCollapsed ? '70px' : '240px'} !important;
          }
        }
        .hover-card {
          cursor: pointer;
          border: 1px solid transparent !important;
        }
        .hover-card:hover {
          transform: translateY(-2px);
          border-color: #E2E8F0 !important;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05) !important;
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
      `}</style>
    </div>
  );
}

export default TaskPage;