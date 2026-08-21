import React, { useEffect, useState } from 'react';
import { XCircle, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  // Step: 'verifying' | 'form' | 'done' | 'error'
  const [step, setStep] = useState('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  // Temp tokens from verify_email — held until profile form submits
  const [tempTokens, setTempTokens] = useState(null);
  const [tempUser, setTempUser] = useState(null);

  // Profile form state
  const [form, setForm] = useState({ full_name: '', email: '', new_password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!uid || !token) {
      setErrorMessage('This verification link is missing required parameters.');
      setStep('error');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await authService.verifyEmail(uid, token);
        if (cancelled) return;
        if (data.tokens && data.user) {
          // Store temp tokens so completeProfile can use them, but don't
          // log the user in yet — they must complete the form first.
          setTempTokens(data.tokens);
          setTempUser(data.user);
          setForm(prev => ({ ...prev, email: data.user.email || '', full_name: data.user.full_name || '' }));
          // Temporarily store access token so completeProfile fetch can auth
          localStorage.setItem('accessToken', data.tokens.access);
          localStorage.setItem('refreshToken', data.tokens.refresh);
          setStep('form');
        } else {
          setStep('error');
          setErrorMessage('Verification succeeded but no session was returned. Please sign in.');
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err.response?.data?.detail || err.message || 'This verification link is invalid or has expired.');
          setStep('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.full_name.trim()) return setFormError('Full name is required.');
    if (!form.email.trim()) return setFormError('Email is required.');
    if (!form.new_password) return setFormError('Password is required.');
    if (form.new_password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (form.new_password !== form.confirm_password) return setFormError('Passwords do not match.');

    setSubmitting(true);
    try {
      const data = await authService.completeProfile({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
      // Now officially log them in with the fresh tokens from completeProfile
      loginWithTokens(data.tokens, data.user);
      setStep('done');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      setFormError(err.message || 'Could not save your profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    color: '#0F172A',
    fontSize: '14px',
    height: '44px',
    paddingLeft: '14px',
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ backgroundColor: '#F1F5F9', fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="bg-white rounded-4 shadow-sm p-4 p-sm-5 w-100"
        style={{ maxWidth: '440px' }}
      >
        {/* Logo mark */}
        <div
          className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-4"
          style={{ width: '48px', height: '48px', backgroundColor: '#3B82F6', fontSize: '18px' }}
        >
          O
        </div>

        {/* VERIFYING */}
        {step === 'verifying' && (
          <div className="text-center">
            <Loader2 size={36} className="text-primary mb-3" style={{ animation: 'spin 1s linear infinite' }} />
            <h2 className="fw-bold mb-2" style={{ fontSize: '20px', color: '#0F172A' }}>Verifying your link...</h2>
            <p className="text-muted small mb-0">Just a moment.</p>
          </div>
        )}

        {/* PROFILE FORM */}
        {step === 'form' && (
          <>
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-1" style={{ fontSize: '20px', color: '#0F172A' }}>Complete your profile</h2>
              <p className="text-muted small mb-0">Set up your account before accessing the portal.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: '#64748B' }}>Full name</label>
                <input
                  type="text"
                  className="form-control"
                  style={inputStyle}
                  placeholder="e.g. Jane Doe"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  autoFocus
                  disabled={submitting}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: '#64748B' }}>Email address</label>
                <input
                  type="email"
                  className="form-control"
                  style={inputStyle}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: '#64748B' }}>New password</label>
                <div className="position-relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control pe-5"
                    style={inputStyle}
                    placeholder="Min. 8 characters"
                    value={form.new_password}
                    onChange={e => setForm({ ...form, new_password: e.target.value })}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="btn p-0 border-0 bg-transparent position-absolute"
                    style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: '#64748B' }}>Confirm password</label>
                <div className="position-relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-control pe-5"
                    style={inputStyle}
                    placeholder="Repeat your password"
                    value={form.confirm_password}
                    onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="btn p-0 border-0 bg-transparent position-absolute"
                    style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
                    onClick={() => setShowConfirm(v => !v)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {formError && (
                <div className="alert alert-danger py-2 px-3 small mb-3 rounded-3">{formError}</div>
              )}

              <button
                type="submit"
                className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center gap-2"
                style={{ backgroundColor: '#3B82F6', height: '44px', borderRadius: '10px', fontSize: '14px' }}
                disabled={submitting}
              >
                {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {submitting ? 'Saving...' : 'Complete setup & go to dashboard'}
              </button>
            </form>
          </>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="text-center">
            <CheckCircle2 size={40} className="text-success mb-3" />
            <h2 className="fw-bold mb-2" style={{ fontSize: '20px', color: '#0F172A' }}>All set!</h2>
            <p className="text-muted small mb-0">Taking you to your dashboard...</p>
            <Loader2 size={18} className="text-primary mt-3" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="text-center">
            <XCircle size={40} className="text-danger mb-3" />
            <h2 className="fw-bold mb-2" style={{ fontSize: '20px', color: '#0F172A' }}>Verification failed</h2>
            <p className="text-muted small mb-4">{errorMessage}</p>
            <Link to="/signin" className="btn btn-outline-secondary w-100 py-2 rounded-3 fw-medium">
              Back to sign in
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-control:focus {
          border-color: #3B82F6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12) !important;
        }
      `}</style>
    </div>
  );
}

export default VerifyEmailPage;
