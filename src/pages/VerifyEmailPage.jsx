import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid || !token) {
      setStatus('error');
      setMessage('This verification link is missing required parameters.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await authService.verifyEmail(uid, token);
        if (!cancelled) {
          setStatus('success');
          setMessage(data.detail || 'Email verified successfully. You can sign in now.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.response?.data?.detail || err.message || 'This verification link is invalid or has expired.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [uid, token]);

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center p-4 bg-light" style={{ fontFamily: 'sans-serif' }}>
      <div className="w-100 bg-white rounded-4 shadow-sm p-4 p-sm-5 text-center" style={{ maxWidth: '420px' }}>
        <div
          className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-4"
          style={{ width: '48px', height: '48px', backgroundColor: '#3B82F6', fontSize: '18px' }}
        >
          O
        </div>

        {status === 'verifying' && (
          <>
            <Loader2 size={40} className="text-primary mb-3 spin-icon" />
            <h2 className="fw-bold mb-2" style={{ color: '#0F172A', fontSize: '22px' }}>Verifying your email...</h2>
            <p className="text-muted small mb-0">Just a moment while we confirm your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="text-success mb-3" />
            <h2 className="fw-bold mb-2" style={{ color: '#0F172A', fontSize: '22px' }}>Email verified</h2>
            <p className="text-muted small mb-4">{message}</p>
            <Link
              to="/signin"
              className="btn text-white w-100 py-2.5 rounded-3 fw-medium"
              style={{ backgroundColor: '#3B82F6', border: 'none' }}
            >
              Go to sign in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} className="text-danger mb-3" />
            <h2 className="fw-bold mb-2" style={{ color: '#0F172A', fontSize: '22px' }}>Verification failed</h2>
            <p className="text-muted small mb-4">{message}</p>
            <Link
              to="/signin"
              className="btn btn-outline-secondary w-100 py-2.5 rounded-3 fw-medium"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>

      <style>{`
        .spin-icon {
          animation: spinIcon 1s linear infinite;
        }
        @keyframes spinIcon {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default VerifyEmailPage;