import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ShieldAlert, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();

  const successRedirectMessage = location.state?.message || '';
  const targetPath = (location.state?.from?.pathname && location.state.from.pathname !== '/signin' && location.state.from.pathname !== '/') ? location.state.from.pathname : '/dashboard';

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [role, setRole] = useState('staff');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const result = await login(email, password, role, rememberMe);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex p-0 bg-light" style={{ fontFamily: 'sans-serif' }}>
      <div className="row g-0 w-100 link-dark text-decoration-none">

        <div
          className="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative"
          style={{
            backgroundColor: '#0F172A',
            backgroundImage: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
          }}
        >
          <div className="d-flex align-items-center gap-2 cursor-pointer">
            <div className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '32px', height: '32px', backgroundColor: '#3B82F6' }}>O</div>
            <span className="fw-bold tracking-wide style-logo">OpsPortal</span>
          </div>

          <div className="my-auto" style={{ maxWidth: '440px' }}>
            <span className="badge bg-primary bg-opacity-25 text-primary mb-3 px-3 py-2 rounded-pill fw-semibold" style={{ color: '#3B82F6' }}>
              v2.4 Production Ready
            </span>
            <h1 className="display-5 fw-bold mb-3 lh-sm">
              Secure Gateway to Workspace Operations.
            </h1>
            <p className="text-secondary lead fs-6 opacity-75">
              Monitor systems execution logs, delegate tasks down your team channels, and maintain strict cloud SLA thresholds smoothly from a singular access deck.
            </p>
          </div>

          <div className="text-muted small opacity-50">
            &copy; 2026 OpsPortal Inc. All structural rights reserved.
          </div>
        </div>

        <div className="col-12 col-lg-6 d-flex align-items-center justify-content-center p-4 p-sm-5 bg-white">
          <div className="w-100 position-relative" style={{ maxWidth: '400px' }}>

            <Link
              to="/"
              className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted small mb-4 hover-dark transition-all"
            >
              <ArrowLeft size={16} /> Back to dashboard
            </Link>

            <div className="mb-4">
              <h2 className="fw-bold text-dark mb-1" style={{ color: '#0F172A' }}>Welcome Back</h2>
              <p className="text-muted small">
                Provide your {role === 'admin' ? 'administrative' : 'workspace'} credentials to log in.
              </p>
            </div>

            {successRedirectMessage && !errorMessage && (
              <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mb-3" role="alert">
                <CheckCircle2 size={18} className="flex-shrink-0" />
                <div>{successRedirectMessage}</div>
              </div>
            )}

            {errorMessage && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mb-3" role="alert">
                <AlertCircle size={18} className="flex-shrink-0" />
                <div>{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">

              <div>
                <label className="form-label small fw-bold text-secondary mb-2">Account Portal Type</label>
                <div className="d-flex p-1 bg-light rounded-3 border border-light">
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`btn btn-sm flex-grow-1 py-2 rounded-2 d-flex align-items-center justify-content-center gap-2 border-0 shadow-none transition-all ${
                      role === 'staff'
                        ? 'bg-white text-dark fw-bold shadow-sm'
                        : 'text-secondary bg-transparent'
                    }`}
                  >
                    <User size={16} />
                    Staff Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`btn btn-sm flex-grow-1 py-2 rounded-2 d-flex align-items-center justify-content-center gap-2 border-0 shadow-none transition-all ${
                      role === 'admin'
                        ? 'bg-white text-dark fw-bold shadow-sm'
                        : 'text-secondary bg-transparent'
                    }`}
                  >
                    <ShieldAlert size={16} />
                    Administrator
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label small fw-bold text-secondary mb-1">Corporate Email</label>
                <div className="position-relative">
                  <Mail className="position-absolute text-muted opacity-50" size={18} style={{ left: '12px', top: '12px' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="form-control border bg-light ps-5 py-2.5 rounded-3 shadow-none custom-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-bold text-secondary mb-0">Security Password</label>
                </div>
                <div className="position-relative">
                  <Lock className="position-absolute text-muted opacity-50" size={18} style={{ left: '12px', top: '12px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="form-control border bg-light ps-5 pe-5 py-2.5 rounded-3 shadow-none custom-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn position-absolute top-0 end-0 h-100 text-muted px-3 border-0 d-flex align-items-center shadow-none bg-transparent"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center py-1">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input shadow-none cursor-pointer rounded"
                    id="rememberMeCheck"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="form-check-label small text-muted user-select-none cursor-pointer" htmlFor="rememberMeCheck">
                    Keep me authenticated
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn text-white w-100 py-2.5 rounded-3 fw-medium shadow-sm transition-all btn-submit d-flex align-items-center justify-content-center gap-2"
                style={{ backgroundColor: '#3B82F6', border: 'none' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Authenticating Identity...
                  </>
                ) : (
                  'Authenticate Identity'
                )}
              </button>
            </form>

            <div className="text-center mt-4 pt-2 border-top border-light">
              <p className="small text-muted mb-0">
                New to the platform?{' '}
                <Link to="/signup" className="text-decoration-none fw-bold text-primary-link">
                  Register standard account
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>

      <style>{`
        .custom-input {
          font-size: 14px;
          border-color: #E2E8F0 !important;
          transition: border-color 0.15s ease-in-out, background-color 0.15s ease-in-out;
        }
        .custom-input:focus {
          background-color: #ffffff !important;
          border-color: #3B82F6 !important;
        }
        .text-primary-link {
          color: #3B82F6;
          transition: color 0.15s ease;
        }
        .text-primary-link:hover {
          color: #2563EB;
          text-decoration: underline !important;
        }
        .btn-submit {
          transition: background-color 0.15s ease;
        }
        .btn-submit:hover:not(:disabled) {
          background-color: #2563EB !important;
        }
        .hover-dark {
          transition: color 0.15s ease;
        }
        .hover-dark:hover {
          color: #0F172A !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .style-logo {
          letter-spacing: -0.01em;
        }
      `}</style>
    </div>
  );
}

export default SignInPage;