import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError('Please enter your email address.');
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
    paddingLeft: '42px',
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

        {!sent ? (
          <>
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-1" style={{ fontSize: '20px', color: '#0F172A' }}>Forgot your password?</h2>
              <p className="text-muted small mb-0">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: '#64748B' }}>Email address</label>
                <div className="position-relative">
                  <Mail size={16} className="position-absolute" style={{ left: '13px', top: '14px', color: '#94A3B8' }} />
                  <input
                    type="email"
                    className="form-control"
                    style={inputStyle}
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center gap-2"
                style={{ backgroundColor: '#3B82F6', height: '44px', borderRadius: '10px', fontSize: '14px' }}
                disabled={loading}
              >
                {loading && <Loader2 size={16} className="spin" />}
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle2 size={40} className="text-success mb-3" />
            <h2 className="fw-bold mb-2" style={{ fontSize: '20px', color: '#0F172A' }}>Check your inbox</h2>
            <p className="text-muted small mb-0">
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            </p>
          </div>
        )}

        <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
          <Link
            to="/signin"
            className="small text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ color: '#64748B' }}
          >
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        </div>
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
