import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!uid || !token) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center p-3"
        style={{ backgroundColor: '#F1F5F9', fontFamily: "'Inter', sans-serif" }}
      >
        <div className="bg-white rounded-4 shadow-sm p-4 p-sm-5 w-100 text-center" style={{ maxWidth: '420px' }}>
          <XCircle size={40} className="text-danger mb-3" />
          <h2 className="fw-bold mb-2" style={{ fontSize: '20px', color: '#0F172A' }}>Invalid reset link</h2>
          <p className="text-muted small mb-4">This link is missing required parameters.</p>
          <Link to="/forgot-password" className="btn btn-outline-secondary w-100 rounded-3">Request a new link</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.new_password) return setError('Password is required.');
    if (form.new_password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.new_password !== form.confirm_password) return setError('Passwords do not match.');

    setLoading(true);
    try {
      await authService.resetPassword(uid, token, form.new_password, form.confirm_password);
      setDone(true);
      setTimeout(() => navigate('/signin', { replace: true, state: { message: 'Password reset successfully. Please sign in.' } }), 2000);
    } catch (err) {
      setError(err.message || 'Could not reset your password. The link may have expired.');
    } finally {
      setLoading(false);
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
      <div className="bg-white rounded-4 shadow-sm p-4 p-sm-5 w-100" style={{ maxWidth: '420px' }}>

        <div
          className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-4"
          style={{ width: '48px', height: '48px', backgroundColor: '#3B82F6', fontSize: '18px' }}
        >
          O
        </div>

        {!done ? (
          <>
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-1" style={{ fontSize: '20px', color: '#0F172A' }}>Set a new password</h2>
              <p className="text-muted small mb-0">Choose a strong password for your account.</p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">{error}</div>
            )}

            <form onSubmit={handleSubmit} noValidate>
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
                    autoFocus
                    disabled={loading}
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
                <label className="form-label small fw-semibold" style={{ color: '#64748B' }}>Confirm new password</label>
                <div className="position-relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-control pe-5"
                    style={inputStyle}
                    placeholder="Repeat your password"
                    value={form.confirm_password}
                    onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                    disabled={loading}
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

              <button
                type="submit"
                className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center gap-2"
                style={{ backgroundColor: '#3B82F6', height: '44px', borderRadius: '10px', fontSize: '14px' }}
                disabled={loading}
              >
                {loading && <Loader2 size={16} className="spin" />}
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>

            <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
              <Link to="/signin" className="small text-decoration-none" style={{ color: '#64748B' }}>
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle2 size={40} className="text-success mb-3" />
            <h2 className="fw-bold mb-2" style={{ fontSize: '20px', color: '#0F172A' }}>Password reset!</h2>
            <p className="text-muted small mb-0">Redirecting you to sign in...</p>
            <Loader2 size={18} className="text-primary mt-3 spin" />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        .form-control:focus {
          border-color: #3B82F6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12) !important;
          background-color: #fff !important;
        }
      `}</style>
    </div>
  );
}
